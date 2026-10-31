"""
VanSetu GreenTech — Human-Verified Suitability Label Schema (Phase 4A).

Defines the 4-state suitability ontology, 5 GreenTech intervention classes,
and strict human reviewer provenance fields for municipal field surveys.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SuitabilityState(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    CONDITIONAL = "CONDITIONAL"
    INELIGIBLE = "INELIGIBLE"
    UNASSESSED = "UNASSESSED"


class InterventionArchetype(str, Enum):
    LINEAR_STREET_TREES = "linear_street_trees"
    ROADSIDE_BIOSWALES = "roadside_bioswales"
    ARCHITECTURAL_SHADE_STRUCTURES = "architectural_shade_structures"
    HIGH_ALBEDO_COOL_PAVEMENTS = "high_albedo_cool_pavements"
    LIVING_GREEN_WALLS = "living_green_walls"


class ReviewStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"


class SiteAssessmentSubmission(BaseModel):
    segment_id: str = Field(description="Stable road segment ID, e.g. 'C-14-S001'.")
    corridor_id: str = Field(description="Parent corridor code, e.g. 'C-14'.")
    intervention_archetype: InterventionArchetype
    suitability_state: SuitabilityState
    reviewer_id: str = Field(min_length=3, description="Authenticated municipal field engineer or planner ID.")
    reviewer_role: str = Field(default="Municipal Field Engineer", description="Authorised role (e.g. Field Engineer, Urban Forester).")
    evidence_reference: str = Field(min_length=3, description="Official ground-survey reference, GPR report, or work order.")
    survey_reference: Optional[str] = None
    engineering_constraints: List[str] = Field(default_factory=list, description="Subsurface utilities, ROW bottlenecks, or structural limits.")
    reviewer_notes: Optional[str] = None
    assessment_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp of field inspection."
    )


class AssessmentReviewAction(BaseModel):
    assessment_id: str
    reviewer_id: str
    action: str = Field(description="APPROVE, REJECT, or CORRECT.")
    corrected_suitability_state: Optional[SuitabilityState] = None
    reviewer_note: str = Field(min_length=3, description="Justification for approval, correction, or rejection.")


class SiteAssessmentRecord(BaseModel):
    assessment_id: str
    segment_id: str
    corridor_id: str
    intervention_archetype: str
    suitability_state: str
    review_status: str
    reviewer_id: str
    reviewer_role: str
    evidence_reference: str
    survey_reference: Optional[str] = None
    engineering_constraints: List[str] = Field(default_factory=list)
    reviewer_notes: Optional[str] = None
    created_at: str
    updated_at: str
    schema_version: str = "2.0.0"
    audit_history_count: int = 1
