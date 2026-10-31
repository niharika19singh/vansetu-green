"""
VanSetu GreenTech — Deterministic Hard Engineering Constraint Layer (Phase 6A).

Enforces physical safety constraints that an ML model can NEVER override.
A model prediction cannot turn a site with verified underground utility conflicts
or inadequate ROW into an ELIGIBLE intervention site.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class ConstraintCheckResult:
    has_hard_constraint: bool
    forced_state: Optional[str] = None
    constraint_reasons: List[str] = field(default_factory=list)
    missing_evidence_warnings: List[str] = field(default_factory=list)


class HardConstraintValidator:
    """
    Evaluates physical, engineering, and regulatory constraints before ML output is accepted.
    """

    MIN_ROW_WIDTH_METRES = {
        "linear_street_trees": 2.5,        # Minimum sidewalk/verge width for healthy tree-pit
        "roadside_bioswales": 2.0,         # Minimum swale channel width
        "architectural_shade_structures": 1.8, # Minimum clear pedestrian envelope
        "high_albedo_cool_pavements": 1.2,
        "living_green_walls": 1.0,
    }

    DEEP_EXCAVATION_ARCHETYPES = {"linear_street_trees", "roadside_bioswales"}

    @classmethod
    def evaluate_constraints(
        cls,
        archetype: str,
        segment_features: Dict[str, Any],
        known_site_restrictions: Optional[List[Dict[str, Any]]] = None,
    ) -> ConstraintCheckResult:
        """
        Evaluate hard constraints for a segment-intervention pair.
        """
        reasons = []
        warnings = []
        forced_state = None

        # 1. Subsurface utility conflict check (GPR / Municipal records)
        utility_conflicts = []
        if known_site_restrictions:
            for r in known_site_restrictions:
                excluded = r.get("excluded_interventions", [])
                if archetype in excluded or "all" in excluded:
                    utility_conflicts.append(r.get("reason", "Verified underground utility conflict on site."))

        if archetype in cls.DEEP_EXCAVATION_ARCHETYPES and utility_conflicts:
            reasons.extend(utility_conflicts)
            forced_state = "INELIGIBLE"

        # 2. GPR survey missingness check
        gpr_status = segment_features.get("gpr_utility_survey_status")
        if gpr_status in ("FIELD_GPR_REQUIRED", "UNVERIFIED") and archetype in cls.DEEP_EXCAVATION_ARCHETYPES:
            warnings.append(
                "Subsurface GPR clearance pending: feasibility conditional upon ground-penetrating radar scan."
            )
            if forced_state is None:
                forced_state = "CONDITIONAL"

        # 3. ROW and clear sidewalk width check
        row_w = segment_features.get("estimated_row_width_m")
        min_required = cls.MIN_ROW_WIDTH_METRES.get(archetype, 1.5)
        if row_w is not None and row_w < min_required:
            reasons.append(
                f"Inadequate Right-of-Way width: available {row_w}m is below minimum {min_required}m required for {archetype}."
            )
            forced_state = "INELIGIBLE"

        # 4. Highway walkability and pedestrian safety
        is_walkable = segment_features.get("is_walkable")
        hw_class = str(segment_features.get("highway_class", "")).lower()
        if hw_class in ("trunk", "motorway") and archetype in ("architectural_shade_structures", "living_green_walls"):
            reasons.append(f"Pedestrian installations prohibited on high-speed {hw_class} corridors without segregated access.")
            forced_state = "INELIGIBLE"

        if is_walkable is False and archetype == "architectural_shade_structures":
            reasons.append("Pedestrian shade structures require verified pedestrian footway access.")
            forced_state = "INELIGIBLE"

        # 5. Cool Pavements structural verification check
        if archetype == "high_albedo_cool_pavements":
            warnings.append(
                "High-albedo coating requires field verification of asphalt pavement structural integrity before application."
            )
            if forced_state is None:
                forced_state = "CONDITIONAL"

        has_constraint = bool(reasons or (forced_state == "INELIGIBLE"))
        return ConstraintCheckResult(
            has_hard_constraint=has_constraint,
            forced_state=forced_state,
            constraint_reasons=reasons,
            missing_evidence_warnings=warnings,
        )
