"""
VanSetu GreenTech — Machine Learning Intervention Intelligence Router (Phase 11B).

Exposes all research-grade ML endpoints with RBAC authentication:
1. POST  /api/ml/interventions/recommend
2. GET   /api/ml/features/{segment_id}
3. POST  /api/ml/site-assessments (requires SUBMIT_ASSESSMENT)
4. PATCH /api/ml/site-assessments/{assessment_id} (requires REVIEW_ASSESSMENT)
5. GET   /api/ml/site-assessments
6. POST  /api/ml/outcome-observations (requires SUBMIT_OUTCOME)
7. GET   /api/ml/model-status
8. GET   /api/ml/data-status
9. POST  /api/ml/model/promote (requires PROMOTE_MODEL)
10. POST /api/ml/model/rollback (requires PROMOTE_MODEL)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.intervention_ml_service import (
    RecommendInterventionsRequest,
    get_intervention_ml_service,
)
from ml.labels.schema import AssessmentReviewAction, ReviewActionType, SiteAssessmentSubmission, SuitabilityState
from ml.outcome.outcome_schema import DeploymentOutcomeObservation
from ml.security.auth import AuthenticatedUser, Permission, require_permission

router = APIRouter(prefix="/api/ml", tags=["Intervention Intelligence ML Engine"])


class ReviewPatchBody(BaseModel):
    action: ReviewActionType = Field(description="APPROVE, REJECT, or CORRECT.")
    corrected_suitability_state: Optional[SuitabilityState] = None
    reviewer_note: str = Field(min_length=3, description="Review justification note.")


class ModelPromoteBody(BaseModel):
    model_version: str = Field(min_length=3, description="Target model version string, e.g. 'v20261031_120000'.")
    approval_note: str = Field(min_length=5, description="Executive justification and audit note for model promotion.")


class ModelRollbackBody(BaseModel):
    target_version: str = Field(min_length=3, description="Historical approved model version to restore.")
    rollback_reason: str = Field(min_length=5, description="Operational justification for rollback.")


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


@router.post("/site-assessments", status_code=status.HTTP_201_CREATED)
async def submit_site_assessment(
    sub: SiteAssessmentSubmission,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.SUBMIT_ASSESSMENT)),
) -> Dict[str, Any]:
    """
    Submit an authenticated human field assessment with strict evidence provenance.
    Assessor ID and municipal organization are bound to the verified server session.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.submit_site_assessment(sub, authenticated_user=current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assessment submission error: {exc}")


@router.patch("/site-assessments/{assessment_id}")
async def review_site_assessment(
    assessment_id: str,
    body: ReviewPatchBody,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.REVIEW_ASSESSMENT)),
) -> Dict[str, Any]:
    """
    Review, approve, or correct a human field assessment with complete audit trail.
    Reviewer identity is injected from server-verified authentication token.
    Self-approval of own submissions is strictly prohibited.
    """
    svc = get_intervention_ml_service()
    act = AssessmentReviewAction(
        assessment_id=assessment_id,
        reviewer_id=current_user.user_id,
        action=body.action,
        corrected_suitability_state=body.corrected_suitability_state,
        reviewer_note=body.reviewer_note,
    )
    try:
        return svc.review_site_assessment(act, authenticated_user=current_user)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


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


@router.post("/outcome-observations", status_code=status.HTTP_201_CREATED)
async def submit_outcome_observation(
    obs: DeploymentOutcomeObservation,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.SUBMIT_OUTCOME)),
) -> Dict[str, Any]:
    """
    Submit an empirical pre/post intervention deployment outcome observation.
    Requires server-side authenticated identity with SUBMIT_OUTCOME permission.
    Rejects synthetic records.
    """
    svc = get_intervention_ml_service()
    try:
        return svc.record_outcome_observation(obs, authenticated_user=current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


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


@router.post("/model/promote")
async def promote_model(
    body: ModelPromoteBody,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.PROMOTE_MODEL)),
) -> Dict[str, Any]:
    """
    Promote an EXPERIMENTAL candidate model to APPROVED_FOR_INFERENCE.
    Requires senior accredited reviewer or administrator authorization.
    """
    svc = get_intervention_ml_service()
    try:
        res = svc.promote_model(
            model_version=body.model_version,
            reviewer=current_user,
            approval_note=body.approval_note,
        )
        return {"status": "MODEL_PROMOTED", "model_metadata": res}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/model/rollback")
async def rollback_model(
    body: ModelRollbackBody,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.PROMOTE_MODEL)),
) -> Dict[str, Any]:
    """
    Roll back operational inference to a previously approved model version.
    """
    svc = get_intervention_ml_service()
    try:
        res = svc.rollback_model(
            target_version=body.target_version,
            reviewer=current_user,
            rollback_reason=body.rollback_reason,
        )
        return {"status": "MODEL_ROLLED_BACK", "model_metadata": res}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
