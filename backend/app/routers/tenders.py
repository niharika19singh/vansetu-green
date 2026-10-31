"""
VanSetu GreenTech — Government Tender & Corridor Allocation Router.

Exposes:
- GET /api/tenders: List open/awarded tenders with RBAC scoping.
- POST /api/tenders: Create tender (Govt Admin only, enforces corridor exclusivity).
- GET /api/tenders/{tender_id}: Tender details and confidential proposal isolation.
- POST /api/tenders/{tender_id}/proposals: Submit competitive proposal (Pro only).
- POST /api/tenders/{tender_id}/award: Transactional tender award & allocation (Govt Admin only, 409 on conflict).
- GET /api/corridors/{corridor_id}/availability: Definitive corridor availability state.
- GET /api/admin/corridor-assignments: View all active/historical corridor allocations (Govt Admin only).
- POST /api/admin/corridor-assignments: Direct administrative assignment (Govt Admin only).
- GET /api/admin/professionals: List registered professional firms.
- POST /api/admin/professionals/verify: Verify/suspend a firm accreditation.
- GET /api/admin/audit-logs: Administrative audit history.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.tender_service import get_tender_service
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    ReviewerRole,
    get_current_user,
    get_optional_current_user,
    require_permission,
)

logger = logging.getLogger("vansetu.routers.tenders")

router = APIRouter(prefix="/api", tags=["Government Tenders & Corridor Allocation"])


class CreateTenderRequest(BaseModel):
    corridor_id: str = Field(description="Target corridor ID (e.g. 'C-14')")
    title: str = Field(description="Tender project title")
    scope_of_work: str = Field(description="Detailed scope of works")
    estimated_cost_lakh: float = Field(gt=0.0, description="Estimated cost in INR Lakhs")
    approved_budget_lakh: float = Field(gt=0.0, description="Government approved project budget in INR Lakhs")
    required_interventions: List[str] = Field(description="List of required intervention archetypes")
    eligibility_requirements: str = Field(default="Registered architectural or landscape firm with municipal experience.")
    opening_date: str = Field(description="Tender release date (YYYY-MM-DD)")
    closing_date: str = Field(description="Tender closing deadline (YYYY-MM-DD)")
    issuing_authority: str = Field(default="Delhi Public Works Department (PWD)")


class SubmitProposalRequest(BaseModel):
    proposed_cost_lakh: float = Field(gt=0.0, description="Proposed execution budget in INR Lakhs")
    technical_proposal_summary: str = Field(description="Technical implementation method statement")
    timeline_weeks: int = Field(gt=0, le=104, description="Proposed delivery timeline in weeks")
    intervention_quantities: Optional[Dict[str, float]] = Field(default=None, description="Quantities breakdown")


class AwardTenderRequest(BaseModel):
    proposal_id: str = Field(description="ID of winning proposal")
    award_notes: str = Field(description="Justification and tender award committee notes")


class DirectAllocateRequest(BaseModel):
    corridor_id: str = Field(description="Corridor ID to allocate")
    assigned_org: str = Field(description="Accredited firm or agency name")
    scope_summary: str = Field(description="Brief project description")
    approved_budget_lakh: float = Field(gt=0.0, description="Approved budget in INR Lakhs")


class VerifyProfessionalRequest(BaseModel):
    org_id: str
    verification_status: str = Field(description="'VERIFIED', 'PENDING_VERIFICATION', or 'SUSPENDED'")


# -----------------------------------------------------------------------------
# Corridor Availability
# -----------------------------------------------------------------------------

@router.get("/corridors/{corridor_id}/availability")
def get_corridor_availability(
    corridor_id: str,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Check the allocation availability of an urban corridor.
    Guarantees conflict messaging:
    - If allocated: 'CORRIDOR ALREADY ALLOCATED — NOT AVAILABLE'
    - If available: 'CORRIDOR AVAILABLE — OPEN FOR AUTHORISED TENDER PARTICIPATION'
    """
    svc = get_tender_service()
    return svc.get_corridor_availability(corridor_id, current_user=current_user)


# -----------------------------------------------------------------------------
# Tender Lifecycle
# -----------------------------------------------------------------------------

@router.get("/tenders")
def list_tenders(
    corridor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Browse tenders.
    Normal users receive a high-level public catalog.
    Pro users see eligible opportunities and their own proposal status.
    Government Admin sees all tenders and proposal submission counts.
    """
    svc = get_tender_service()
    tenders = svc.list_tenders(current_user=current_user, corridor_id=corridor_id, status=status)
    return {"count": len(tenders), "tenders": tenders}


@router.post("/tenders", status_code=status.HTTP_201_CREATED)
def create_tender(
    body: CreateTenderRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_TENDERS)),
) -> Dict[str, Any]:
    """
    Publish a new municipal corridor tender.
    Requires MANAGE_TENDERS permission (Government Admin only).
    Enforces corridor exclusivity: returns HTTP 409 Conflict if corridor is already allocated.
    """
    svc = get_tender_service()
    try:
        return svc.create_tender(
            corridor_id=body.corridor_id,
            title=body.title,
            scope_of_work=body.scope_of_work,
            estimated_cost_lakh=body.estimated_cost_lakh,
            approved_budget_lakh=body.approved_budget_lakh,
            required_interventions=body.required_interventions,
            eligibility_requirements=body.eligibility_requirements,
            opening_date=body.opening_date,
            closing_date=body.closing_date,
            issuing_authority=body.issuing_authority,
            user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        logger.error("Error creating tender: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create tender: {exc}")


@router.get("/tenders/{tender_id}")
def get_tender_details(
    tender_id: str,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Retrieve tender details with bid confidentiality protection.
    Pro users only see their own proposals. Government engineers see all competing bids.
    """
    svc = get_tender_service()
    try:
        return svc.get_tender(tender_id, current_user=current_user)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/tenders/{tender_id}/proposals", status_code=status.HTTP_201_CREATED)
def submit_tender_proposal(
    tender_id: str,
    body: SubmitProposalRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.SUBMIT_PROPOSAL)),
) -> Dict[str, Any]:
    """
    Submit a proposal for an open tender.
    Requires SUBMIT_PROPOSAL permission (Pro Professional only).
    Injected identity guarantees organizational accountability.
    """
    svc = get_tender_service()
    try:
        return svc.submit_proposal(
            tender_id=tender_id,
            proposed_cost_lakh=body.proposed_cost_lakh,
            technical_proposal_summary=body.technical_proposal_summary,
            timeline_weeks=body.timeline_weeks,
            intervention_quantities=body.intervention_quantities,
            user=current_user,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/tenders/{tender_id}/award")
def award_tender(
    tender_id: str,
    body: AwardTenderRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.ASSIGN_TENDER)),
) -> Dict[str, Any]:
    """
    Award a tender to a winning professional proposal.
    Requires ASSIGN_TENDER permission (Government Admin only).
    Atomically updates corridor status to ALLOCATED.
    Enforces conflict protection: returns HTTP 409 Conflict if corridor is already allocated.
    """
    svc = get_tender_service()
    try:
        return svc.award_tender(
            tender_id=tender_id,
            proposal_id=body.proposal_id,
            award_notes=body.award_notes,
            user=current_user,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


# -----------------------------------------------------------------------------
# Corridor Assignments & Administration (Government Admin)
# -----------------------------------------------------------------------------

@router.get("/admin/corridor-assignments")
def list_corridor_assignments(
    status: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_ALL_ASSIGNMENTS)),
) -> Dict[str, Any]:
    """
    List all active and historical corridor assignments.
    Requires VIEW_ALL_ASSIGNMENTS (Government Admin only).
    """
    svc = get_tender_service()
    assignments = svc.list_corridor_allocations(current_user=current_user, status=status)
    return {"count": len(assignments), "assignments": assignments}


@router.post("/admin/corridor-assignments", status_code=status.HTTP_201_CREATED)
def direct_allocate_corridor(
    body: DirectAllocateRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.ALLOCATE_CORRIDOR)),
) -> Dict[str, Any]:
    """
    Directly allocate a corridor to an authorized professional agency.
    Requires ALLOCATE_CORRIDOR (Government Admin only).
    Enforces concurrency conflict detection: returns HTTP 409 Conflict if corridor is active.
    """
    svc = get_tender_service()
    try:
        return svc.direct_allocate_corridor(
            corridor_id=body.corridor_id,
            assigned_org=body.assigned_org,
            scope_summary=body.scope_summary,
            approved_budget_lakh=body.approved_budget_lakh,
            user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("/admin/professionals")
def list_registered_professionals(
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_PROFESSIONALS)),
) -> Dict[str, Any]:
    """List registered professional firms and accreditation verification status."""
    svc = get_tender_service()
    profs = svc.list_professionals()
    return {"count": len(profs), "professionals": profs}


@router.post("/admin/professionals/verify")
def verify_professional_profile(
    body: VerifyProfessionalRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_PROFESSIONALS)),
) -> Dict[str, Any]:
    """Verify or suspend a professional organization's credentials."""
    svc = get_tender_service()
    return svc.verify_professional(
        org_id=body.org_id,
        verification_status=body.verification_status,
        user=current_user,
    )


@router.get("/admin/audit-logs")
def list_administrative_audit_logs(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_GOVERNMENT_AUDIT)),
) -> Dict[str, Any]:
    """Retrieve immutable audit history of tender creations, awards, and allocations."""
    svc = get_tender_service()
    logs = svc.list_audit_logs(entity_type=entity_type, limit=limit)
    return {"count": len(logs), "audit_logs": logs}
