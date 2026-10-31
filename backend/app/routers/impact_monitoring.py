"""
Feature 6: Climate Intervention Impact Monitoring Router.
Exposes endpoints for the persistent lifecycle registry, empirical before-after deltas,
paired control corridors, and status updates.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Path, Body

from app.services.impact_monitoring_service import (
    get_all_deployments,
    get_deployment_detail,
    create_deployment,
    update_deployment_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/impact", tags=["Impact Monitoring"])


class CreateDeploymentRequest(BaseModel):
    corridor_id: str = Field(..., description="Corridor ID or Code")
    archetype: str = Field("Linear Street Trees", description="GreenTech intervention archetype")
    lifecycle_status: str = Field("PLANNED", description="Initial lifecycle state")
    planned_date: str = Field(..., description="YYYY-MM-DD")
    capex_inr_lakhs: float = Field(..., description="Capital investment")
    opex_annual_lakhs: float = Field(..., description="Annual maintenance")
    units_deployed: int = Field(..., description="Tree count or canopy units")
    control_corridor_id: Optional[str] = Field("12", description="Paired untreated control corridor ID")
    notes: Optional[str] = Field(None, description="Administrative notes")


class UpdateStatusRequest(BaseModel):
    lifecycle_status: str = Field(..., description="PLANNED | UNDER_CONSTRUCTION | OPERATIONAL | MAINTENANCE_REQUIRED")
    notes: Optional[str] = Field(None, description="Status change rationale")


@router.get("/registry", summary="Get All Tracked Intervention Deployments")
def list_registry() -> Dict[str, Any]:
    """
    Retrieve all tracked intervention deployments across the 4 lifecycle stages:
    PLANNED, UNDER_CONSTRUCTION, OPERATIONAL, MAINTENANCE_REQUIRED.
    """
    deployments = get_all_deployments()
    return {
        "count": len(deployments),
        "deployments": deployments,
    }


@router.get("/deployment/{deployment_id}", summary="Get Deployment Impact & Before-After Delta")
def get_deployment(
    deployment_id: str = Path(..., description="Deployment ID (e.g. 'DEP-DEL-C14-2024-01')")
) -> Dict[str, Any]:
    """
    Retrieve detailed deployment impact:
    - Empirical deltas (NDVI change, LST change, PM2.5 change)
    - Paired control corridor baseline comparison
    - Scientific attribution honesty disclaimer
    """
    try:
        return get_deployment_detail(deployment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting deployment {deployment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch deployment: {e}")


@router.post("/deployments", summary="Register New Climate Intervention")
def register_deployment(req: CreateDeploymentRequest) -> Dict[str, Any]:
    """
    Register a newly funded climate intervention into the permanent lifecycle registry.
    """
    try:
        data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
        return create_deployment(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error registering deployment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to register deployment: {e}")


@router.patch("/deployment/{deployment_id}/status", summary="Update Deployment Lifecycle State")
def update_status(
    deployment_id: str = Path(..., description="Deployment ID"),
    req: UpdateStatusRequest = Body(...),
) -> Dict[str, Any]:
    """
    Transition intervention across lifecycle gates:
    PLANNED -> UNDER_CONSTRUCTION -> OPERATIONAL -> MAINTENANCE_REQUIRED.
    """
    try:
        return update_deployment_status(deployment_id, req.lifecycle_status, req.notes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating status for {deployment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update deployment: {e}")
