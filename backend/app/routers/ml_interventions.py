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

import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

from app.services.intervention_ml_service import (
    RecommendInterventionsRequest,
    get_intervention_ml_service,
)
from ml.labels.schema import (
    AssessmentReviewAction,
    EvidenceDocumentType,
    ReviewActionType,
    SiteAssessmentSubmission,
    SuitabilityState,
)
from ml.labels.store import AssessmentLabelStore
from ml.outcome.outcome_schema import DeploymentOutcomeObservation
from ml.security.auth import AuthenticatedUser, Permission, ReviewerRole, require_permission

router = APIRouter(prefix="/api/ml", tags=["Intervention Intelligence ML Engine"])


class ReviewPatchBody(BaseModel):
    action: ReviewActionType = Field(description="APPROVE, REJECT, or CORRECT.")
    corrected_suitability_state: Optional[SuitabilityState] = None
    reviewer_note: str = Field(min_length=3, description="Review justification note.")


class EvidenceVerifyBody(BaseModel):
    action: str = Field(description="APPROVE or REJECT.")
    verification_notes: str = Field(min_length=3, description="Justification for evidence verification decision.")


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


@router.post("/evidence/upload", status_code=status.HTTP_201_CREATED)
async def upload_evidence_document(
    file: UploadFile = File(...),
    document_type: str = Form(default="GPR_UTILITY_SURVEY"),
    current_user: AuthenticatedUser = Depends(require_permission(Permission.SUBMIT_ASSESSMENT)),
) -> Dict[str, Any]:
    """
    Upload a binary evidence document (PDF, PNG, JPEG <= 10MB) via bounded chunked streaming.
    Enforces magic bytes verification, path traversal prevention, and SHA-256 integrity calculation.
    """
    svc = get_intervention_ml_service()
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
    CHUNK_SIZE = 64 * 1024  # 64 KB

    chunks = []
    total_bytes = 0
    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE:
                await file.close()
                raise HTTPException(
                    status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
                    detail="Payload Too Large: Evidence file exceeds the maximum 10 MB limit.",
                )
            chunks.append(chunk)
    finally:
        await file.close()

    if total_bytes < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Evidence document is empty or corrupted (minimum 4 bytes required).",
        )

    content = b"".join(chunks)

    # Sanitize filename against path traversal and null bytes
    raw_name = file.filename or "evidence_document.bin"
    safe_filename = os.path.basename(raw_name).strip().replace("\x00", "")
    if not safe_filename or safe_filename in (".", ".."):
        safe_filename = "evidence_document.bin"

    try:
        try:
            doc_enum = EvidenceDocumentType(document_type)
        except ValueError:
            doc_enum = EvidenceDocumentType.GPR_UTILITY_SURVEY

        saved = svc.save_evidence_document(
            file_bytes=content,
            filename=safe_filename,
            document_type=doc_enum,
            user=current_user,
        )
        return AssessmentLabelStore.sanitize_evidence_metadata(saved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Evidence upload failed: {exc}")


@router.post("/evidence/{evidence_id}/verify")
async def verify_evidence_document(
    evidence_id: str,
    body: EvidenceVerifyBody,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VERIFY_EVIDENCE)),
) -> Dict[str, Any]:
    """
    Verify or reject an uploaded empirical evidence document.
    Enforces conflict-of-interest check: uploader cannot verify their own document.
    """
    svc = get_intervention_ml_service()
    try:
        saved = svc.verify_evidence_document(
            evidence_id=evidence_id,
            action=body.action,
            reviewer=current_user,
            notes=body.verification_notes,
        )
        return AssessmentLabelStore.sanitize_evidence_metadata(saved)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@router.get("/evidence/storage/status")
async def get_evidence_storage_status(
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_EVIDENCE)),
) -> Dict[str, Any]:
    """Probe evidence object storage provider status (truthfully reports durability)."""
    svc = get_intervention_ml_service()
    return svc.get_evidence_storage_status()


@router.get("/evidence/{evidence_id}/history")
async def get_evidence_history(
    evidence_id: str,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_EVIDENCE)),
) -> Dict[str, Any]:
    """Retrieve immutable verification decision history for an evidence document."""
    svc = get_intervention_ml_service()
    doc = svc.get_evidence_document(evidence_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Evidence document '{evidence_id}' not found.")

    if current_user.role == ReviewerRole.FIELD_ASSESSOR and doc["uploaded_by_user_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Field Assessors may only access evidence documents they submitted.",
        )

    history = svc.get_evidence_verification_history(evidence_id)
    return {"evidence_id": evidence_id, "verification_history": history}


@router.get("/evidence/{evidence_id}")
async def get_evidence_document(
    evidence_id: str,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_EVIDENCE)),
) -> Dict[str, Any]:
    """
    Retrieve sanitized metadata and verification status of an empirical evidence document.
    Field assessors are strictly scoped to documents they submitted.
    """
    svc = get_intervention_ml_service()
    doc = svc.get_evidence_document(evidence_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Evidence document '{evidence_id}' not found.")

    if current_user.role == ReviewerRole.FIELD_ASSESSOR and doc["uploaded_by_user_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Field Assessors may only access evidence documents they submitted.",
        )

    return AssessmentLabelStore.sanitize_evidence_metadata(doc)


@router.get("/evidence")
async def list_evidence_documents(
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(require_permission(Permission.VIEW_EVIDENCE)),
) -> Dict[str, Any]:
    """
    List uploaded evidence documents with role-scoped filtering and sanitized metadata.
    Field assessors can only list documents they submitted.
    """
    svc = get_intervention_ml_service()
    effective_user_id = user_id
    if current_user.role == ReviewerRole.FIELD_ASSESSOR:
        effective_user_id = current_user.user_id

    items = svc.list_evidence_documents(user_id=effective_user_id, status=status)
    sanitized = [AssessmentLabelStore.sanitize_evidence_metadata(i) for i in items]
    return {"count": len(sanitized), "evidence_documents": sanitized}


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
