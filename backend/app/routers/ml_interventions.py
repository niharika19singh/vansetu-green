"""
VanSetu GreenTech — Machine Learning Intervention Intelligence Router (Phase 11B).

Exposes all 7 research-grade ML endpoints:
1. POST  /api/ml/interventions/recommend
2. GET   /api/ml/features/{segment_id}
3. POST  /api/ml/site-assessments
4. PATCH /api/ml/site-assessments/{assessment_id}
5. POST  /api/ml/outcome-observations
6. GET   /api/ml/model-status
7. GET   /api/ml/data-status
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.intervention_ml_service import (
    RecommendInterventionsRequest,
    get_intervention_ml_service,
)
from ml.labels.schema import AssessmentReviewAction, SiteAssessmentSubmission, SuitabilityState
from ml.outcome.outcome_schema import DeploymentOutcomeObservation

router = APIRouter(prefix="/api/ml", tags=["Intervention Intelligence ML Engine"])


class ReviewPatchBody(BaseModel):
    reviewer_id: str = Field(min_length=3, description="Authenticated reviewer ID.")
    action: str = Field(description="APPROVE, REJECT, or CORRECT.")
    corrected_suitability_state: Optional[SuitabilityState] = None
    reviewer_note: str = Field(min_length=3, description="Review justification note.")


@router.post("/interventions/recommend")
async def recommend_interventions(req: RecommendInterventionsRequest) -> Dict[str, Any]:
    """
    Predict and rank climate interventions for a road segment with explainable rationales,
    confidence metrics, and deterministic safety constraint overrides.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.recommend_interventions(req)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failure: {exc}")


@router.get("/features/{segment_id}")
async def get_segment_features(segment_id: str) -> Dict[str, Any]:
    """
    Retrieve multi-domain segment features, native raster resolutions, and source provenance.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.get_segment_features(segment_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/site-assessments")
async def submit_site_assessment(sub: SiteAssessmentSubmission) -> Dict[str, Any]:
    """
    Submit an authenticated human field assessment with strict evidence provenance.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.submit_site_assessment(sub)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assessment submission error: {exc}")


@router.patch("/site-assessments/{assessment_id}")
async def review_site_assessment(assessment_id: str, body: ReviewPatchBody) -> Dict[str, Any]:
    """
    Review, approve, or correct a human field assessment with complete audit trail.
    """
    svc = get_intervention_ml_service()
    act = AssessmentReviewAction(
        assessment_id=assessment_id,
        reviewer_id=body.reviewer_id,
        action=body.action,
        corrected_suitability_state=body.corrected_suitability_state,
        reviewer_note=body.reviewer_note,
    )
    try:
        return svc.review_site_assessment(act)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/site-assessments")
async def list_site_assessments(
    segment_id: Optional[str] = Query(None),
    corridor_id: Optional[str] = Query(None),
    only_approved: bool = Query(False),
) -> Dict[str, Any]:
    """List recorded field assessments and review audit trails."""
    svc = get_intervention_ml_service()
    items = svc.list_assessments(
        segment_id=segment_id,
        corridor_id=corridor_id,
        only_approved=only_approved,
    )
    return {"count": len(items), "assessments": items}


@router.post("/outcome-observations")
async def submit_outcome_observation(obs: DeploymentOutcomeObservation) -> Dict[str, Any]:
    """
    Submit an empirical pre/post intervention deployment outcome observation.
    Rejects synthetic records.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.record_outcome_observation(obs)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/model-status")
async def get_model_status() -> Dict[str, Any]:
    """
    Expose active model version, minimum data gate status, validation metrics, and fallback mode.
    """
    svc = get_intervention_ml_service()
    return svc.get_model_status()


@router.get("/data-status")
async def get_data_ecosystem_status() -> Dict[str, Any]:
    """
    Audit actual ingestion connectivity, credential checks, and provenance across all 8 Delhi data sources.
    Never exposes secrets or API keys.
    """
    svc = get_intervention_ml_service()
    return svc.get_data_ecosystem_status()
