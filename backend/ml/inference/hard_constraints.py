"""
VanSetu GreenTech — Deterministic Hard Engineering Constraint Layer (Phase 6A).

Enforces physical safety constraints that an ML model can NEVER override.
A model prediction cannot turn a site with verified underground utility conflicts
or unmeasured guideline ROW into a VERIFIED_ELIGIBLE intervention site.

Defines the four canonical physical safety states:
- VERIFIED_ELIGIBLE
- CONDITIONAL_PENDING_INSPECTION
- INELIGIBLE_HARD_CONSTRAINT
- UNASSESSED_INSUFFICIENT_EVIDENCE
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class ConstraintState(str, Enum):
    VERIFIED_ELIGIBLE = "VERIFIED_ELIGIBLE"
    CONDITIONAL_PENDING_INSPECTION = "CONDITIONAL_PENDING_INSPECTION"
    INELIGIBLE_HARD_CONSTRAINT = "INELIGIBLE_HARD_CONSTRAINT"
    UNASSESSED_INSUFFICIENT_EVIDENCE = "UNASSESSED_INSUFFICIENT_EVIDENCE"


@dataclass
class ConstraintCheckResult:
    has_hard_constraint: bool
    forced_state: Optional[str] = None
    constraint_state: Optional[ConstraintState] = None
    constraint_reasons: List[str] = field(default_factory=list)
    missing_evidence_warnings: List[str] = field(default_factory=list)

    @property
    def is_ineligible(self) -> bool:
        return self.forced_state in (
            "INELIGIBLE",
            ConstraintState.INELIGIBLE_HARD_CONSTRAINT.value,
        )

    @property
    def is_conditional(self) -> bool:
        return self.forced_state in (
            "CONDITIONAL",
            ConstraintState.CONDITIONAL_PENDING_INSPECTION.value,
        )


class HardConstraintValidator:
    """
    Evaluates physical, engineering, and regulatory constraints before ML output is accepted.
    Strictly separates guideline Right-of-Way estimates from field-verified cross-sections.
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
        Returns explicit ConstraintState and backward-compatible forced_state string.
        """
        reasons: List[str] = []
        warnings: List[str] = []
        forced_state: Optional[str] = None

        # 1. Subsurface utility conflict check (GPR / Municipal records)
        utility_conflicts = []
        if known_site_restrictions:
            for r in known_site_restrictions:
                excluded = r.get("excluded_interventions", [])
                if archetype in excluded or "all" in excluded:
                    utility_conflicts.append(r.get("reason", "Verified underground utility conflict on site."))

        # Direct segment feature check for verified subsurface conflict
        if segment_features.get("subsurface_utility_conflict_gpr") is True:
            utility_conflicts.append("Ground-penetrating radar confirmed active high-voltage/water main utility conflict in excavation zone.")

        if archetype in cls.DEEP_EXCAVATION_ARCHETYPES and utility_conflicts:
            reasons.extend(utility_conflicts)
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT

        # 2. GPR survey verification check for deep excavations
        gpr_status = segment_features.get("gpr_utility_survey_status")
        if archetype in cls.DEEP_EXCAVATION_ARCHETYPES:
            if gpr_status != "VERIFIED_CLEAR":
                warnings.append(
                    "Subsurface GPR clearance pending: feasibility conditional upon ground-penetrating radar scan."
                )
                if forced_state is None:
                    forced_state = "CONDITIONAL"
                    canonical_state = ConstraintState.CONDITIONAL_PENDING_INSPECTION

        # 3. ROW and clear sidewalk width check (Guideline vs Measured)
        surveyed_row = segment_features.get("surveyed_row_width_m")
        clear_ped = segment_features.get("clear_pedestrian_width_m")
        verge_m = segment_features.get("available_planting_verge_m")
        guideline_row = segment_features.get("road_class_guideline_row_m") or segment_features.get("estimated_row_width_m")
        min_required = cls.MIN_ROW_WIDTH_METRES.get(archetype, 1.5)

        # Physical measurements ONLY can establish physical ineligibility
        if surveyed_row is not None and surveyed_row < min_required:
            reasons.append(
                f"Inadequate surveyed Right-of-Way width: measured {surveyed_row}m is below minimum {min_required}m required for {archetype}."
            )
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT
        elif clear_ped is not None and clear_ped < 1.5 and archetype in ("linear_street_trees", "architectural_shade_structures", "living_green_walls"):
            reasons.append(
                f"Inadequate measured clear pedestrian footway: {clear_ped}m is below IRC minimum 1.5m unobstructed walkway requirement."
            )
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT
        elif verge_m is not None and verge_m < 1.2 and archetype == "linear_street_trees":
            reasons.append(
                f"Inadequate measured planting verge: {verge_m}m is below minimum 1.2m soil pit width required for street trees."
            )
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT
        elif surveyed_row is None:
            # Guideline-only width NEVER establishes physical ineligibility (INELIGIBLE)
            if guideline_row is not None:
                if guideline_row < min_required:
                    warnings.append(
                        f"Physical cross-section required: Road-class guideline width ({guideline_row}m) is indicative only and cannot establish physical ineligibility without field measurement."
                    )
                else:
                    warnings.append(
                        "Field survey required: Road width is based on road-class guideline, not measured cross-section."
                    )
                if forced_state is None:
                    forced_state = "CONDITIONAL"
                    canonical_state = ConstraintState.CONDITIONAL_PENDING_INSPECTION
            else:
                warnings.append("Right-of-Way width unassessed: physical cross-section data unavailable.")
                if forced_state is None:
                    forced_state = "UNASSESSED"
                    canonical_state = ConstraintState.UNASSESSED_INSUFFICIENT_EVIDENCE

        # 4. Highway walkability and pedestrian safety
        is_walkable = segment_features.get("is_walkable")
        hw_class = str(segment_features.get("highway_class", "")).lower()
        if hw_class in ("trunk", "motorway") and archetype in ("architectural_shade_structures", "living_green_walls"):
            reasons.append(f"Pedestrian installations prohibited on high-speed {hw_class} corridors without segregated access.")
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT

        if is_walkable is False and archetype == "architectural_shade_structures":
            reasons.append("Pedestrian shade structures require verified pedestrian footway access.")
            forced_state = "INELIGIBLE"
            canonical_state = ConstraintState.INELIGIBLE_HARD_CONSTRAINT

        # 5. Cool Pavements structural verification check
        if archetype == "high_albedo_cool_pavements":
            warnings.append(
                "High-albedo coating requires field verification of asphalt pavement structural integrity before application."
            )
            if forced_state is None:
                forced_state = "CONDITIONAL"
                canonical_state = ConstraintState.CONDITIONAL_PENDING_INSPECTION

        has_constraint = bool(reasons or (forced_state == "INELIGIBLE"))
        if forced_state is None:
            canonical_state = ConstraintState.VERIFIED_ELIGIBLE

        return ConstraintCheckResult(
            has_hard_constraint=has_constraint,
            forced_state=forced_state,
            constraint_state=canonical_state,
            constraint_reasons=reasons,
            missing_evidence_warnings=warnings,
        )
