"""
End-to-End FastAPI Endpoint Verification Tests (Section 7).
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_and_health_endpoints():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["theme"] == "GreenTech"

    health = client.get("/api/health")
    assert health.status_code == 200
    data = health.json()
    assert data["status"] == "healthy"
    assert data["ndvi_native_shape"] == [5572, 7794]
    assert data["lst_native_shape"] == [57, 79]
    assert data["corridors_loaded"] == 44


def test_layers_and_provenance_endpoints():
    prov = client.get("/api/provenance")
    assert prov.status_code == 200
    p_json = prov.json()
    assert p_json["scientific_integrity_policy"]["preserve_native_resolution"] is True
    assert p_json["datasets"]["lst"]["native_resolution_m"] == 1000.0
    assert p_json["datasets"]["ndvi"]["native_resolution_m"] == 10.0

    layers = client.get("/api/layers")
    assert layers.status_code == 200
    assert layers.json()["count"] == 5

    lst_meta = client.get("/api/layers/lst/metadata")
    assert lst_meta.status_code == 200
    assert lst_meta.json()["native_resolution_m"] == 1000.0


def test_tiles_and_legends_endpoints():
    for layer in ("ndvi", "lst", "gdi", "corridors"):
        leg = client.get(f"/api/tiles/{layer}/legend")
        assert leg.status_code == 200
        assert "stops" in leg.json()

        # Tile over Delhi (z=11, x=1463, y=858)
        tile_resp = client.get(f"/api/tiles/{layer}/11/1463/858.png")
        assert tile_resp.status_code == 200
        assert tile_resp.headers["content-type"] == "image/png"
        assert len(tile_resp.content) > 100


def test_corridors_scenarios_sensitivity_and_explain():
    corr_resp = client.get("/api/corridors?scenario=heat_resilience&district=Central%20Delhi")
    assert corr_resp.status_code == 200
    c_data = corr_resp.json()
    assert c_data["metadata"]["active_scenario"] == "heat_resilience"
    assert len(c_data["corridors"]) > 0

    first_id = c_data["corridors"][0]["id"]
    detail = client.get(f"/api/corridors/{first_id}")
    assert detail.status_code == 200
    assert "calculation_breakdown" in detail.json()
    assert "intervention_plan" in detail.json()

    explain = client.get(f"/api/corridors/{first_id}/explain")
    assert explain.status_code == 200
    assert "formula_trace" in explain.json()

    sens = client.get("/api/corridors/sensitivity?scenario=pedestrian_equity")
    assert sens.status_code == 200
    assert sens.json()["total_corridors"] == 44

    dists = client.get("/api/corridors/districts")
    assert dists.status_code == 200
    assert len(dists.json()["districts"]) == 11

    zones = client.get("/api/corridors/raster-zones")
    assert zones.status_code == 200
    assert zones.json()["type"] == "FeatureCollection"


def test_interventions_aqi_and_stats_endpoints():
    cat = client.get("/api/interventions/catalog")
    assert cat.status_code == 200
    assert len(cat.json()["interventions"]) == 5

    aqi_st = client.get("/api/aqi/stations")
    assert aqi_st.status_code == 200
    assert len(aqi_st.json()["features"]) == 8

    stats_sum = client.get("/api/stats/summary")
    assert stats_sum.status_code == 200
    assert stats_sum.json()["corridors_overview"]["total_corridors"] == 44

    pt = client.get("/api/stats/point?lat=28.6289&lng=77.2405")
    assert pt.status_code == 200
    pt_data = pt.json()
    assert pt_data["lst_native_1km"] is not None
    assert pt_data["lst_display_10m"] is not None
    assert pt_data["ndvi"] is not None


def test_legacy_parity_roads_and_community_endpoints():
    # 1. /api/roads/simple
    roads = client.get("/api/roads/simple")
    assert roads.status_code == 200
    r_data = roads.json()
    assert r_data["type"] == "FeatureCollection"
    assert len(r_data["features"]) > 0

    # 2. Upvotes
    c_resp = client.get("/api/corridors")
    cid = c_resp.json()["features"][0]["properties"]["id"]

    upvotes = client.get(f"/api/corridors/{cid}/upvotes")
    assert upvotes.status_code == 200
    u_data = upvotes.json()
    assert "upvotes" in u_data
    init_count = u_data["upvotes"]

    post_up = client.post(f"/api/corridors/{cid}/upvote")
    assert post_up.status_code == 200
    assert post_up.json()["upvotes"] == init_count + 1

    # 3. Suggestions
    suggs = client.get(f"/api/corridors/{cid}/suggestions")
    assert suggs.status_code == 200
    assert "suggestions" in suggs.json()

    post_sugg = client.post(f"/api/corridors/{cid}/suggestions", json={"text": "Add solar shade canopies"})
    assert post_sugg.status_code == 200
    assert post_sugg.json()["success"] is True


