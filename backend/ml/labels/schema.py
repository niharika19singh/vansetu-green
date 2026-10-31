"""
VanSetu GreenTech — Human-Verified Suitability Label Schema (Phase 4A & Remediation).

Defines the 4-state suitability ontology, 5 GreenTech intervention classes,
evidence classification types, evidence document lifecycle, and strict server-side reviewer provenance.
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


class EvidenceVerificationStatus(str, Enum):
    EVIDENCE_NOT_PROVIDED = "EVIDENCE_NOT_PROVIDED"
    EVIDENCE_UPLOADED_UNVERIFIED = "EVIDENCE_UPLOADED_UNVERIFIED"
    EVIDENCE_PENDING_REVIEW = "EVIDENCE_PENDING_REVIEW"
    EVIDENCE_VERIFIED = "EVIDENCE_VERIFIED"
    EVIDENCE_REJECTED = "EVIDENCE_REJECTED"


class EvidenceDocumentType(str, Enum):
    GPR_UTILITY_SURVEY = "GPR_UTILITY_SURVEY"
    MUNICIPAL_WORK_ORDER = "MUNICIPAL_WORK_ORDER"
    ENGINEERING_CROSS_SECTION = "ENGINEERING_CROSS_SECTION"
    TREE_CENSUS_REGISTER = "TREE_CENSUS_REGISTER"
    HERITAGE_RESTRICTION_CIRCULAR = "HERITAGE_RESTRICTION_CIRCULAR"
    UNVERIFIED_TEXTUAL_NOTE = "UNVERIFIED_TEXTUAL_NOTE"


class ReviewActionType(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    CORRECT = "CORRECT"


class EvidenceDocumentMetadata(BaseModel):
    """
    Metadata for uploaded and verified empirical evidence documents (e.g. GPR scans, PWD work orders).
    Internal model including server storage paths.
    """
    evidence_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    sha256_checksum: str
    document_type: EvidenceDocumentType
    uploaded_by_user_id: str
    uploaded_by_username: str
    uploaded_at: str
    verification_status: EvidenceVerificationStatus = EvidenceVerificationStatus.EVIDENCE_UPLOADED_UNVERIFIED
    verified_by_user_id: Optional[str] = None
    verified_at: Optional[str] = None
    verification_notes: Optional[str] = None
    storage_path: str
    storage_backend: Optional[str] = "LOCAL"
    object_key: Optional[str] = None


class EvidenceDocumentPublic(BaseModel):
    """
    Sanitized public-facing metadata for API responses.
    Strictly omits internal filesystem storage paths.
    """
    evidence_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    sha256_checksum: str
    document_type: EvidenceDocumentType
    uploaded_by_user_id: str
    uploaded_by_username: str
    uploaded_at: str
    verification_status: EvidenceVerificationStatus = EvidenceVerificationStatus.EVIDENCE_UPLOADED_UNVERIFIED
    verified_by_user_id: Optional[str] = None
    verified_at: Optional[str] = None
    verification_notes: Optional[str] = None
    storage_backend: Optional[str] = "LOCAL"
    is_available: bool = True


class EvidenceVerificationHistoryItem(BaseModel):
    """
    Immutable audit history record for physical evidence verification lifecycle decisions.
    """
    history_id: str
    evidence_id: str
    previous_status: Optional[str] = None
    new_status: str
    reviewer_id: str
    reviewer_role: str
    timestamp: str
    decision: str
    verification_notes: Optional[str] = None
    sha256_checksum: str


class SiteAssessmentSubmission(BaseModel):
    """
    Client submission model for field assessments.
    Reviewer identity and role are server-injected via authenticated session.
    """
    segment_id: str = Field(description="Stable road segment ID, e.g. 'C-14-S001'.")
    corridor_id: str = Field(description="Parent corridor code, e.g. 'C-14'.")
    intervention_archetype: InterventionArchetype
    suitability_state: SuitabilityState
    evidence_reference: str = Field(min_length=3, description="Official ground-survey reference, GPR report, or work order.")
    evidence_document_type: EvidenceDocumentType = Field(
        default=EvidenceDocumentType.GPR_UTILITY_SURVEY,
        description="Classification of supporting physical evidence.",
    )
    evidence_id: Optional[str] = Field(
        default=None,
        description="Optional unique identifier of uploaded supporting document.",
    )
    survey_reference: Optional[str] = None
    engineering_constraints: List[str] = Field(default_factory=list, description="Subsurface utilities, ROW bottlenecks, or structural limits.")
    reviewer_notes: Optional[str] = None
    # Optional client-supplied hints; SERVER OVERWRITES WITH AUTHENTICATED USER
    reviewer_id: Optional[str] = None
    reviewer_role: Optional[str] = None
    assessment_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp of field inspection."
    )


class AssessmentReviewAction(BaseModel):
    """
    Server action model for reviewing, approving, or correcting an assessment.
    """
    assessment_id: str
    action: ReviewActionType = Field(description="APPROVE, REJECT, or CORRECT.")
    corrected_suitability_state: Optional[SuitabilityState] = None
    reviewer_note: str = Field(min_length=5, description="Mandatory engineering justification.")
    # Optional client hint; SERVER OVERWRITES WITH AUTHENTICATED REVIEWER ID
    reviewer_id: Optional[str] = None


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
    evidence_document_type: str
    evidence_id: Optional[str] = None
    evidence_verification_status: str = EvidenceVerificationStatus.EVIDENCE_NOT_PROVIDED.value
    is_evidence_verified: bool
    survey_reference: Optional[str] = None
    engineering_constraints: List[str] = Field(default_factory=list)
    reviewer_notes: Optional[str] = None
    created_at: str
    updated_at: str
    schema_version: str = "2.2.0"
    audit_history_count: int = 1
