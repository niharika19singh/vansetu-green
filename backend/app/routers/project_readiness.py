"""
Feature 8: Climate Project Implementation & Readiness Planner Router.
Exposes endpoints for converting portfolios into 8 work packages, tracking 8 readiness gates,
and linking to the IOMETE Climate Technology Procurement Studio.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Path, Body

from app.services.project_readiness_service import (
    create_project_from_portfolio,
    get_all_readiness_projects,
    get_project_readiness_plan,
    advance_package_gate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/readiness", tags=["Project Readiness"])


class CreateProjectRequest(BaseModel):
    portfolio_name: str = Field(..., description="Project name")
    budget_lakhs: float = Field(..., description="Approved budget in INR Lakhs")
    corridors: List[Dict[str, Any]] = Field(default_factory=list, description="Selected corridors")


class AdvanceGateRequest(BaseModel):
    new_gate: str = Field(..., description="One of the 8 readiness gates")


@router.get("/projects", summary="Get All Readiness Projects")
def list_projects() -> Dict[str, Any]:
    """Retrieve all municipal readiness projects."""
    projects = get_all_readiness_projects()
    return {
        "count": len(projects),
        "projects": projects,
    }


@router.post("/projects/from-portfolio", summary="Create Implementation Plan from Portfolio")
def create_project(req: CreateProjectRequest) -> Dict[str, Any]:
    """
    Decompose an approved climate portfolio into 8 standard municipal work packages (WP-1 to WP-8)
    across the 8 readiness lifecycle gates.
    """
    try:
        return create_project_from_portfolio(
            portfolio_name=req.portfolio_name,
            budget_lakhs=req.budget_lakhs,
            corridors=req.corridors,
        )
    except Exception as e:
        logger.error(f"Error creating readiness project: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create readiness project: {e}")


@router.get("/projects/{project_id}", summary="Get Detailed Readiness Plan for Project")
def get_project_plan(
    project_id: str = Path(..., description="Project ID (e.g. 'PROJ-DEL-...' or 'PROJ-SAMPLE')")
) -> Dict[str, Any]:
    """
    Retrieve project implementation readiness plan, all 8 work packages, readiness score,
    and IOMETE Procurement Studio specifications.
    """
    try:
        return get_project_readiness_plan(project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting project {project_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch readiness plan: {e}")


@router.patch("/package/{package_id}/gate", summary="Advance Work Package Readiness Gate")
def update_gate(
    package_id: str = Path(..., description="Package ID (e.g. 'PROJ-DEL-...-WP-1')"),
    req: AdvanceGateRequest = Body(...),
) -> Dict[str, Any]:
    """
    Advance a municipal work package to its next readiness gate:
    1_CONCEPT_IDENTIFIED -> 2_FEASIBILITY_ESTIMATED -> 3_SITE_SURVEY_COMPLETED ->
    4_STAKEHOLDER_APPROVED -> 5_PROCUREMENT_READY -> 6_CONTRACT_AWARDED ->
    7_UNDER_EXECUTION -> 8_OPERATIONAL_MONITORING.
    """
    try:
        return advance_package_gate(package_id, req.new_gate)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating gate for {package_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to advance package gate: {e}")
