"""
VanSetu GreenTech — Intervention Recommendation Explainer (Phase 6B).

Synthesizes evidence-grounded engineering explanations for intervention suitability.
Highlights supporting environmental drivers, limiting constraints, and missing inputs.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


class RecommendationExplainer:
    """Builds transparent, interpretable rationales for intervention predictions."""

    @classmethod
    def generate_explanation(
        cls,
        archetype: str,
        suitability_state: str,
        features: Dict[str, Any],
        hard_constraints: List[str],
        missing_warnings: List[str],
        probabilities: Optional[Dict[str, float]] = None,
        is_model_driven: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate structured explanation with positive drivers and limiting factors.
        """
        supporting_factors = []
        limiting_factors = list(hard_constraints)

        ndvi = features.get("ndvi_mean")
        lst = features.get("modis_lst_celsius")
        anom = features.get("thermal_anomaly_celsius")
        row_w = features.get("estimated_row_width_m")
        cpcb_dist = features.get("cpcb_distance_km")

        # Environmental drivers
        if anom is not None and anom > 1.0:
            supporting_factors.append(f"Elevated thermal stress: surface temperature anomaly of +{anom}°C above baseline.")
        if ndvi is not None and ndvi < 0.15:
            supporting_factors.append(f"Severe vegetative deficit: Sentinel-2 10m NDVI is {ndvi:.3f} (depleted canopy).")
        elif ndvi is not None and ndvi > 0.40 and archetype == "linear_street_trees":
            limiting_factors.append(f"Existing dense canopy (NDVI {ndvi:.3f}): additional tree planting has diminishing marginal thermal returns.")

        if row_w is not None and row_w >= 20.0:
            supporting_factors.append(f"Adequate corridor Right-of-Way: estimated width of {row_w}m supports standard planting verges.")

        if cpcb_dist is not None and cpcb_dist <= 3.0:
            supporting_factors.append(f"Proximate CAAQM station ({cpcb_dist} km) confirms elevated particulate background.")

        # Narrative synthesis
        if suitability_state in ("INELIGIBLE", "INELIGIBLE_HARD_CONSTRAINT"):
            narrative = f"Rejected for {archetype}: " + ("; ".join(limiting_factors) if limiting_factors else "Unsuitable site conditions.")
        elif suitability_state in ("CONDITIONAL", "CONDITIONAL_PENDING_INSPECTION"):
            narrative = f"Conditional suitability for {archetype}: Site has environmental justification, but requires clearance: " + ("; ".join(missing_warnings) if missing_warnings else "Engineering checks pending.")
        elif suitability_state in ("ELIGIBLE", "VERIFIED_ELIGIBLE"):
            narrative = f"Highly suitable for {archetype}: Supported by " + ("; ".join(supporting_factors[:3]) if supporting_factors else "favourable environmental conditions.")
        else:
            narrative = f"Unassessed: Insufficient verified field evidence to determine feasibility for {archetype}."

        return {
            "narrative_summary": narrative,
            "supporting_drivers": supporting_factors,
            "limiting_factors": limiting_factors,
            "missing_evidence_warnings": missing_warnings,
            "predicted_probabilities": probabilities,
            "decision_method": "APPROVED_ML_CLASSIFIER" if is_model_driven else "RULE_BASED_DETERMINISTIC_ENGINE",
        }
