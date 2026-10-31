"""
VanSetu GreenTech — Intervention Intelligence ML Service (Phase 11A).

High-level application service orchestrating data ecosystem auditing,
segment feature queries, suitability prediction, field assessments, and outcome tracking.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from ml.inference.predictor import InterventionIntelligencePredictor
from ml.labels.schema import AssessmentReviewAction, SiteAssessmentSubmission
from ml.labels.store import AssessmentLabelStore
from ml.outcome.outcome_schema import DeploymentOutcomeObservation
from ml.outcome.store import OutcomeObservationStore
from ml.preprocessing.feature_pipeline import SegmentFeaturePipeline
from ml.security.auth import AuthenticatedUser
from ml.sources import get_data_ecosystem_status
from ml.training.data_builder import TrainingDatasetBuilder
from ml.training.registry import ModelRegistry


class RecommendInterventionsRequest(BaseModel):
    corridor_id: Optional[str] = None
    segment_id: str = Field(default="C-14-S001", description="Target road segment ID, e.g. 'C-14-S001'.")
    policy_objective: str = Field(default="heat_resilience", description="heat_resilience, air_quality, pedestrian_shade, waterlogging_mitigation.")
    budget_lakh: Optional[float] = Field(default=8.0, ge=0.5, le=5000.0)
    intervention_filters: Optional[List[str]] = None
    site_restrictions: Optional[List[Dict[str, Any]]] = None


class InterventionMlService:
    """Singleton service for all ML operations within VanSetu GreenTech."""

    def __init__(self) -> None:
        self.feature_pipeline = SegmentFeaturePipeline()
        self.label_store = AssessmentLabelStore()
        self.outcome_store = OutcomeObservationStore()
        self.registry = ModelRegistry()
        self.predictor = InterventionIntelligencePredictor(
            registry=self.registry,
            feature_pipeline=self.feature_pipeline,
        )
        self.data_builder = TrainingDatasetBuilder(
            label_store=self.label_store,
            feature_pipeline=self.feature_pipeline,
        )

    def recommend_interventions(self, req: RecommendInterventionsRequest) -> Dict[str, Any]:
        """Rank interventions for a segment, explain predictions, and enforce hard safety constraints."""
        res = self.predictor.evaluate_segment_suitability(
            segment_id=req.segment_id,
            policy_objective=req.policy_objective,
            budget_lakh=req.budget_lakh,
            site_restrictions=req.site_restrictions,
        )

        if req.intervention_filters:
            filtered = [r for r in res["ranked_recommendations"] if r["archetype"] in req.intervention_filters]
            res["ranked_recommendations"] = filtered

        # Include outcome learning readiness
        outcome_rep = self.outcome_store.get_readiness_report()
        res["outcome_learning_readiness"] = outcome_rep.model_dump()
        return res

    def get_segment_features(self, segment_id: str) -> Dict[str, Any]:
        """Retrieve multi-domain features, source provenance, and native resolutions for a segment."""
        df = self.feature_pipeline.load_feature_dataset()
        matches = df[df["segment_id"] == segment_id]
        if matches.empty:
            raise KeyError(f"Segment '{segment_id}' not found in Delhi road feature dataset.")

        row = matches.iloc[0].to_dict()
        row.pop("geometry", None)

        return {
            "segment_id": segment_id,
            "corridor_code": row.get("corridor_code"),
            "corridor_name": row.get("corridor_name"),
            "district": row.get("district"),
            "features": row,
            "data_sources": {
                "vegetation": {
                    "source": "ESA Copernicus Sentinel-2 Level-2A",
                    "native_resolution": "10m",
                    "observation_period": "Pre-Monsoon Peak Canopy",
                },
                "thermal": {
                    "source": "NASA Terra/Aqua MODIS LST (MOD11A2)",
                    "native_resolution": "1,000m (native sinusoidal grid)",
                    "observation_period": "Pre-Monsoon Peak Daily LST",
                },
                "air_quality": {
                    "source": "CPCB/DPCC CAAQM Network",
                    "native_resolution": "Point station coordinates (spatial decay calculated)",
                    "nearest_station": row.get("nearest_cpcb_station_name"),
                    "distance_km": row.get("cpcb_distance_km"),
                },
                "transport": {
                    "source": "OpenStreetMap Delhi Road Network (ODbL)",
                    "highway_class": row.get("highway_class"),
                    "estimated_row_width_m": row.get("estimated_row_width_m"),
                },
                "boundaries": {
                    "source": "State Election Commission Delhi / Census of India",
                    "method": "EPSG:32643 Metric Polygon Spatial Join",
                    "is_boundary_edge": row.get("is_boundary_edge"),
                },
            },
            "feature_schema_version": self.feature_pipeline.FEATURE_SCHEMA_VERSION,
        }

    def submit_site_assessment(
        self,
        sub: SiteAssessmentSubmission,
        authenticated_user: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """Submit a verified human field assessment with server-side identity injection."""
        return self.label_store.submit_assessment(sub, authenticated_user=authenticated_user)

    def save_evidence_document(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: Any,
        user: AuthenticatedUser,
    ) -> Dict[str, Any]:
        """Save and validate an empirical evidence document."""
        return self.label_store.save_evidence_document(file_bytes, filename, document_type, user)

    def verify_evidence_document(
        self,
        evidence_id: str,
        action: str,
        reviewer: AuthenticatedUser,
        notes: str,
    ) -> Dict[str, Any]:
        """Review and verify or reject an evidence document."""
        return self.label_store.verify_evidence_document(evidence_id, action, reviewer, notes)

    def get_evidence_document(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        return self.label_store.get_evidence_document(evidence_id)

    def list_evidence_documents(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return self.label_store.list_evidence_documents(user_id=user_id, status=status)

    def get_evidence_verification_history(self, evidence_id: str) -> List[Dict[str, Any]]:
        return self.label_store.get_evidence_verification_history(evidence_id)

    def get_evidence_storage_status(self) -> Dict[str, Any]:
        return self.label_store.get_evidence_storage_status()

    def review_site_assessment(
        self,
        act: AssessmentReviewAction,
        authenticated_user: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """Perform documented review or correction on a field assessment."""
        return self.label_store.review_assessment(act, authenticated_reviewer=authenticated_user)

    def list_assessments(
        self,
        segment_id: Optional[str] = None,
        corridor_id: Optional[str] = None,
        only_approved: bool = False,
    ) -> List[Dict[str, Any]]:
        return self.label_store.list_assessments(
            segment_id=segment_id,
            corridor_id=corridor_id,
            only_approved=only_approved,
        )

    def record_outcome_observation(
        self,
        obs: DeploymentOutcomeObservation,
        authenticated_user: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """Record an empirical post-intervention deployment outcome."""
        return self.outcome_store.record_outcome_observation(obs, authenticated_user=authenticated_user)

    def promote_model(
        self,
        model_version: str,
        reviewer: AuthenticatedUser,
        approval_note: str,
    ) -> Dict[str, Any]:
        """Promote candidate model to approved inference status."""
        return self.registry.promote_model(
            model_version=model_version,
            reviewer=reviewer,
            approval_note=approval_note,
        )

    def rollback_model(
        self,
        target_version: str,
        reviewer: AuthenticatedUser,
        rollback_reason: str,
    ) -> Dict[str, Any]:
        """Roll back inference engine to prior approved model version."""
        return self.registry.rollback_model(
            target_version=target_version,
            reviewer=reviewer,
            rollback_reason=rollback_reason,
        )

    def get_model_status(self) -> Dict[str, Any]:
        """Return model availability, minimum data gate status, and validation metrics."""
        summary = self.registry.get_model_status_summary()
        gate = self.data_builder.check_minimum_data_gate()
        outcome_rep = self.outcome_store.get_readiness_report()

        summary["minimum_evidence_gate"] = gate
        summary["outcome_learning_readiness"] = outcome_rep.model_dump()
        return summary

    def get_data_ecosystem_status(self) -> Dict[str, Any]:
        """Audit connectivity and provenance across all 8 Delhi environmental data adapters."""
        return get_data_ecosystem_status()


_ml_service = InterventionMlService()


def get_intervention_ml_service() -> InterventionMlService:
    return _ml_service
