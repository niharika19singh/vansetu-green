"""
VanSetu GreenTech — Acceptance Test Suite for Evidence Passport & Data Provenance Modules.

Verifies:
1. Evidence Passport Catalogue (44 corridors, 11 districts, status filters, search)
2. Comprehensive 8-Section Corridor Evidence Dossier (Identity, MODIS, Sentinel-2, CPCB, Infrastructure, 6 Dimensions, Field Verification, Export)
3. Role-Enforced Field Verification Workflow (Auth 403 rejection vs Admin signoff)
4. Verification History Audit Trail
5. Data Provenance Summary & Searchable Dataset Catalog (7 institutional sources)
6. Interactive 9-Stage Data Lineage DAG Architecture
7. On-Disk Geospatial Asset Freshness & Real Health Checks
8. Chronological Provenance Audit Ledger & JSON Manifest Export
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from ml.security.auth import get_auth_manager, ReviewerRole

client = TestClient(app)


# -----------------------------------------------------------------------------
# MODULE 1: EVIDENCE PASSPORT ACCEPTANCE TESTS
# -----------------------------------------------------------------------------

def test_evidence_catalogue_overview_and_district_filters():
    """Test catalogue returns all 44 corridors and filters by district and verification status."""
    res = client.get("/api/evidence/catalogue")
    assert res.status_code == 200
    data = res.json()

    assert data["total_corridors"] == 44
    assert data["verified_count"] >= 8
    assert data["pending_verification_count"] >= 20
    assert len(data["canonical_districts"]) == 11
    assert len(data["corridors"]) == 44

    # Verify corridor card fields
    card = data["corridors"][0]
    assert "corridor_id" in card
    assert "corridor_code" in card
    assert "corridor_name" in card
    assert "district" in card
    assert "verification_status" in card
    assert "evidence_completeness" in card
    assert "key_metrics" in card
    assert "sources" in card

    # Test District Filter (e.g. 'New Delhi')
    nd_res = client.get("/api/evidence/catalogue?district=New%20Delhi")
    assert nd_res.status_code == 200
    nd_data = nd_res.json()
    assert nd_data["filtered_count"] > 0
    assert all(c["district"] in ("New Delhi", "New Delhi District") for c in nd_data["corridors"])

    # Test Verification Status Filter ('verified')
    v_res = client.get("/api/evidence/catalogue?status=verified")
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["filtered_count"] >= 8
    assert all(c["verification_status"] == "verified" for c in v_data["corridors"])

    # Test Search query ('Barakhamba')
    s_res = client.get("/api/evidence/catalogue?search=Barakhamba")
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert s_data["filtered_count"] >= 1
    assert any("Barakhamba" in c["corridor_name"] for c in s_data["corridors"])


def test_corridor_evidence_passport_eight_sections():
    """Test that individual evidence passport contains all 8 required sections with genuine data."""
    res = client.get("/api/evidence/passport/C-14")
    assert res.status_code == 200
    p = res.json()

    assert p["corridor_code"] == "C-14"
    assert len(p["corridor_name"]) > 0
    assert p["district"] in ("South", "South Delhi")

    # Section A: Corridor Identity
    ident = p["corridor_identity"]
    assert ident["corridor_id"] == "delhi_corridor_014" or "014" in ident["corridor_id"]
    assert ident["geometry"]["type"] == "LineString"
    assert len(ident["geometry"]["coordinates"]) > 0
    assert ident["centroid"] is not None
    assert ident["corridor_length_km"] > 0.0
    assert "Urban Corridor" in ident["highway_classification"]

    # Section B: Thermal Evidence — MODIS LST
    thermal = p["thermal_evidence"]
    assert "MODIS" in thermal["dataset_name"]
    assert "1,000m" in thermal["native_measurement_resolution"]
    assert "10m" in thermal["display_resolution"]
    assert thermal["display_lst_celsius"] is not None
    assert "NOT 2m ambient" in thermal["physical_meaning_disclosure"]

    # Section C: Vegetation Evidence — Sentinel-2
    veg = p["vegetation_evidence"]
    assert "Sentinel-2" in veg["dataset_name"]
    assert veg["native_resolution"] == "10m × 10m"
    assert veg["measured_ndvi"] is not None
    assert "NDVI = (B08 - B04) / (B08 + B04)" in veg["calculation_formula"]
    assert "BOA" in veg["quality_status"]

    # Section D: Air Quality Evidence — CPCB
    aqi = p["air_quality_evidence"]
    assert aqi["aqi"] is not None
    assert aqi["station_name"] != ""
    assert aqi["station_distance_km"] is not None
    assert "HONEST PROXIMITY LIMITATION" in aqi["proximity_disclaimer"]
    assert "NOT a direct vehicle-exhaust measurement" in aqi["proximity_disclaimer"]

    # Section E: Geographic and Infrastructure Evidence
    infra = p["infrastructure_evidence"]
    assert infra["estimated_row_width_guideline_m"] > 0
    assert "IRC:SP:73" in infra["row_width_estimation_basis"]
    assert "Right-of-Way width is an IRC guideline estimate" in infra["estimation_vs_verification_distinction"]

    # Section F: 6-Dimension Quality Assessment
    dims = p["data_quality_dimensions"]
    assert "source_authenticity" in dims
    assert "spatial_resolution" in dims
    assert "temporal_freshness" in dims
    assert "data_completeness" in dims
    assert "geographic_relevance" in dims
    assert "field_verification" in dims
    assert "recommendation_confidence" in dims

    assert dims["source_authenticity"]["score"] > 80.0
    assert "formula" in dims["source_authenticity"]
    assert "limitations" in dims["source_authenticity"]

    # Section G: Field Verification
    vf = p["field_verification"]
    assert vf["status"] in ("verified", "pending_field_survey", "unverified")
    assert len(vf["mandatory_checkpoints"]) >= 4
    assert len(vf["missing_physical_measurements"]) >= 4

    # Section H: Evidence Export
    exp = p["evidence_export"]
    assert len(exp["export_hash"]) == 64  # SHA256 length
    assert exp["export_schema_version"] == "2.1.0"
    assert len(exp["source_references"]) >= 4


def test_field_verification_rbac_enforcement():
    """Verify unauthorized users are rejected (403) and Government Admin can sign off verifications."""
    # 1. Unauthenticated or public citizen user must be rejected
    auth_mgr = get_auth_manager()
    citizen_token, _ = auth_mgr.provision_test_user(
        role=ReviewerRole.NORMAL_USER,
        user_id="CITIZEN_TEST_001",
        username="citizen.tester",
        full_name="Citizen Tester",
        organization="Public",
        expires_in_seconds=600,
        is_demo=True,
    )

    unauthorized_res = client.post(
        "/api/evidence/verify",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={
            "corridor_id": "C-14",
            "status": "verified",
            "survey_notes": "Attempting unauthorized citizen signoff",
            "checkpoints_verified": ["Ground-Penetrating Radar (GPR) Utility Clearance"],
        },
    )
    assert unauthorized_res.status_code == 403
    detail_msg = unauthorized_res.json()["detail"]
    assert "Access Denied" in detail_msg or "Forbidden" in detail_msg

    # 2. Government Admin must be authorized to sign off
    admin_token, _ = auth_mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ADMIN,
        user_id="GOVT_ADMIN_TEST_001",
        username="govt.admin.test",
        full_name="Er. Sunita Rao",
        organization="Delhi Public Works Department (Headquarters)",
        expires_in_seconds=600,
        is_demo=True,
    )

    authorized_res = client.post(
        "/api/evidence/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "corridor_id": "delhi_corridor_014",
            "status": "verified",
            "survey_notes": "Official PWD Joint Inspection signoff. GPR scans and IRC:103 clear width verified on-site.",
            "checkpoints_verified": [
                "Ground-Penetrating Radar (GPR) Utility Clearance",
                "Clear Sidewalk Pedestrian Width Audit (IRC:103)",
                "Treated Effluent (STP) Non-Potable Irrigation Guarantee",
                "Structural Load & Wind-Shear Engineering Assessment",
            ],
        },
    )
    assert authorized_res.status_code == 200
    res_data = authorized_res.json()
    assert res_data["status"] == "success"
    assert res_data["verification"]["status"] == "verified"
    assert res_data["verification"]["verified_by"] == "Er. Sunita Rao"

    # Verify history is logged
    hist_res = client.get("/api/evidence/history/delhi_corridor_014")
    assert hist_res.status_code == 200
    hist = hist_res.json()["history"]
    assert len(hist) > 0
    assert any("Official PWD Joint Inspection" in h["notes"] for h in hist)


# -----------------------------------------------------------------------------
# MODULE 2: DATA PROVENANCE ACCEPTANCE TESTS
# -----------------------------------------------------------------------------

def test_provenance_summary_and_dataset_catalog():
    """Verify platform-wide provenance summary and all 7 registered institutional datasets."""
    res = client.get("/api/provenance/summary")
    assert res.status_code == 200
    summary = res.json()

    assert summary["total_registered_datasets"] >= 7
    assert summary["active_sources"] >= 6
    assert summary["available_data_layers"] == 10
    assert summary["system_status"] in ("HEALTHY", "OPERATIONAL_WITH_FALLBACKS")
    assert summary["lineage_stages_count"] == 9

    # List datasets
    ds_res = client.get("/api/provenance/datasets")
    assert ds_res.status_code == 200
    ds_data = ds_res.json()
    assert ds_data["total_registered"] >= 7
    dataset_ids = [d["id"] for d in ds_data["datasets"]]
    assert "sentinel2" in dataset_ids
    assert "modis" in dataset_ids
    assert "cpcb" in dataset_ids
    assert "osm" in dataset_ids
    assert "era5" in dataset_ids
    assert "districts" in dataset_ids
    assert "hospital_health" in dataset_ids

    # Search datasets ('Copernicus')
    search_res = client.get("/api/provenance/datasets?search=Copernicus")
    assert search_res.status_code == 200
    assert search_res.json()["count"] >= 1


def test_provenance_dataset_detail_endpoints():
    """Verify detailed scientific metadata for Sentinel-2, MODIS, and CPCB."""
    # Sentinel-2
    s2_res = client.get("/api/provenance/datasets/sentinel2")
    assert s2_res.status_code == 200
    s2 = s2_res.json()
    assert "European Space Agency" in s2["provider"]
    assert s2["native_resolution"] == "10m × 10m (True Native Pixel)"
    assert "NDVI = (B08 - B04) / (B08 + B04)" in s2["formula"]
    assert len(s2["known_limitations"]) >= 1
    assert "https://" in s2["docs_url"]

    # MODIS
    mod_res = client.get("/api/provenance/datasets/modis")
    assert mod_res.status_code == 200
    mod = mod_res.json()
    assert "NASA" in mod["provider"]
    assert "1,000m" in mod["native_resolution"]
    assert mod["resampling_applied"] is True
    assert "Bilinear" in mod["resampling_method"]
    assert "NOT 2m ambient" in mod["known_limitations"][1]

    # CPCB
    cpcb_res = client.get("/api/provenance/datasets/cpcb")
    assert cpcb_res.status_code == 200
    cpcb = cpcb_res.json()
    assert "Central Pollution Control Board" in cpcb["provider"]
    assert "Point Monitoring Station" in cpcb["native_resolution"]
    assert any("ambient regional measurement" in lim for lim in cpcb["known_limitations"])


def test_provenance_lineage_graph_dag():
    """Verify interactive 9-stage lineage graph structure, nodes, formulas, and connections."""
    res = client.get("/api/provenance/lineage")
    assert res.status_code == 200
    lineage = res.json()

    assert len(lineage["stages"]) == 9
    assert lineage["total_nodes"] >= 20
    assert lineage["total_edges"] >= 20

    stage_ids = [s["id"] for s in lineage["stages"]]
    assert "raw_sources" in stage_ids
    assert "data_ingestion" in stage_ids
    assert "preprocessing" in stage_ids
    assert "spatial_alignment" in stage_ids
    assert "analytical_indicators" in stage_ids
    assert "corridor_scoring" in stage_ids
    assert "risk_assessment" in stage_ids
    assert "intervention_recommendations" in stage_ids
    assert "final_planning_decisions" in stage_ids

    # Verify node formulas
    nodes_by_id = {n["id"]: n for n in lineage["nodes"]}
    assert "transformation_formula" in nodes_by_id["align_grid_resampling"]
    assert "transformation_formula" in nodes_by_id["score_tri_vector"]
    assert "transformation_formula" in nodes_by_id["score_missing_renorm"]
    assert "code_reference" in nodes_by_id["rec_irc103_feasibility"]


def test_provenance_health_real_asset_checks():
    """Verify real checks on underlying geospatial files on disk."""
    res = client.get("/api/provenance/health")
    assert res.status_code == 200
    health = res.json()

    assert health["active_sources"] >= 5
    assert len(health["checks"]) >= 6

    checks_by_id = {c["asset_id"]: c for c in health["checks"]}
    assert "sentinel2_ndvi" in checks_by_id
    assert checks_by_id["sentinel2_ndvi"]["status"] == "HEALTHY"
    assert checks_by_id["sentinel2_ndvi"]["size_bytes"] > 100_000_000  # ~250MB GeoTIFF

    assert "modis_lst" in checks_by_id
    assert checks_by_id["modis_lst"]["status"] == "HEALTHY"

    assert "osm_corridors" in checks_by_id
    assert checks_by_id["osm_corridors"]["status"] == "HEALTHY"

    assert "cpcb_network" in checks_by_id
    assert checks_by_id["cpcb_network"]["status"] in ("LIVE_TELEMETRY_CONNECTED", "CACHED_SEASONAL_BASELINE")


def test_provenance_audit_and_manifest_export():
    """Verify chronological audit ledger and full provenance manifest export."""
    audit_res = client.get("/api/provenance/audit")
    assert audit_res.status_code == 200
    audit = audit_res.json()
    assert audit["total_events"] >= 5
    categories = [e["category"] for e in audit["events"]]
    assert "DATASET_REGISTRATION" in categories
    assert "METHODOLOGY_CALIBRATION" in categories

    # Manifest export
    exp_res = client.get("/api/provenance/export")
    assert exp_res.status_code == 200
    manifest = exp_res.json()
    assert manifest["manifest_type"] == "VanSetu Institutional Data Provenance Manifest"
    assert "summary" in manifest
    assert "datasets" in manifest
    assert "lineage" in manifest
    assert "health_checks" in manifest
    assert "audit_history" in manifest
