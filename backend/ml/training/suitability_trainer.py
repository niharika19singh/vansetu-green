"""
VanSetu GreenTech — Suitability Classifier Model Trainer (Phase 5B).

Trains and compares scikit-learn classifier candidates using strict spatial cross-validation
grouped by road corridor. Rejects training when the minimum evidence gate is not satisfied.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.training.data_builder import (
    InsufficientLabelsError,
    InsufficientSpatialClassCoverageError,
    TrainingDatasetBuilder,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SuitabilityModelTrainer:
    """Trains, compares, and packages intervention suitability models."""

    def __init__(
        self,
        models_dir: Optional[Path] = None,
        builder: Optional[TrainingDatasetBuilder] = None,
    ) -> None:
        self.models_dir = models_dir or (Path(__file__).parent.parent.parent / "models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.builder = builder or TrainingDatasetBuilder()

    def build_preprocessor(self) -> ColumnTransformer:
        """Create sklearn ColumnTransformer for numerical imputation & categorical encoding."""
        num_cols = self.builder.FEATURE_COLUMNS
        cat_cols = self.builder.CATEGORICAL_COLUMNS

        num_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])

        cat_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])

        return ColumnTransformer(
            transformers=[
                ("num", num_pipeline, num_cols),
                ("cat", cat_pipeline, cat_cols),
            ]
        )

    def get_candidate_models(self) -> Dict[str, Any]:
        """Define the candidate classifier architectures."""
        return {
            "logistic_regression": LogisticRegression(
                max_iter=1000,
                class_weight="balanced",
                random_state=42,
            ),
            "random_forest": RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight="balanced",
                random_state=42,
            ),
            "extra_trees": ExtraTreesClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight="balanced",
                random_state=42,
            ),
            "hist_gradient_boosting": HistGradientBoostingClassifier(
                max_iter=100,
                class_weight="balanced",
                random_state=42,
            ),
        }

    def evaluate_model_spatial_cv(
        self,
        model_name: str,
        estimator: Any,
        X: pd.DataFrame,
        y: pd.Series,
        groups: np.ndarray,
        n_splits: int = 3,
    ) -> Dict[str, Any]:
        """
        Evaluate candidate using GroupKFold cross-validation across distinct corridors.
        """
        preprocessor = self.build_preprocessor()
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", estimator),
        ])

        unique_groups = len(np.unique(groups))
        effective_splits = min(n_splits, unique_groups)
        if effective_splits < 2:
            effective_splits = 2

        gkf = GroupKFold(n_splits=effective_splits)

        y_true_all: List[int] = []
        y_pred_all: List[int] = []
        y_prob_all: List[np.ndarray] = []
        present_classes = set(y.unique())

        for fold_idx, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups=groups)):
            X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
            y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]

            # Enforce spatial class coverage rule: no fold can lack class representation
            if len(set(y_tr.unique())) < len(present_classes) or len(set(y_te.unique())) < len(present_classes):
                raise InsufficientSpatialClassCoverageError(
                    f"INSUFFICIENT_SPATIAL_CLASS_COVERAGE: Fold {fold_idx} lacks representation for all classes. "
                    f"Corridor grouping cannot form valid stratified validation folds with current label distribution. "
                    f"Falling back to non-spatial random splits is strictly prohibited for spatial integrity."
                )

            pipe.fit(X_tr, y_tr)
            preds = pipe.predict(X_te)
            probs = pipe.predict_proba(X_te) if hasattr(pipe, "predict_proba") else None

            y_true_all.extend(y_te.tolist())
            y_pred_all.extend(preds.tolist())
            if probs is not None:
                y_prob_all.extend(probs)

        y_t = np.array(y_true_all)
        y_p = np.array(y_pred_all)

        macro_f1 = float(f1_score(y_t, y_p, average="macro", zero_division=0))
        bal_acc = float(balanced_accuracy_score(y_t, y_p))

        # Precision & Recall per class
        prec_per_class = precision_score(y_t, y_p, average=None, zero_division=0).tolist()
        rec_per_class = recall_score(y_t, y_p, average=None, zero_division=0).tolist()

        cm = confusion_matrix(y_t, y_p, labels=[0, 1, 2]).tolist()

        # False-eligible rate: True is INELIGIBLE (0), but predicted ELIGIBLE (2)
        true_ineligible_count = int(np.sum(y_t == 0))
        false_eligible_count = int(np.sum((y_t == 0) & (y_p == 2)))
        false_eligible_rate = float(false_eligible_count / max(1, true_ineligible_count))
        is_disqualified = false_eligible_rate > 0.05

        return {
            "model_name": model_name,
            "macro_f1": round(macro_f1, 4),
            "balanced_accuracy": round(bal_acc, 4),
            "per_class_precision": [round(p, 4) for p in prec_per_class],
            "per_class_recall": [round(r, 4) for r in rec_per_class],
            "confusion_matrix": cm,
            "false_eligible_rate": round(false_eligible_rate, 4),
            "cross_val_splits": effective_splits,
            "is_disqualified": is_disqualified,
            "disqualification_reason": "False-eligible rate exceeds 5.0% threshold" if is_disqualified else None,
        }

    def train_and_compare_candidates(self) -> Dict[str, Any]:
        """
        Execute full training run comparing all 4 candidates.
        Enforces minimum evidence gate; raises InsufficientLabelsError if not met.
        Enforces 5% maximum false-eligible safety disqualification rule.
        """
        X, y, groups = self.builder.build_training_matrix()

        candidates = self.get_candidate_models()
        evaluation_results: Dict[str, Any] = {}
        best_name = None
        best_score = -1.0

        for name, est in candidates.items():
            metrics = self.evaluate_model_spatial_cv(name, est, X, y, groups)
            evaluation_results[name] = metrics

            # Code rejection rule: Models with false_eligible_rate > 5% are disqualified
            if metrics["is_disqualified"]:
                continue

            # Safety-weighted selection: balanced_accuracy - 2 * false_eligible_rate
            selection_score = metrics["balanced_accuracy"] - (2.0 * metrics["false_eligible_rate"])
            if selection_score > best_score:
                best_score = selection_score
                best_name = name

        if best_name is None:
            raise ValueError(
                "MODEL_REJECTED_EXCESSIVE_FALSE_ELIGIBLE_RATE: All candidate architectures "
                "exceeded the 5.0% false-eligible safety limit."
            )

        best_estimator = candidates[best_name]

        # Fit final pipeline on all verified training data
        final_pipeline = Pipeline([
            ("preprocessor", self.build_preprocessor()),
            ("classifier", best_estimator),
        ])
        final_pipeline.fit(X, y)

        # Serialize model artifact
        version_tag = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        model_filename = f"suitability_model_{best_name}_{version_tag}.joblib"
        artifact_path = self.models_dir / model_filename
        joblib.dump(final_pipeline, artifact_path)

        # Compute SHA-256 integrity hash
        sha256 = hashlib.sha256(artifact_path.read_bytes()).hexdigest()

        # Newly trained model is EXPERIMENTAL; NEVER APPROVED_FOR_INFERENCE until promoted by senior reviewer
        metadata = {
            "model_version": version_tag,
            "model_architecture": best_name,
            "artifact_filename": model_filename,
            "artifact_sha256": sha256,
            "trained_at": _utc_now_iso(),
            "training_samples_count": len(y),
            "feature_schema_version": self.builder.feature_pipeline.FEATURE_SCHEMA_VERSION,
            "label_schema_version": "2.0.0",
            "approval_status": "EXPERIMENTAL",
            "validation_metrics": evaluation_results[best_name],
            "candidate_comparisons": evaluation_results,
        }

        meta_path = self.models_dir / "latest_model_metadata.json"
        meta_path.write_text(json.dumps(metadata, indent=2))

        return metadata
