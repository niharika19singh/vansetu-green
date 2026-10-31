"""
VanSetu GreenTech — Intervention Intelligence Predictor & Ranker (Phase 6C).

Coordinates model inference, hard constraint verification, rule-based fallback,
and multi-criteria ranking across the 5 GreenTech climate intervention classes.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import pandas as pd

from ml.inference.explanation import RecommendationExplainer
from ml.inference.hard_constraints import HardConstraintValidator
from ml.labels.schema import InterventionArchetype
from ml.preprocessing.feature_pipeline import SegmentFeaturePipeline
from ml.training.registry import ModelRegistry


# Indicative reference rates from CPWD DSR 2023 & Delhi Urban Greening Guidelines
INTERVENTION_METADATA = {
    "linear_street_trees": {
        "name": "Linear Street Trees",
        "primary_objective": "heat_resilience",
        "cooling_potential_celsius": "1.5°C to 2.8°C (localized canopy shade)",
        "capex_per_km_lakhs": 7.20,
        "annual_opex_per_km_lakhs": 0.90,
    },
    "roadside_bioswales": {
        "name": "Roadside Bioswales",
        "primary_objective": "waterlogging_mitigation",
        "cooling_potential_celsius": "0.8°C to 1.4°C (evapotranspiration)",
        "capex_per_km_lakhs": 6.50,
        "annual_opex_per_km_lakhs": 0.75,
    },
    "architectural_shade_structures": {
        "name": "Architectural Shade Structures",
        "primary_objective": "pedestrian_shade",
        "cooling_potential_celsius": "2.0°C to 3.5°C (direct radiation interception)",
        "capex_per_km_lakhs": 9.80,
        "annual_opex_per_km_lakhs": 0.40,
    },
    "high_albedo_cool_pavements": {
        "name": "High-Albedo Cool Pavements",
        "primary_objective": "heat_resilience",
        "cooling_potential_celsius": "1.2°C to 2.2°C (surface albedo increase >= 0.40)",
        "capex_per_km_lakhs": 4.50,
        "annual_opex_per_km_lakhs": 0.35,
    },
    "living_green_walls": {
        "name": "Living Green Walls",
        "primary_objective": "air_quality",
        "cooling_potential_celsius": "1.0°C to 1.8°C (vertical façade shading)",
        "capex_per_km_lakhs": 12.00,
        "annual_opex_per_km_lakhs": 1.50,
    },
}


class InterventionIntelligencePredictor:
    """
    Evaluates segment suitability, applies safety constraints, and explains rankings.
    """

    ALL_ARCHETYPES = [
        "linear_street_trees",
        "roadside_bioswales",
        "architectural_shade_structures",
        "high_albedo_cool_pavements",
        "living_green_walls",
    ]

    def __init__(
        self,
        registry: Optional[ModelRegistry] = None,
        feature_pipeline: Optional[SegmentFeaturePipeline] = None,
    ) -> None:
        self.registry = registry or ModelRegistry()
        self.feature_pipeline = feature_pipeline or SegmentFeaturePipeline()
        self._cached_model = None
        self._cached_version = None

    def _get_active_model(self) -> Optional[Any]:
        meta = self.registry.get_latest_approved_model_metadata()
        if not meta:
            return None

        ver = meta["model_version"]
        if self._cached_version == ver and self._cached_model is not None:
            return self._cached_model

        fn = meta.get("artifact_filename")
        if not fn:
            return None

        path = self.registry.models_dir / fn
        if path.exists():
            try:
                self._cached_model = joblib.load(path)
                self._cached_version = ver
                return self._cached_model
            except Exception:
                return None
        return None

    def evaluate_segment_suitability(
        self,
        segment_id: str,
        policy_objective: str = "heat_resilience",
        budget_lakh: Optional[float] = None,
        site_restrictions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate and rank all 5 GreenTech interventions for a specific road segment.
        """
        feat_df = self.feature_pipeline.load_feature_dataset()
        seg_matches = feat_df[feat_df["segment_id"] == segment_id]
        if seg_matches.empty:
            raise KeyError(f"Segment '{segment_id}' not found in Delhi road feature dataset.")

        seg_row = seg_matches.iloc[0].to_dict()
        seg_features = {k: v for k, v in seg_row.items() if k != "geometry"}

        model = self._get_active_model()
        meta = self.registry.get_latest_approved_model_metadata()
        is_model_driven = model is not None

        candidates_eval = []

        for arch in self.ALL_ARCHETYPES:
            meta_info = INTERVENTION_METADATA.get(arch, {})

            # 1. Hard physical & engineering constraints
            constraint_res = HardConstraintValidator.evaluate_constraints(
                archetype=arch,
                segment_features=seg_features,
                known_site_restrictions=site_restrictions,
            )

            # 2. Prediction or Rule-based fallback
            probs = None
            if is_model_driven:
                # Prepare single-row DataFrame for pipeline
                row_copy = dict(seg_features)
                row_copy["intervention_archetype"] = arch
                row_df = pd.DataFrame([row_copy])
                try:
                    pred_probs = model.predict_proba(row_df)[0]
                    # classes: 0: INELIGIBLE, 1: CONDITIONAL, 2: ELIGIBLE
                    probs = {
                        "ineligible": round(float(pred_probs[0]), 3),
                        "conditional": round(float(pred_probs[1]), 3),
                        "eligible": round(float(pred_probs[2]), 3),
                    }
                    pred_idx = int(model.predict(row_df)[0])
                    raw_state = {0: "INELIGIBLE", 1: "CONDITIONAL", 2: "ELIGIBLE"}.get(pred_idx, "CONDITIONAL")
                except Exception:
                    raw_state = self._rule_based_suitability(arch, seg_features)
            else:
                raw_state = self._rule_based_suitability(arch, seg_features)

            # 3. SAFETY RULE: Hard constraint strictly overrides prediction
            if constraint_res.forced_state:
                final_state = constraint_res.forced_state
            else:
                final_state = raw_state

            # 4. Generate transparent rationale
            explanation = RecommendationExplainer.generate_explanation(
                archetype=arch,
                suitability_state=final_state,
                features=seg_features,
                hard_constraints=constraint_res.constraint_reasons,
                missing_warnings=constraint_res.missing_evidence_warnings,
                probabilities=probs,
                is_model_driven=is_model_driven,
            )

            # Compute rank score based on state + policy objective alignment
            score = self._compute_ranking_score(
                archetype=arch,
                state=final_state,
                policy_objective=policy_objective,
                features=seg_features,
                probabilities=probs,
            )

            candidates_eval.append({
                "archetype": arch,
                "name": meta_info.get("name", arch),
                "suitability_state": final_state,
                "ranking_score": round(score, 3),
                "primary_objective": meta_info.get("primary_objective"),
                "cooling_potential": meta_info.get("cooling_potential_celsius"),
                "indicative_capex_lakhs": meta_info.get("capex_per_km_lakhs"),
                "annual_opex_lakhs": meta_info.get("annual_opex_per_km_lakhs"),
                "probabilities": probs,
                "hard_constraints": constraint_res.constraint_reasons,
                "missing_evidence_warnings": constraint_res.missing_evidence_warnings,
                "explanation": explanation,
            })

        # Rank candidates descending by score
        candidates_eval.sort(key=lambda x: x["ranking_score"], reverse=True)

        return {
            "segment_id": segment_id,
            "corridor_id": seg_features.get("corridor_id"),
            "corridor_code": seg_features.get("corridor_code"),
            "corridor_name": seg_features.get("corridor_name"),
            "district": seg_features.get("district"),
            "policy_objective": policy_objective,
            "decision_engine": "APPROVED_ML_CLASSIFIER" if is_model_driven else "DETERMINISTIC_RULE_BASED_ENGINE",
            "model_version": meta.get("model_version") if meta else None,
            "model_status": "APPROVED_FOR_INFERENCE" if is_model_driven else "FALLBACK_RULE_BASED_ACTIVE",
            "environmental_features": {
                "ndvi_mean": seg_features.get("ndvi_mean"),
                "modis_lst_celsius": seg_features.get("modis_lst_celsius"),
                "thermal_anomaly_celsius": seg_features.get("thermal_anomaly_celsius"),
                "built_up_fraction": seg_features.get("built_up_fraction"),
                "cpcb_distance_km": seg_features.get("cpcb_distance_km"),
                "nearest_cpcb_station": seg_features.get("nearest_cpcb_station_name"),
                "estimated_row_width_m": seg_features.get("estimated_row_width_m"),
                "is_walkable": seg_features.get("is_walkable"),
            },
            "ranked_recommendations": candidates_eval,
            "outcome_model_status": "OUTCOME_LEARNING_PIPELINE_COLLECTING_EMPIRICAL_BASELINES",
        }

    def _rule_based_suitability(self, archetype: str, feats: Dict[str, Any]) -> str:
        """Deterministic empirical baseline engine used when no ML model has been approved."""
        ndvi = feats.get("ndvi_mean")
        anom = feats.get("thermal_anomaly_celsius") or 0.0
        row_w = feats.get("estimated_row_width_m") or 15.0
        is_walkable = feats.get("is_walkable", True)

        if archetype == "linear_street_trees":
            if row_w >= 20.0 and (ndvi is None or ndvi < 0.25):
                return "ELIGIBLE"
            elif row_w >= 14.0:
                return "CONDITIONAL"
            return "INELIGIBLE"

        elif archetype == "roadside_bioswales":
            if row_w >= 18.0:
                return "CONDITIONAL"  # Requires infiltration testing
            return "INELIGIBLE"

        elif archetype == "architectural_shade_structures":
            if is_walkable and anom >= 1.0:
                return "ELIGIBLE"
            return "CONDITIONAL"

        elif archetype == "high_albedo_cool_pavements":
            if anom >= 1.5:
                return "CONDITIONAL"  # Requires pavement integrity survey
            return "INELIGIBLE"

        elif archetype == "living_green_walls":
            return "CONDITIONAL"  # Requires structural inspection

        return "CONDITIONAL"

    def _compute_ranking_score(
        self,
        archetype: str,
        state: str,
        policy_objective: str,
        features: Dict[str, Any],
        probabilities: Optional[Dict[str, float]],
    ) -> float:
        """Compute relative prioritization score (0 to 100) based on suitability & objective."""
        state_multiplier = {"ELIGIBLE": 1.0, "CONDITIONAL": 0.5, "INELIGIBLE": 0.0}.get(state, 0.2)
        if state_multiplier == 0.0:
            return 0.0

        base_score = 60.0
        if probabilities:
            base_score = probabilities.get("eligible", 0.5) * 80.0

        anom = features.get("thermal_anomaly_celsius") or 0.0
        ndvi = features.get("ndvi_mean") or 0.2

        if policy_objective == "heat_resilience":
            if archetype in ("linear_street_trees", "architectural_shade_structures", "high_albedo_cool_pavements"):
                base_score += min(20.0, max(0.0, anom * 8.0))
        elif policy_objective == "waterlogging_mitigation":
            if archetype == "roadside_bioswales":
                base_score += 25.0
        elif policy_objective == "pedestrian_shade":
            if archetype in ("architectural_shade_structures", "linear_street_trees"):
                base_score += 20.0
        elif policy_objective == "air_quality":
            if archetype in ("linear_street_trees", "living_green_walls"):
                base_score += 20.0

        return float(base_score * state_multiplier)
