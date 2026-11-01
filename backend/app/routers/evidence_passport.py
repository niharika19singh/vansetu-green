"""
Feature 1: Corridor Evidence Passport Router.
Exposes endpoints for comprehensive evidence verification, data quality scoring, and gap analysis.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field

from app.services.evidence_passport_service import (
    generate_corridor_evidence_passport,
    get_evidence_catalogue,
    record_corridor_verification,
    get_verification_history,
)
from app.services.corridor_service import get_all_corridors
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    ReviewerRole,
    get_current_user,
    get_optional_current_user,
    require_permission,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evidence", tags=["Evidence Passport"])


class EvidenceVerifyRequest(BaseModel):
    corridor_id: str = Field(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
    status: str = Field(..., description="Verification status: 'verified', 'pending_field_survey', or 'unverified'")
    survey_notes: Optional[str] = Field(default="", description="Field survey observations or engineering justification")
    checkpoints_verified: Optional[List[str]] = Field(default=[], description="List of verified pre-installation checkpoints")


@router.get("/catalogue", summary="Get Filterable Corridor Evidence Catalogue")
def get_catalogue(
    district: Optional[str] = Query(default=None, description="Filter by district (canonical short or full name)"),
    status: Optional[str] = Query(default=None, description="Filter by status: 'verified', 'pending_field_survey', 'unverified'"),
    search: Optional[str] = Query(default=None, description="Search query matching corridor name, code, or district"),
    source: Optional[str] = Query(default=None, description="Filter by dataset source"),
) -> Dict[str, Any]:
    """
    Retrieve filterable catalogue of all 44 corridor evidence dossiers across 11 NCT Delhi districts.
    Includes city-wide overview statistics: verified count, pending count, unverified count, and average completeness.
    """
    try:
        return get_evidence_catalogue(district=district, status=status, search=search, source=source)
    except Exception as e:
        logger.error(f"Error fetching evidence catalogue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch evidence catalogue: {e}")


@router.get("/passport/{corridor_id}", summary="Get Corridor Evidence Passport")
def get_corridor_passport(
    corridor_id: str = Path(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
) -> Dict[str, Any]:
    """
    Retrieve the comprehensive 8-section Evidence Passport for a corridor:
    - Section A: Corridor Identity (OSM Geometry, LineString coords, length, highway class)
    - Section B: Thermal Evidence (NASA MODIS Terra 1km LST native vs 10m display)
    - Section C: Vegetation Evidence (Copernicus Sentinel-2 10m NDVI & canopy deficit)
    - Section D: Air Quality Evidence (CPCB CAAQMS station distance & proximity disclaimer)
    - Section E: Geographic and Infrastructure Evidence (OSM road attributes & walkability)
    - Section F: 6-Dimension Quality Assessment (Authenticity, Resolution, Freshness, Completeness, Relevance, Verification)
    - Section G: Field Verification (Checkpoints, missing physical measurements, reviewer info)
    - Section H: Evidence Export (PDF/print metadata, JSON payload, SHA256 integrity hash)
    """
    try:
        return generate_corridor_evidence_passport(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating evidence passport for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate evidence passport: {e}")


@router.post("/verify", summary="Sign Off / Update Corridor Field Verification")
def verify_corridor_evidence(
    req: EvidenceVerifyRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VERIFY_EVIDENCE)),
) -> Dict[str, Any]:
    """
    Submit a field verification signoff for a corridor.
    STRICTLY RESTRICTED to accredited Government Admin and Senior Reviewer accounts.
    Persists decision in SQLite audit ledger and updates corridor verification state.
    """
    valid_statuses = {"verified", "pending_field_survey", "unverified"}
    if req.status.lower() not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: {list(valid_statuses)}",
        )

    try:
        res = record_corridor_verification(
            corridor_id=req.corridor_id,
            status=req.status.lower(),
            survey_notes=req.survey_notes or "",
            checkpoints_verified=req.checkpoints_verified or [],
            user_id=current_user.user_id,
            user_role=current_user.role.value,
            reviewer_org=current_user.organization or "Delhi Public Works Department",
            reviewer_name=current_user.full_name or current_user.username,
        )
        return {
            "status": "success",
            "message": f"Corridor {req.corridor_id} verification updated to '{req.status}' by {current_user.full_name}.",
            "verification": res,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error recording verification for {req.corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record verification: {e}")


@router.get("/history/{corridor_id}", summary="Get Corridor Verification History")
def get_corridor_verification_history(
    corridor_id: str = Path(..., description="Corridor code or ID"),
) -> Dict[str, Any]:
    """Retrieve chronological audit trail of all field verification events for a corridor."""
    try:
        history = get_verification_history(corridor_id)
        return {
            "corridor_id": corridor_id,
            "count": len(history),
            "history": history,
        }
    except Exception as e:
        logger.error(f"Error fetching verification history for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {e}")


@router.get("/passports", summary="Get All Corridor Evidence Passport Summaries")
def get_all_passports_summary() -> Dict[str, Any]:
    """
    Retrieve concise evidence summary and data quality dimension grades for all 44 corridors.
    (Preserved for backward compatibility).
    """
    catalogue = get_evidence_catalogue()
    summaries: List[Dict[str, Any]] = []

    for item in catalogue["corridors"]:
        summaries.append({
            "corridor_id": item["corridor_id"],
            "corridor_code": item["corridor_code"],
            "corridor_name": item["corridor_name"],
            "district": item["district"],
            "verification_status": item["verification_status"],
            "evidence_completeness": item["evidence_completeness"],
            "key_metrics": item["key_metrics"],
        })

    return {
        "count": len(summaries),
        "standards": "VanSetu Evidence-Aware Scientific Governance Specification v2.1",
        "summaries": summaries,
    }
