"""Automated unit and integration test suite for Delhi Intervention Intelligence ML Pipeline.

Tests:
1. Data Ingestion Adapters (all 8 sources)
2. Geospatial Segmentation & Zonal Stats Sampling
3. Data Integrity & Validation (Rejection of Simulated & Contaminated Records)
4. Human-Verified Label Store & Minimum Evidence Gate
5. Model Registry & Fallback Mode
6. Hard Constraint Safety Layer & Explainability
7. Predictor (Deterministic Rule-Based Fallback Engine)
8. Outcome Observations & Causal Learning Store
9. FastAPI API Endpoints (All 7 endpoints)
"""

import hashlib
import io
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Point, LineString

from app.main import app
from ml.validation import TrainingDataEligibilityValidator, ContaminatedDataError
from ml.security.auth import (
    AuthenticatedUser,
    CredentialStore,
    Permission,
    ReviewerRole,
    compute_token_hmac,
    get_auth_manager,
)
from ml.sources import (
    CopernicusSentinel2Adapter,
    NasaModisAdapter,
    UsgsLandsatAdapter,
    Era5MeteoAdapter,
    CpcbAirQualityAdapter,
    OsmTransportAdapter,
    BhuvanLanduseAdapter,
    DelhiAdministrativeBoundaryAdapter,
    get_all_source_adapters,
    get_data_ecosystem_status,
)
from ml.sources.base import IngestionStatus
from ml.sources.cpcb_airquality import DELHI_CAAQM_STATIONS
from ml.preprocessing.segmentation import CorridorSegmenter
from ml.preprocessing.zonal_stats import ZonalStatsSampler
from ml.labels.schema import (
    AssessmentReviewAction,
    EvidenceDocumentType,
    EvidenceVerificationStatus,
    InterventionArchetype,
    ReviewActionType,
    SiteAssessmentSubmission,
    SuitabilityState,
)
from ml.labels.store import AssessmentLabelStore
from ml.labels.storage import EvidenceStorageManager
from ml.training.data_builder import TrainingDatasetBuilder, InsufficientLabelsError
from ml.training.registry import ModelRegistry
from ml.training.spaces_storage import SpacesArtifactStore
from ml.inference.hard_constraints import HardConstraintValidator, ConstraintState
from ml.inference.explanation import RecommendationExplainer
from ml.inference.predictor import InterventionIntelligencePredictor
from ml.outcome.outcome_schema import DeploymentOutcomeObservation, OutcomeMetricType
from ml.outcome.store import OutcomeObservationStore


@pytest.fixture
def client():
    return TestClient(app)


# -------------------------------------------------------------------------
# 1. Data Ingestion Adapters
# -------------------------------------------------------------------------

def test_sentinel2_adapter_local_cache():
    adapter = CopernicusSentinel2Adapter()
    conn = adapter.check_connection()
    assert adapter.source_name == "ESA Copernicus Sentinel-2 Level-2A (MSI)"
    assert conn["status"] == "AVAILABLE_LOCAL_CACHE"
    assert "local_cache_details" in conn
    assert conn["local_cache_details"]["crs"] == "EPSG:4326"
    assert conn["local_cache_details"]["size_bytes"] > 200_000_000  # 238MB raster

    prov = adapter.get_provenance()
    assert "10 metres" in prov.native_spatial_resolution
    assert prov.ingestion_status.value == "AVAILABLE_LOCAL_CACHE"
    assert conn["local_cache_available"] is True


def test_modis_adapter_local_cache():
    adapter = NasaModisAdapter()
    conn = adapter.check_connection()
    assert "NASA" in adapter.source_name
    assert conn["status"] == "AVAILABLE_LOCAL_CACHE"
    assert "local_cache_details" in conn
    assert conn["local_cache_details"]["crs"] == "EPSG:4326"

    prov = adapter.get_provenance()
    assert "1,000 metres" in prov.native_spatial_resolution or "1 km" in prov.native_spatial_resolution
    assert prov.ingestion_status.value == "AVAILABLE_LOCAL_CACHE"
    assert conn["local_cache_available"] is True


def test_missing_credentials_adapters_handle_gracefully():
    # USGS Landsat, ERA5, NRSC Bhuvan should not crash when credentials are absent
    landsat = UsgsLandsatAdapter()
    l_conn = landsat.check_connection()
    assert "USGS" in landsat.source_name
    assert l_conn["status"] in ("CONNECTED_LIVE_API", "MISSING_CREDENTIALS", "NOT_CONFIGURED")

    era5 = Era5MeteoAdapter()
    e_conn = era5.check_connection()
    assert "ERA5" in era5.source_name
    assert e_conn["status"] in ("CONNECTED_LIVE_API", "MISSING_CREDENTIALS", "NOT_CONFIGURED")

    bhuvan = BhuvanLanduseAdapter()
    b_conn = bhuvan.check_connection()
    assert "Bhuvan" in bhuvan.source_name
    assert b_conn["status"] in ("CONNECTED_LIVE_API", "MISSING_CREDENTIALS", "NOT_CONFIGURED")


def test_cpcb_and_osm_adapters():
    cpcb = CpcbAirQualityAdapter()
    c_conn = cpcb.check_connection()
    assert "CPCB" in cpcb.source_name
    assert c_conn["verified_stations_count"] == len(DELHI_CAAQM_STATIONS)
    assert len(DELHI_CAAQM_STATIONS) == 18

    osm = OsmTransportAdapter()
    o_conn = osm.check_connection()
    assert "OpenStreetMap" in osm.source_name
    assert o_conn["local_cache_available"] is True


def test_delhi_administrative_boundary_adapter():
    admin = DelhiAdministrativeBoundaryAdapter()
    conn = admin.check_connection()
    assert "NCT Delhi" in admin.source_name
    assert conn["verified_districts_count"] == 11

    # Test genuine point in Central Delhi (Connaught Place ~ 28.6304, 77.2177)
    pt = Point(77.2177, 28.6304)
    res = admin.spatial_join_geometry(pt)
    assert res["district"] is not None
    assert res["distance_to_boundary_metres"] >= 0


def test_ecosystem_status_summary():
    status = get_data_ecosystem_status()
    assert status["sources_count"] == 8
    assert "sentinel2" in status["ecosystem_status"]
    assert "modis" in status["ecosystem_status"]


# -------------------------------------------------------------------------
# 2. Geospatial Segmentation & Zonal Stats
# -------------------------------------------------------------------------

def test_corridor_segmenter_linestring():
    segmenter = CorridorSegmenter(target_length_m=75.0)
    # 300m LineString in Delhi (metric coordinates roughly)
    line_4326 = LineString([(77.2100, 28.6300), (77.2130, 28.6300)])
    segs = segmenter.process_corridor_feature(
        corridor_id="TEST-01",
        corridor_code="C-99",
        corridor_name="Test Corridor",
        geometry_4326=line_4326,
    )
    assert len(segs) >= 2
    seg0 = segs[0]
    assert seg0["segment_id"].startswith("C-99-S")
    assert seg0["length_metres"] > 0
    assert 28.0 < seg0["centroid_lat"] < 29.0
    assert 76.5 < seg0["centroid_lon"] < 77.8


def test_zonal_stats_sampler():
    sampler = ZonalStatsSampler()
    # Sample a small polygon in central Delhi
    poly_4326 = Point(77.2177, 28.6304).buffer(0.001)
    ndvi_res = sampler.sample_ndvi_for_polygon(poly_4326)
    assert ndvi_res["available"] is True
    assert ndvi_res["pixel_count"] >= 1
    assert 0.0 <= ndvi_res["nodata_fraction"] <= 1.0


# -------------------------------------------------------------------------
# 3. Data Integrity & Validation (Contamination Gate)
# -------------------------------------------------------------------------

def test_validator_rejects_simulated_record():
    validator = TrainingDataEligibilityValidator()
    simulated_record = {
        "is_simulated": True,
        "source": "synthetic_model_run",
        "latitude": 28.6304,
        "longitude": 77.2177,
        "timestamp": "2026-05-15T12:00:00Z",
        "value": 38.5,
        "metric": "lst_celsius",
    }
    with pytest.raises(ContaminatedDataError) as excinfo:
        validator.validate_record(simulated_record)
    assert "DATA_CONTAMINATION_PREVENTED" in str(excinfo.value)
    assert "simulated" in str(excinfo.value).lower()


def test_validator_rejects_out_of_bounds_and_bad_timestamps():
    validator = TrainingDataEligibilityValidator()

    # Out of bounds coordinates (Mumbai)
    with pytest.raises(ContaminatedDataError):
        validator.validate_record({
            "is_simulated": False,
            "source": "cpcb",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "timestamp": "2026-05-15T12:00:00Z",
            "value": 45.0,
            "metric": "pm25",
        })

    # Non-ISO timestamp
    with pytest.raises(ContaminatedDataError):
        validator.validate_record({
            "is_simulated": False,
            "source": "cpcb",
            "latitude": 28.6304,
            "longitude": 77.2177,
            "timestamp": "yesterday afternoon",
            "value": 45.0,
            "metric": "pm25",
        })


def test_validator_accepts_clean_record():
    validator = TrainingDataEligibilityValidator()
    clean_record = {
        "is_simulated": False,
        "source": "copernicus_l2a",
        "latitude": 28.6304,
        "longitude": 77.2177,
        "timestamp": "2026-05-15T12:00:00Z",
        "value": 0.28,
        "metric": "ndvi",
    }
    validated = validator.validate_record(clean_record)
    assert validated["is_simulated"] is False


# -------------------------------------------------------------------------
# 4. Human-Verified Label Store & Minimum Evidence Gate
# -------------------------------------------------------------------------

def test_label_store_crud_and_history():
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tf:
        db_path = tf.name

    try:
        store = AssessmentLabelStore(db_path=Path(db_path))
        assessor = AuthenticatedUser(
            user_id="PWD_ENG_7104",
            username="pwd.engineer",
            full_name="Senior Municipal Engineer",
            role=ReviewerRole.FIELD_ASSESSOR,
            organization="Public Works Department",
        )
        reviewer = AuthenticatedUser(
            user_id="CHIEF_ENG_01",
            username="chief.reviewer",
            full_name="Chief Municipal Reviewer",
            role=ReviewerRole.AUTHORIZED_REVIEWER,
            organization="Municipal Corporation of Delhi",
        )
        submission = SiteAssessmentSubmission(
            segment_id="C-14-S001",
            corridor_id="C-14",
            intervention_archetype=InterventionArchetype.LINEAR_STREET_TREES,
            suitability_state=SuitabilityState.CONDITIONAL,
            reviewer_id="PWD_ENG_7104",
            reviewer_role="Senior Municipal Engineer",
            evidence_reference="PWD/2026/GPR-7701",
            engineering_constraints=["Subsurface utility present at 1.8m"],
            reviewer_notes="Feasibility dependent on GPR clearance",
        )
        saved = store.submit_assessment(submission, authenticated_user=assessor)
        assert saved["assessment_id"] is not None
        assert saved["segment_id"] == "C-14-S001"

        # Read back
        fetched = store.get_assessment(saved["assessment_id"])
        assert fetched is not None
        assert fetched["segment_id"] == "C-14-S001"
        assert fetched["reviewer_id"] == "PWD_ENG_7104"

        # Apply a review action
        review_action = AssessmentReviewAction(
            assessment_id=saved["assessment_id"],
            reviewer_id="CHIEF_ENG_01",
            action="APPROVE",
            reviewer_note="Verified against PWD GPR portal",
        )
        updated = store.review_assessment(review_action, authenticated_reviewer=reviewer)
        assert updated["review_status"] == "APPROVED"
        assert len(updated["audit_history"]) >= 1
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


def test_minimum_evidence_gate_blocks_untrainable_dataset():
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tf:
        db_path = tf.name

    try:
        builder = TrainingDatasetBuilder(
            label_store=AssessmentLabelStore(db_path=Path(db_path)),
            min_labels=50,
            min_corridors=3,
        )
        with pytest.raises(InsufficientLabelsError) as excinfo:
            builder.build_training_matrix()
        assert "MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS" in str(excinfo.value)
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


# -------------------------------------------------------------------------
# 5. Model Registry
# -------------------------------------------------------------------------

def test_model_registry_summary():
    with tempfile.TemporaryDirectory() as tmpdir:
        registry = ModelRegistry(models_dir=Path(tmpdir))
        summary = registry.get_model_status_summary()
        assert summary["has_approved_model"] is False
        assert summary["model_status"] == "NO_MODEL_TRAINED_YET"
        assert summary["fallback_mode"] == "DETERMINISTIC_RULE_BASED_ENGINE_ACTIVE"


# -------------------------------------------------------------------------
# 6. Hard Constraints & Explainability
# -------------------------------------------------------------------------

def test_hard_constraint_overrides_prediction():
    # Case A: Narrow surveyed ROW (< 2.5m) should strictly forbid linear_street_trees
    narrow_features = {
        "surveyed_row_width_m": 1.8,
        "gpr_utility_survey_status": "VERIFIED_CLEAR",
    }
    res = HardConstraintValidator.evaluate_constraints("linear_street_trees", narrow_features)
    assert res.has_hard_constraint is True
    assert res.forced_state == "INELIGIBLE"
    assert any("Inadequate" in r for r in res.constraint_reasons)

    # Case B: GPR Subsurface Utility Conflict should strictly forbid bioswales
    restrictions = [{"excluded_interventions": ["roadside_bioswales"], "reason": "High-voltage conduit at 0.6m"}]
    res_bio = HardConstraintValidator.evaluate_constraints(
        "roadside_bioswales",
        {"estimated_row_width_m": 12.0},
        known_site_restrictions=restrictions,
    )
    assert res_bio.has_hard_constraint is True
    assert res_bio.forced_state == "INELIGIBLE"
    assert any("High-voltage" in r for r in res_bio.constraint_reasons)

    # Case C: Ample surveyed space, clear GPR
    safe_features = {
        "surveyed_row_width_m": 24.0,
        "gpr_utility_survey_status": "VERIFIED_CLEAR",
        "is_walkable": True,
        "highway_class": "primary",
    }
    res_safe = HardConstraintValidator.evaluate_constraints("linear_street_trees", safe_features)
    assert res_safe.has_hard_constraint is False
    assert res_safe.forced_state is None
    assert res_safe.constraint_state.value == "VERIFIED_ELIGIBLE"

    # Case D: Guideline ROW alone CANNOT produce VERIFIED_ELIGIBLE (must require field survey)
    guideline_only_features = {
        "road_class_guideline_row_m": 24.0,
        "gpr_utility_survey_status": "VERIFIED_CLEAR",
        "is_walkable": True,
        "highway_class": "primary",
    }
    res_guideline = HardConstraintValidator.evaluate_constraints("linear_street_trees", guideline_only_features)
    assert res_guideline.forced_state == "CONDITIONAL"
    assert any("Road width is based on road-class guideline" in w for w in res_guideline.missing_evidence_warnings)


def test_explainer_produces_engineering_rationale():
    features = {
        "ndvi_mean": 0.12,
        "thermal_anomaly_celsius": 2.4,
        "estimated_row_width_m": 25.0,
        "cpcb_distance_km": 2.1,
    }
    explanation = RecommendationExplainer.generate_explanation(
        archetype="linear_street_trees",
        suitability_state="ELIGIBLE",
        features=features,
        hard_constraints=[],
        missing_warnings=[],
    )
    assert "supporting_drivers" in explanation
    assert len(explanation["supporting_drivers"]) >= 2
    assert "narrative_summary" in explanation
    assert "Highly suitable" in explanation["narrative_summary"]


# -------------------------------------------------------------------------
# 7. Predictor Fallback Engine
# -------------------------------------------------------------------------

def test_predictor_evaluates_all_archetypes():
    predictor = InterventionIntelligencePredictor()
    recs = predictor.evaluate_segment_suitability("C-14-S001", policy_objective="heat_resilience")
    assert recs["segment_id"] == "C-14-S001"
    assert recs["decision_engine"] == "DETERMINISTIC_RULE_BASED_ENGINE"
    assert len(recs["ranked_recommendations"]) == 5
    assert all("ranking_score" in item for item in recs["ranked_recommendations"])


# -------------------------------------------------------------------------
# 8. Outcome Observations & Causal Learning Store
# -------------------------------------------------------------------------

def test_outcome_store_lifecycle():
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tf:
        db_path = tf.name

    try:
        store = OutcomeObservationStore(db_path=Path(db_path))
        obs = DeploymentOutcomeObservation(
            deployment_id="DEP-2026-DEL-001",
            segment_id="C-14-S001",
            intervention_archetype="linear_street_trees",
            installation_date="2026-03-01",
            observation_date="2026-08-01",
            is_post_intervention=True,
            metric_type=OutcomeMetricType.LST_THERMAL_REDUCTION_CELSIUS,
            measured_value=2.8,
            measurement_unit="celsius",
            measurement_method="SATELLITE_RASTER",
            instrument_details="Terra/Aqua 1000m daytime LST",
            matched_control_segment_id="C-14-S008",
            control_measured_value=0.2,
            weather_confounder_notes="Pre-monsoon clear sky, wind speed 3.2 m/s",
            evidence_document_ref="MCD/WO/2026/014",
            evidence_document_type="MUNICIPAL_WORK_ORDER",
            verification_status="EMPIRICAL_VERIFIED",
        )
        recorder = AuthenticatedUser(
            user_id="PWD_ENG_RECORDER_01",
            username="pwd.recorder",
            full_name="Outcome Field Officer",
            role=ReviewerRole.FIELD_ASSESSOR,
            organization="Public Works Department",
        )
        saved = store.record_outcome_observation(obs, authenticated_user=recorder)
        assert saved["deployment_id"] == "DEP-2026-DEL-001"
        assert saved["measured_value"] == 2.8

        # Read back
        fetched = store.get_observation(saved["observation_id"])
        assert fetched["matched_control_segment_id"] == "C-14-S008"

        # Causal readiness report
        readiness = store.get_readiness_report()
        assert readiness.total_verified_deployments == 1
        assert readiness.is_outcome_model_trainable is False
        assert readiness.status_code in ("OUTCOME_MONITORING_DATA_COLLECTION_ONLY", "OUTCOME_LEARNING_PENDING_EMPIRICAL_FOLLOW_UP")
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


# -------------------------------------------------------------------------
# 9. FastAPI API Endpoints
# -------------------------------------------------------------------------

def test_api_recommend_endpoint(client):
    payload = {
        "segment_id": "C-14-S001",
        "policy_objective": "heat_resilience",
    }
    response = client.post("/api/ml/interventions/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["segment_id"] == "C-14-S001"
    assert data["decision_engine"] == "DETERMINISTIC_RULE_BASED_ENGINE"
    assert len(data["ranked_recommendations"]) == 5


def test_api_features_endpoint(client):
    response = client.get("/api/ml/features/C-14-S001")
    assert response.status_code == 200
    data = response.json()
    assert data["segment_id"] == "C-14-S001"
    assert "features" in data
    assert "modis_lst_celsius" in data["features"]
    assert "ndvi_mean" in data["features"]


def test_api_model_status_endpoint(client):
    response = client.get("/api/ml/model-status")
    assert response.status_code == 200
    data = response.json()
    assert data["model_status"] == "NO_MODEL_TRAINED_YET"
    assert data["fallback_mode"] == "DETERMINISTIC_RULE_BASED_ENGINE_ACTIVE"
    assert "minimum_evidence_gate" in data
    assert data["minimum_evidence_gate"]["status"] == "MODEL_NOT_TRAINABLE_INSUFFICIENT_VERIFIED_LABELS"


def test_api_data_status_endpoint(client):
    response = client.get("/api/ml/data-status")
    assert response.status_code == 200
    data = response.json()
    assert data["sources_count"] == 8
    assert "ecosystem_status" in data


def test_source_code_zero_hardcoded_credentials():
    """Verify that none of the previously leaked credentials appear in source files."""
    repo_root = Path(__file__).parent.parent.parent
    banned_tokens = [
        "token_field_pwd_7104",
        "token_reviewer_mcd_3012",
        "token_senior_delhi_001",
        "token_admin_delhi_root",
    ]
    checked_dirs = [
        repo_root / "backend" / "ml",
        repo_root / "backend" / "app",
        repo_root / "backend" / "tests",
        repo_root / "frontend" / "src",
    ]
    for check_dir in checked_dirs:
        if not check_dir.exists():
            continue
        for p in check_dir.rglob("*"):
            if p.is_file() and p.suffix in (".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html"):
                if p.name == "test_ml_pipeline.py" and "banned_tokens" in p.read_text():
                    # Skip the test definition itself when checking strings
                    content = p.read_text()
                    for tok in banned_tokens:
                        # Ensure it only appears within banned_tokens list in this test file
                        occurrences = content.count(tok)
                        assert occurrences <= 1, f"Banned credential '{tok}' found in {p} outside blacklist definition"
                else:
                    content = p.read_text()
                    for tok in banned_tokens:
                        assert tok not in content, f"Leaked credential '{tok}' found in source file: {p}"


def test_api_site_assessments_security_and_roundtrip(client):
    auth_mgr = get_auth_manager()
    assessor_tok, assessor_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="PWD_ENG_TEST_01",
        username="test.assessor",
        full_name="Test Assessor",
        organization="Public Works Department - South",
    )
    reviewer_tok, reviewer_user = auth_mgr.provision_test_user(
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        user_id="MCD_REV_TEST_02",
        username="test.reviewer",
        full_name="Test Reviewer",
        organization="Municipal Corporation of Delhi",
    )

    payload = {
        "segment_id": "C-14-S002",
        "corridor_id": "C-14",
        "intervention_archetype": "high_albedo_cool_pavements",
        "suitability_state": "ELIGIBLE",
        "evidence_reference": "PWD/ORDER/2026/GPR-VERIFY",
        "evidence_document_type": "MUNICIPAL_WORK_ORDER",
        "engineering_constraints": [],
        "reviewer_notes": "Verified asphalt sub-base stability >= 45 kN",
    }

    # 1. Unauthenticated request MUST be rejected with HTTP 401
    unauth_res = client.post("/api/ml/site-assessments", json=payload)
    assert unauth_res.status_code == 401

    # 2. Authenticated field assessor submission succeeds
    auth_headers = {"Authorization": f"Bearer {assessor_tok}"}
    post_res = client.post("/api/ml/site-assessments", json=payload, headers=auth_headers)
    assert post_res.status_code in (200, 201)
    saved = post_res.json()
    assert saved["assessment_id"] is not None
    # Server injected identity, rejecting client role tampering
    assert saved["reviewer_id"] == "PWD_ENG_TEST_01"
    assert saved["review_status"] == "PENDING_REVIEW"
    ass_id = saved["assessment_id"]

    # 3. Field Assessor attempting to review/approve MUST be rejected with HTTP 403 Forbidden
    review_payload = {
        "action": "APPROVE",
        "reviewer_note": "Attempted self-approval by field staff",
    }
    assessor_review_res = client.patch(
        f"/api/ml/site-assessments/{ass_id}",
        json=review_payload,
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert assessor_review_res.status_code == 403

    # 4. Authorized Reviewer from MCD reviews assessment
    reviewer_headers = {"Authorization": f"Bearer {reviewer_tok}"}
    review_res = client.patch(
        f"/api/ml/site-assessments/{ass_id}",
        json=review_payload,
        headers=reviewer_headers,
    )
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["review_status"] == "APPROVED"
    assert reviewed_data["last_reviewed_by"] == "MCD_REV_TEST_02"
    assert reviewed_data["audit_history"][-1]["performed_by"] == "MCD_REV_TEST_02"

    # 5. List endpoint returns recorded assessments
    get_res = client.get("/api/ml/site-assessments?segment_id=C-14-S002")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["count"] >= 1


def test_api_outcome_observations_security_and_roundtrip(client):
    auth_mgr = get_auth_manager()
    assessor_tok, assessor_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="PWD_ENG_TEST_03",
    )

    payload = {
        "deployment_id": "DEP-TEST-002",
        "segment_id": "C-14-S003",
        "intervention_archetype": "roadside_bioswales",
        "installation_date": "2026-04-01",
        "observation_date": "2026-09-01",
        "is_post_intervention": True,
        "metric_type": "lst_thermal_reduction_celsius",
        "measured_value": 1.8,
        "measurement_unit": "celsius",
        "measurement_method": "SATELLITE_RASTER",
        "instrument_details": "MOD11A2 1000m",
        "matched_control_segment_id": "C-14-S009",
        "control_measured_value": 0.3,
        "evidence_document_ref": "MCD/WO/2026/014",
        "evidence_document_type": "MUNICIPAL_WORK_ORDER",
        "verification_status": "EMPIRICAL_VERIFIED",
    }

    # 1. Unauthenticated request MUST return 401
    unauth_res = client.post("/api/ml/outcome-observations", json=payload)
    assert unauth_res.status_code == 401

    # 2. Authenticated submission succeeds
    auth_headers = {"Authorization": f"Bearer {assessor_tok}"}
    post_res = client.post("/api/ml/outcome-observations", json=payload, headers=auth_headers)
    assert post_res.status_code in (200, 201)
    saved = post_res.json()
    assert saved["observation_id"] is not None
    assert saved["deployment_id"] == "DEP-TEST-002"
    assert saved["recorder_id"] == "PWD_ENG_TEST_03"


def test_api_model_governance_rbac_promotion(client):
    auth_mgr = get_auth_manager()
    assessor_tok, _ = auth_mgr.provision_test_user(role=ReviewerRole.FIELD_ASSESSOR)
    senior_tok, _ = auth_mgr.provision_test_user(role=ReviewerRole.SENIOR_REVIEWER)

    promote_payload = {
        "model_version": "v_nonexistent_test",
        "approval_note": "Attempted unauthorized promotion",
    }
    # Field assessor cannot promote -> 403 Forbidden
    res_field = client.post(
        "/api/ml/model/promote",
        json=promote_payload,
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_field.status_code == 403

    # Senior reviewer has permission -> passes auth gate, returns 404 for nonexistent version
    res_senior = client.post(
        "/api/ml/model/promote",
        json=promote_payload,
        headers={"Authorization": f"Bearer {senior_tok}"},
    )
    assert res_senior.status_code in (400, 404)


def test_evidence_document_magic_bytes_and_lifecycle(client):
    """Test binary evidence upload, magic byte validation, conflict of interest, and verification."""
    auth_mgr = get_auth_manager()
    assessor_tok, assessor_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="UPLOADER_ENG_01",
    )
    reviewer_tok, reviewer_user = auth_mgr.provision_test_user(
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        user_id="REVIEWER_DOC_02",
    )

    # 1. Invalid file format (text/executable) rejected with 400
    bad_file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00DOS executable fake")
    res_bad = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("fake.exe", bad_file, "application/octet-stream")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_bad.status_code == 400
    assert "Magic header verification failed" in res_bad.json()["detail"]

    # 2. Valid PDF file accepted
    valid_pdf_content = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    pdf_file = io.BytesIO(valid_pdf_content)
    res_ok = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("gpr_clearance.pdf", pdf_file, "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_ok.status_code in (200, 201)
    ev_data = res_ok.json()
    assert ev_data["evidence_id"].startswith("evid-")
    assert ev_data["mime_type"] == "application/pdf"
    assert ev_data["verification_status"] == EvidenceVerificationStatus.EVIDENCE_PENDING_REVIEW.value
    ev_id = ev_data["evidence_id"]

    # 3. Conflict of Interest: Uploader cannot verify their own document
    res_self_verify = client.post(
        f"/api/ml/evidence/{ev_id}/verify",
        json={"action": "APPROVE", "verification_notes": "Self verification attempt"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    # Field assessor has no VERIFY_EVIDENCE permission -> 403
    assert res_self_verify.status_code == 403

    # 4. Independent Reviewer verifies document
    res_verify = client.post(
        f"/api/ml/evidence/{ev_id}/verify",
        json={"action": "APPROVE", "verification_notes": "Verified against PWD portal records"},
        headers={"Authorization": f"Bearer {reviewer_tok}"},
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["verification_status"] == EvidenceVerificationStatus.EVIDENCE_VERIFIED.value

    # 5. Retrieve verified document metadata
    # Unauthenticated request is rejected with 401
    res_unauth = client.get(f"/api/ml/evidence/{ev_id}")
    assert res_unauth.status_code == 401

    # Authenticated reviewer request succeeds with sanitized response
    res_get = client.get(
        f"/api/ml/evidence/{ev_id}",
        headers={"Authorization": f"Bearer {reviewer_tok}"},
    )
    assert res_get.status_code == 200
    assert res_get.json()["verified_by_user_id"] == "REVIEWER_DOC_02"
    assert "storage_path" not in res_get.json()


def test_row_safety_logic_guideline_width_never_forces_ineligible():
    """Guideline ROW below minimum must return CONDITIONAL_PENDING_INSPECTION, never INELIGIBLE."""
    # Guideline width 1.0m is below the 1.5m required for linear_street_trees
    features_guideline_only = {
        "road_class_guideline_row_m": 1.0,
        "surveyed_row_width_m": None,
        "clear_pedestrian_width_m": None,
        "available_planting_verge_m": None,
        "gpr_utility_survey_status": "VERIFIED_CLEAR",
        "overhead_ht_powerline": False,
        "heritage_monument_zone": False,
        "highway_class": "secondary",
        "is_walkable": True,
    }

    eval_res = HardConstraintValidator.evaluate_constraints(
        "linear_street_trees",
        features_guideline_only,
    )
    assert eval_res.has_hard_constraint is False
    assert eval_res.forced_state == "CONDITIONAL"
    assert eval_res.constraint_state == ConstraintState.CONDITIONAL_PENDING_INSPECTION
    assert any("Road-class guideline width (1.0m) is indicative only" in w for w in eval_res.missing_evidence_warnings)
    assert not any("Inadequate" in r for r in eval_res.constraint_reasons)

    # When surveyed physical width is below minimum -> INELIGIBLE
    features_surveyed = dict(features_guideline_only)
    features_surveyed["surveyed_row_width_m"] = 1.0
    eval_surveyed = HardConstraintValidator.evaluate_constraints(
        "linear_street_trees",
        features_surveyed,
    )
    assert eval_surveyed.has_hard_constraint is True
    assert eval_surveyed.forced_state == "INELIGIBLE"
    assert eval_surveyed.constraint_state == ConstraintState.INELIGIBLE_HARD_CONSTRAINT
    assert any("Inadequate surveyed Right-of-Way width" in r for r in eval_surveyed.constraint_reasons)


def test_cpcb_empty_records_returns_data_unavailable_or_metadata():
    """Empty CPCB response must return DATA_UNAVAILABLE, never LIVE_DATA_FETCHED."""
    adapter = CpcbAirQualityAdapter()
    adapter.api_key = "test_key"

    # Mock connection test
    with patch("httpx.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"records": []}
        mock_get.return_value = mock_resp

        # fetch_observations_or_raster with empty records
        res = adapter.fetch_observations_or_raster(lat=28.55, lon=77.20)
        assert res["status"] in (
            IngestionStatus.DATA_UNAVAILABLE.value,
            IngestionStatus.AVAILABLE_LOCAL_CACHE.value,
        )
        assert res["status"] != IngestionStatus.LIVE_DATA_FETCHED.value


def test_spaces_storage_adapter_and_checksum_verification(tmp_path):
    """Test DigitalOcean Spaces storage unconfigured fallback and checksum validation."""
    # 1. When unconfigured -> reports DURABLE_MODEL_STORAGE_NOT_CONFIGURED
    unconfigured_store = SpacesArtifactStore(key="", secret="", bucket="")
    status = unconfigured_store.test_storage_connection()
    assert status["status"] == "DURABLE_MODEL_STORAGE_NOT_CONFIGURED"
    assert status["local_fallback_active"] is True

    # 2. Upload with checksum verification using mock S3 client
    mock_s3 = MagicMock()
    configured_store = SpacesArtifactStore(
        key="test_key",
        secret="test_secret",
        bucket="vansetu-models",
        region="blr1",
    )
    configured_store._get_s3_client = MagicMock(return_value=mock_s3)

    dummy_artifact = tmp_path / "test_model.joblib"
    dummy_artifact.write_bytes(b"dummy trained model weights")
    correct_sha = hashlib.sha256(dummy_artifact.read_bytes()).hexdigest()

    # Upload with correct checksum
    receipt = configured_store.upload_artifact(
        local_path=dummy_artifact,
        remote_key="models/v1/test_model.joblib",
        expected_sha256=correct_sha,
    )
    assert receipt["status"] == "UPLOADED_TO_SPACES"
    assert receipt["sha256_checksum"] == correct_sha
    mock_s3.upload_file.assert_called_once()

    # Upload with bad checksum raises ValueError
    with pytest.raises(ValueError) as exc:
        configured_store.upload_artifact(
            local_path=dummy_artifact,
            remote_key="models/v1/test_model.joblib",
            expected_sha256="wrong_checksum",
        )
    assert "Checksum mismatch" in str(exc.value)


def test_label_store_disqualifies_unbacked_evidence_from_training(tmp_path):
    """Approved assessment must have a verified on-disk document with matching SHA-256 to enter training."""
    db_file = tmp_path / "test_labels.sqlite"
    store = AssessmentLabelStore(db_path=db_file, data_dir=tmp_path)

    auth_mgr = get_auth_manager()
    assessor_tok, assessor = auth_mgr.provision_test_user(role=ReviewerRole.FIELD_ASSESSOR, user_id="FLD_01")
    reviewer_tok, reviewer = auth_mgr.provision_test_user(role=ReviewerRole.AUTHORIZED_REVIEWER, user_id="REV_02")

    # Upload genuine document
    pdf_bytes = b"%PDF-1.5 legitimate engineering survey"
    doc_meta = store.save_evidence_document(
        file_bytes=pdf_bytes,
        filename="survey_report.pdf",
        document_type=EvidenceDocumentType.ENGINEERING_CROSS_SECTION,
        user=assessor,
    )
    ev_id = doc_meta["evidence_id"]

    # Submit assessment linking to uploaded evidence
    sub = SiteAssessmentSubmission(
        segment_id="C-14-S001",
        corridor_id="C-14",
        intervention_archetype=InterventionArchetype.LINEAR_STREET_TREES,
        suitability_state=SuitabilityState.ELIGIBLE,
        evidence_reference="SURVEY-2026-001",
        evidence_document_type=EvidenceDocumentType.ENGINEERING_CROSS_SECTION,
        evidence_id=ev_id,
        reviewer_notes="Accurate cross-section",
    )
    rec = store.submit_assessment(sub, authenticated_user=assessor)
    ass_id = rec["assessment_id"]

    # Before approval: 0 training labels
    assert len(store.get_training_eligible_labels()) == 0

    # Reviewer approves assessment (which also approves evidence)
    action = AssessmentReviewAction(
        assessment_id=ass_id,
        action=ReviewActionType.APPROVE,
        reviewer_note="Fully verified by municipal supervisor",
    )
    store.review_assessment(action, authenticated_reviewer=reviewer)

    # Now 1 verified label is eligible
    eligible = store.get_training_eligible_labels()
    assert len(eligible) == 1
    assert eligible[0]["assessment_id"] == ass_id

    # If the file on disk is tampered or deleted, it is immediately disqualified
    disk_path = Path(doc_meta["storage_path"])
    disk_path.write_bytes(b"tampered contents")
    eligible_tampered = store.get_training_eligible_labels()
    assert len(eligible_tampered) == 0


# -------------------------------------------------------------------------
# 10. Security & Storage Persistence Hardening Tests
# -------------------------------------------------------------------------

def test_evidence_metadata_endpoints_security_and_scoping(client):
    """
    Test that evidence endpoints strictly enforce VIEW_EVIDENCE permission,
    role scoping (field assessors see only their own docs), and sanitize storage_path.
    """
    auth_mgr = get_auth_manager()
    assessor1_tok, assessor1_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="ASSESSOR_SEC_01",
    )
    assessor2_tok, assessor2_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="ASSESSOR_SEC_02",
    )
    reviewer_tok, reviewer_user = auth_mgr.provision_test_user(
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        user_id="REVIEWER_SEC_01",
    )

    # 1. Upload a document by Assessor 1
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("assessor1_gpr.pdf", io.BytesIO(pdf_content), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor1_tok}"},
    )
    assert upload_res.status_code == 201
    ev_id = upload_res.json()["evidence_id"]

    # 2. Unauthenticated calls must return 401
    assert client.get(f"/api/ml/evidence/{ev_id}").status_code == 401
    assert client.get("/api/ml/evidence").status_code == 401
    assert client.get(f"/api/ml/evidence/{ev_id}/history").status_code == 401

    # 3. Field Assessor 2 cannot view Field Assessor 1's document (403 Forbidden)
    res_other = client.get(
        f"/api/ml/evidence/{ev_id}",
        headers={"Authorization": f"Bearer {assessor2_tok}"},
    )
    assert res_other.status_code == 403
    assert "Field Assessors may only access evidence documents they submitted" in res_other.json()["detail"]

    # 4. Field Assessor 1 can view their own document with sanitized metadata
    res_own = client.get(
        f"/api/ml/evidence/{ev_id}",
        headers={"Authorization": f"Bearer {assessor1_tok}"},
    )
    assert res_own.status_code == 200
    doc_data = res_own.json()
    assert doc_data["evidence_id"] == ev_id
    assert "storage_path" not in doc_data
    assert "local_path" not in doc_data
    assert doc_data["is_available"] is True

    # 5. Authorized Reviewer can view the document
    res_rev = client.get(
        f"/api/ml/evidence/{ev_id}",
        headers={"Authorization": f"Bearer {reviewer_tok}"},
    )
    assert res_rev.status_code == 200
    assert "storage_path" not in res_rev.json()

    # 6. Listing scoping: Assessor 2 sees 0 documents
    list_ass2 = client.get(
        "/api/ml/evidence",
        headers={"Authorization": f"Bearer {assessor2_tok}"},
    )
    assert list_ass2.status_code == 200
    assert not any(d["evidence_id"] == ev_id for d in list_ass2.json()["evidence_documents"])

    # 7. Listing scoping: Assessor 1 sees their uploaded document
    list_ass1 = client.get(
        "/api/ml/evidence",
        headers={"Authorization": f"Bearer {assessor1_tok}"},
    )
    assert list_ass1.status_code == 200
    assert any(d["evidence_id"] == ev_id for d in list_ass1.json()["evidence_documents"])
    assert all("storage_path" not in d for d in list_ass1.json()["evidence_documents"])


def test_upload_limits_and_chunked_streaming(client):
    """
    Test upload size boundaries (empty -> 400, >10MB -> 413) and path traversal neutralization.
    """
    auth_mgr = get_auth_manager()
    assessor_tok, _ = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="UPLOAD_TEST_ASSESSOR",
    )

    # 1. Empty file rejected with 400
    res_empty = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_empty.status_code == 400

    # 2. 3-byte file rejected with 400
    res_short = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("short.pdf", io.BytesIO(b"abc"), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_short.status_code == 400

    # 3. Oversized file (> 10MB) rejected with 413
    oversized_bytes = b"%PDF-1.4" + (b"0" * (10 * 1024 * 1024 + 1024))
    res_large = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("huge.pdf", io.BytesIO(oversized_bytes), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_large.status_code == 413
    assert "Payload Too Large" in res_large.json()["detail"]

    # 4. Path traversal filename is safely sanitized
    traversal_pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    res_traversal = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("../../../../etc/passwd.pdf", io.BytesIO(traversal_pdf), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert res_traversal.status_code == 201
    meta = res_traversal.json()
    assert meta["filename"] == "passwd.pdf"
    assert ".." not in meta["filename"]
    assert "/" not in meta["filename"]


def test_unauthenticated_identity_rejection(tmp_path):
    """
    Test that calling submit_assessment, review_assessment, or record_outcome_observation
    without an authenticated user strictly raises PermissionError.
    """
    db_file = tmp_path / "strict_auth.sqlite"
    label_store = AssessmentLabelStore(db_path=db_file, data_dir=tmp_path)
    outcome_store = OutcomeObservationStore(db_path=db_file)

    sub = SiteAssessmentSubmission(
        segment_id="C-14-S001",
        corridor_id="C-14",
        intervention_archetype=InterventionArchetype.LINEAR_STREET_TREES,
        suitability_state=SuitabilityState.CONDITIONAL,
        evidence_reference="PWD/2026/001",
    )

    # 1. Unauthenticated submission raises PermissionError
    with pytest.raises(PermissionError) as exc_info:
        label_store.submit_assessment(sub, authenticated_user=None)
    assert "strictly requires an authenticated municipal officer session" in str(exc_info.value)

    # 2. Unauthenticated review raises PermissionError
    review_act = AssessmentReviewAction(
        assessment_id="assmnt-test1",
        action=ReviewActionType.APPROVE,
        reviewer_note="Attempted unauthenticated review",
    )
    with pytest.raises(PermissionError) as exc_rev:
        label_store.review_assessment(review_act, authenticated_reviewer=None)
    assert "strictly requires an authenticated municipal reviewer session" in str(exc_rev.value)

    # 3. Unauthenticated outcome observation raises PermissionError
    obs = DeploymentOutcomeObservation(
        deployment_id="DEP-TEST-01",
        segment_id="C-14-S001",
        intervention_archetype="linear_street_trees",
        installation_date="2025-01-01",
        observation_date="2026-01-01",
        is_post_intervention=True,
        metric_type=OutcomeMetricType.LST_THERMAL_REDUCTION_CELSIUS,
        measured_value=1.5,
        measurement_unit="celsius",
        measurement_method="SATELLITE_RASTER",
        instrument_details="Terra/Aqua 1000m daytime LST",
        verification_status="EMPIRICAL_VERIFIED",
    )
    with pytest.raises(PermissionError) as exc_obs:
        outcome_store.record_outcome_observation(obs, authenticated_user=None)
    assert "strictly requires an authenticated municipal user session" in str(exc_obs.value)


def test_evidence_verification_audit_history_append_only(client):
    """
    Test that evidence document verification produces an append-only, immutable audit trail.
    """
    auth_mgr = get_auth_manager()
    assessor_tok, assessor_user = auth_mgr.provision_test_user(
        role=ReviewerRole.FIELD_ASSESSOR,
        user_id="HIST_ASSESSOR_01",
    )
    reviewer1_tok, reviewer1_user = auth_mgr.provision_test_user(
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        user_id="HIST_REVIEWER_01",
    )
    reviewer2_tok, reviewer2_user = auth_mgr.provision_test_user(
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        user_id="HIST_REVIEWER_02",
    )

    # Upload document
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/api/ml/evidence/upload",
        files={"file": ("history_test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        data={"document_type": "GPR_UTILITY_SURVEY"},
        headers={"Authorization": f"Bearer {assessor_tok}"},
    )
    assert upload_res.status_code == 201
    ev_id = upload_res.json()["evidence_id"]

    # 1. Reviewer 1 approves document
    res_v1 = client.post(
        f"/api/ml/evidence/{ev_id}/verify",
        json={"action": "APPROVE", "verification_notes": "First round verification passed"},
        headers={"Authorization": f"Bearer {reviewer1_tok}"},
    )
    assert res_v1.status_code == 200

    # 2. Reviewer 2 subsequently rejects document based on further survey
    res_v2 = client.post(
        f"/api/ml/evidence/{ev_id}/verify",
        json={"action": "REJECT", "verification_notes": "Subsurface utility conflict re-detected"},
        headers={"Authorization": f"Bearer {reviewer2_tok}"},
    )
    assert res_v2.status_code == 200
    assert res_v2.json()["verification_status"] == EvidenceVerificationStatus.EVIDENCE_REJECTED.value

    # 3. Retrieve immutable history trail
    res_hist = client.get(
        f"/api/ml/evidence/{ev_id}/history",
        headers={"Authorization": f"Bearer {reviewer1_tok}"},
    )
    assert res_hist.status_code == 200
    history = res_hist.json()["verification_history"]
    assert len(history) == 2

    # Verify event 1
    ev1 = history[0]
    assert ev1["decision"] == "APPROVE"
    assert ev1["reviewer_id"] == "HIST_REVIEWER_01"
    assert ev1["new_status"] == EvidenceVerificationStatus.EVIDENCE_VERIFIED.value
    assert ev1["previous_status"] == EvidenceVerificationStatus.EVIDENCE_PENDING_REVIEW.value

    # Verify event 2
    ev2 = history[1]
    assert ev2["decision"] == "REJECT"
    assert ev2["reviewer_id"] == "HIST_REVIEWER_02"
    assert ev2["new_status"] == EvidenceVerificationStatus.EVIDENCE_REJECTED.value
    assert ev2["previous_status"] == EvidenceVerificationStatus.EVIDENCE_VERIFIED.value


def test_evidence_storage_manager_lifecycle(tmp_path):
    """
    Test EvidenceStorageManager: randomized object keys, private access, SHA-256 verification,
    and truthful status reporting.
    """
    storage = EvidenceStorageManager(base_dir=tmp_path / "evidence")

    # Status without Spaces credentials must report LOCAL_STORAGE_ONLY
    status_report = storage.get_storage_status()
    assert status_report["status"] == "LOCAL_STORAGE_ONLY"
    assert status_report["durable_cloud_storage"] is False

    # Store a test file
    content = b"%PDF-1.4\nSample GPR utility clearance scan\n%%EOF"
    stored = storage.store_evidence_file(
        evidence_id="evid-test-001",
        original_filename="../../../unsafe_name.pdf",
        file_bytes=content,
        mime_type="application/pdf",
    )
    assert stored["storage_backend"] == "LOCAL"
    assert stored["is_durable"] is False
    assert stored["object_key"].startswith("evidence/evid-test-001/")
    assert stored["object_key"].endswith(".pdf")
    assert "unsafe_name" not in stored["object_key"]
    assert Path(stored["local_path"]).exists()

    # Retrieve and verify checksum
    retrieved = storage.retrieve_evidence_bytes(
        evidence_id="evid-test-001",
        local_path=stored["local_path"],
        expected_sha256=stored["sha256_checksum"],
    )
    assert retrieved == content

    # Corrupting file triggers ValueError
    Path(stored["local_path"]).write_bytes(b"%PDF-1.4 CORRUPTED FILE CONTENT")
    with pytest.raises(ValueError) as exc_tamper:
        storage.retrieve_evidence_bytes(
            evidence_id="evid-test-001",
            local_path=stored["local_path"],
            expected_sha256=stored["sha256_checksum"],
        )
    assert "integrity compromise" in str(exc_tamper.value)


def test_token_keyed_hmac_and_transactional_rotation(tmp_path):
    """
    Test O(1) keyed HMAC token authentication and single-transaction rotation.
    """
    store = CredentialStore(db_path=tmp_path / "test_auth.sqlite", hmac_secret="test_secret_12345")
    user = AuthenticatedUser(
        user_id="ROT_USER_01",
        username="rot.user",
        full_name="Rotation Test Officer",
        role=ReviewerRole.FIELD_ASSESSOR,
        organization="Public Works Department",
    )

    # 1. Create token and authenticate via HMAC
    token1 = store.create_token(user)
    assert token1.startswith("vs_")
    auth_user = store.authenticate(token1)
    assert auth_user is not None
    assert auth_user.user_id == "ROT_USER_01"

    # 2. Fast O(1) indexed lookup: verify token_hmac column is present
    with store._get_conn() as conn:
        row = conn.execute("SELECT token_hmac, token_prefix FROM api_credentials WHERE user_id = ?", ("ROT_USER_01",)).fetchone()
        assert row["token_hmac"] == compute_token_hmac(token1, "test_secret_12345")
        assert row["token_prefix"] == token1[:7]

    # 3. Transactional rotation: atomically revoke token1 and issue token2
    rot_result = store.rotate_token(token1)
    assert rot_result is not None
    token2, rot_user = rot_result
    assert token2 != token1
    assert rot_user.user_id == "ROT_USER_01"

    # Old token fails authentication immediately
    assert store.authenticate(token1) is None

    # New token succeeds
    auth_user2 = store.authenticate(token2)
    assert auth_user2 is not None
    assert auth_user2.user_id == "ROT_USER_01"

