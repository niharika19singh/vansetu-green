"""
Best Social Innovation — Equity-Aware Climate Planning & Community Observations Router (Phase 8).
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.social_equity_service import get_social_equity_service

router = APIRouter(prefix="/api/equity", tags=["Social Equity & Community Observations"])


class SubmitObservationRequest(BaseModel):
    corridor_id: str = Field(default="C-14")
    category: str = Field(default="heat_exposure")
    vulnerable_group: str = Field(default="outdoor_workers")
    severity: int = Field(default=5, ge=1, le=5)
    observation_text: str
    location_landmark: str
    anonymized_reporter_role: str = Field(default="Community Resident (Anonymized)")


class VerifyObservationRequest(BaseModel):
    verified_by: str = Field(default="planner_niharika")
    approve: bool = Field(default=True)


@router.get("/summary")
async def get_equity_summary() -> Dict[str, Any]:
    """Return city-wide equity priority rankings and community observation counts."""
    svc = get_social_equity_service()
    return svc.get_equity_summary()


@router.get("/observations")
async def list_community_observations(
    corridor_id: Optional[str] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """List anonymized community observations with optional corridor or verification filter."""
    svc = get_social_equity_service()
    obs = svc.list_observations(
        corridor_id=corridor_id,
        verification_status=verification_status,
    )
    return {
        "count": len(obs),
        "observations": obs,
    }


@router.post("/observations")
async def submit_community_observation(req: SubmitObservationRequest) -> Dict[str, Any]:
    """Submit a new anonymized community observation (enters `pending_review` state)."""
    svc = get_social_equity_service()
    return svc.submit_observation(
        corridor_id=req.corridor_id,
        category=req.category,
        vulnerable_group=req.vulnerable_group,
        severity=req.severity,
        observation_text=req.observation_text,
        location_landmark=req.location_landmark,
        anonymized_reporter_role=req.anonymized_reporter_role,
    )


@router.post("/observations/{observation_id}/verify")
async def verify_community_observation(
    observation_id: str,
    req: VerifyObservationRequest,
) -> Dict[str, Any]:
    """Verify or reject a community observation through the human-in-the-loop governance gate."""
    svc = get_social_equity_service()
    try:
        return svc.verify_observation(
            observation_id=observation_id,
            verified_by=req.verified_by,
            approve=req.approve,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
