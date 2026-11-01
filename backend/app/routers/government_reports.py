"""
VanSetu GreenTech — Government Reports & Municipal Submission Router.

Endpoints:
- GET /api/reports: List municipal reports with status, district, and author filters.
- POST /api/reports: Create and submit a new municipal climate action report.
- GET /api/reports/stats: Statistical summary of reports (submitted, under review, approved).
- GET /api/reports/{report_id}: Get details and review history of a specific report.
- POST /api/reports/{report_id}/review: Review action (Under Review, Approve, Reject).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.government_report_service import get_government_report_service
from ml.security.auth import (
    AuthenticatedUser,
    get_optional_current_user,
)

logger = logging.getLogger("vansetu.routers.reports")

router = APIRouter(prefix="/api/reports", tags=["Government Reports & Review Workflow"])


class CreateReportRequest(BaseModel):
    title: str = Field(min_length=3, description="Report headline or proposal title")
    district: str = Field(description="NCT Delhi District")
    corridor_ids: List[str] = Field(default_factory=list, description="Target corridor codes (e.g. ['C-14'])")
    report_type: str = Field(default="HEAT_MITIGATION_ASSESSMENT", description="Report classification")
    author_name: str = Field(default="Municipal Officer")
    author_role: str = Field(default="PWD Climate Cell")
    author_id: str = Field(default="GOV_USER_001")
    budget_impact_lakh: float = Field(default=0.0, ge=0.0)
    summary: str = Field(min_length=10, description="Detailed report description, findings, and justification")
    status: str = Field(default="Submitted", description="'Draft' or 'Submitted'")


class ReviewReportRequest(BaseModel):
    action: str = Field(description="'Under Review', 'Approved', or 'Rejected'")
    reviewer_name: str = Field(default="Municipal Reviewer")
    reviewer_role: str = Field(default="Government Admin")
    notes: str = Field(default="", description="Review justification, conditions, or rejection reason")


@router.get("")
def list_reports(
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    svc = get_government_report_service()
    reports = svc.list_reports(status=status, district=district, author_id=author_id)
    return {"count": len(reports), "reports": reports}


@router.get("/stats")
def get_report_stats(
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    svc = get_government_report_service()
    return svc.get_report_stats()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_report(
    body: CreateReportRequest,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    svc = get_government_report_service()
    try:
        report = svc.create_report(
            title=body.title,
            district=body.district,
            corridor_ids=body.corridor_ids,
            report_type=body.report_type,
            author_name=body.author_name or (current_user.name if current_user else "Municipal Officer"),
            author_role=body.author_role or (current_user.role.value if current_user else "PWD Climate Cell"),
            author_id=body.author_id or (current_user.user_id if current_user else "GOV_USER_001"),
            budget_impact_lakh=body.budget_impact_lakh,
            summary=body.summary,
            status=body.status,
        )
        return {"report": report, "message": "Government report created successfully."}
    except Exception as exc:
        logger.error("Failed to create report: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/{report_id}")
def get_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    svc = get_government_report_service()
    report = svc.get_report(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report '{report_id}' not found.")
    return {"report": report}


@router.post("/{report_id}/review")
def review_report(
    report_id: str,
    body: ReviewReportRequest,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    svc = get_government_report_service()
    try:
        updated = svc.review_report(
            report_id=report_id,
            action=body.action,
            reviewer_name=body.reviewer_name or (current_user.name if current_user else "Government Reviewer"),
            reviewer_role=body.reviewer_role or (current_user.role.value if current_user else "Govt Admin"),
            notes=body.notes,
        )
        return {"report": updated, "message": f"Report '{report_id}' status updated to {body.action}."}
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Failed to review report: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
