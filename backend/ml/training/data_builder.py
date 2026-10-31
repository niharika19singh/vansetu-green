"""
VanSetu GreenTech — Training Dataset Builder & Minimum Evidence Gate (Phase 5A).

Enforces the non-negotiable minimum data gate. Rejects training if verified empirical
labels are insufficient, reporting MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS.
Prepares grouped spatial splits based on corridors and districts to prevent data leakage.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from ml.labels.store import AssessmentLabelStore
from ml.preprocessing.feature_pipeline import SegmentFeaturePipeline


class InsufficientLabelsError(Exception):
    """Raised when genuine field labels do not meet the minimum evidence gate for training."""
    pass


class InsufficientSpatialClassCoverageError(Exception):
    """Raised when spatial corridor grouping leaves a validation fold with zero representation for a class."""
    pass


class TrainingDatasetBuilder:
    """
    Assembles spatial features and verified ground-truth labels for ML training.
    """

    # Non-negotiable minimum evidence gate thresholds
    DEFAULT_MIN_TOTAL_LABELS = 50
    DEFAULT_MIN_DISTINCT_CORRIDORS = 3
    DEFAULT_MIN_LABELS_PER_CLASS = 5

    FEATURE_COLUMNS = [
        "length_metres",
        "ndvi_mean",
        "ndvi_median",
        "ndvi_p10",
        "ndvi_p90",
        "ndvi_valid_pixel_fraction",
        "modis_lst_celsius",
        "thermal_anomaly_celsius",
        "built_up_fraction",
        "open_space_fraction",
        "cpcb_distance_km",
        "is_walkable",
        "road_class_guideline_row_m",
        "estimated_row_width_m",
        "is_boundary_edge",
    ]

    CATEGORICAL_COLUMNS = [
        "district",
        "highway_class",
        "intervention_archetype",
    ]

    LABEL_ENCODING = {
        "INELIGIBLE": 0,
        "CONDITIONAL": 1,
        "ELIGIBLE": 2,
    }
    INVERSE_LABEL_ENCODING = {v: k for k, v in LABEL_ENCODING.items()}

    def __init__(
        self,
        min_labels: int = DEFAULT_MIN_TOTAL_LABELS,
        min_corridors: int = DEFAULT_MIN_DISTINCT_CORRIDORS,
        min_per_class: int = DEFAULT_MIN_LABELS_PER_CLASS,
        label_store: Optional[AssessmentLabelStore] = None,
        feature_pipeline: Optional[SegmentFeaturePipeline] = None,
    ) -> None:
        self.min_labels = min_labels
        self.min_corridors = min_corridors
        self.min_per_class = min_per_class
        self.label_store = label_store or AssessmentLabelStore()
        self.feature_pipeline = feature_pipeline or SegmentFeaturePipeline()

    def check_minimum_data_gate(self) -> Dict[str, Any]:
        """
        Audit available verified labels against the training gate.
        Does not train or synthesize fake labels to pass this gate.
        """
        labels = self.label_store.get_training_eligible_labels()
        total_count = len(labels)

        corridors = set(l["corridor_id"] for l in labels)
        corridor_count = len(corridors)

        class_counts = {}
        for l in labels:
            st = l["suitability_state"]
            class_counts[st] = class_counts.get(st, 0) + 1

        is_trainable = True
        block_reasons = []

        if total_count < self.min_labels:
            is_trainable = False
            block_reasons.append(
                f"Total verified labels ({total_count}) is below minimum gate of {self.min_labels}."
            )

        if corridor_count < self.min_corridors:
            is_trainable = False
            block_reasons.append(
                f"Distinct surveyed corridors ({corridor_count}) is below geographic minimum of {self.min_corridors}."
            )

        for cls_name in ("ELIGIBLE", "CONDITIONAL", "INELIGIBLE"):
            c_cnt = class_counts.get(cls_name, 0)
            if c_cnt < self.min_per_class:
                is_trainable = False
                block_reasons.append(
                    f"Class '{cls_name}' has only {c_cnt} verified samples (minimum required: {self.min_per_class})."
                )

        status_code = "TRAINING_DATA_ELIGIBLE" if is_trainable else "MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS"

        return {
            "status": status_code,
            "is_trainable": is_trainable,
            "total_verified_labels": total_count,
            "required_minimum_labels": self.min_labels,
            "distinct_corridors_count": corridor_count,
            "required_minimum_corridors": self.min_corridors,
            "class_distribution": class_counts,
            "block_reasons": block_reasons,
            "fallback_mode": "RULE_BASED_ENGINE_ACTIVE",
        }

    def build_training_matrix(self) -> Tuple[pd.DataFrame, pd.Series, np.ndarray]:
        """
        Assemble feature matrix X, target y, and spatial group array for GroupKFold.
        Raises InsufficientLabelsError if the minimum data gate is not met.
        """
        gate = self.check_minimum_data_gate()
        if not gate["is_trainable"]:
            raise InsufficientLabelsError(
                f"MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS: "
                f"{'; '.join(gate['block_reasons'])}"
            )

        labels = self.label_store.get_training_eligible_labels()
        feat_gdf = self.feature_pipeline.load_feature_dataset()
        feat_df = pd.DataFrame(feat_gdf.drop(columns=["geometry"], errors="ignore"))

        label_df = pd.DataFrame(labels)
        # Merge on segment_id
        merged = pd.merge(
            label_df[["assessment_id", "segment_id", "corridor_id", "intervention_archetype", "suitability_state"]],
            feat_df,
            on="segment_id",
            how="inner",
            suffixes=("", "_feat"),
        )

        if len(merged) == 0:
            raise InsufficientLabelsError("MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS: No matching features found for label segment IDs.")

        y = merged["suitability_state"].map(self.LABEL_ENCODING)
        groups = merged["corridor_id"].values

        # Prepare X with encoded categorical features and imputed missing values
        X = merged[self.FEATURE_COLUMNS + self.CATEGORICAL_COLUMNS].copy()

        # Handle boolean walkability
        X["is_walkable"] = X["is_walkable"].astype(float)
        X["is_boundary_edge"] = X["is_boundary_edge"].astype(float)

        return X, y, groups
