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

import os
import tempfile
from pathlib import Path
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from shapely.geometry import Point, LineString

from app.main import app
from ml.validation import TrainingDataEligibilityValidator, ContaminatedDataError
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
from ml.sources.cpcb_airquality import DELHI_CAAQM_STATIONS
from ml.preprocessing.segmentation import CorridorSegmenter
from ml.preprocessing.zonal_stats import ZonalStatsSampler
from ml.labels.schema import (
    AssessmentReviewAction,
    InterventionArchetype,
    SiteAssessmentSubmission,
    SuitabilityState,
)
from ml.labels.store import AssessmentLabelStore
from ml.training.data_builder import TrainingDatasetBuilder, InsufficientLabelsError
from ml.training.registry import ModelRegistry
from ml.inference.hard_constraints import HardConstraintValidator
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
        saved = store.submit_assessment(submission)
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
        updated = store.review_assessment(review_action)
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
    # Case A: Narrow ROW (< 2.5m) should strictly forbid linear_street_trees
    narrow_features = {
        "estimated_row_width_m": 1.8,
        "gpr_utility_survey_status": "VERIFIED_CLEAR",
    }
    res = HardConstraintValidator.evaluate_constraints("linear_street_trees", narrow_features)
    assert res.has_hard_constraint is True
    assert res.forced_state == "INELIGIBLE"
    assert any("Inadequate Right-of-Way" in r for r in res.constraint_reasons)

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
        saved = store.record_outcome_observation(obs)
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


def test_api_site_assessments_security_and_roundtrip(client):
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
    auth_headers = {"Authorization": "Bearer token_field_pwd_7104"}
    post_res = client.post("/api/ml/site-assessments", json=payload, headers=auth_headers)
    assert post_res.status_code in (200, 201)
    saved = post_res.json()
    assert saved["assessment_id"] is not None
    # Server injected identity, rejecting client role tampering
    assert saved["reviewer_id"] == "PWD_ENG_7104"
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
        headers={"Authorization": "Bearer token_field_pwd_7104"},
    )
    assert assessor_review_res.status_code == 403

    # 4. Authorized Reviewer from MCD reviews assessment
    reviewer_headers = {"Authorization": "Bearer token_reviewer_mcd_3012"}
    review_res = client.patch(
        f"/api/ml/site-assessments/{ass_id}",
        json=review_payload,
        headers=reviewer_headers,
    )
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["review_status"] == "APPROVED"
    assert reviewed_data["last_reviewed_by"] == "MCD_REV_3012"
    assert reviewed_data["audit_history"][-1]["performed_by"] == "MCD_REV_3012"

    # 5. List endpoint returns recorded assessments
    get_res = client.get("/api/ml/site-assessments?segment_id=C-14-S002")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["count"] >= 1


def test_api_outcome_observations_security_and_roundtrip(client):
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
    auth_headers = {"Authorization": "Bearer token_field_pwd_7104"}
    post_res = client.post("/api/ml/outcome-observations", json=payload, headers=auth_headers)
    assert post_res.status_code in (200, 201)
    saved = post_res.json()
    assert saved["observation_id"] is not None
    assert saved["deployment_id"] == "DEP-TEST-002"
    assert saved["recorder_id"] == "PWD_ENG_7104"


def test_api_model_governance_rbac_promotion(client):
    promote_payload = {
        "model_version": "v_nonexistent_test",
        "approval_note": "Attempted unauthorized promotion",
    }
    # Field assessor cannot promote -> 403 Forbidden
    res_field = client.post(
        "/api/ml/model/promote",
        json=promote_payload,
        headers={"Authorization": "Bearer token_field_pwd_7104"},
    )
    assert res_field.status_code == 403

    # Senior reviewer has permission -> passes auth gate, returns 404 for nonexistent version
    res_senior = client.post(
        "/api/ml/model/promote",
        json=promote_payload,
        headers={"Authorization": "Bearer token_senior_delhi_001"},
    )
    assert res_senior.status_code in (400, 404)
