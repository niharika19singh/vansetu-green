"""
Unit and integration tests for Corridor Microclimate Prediction,
District Normalization, Two-Factor What-If Ranking, and Legacy Community/Health Parity.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.corridor_service import corridor_service, DELHI_DISTRICTS_CANONICAL, normalize_district_name
from app.services.prediction_service import prediction_service, PREDICTION_HORIZONS

client = TestClient(app)


def test_district_normalization_and_audit():
    """Verify all 11 Delhi administrative districts normalize and return valid audit metrics."""
    assert len(DELHI_DISTRICTS_CANONICAL) == 11
    audit = corridor_service.get_district_audit()
    assert audit["total_districts"] == 11
    assert audit["covered_districts"] == 11
    assert audit["total_corridors"] == 44

    for d in DELHI_DISTRICTS_CANONICAL:
        # Short name
        res_short = corridor_service.get_corridors(district=d)
        assert len(res_short["corridors"]) > 0, f"District {d} returned 0 corridors"
        # Full name
        full_d = d + " Delhi" if d != "New Delhi" else "New Delhi"
        res_full = corridor_service.get_corridors(district=full_d)
        assert len(res_short["corridors"]) == len(res_full["corridors"]), f"Mismatch for {d}"


def test_api_district_audit_endpoint():
    """Test GET /api/corridors/districts/audit endpoint."""
    res = client.get("/api/corridors/districts/audit")
    assert res.status_code == 200
    data = res.json()
    assert data["total_districts"] == 11
    assert data["covered_districts"] == 11
    assert len(data["districts"]) == 11


def test_api_what_if_ranking_endpoint():
    """Test GET /api/corridors/rank two-factor ranking formula."""
    res = client.get("/api/corridors/rank?heat_weight=0.75&top=5")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["heat_weight"] == 0.75
    assert data["green_weight"] == 0.25
    assert len(data["corridors"]) == 5

    # Check score ordering
    scores = [c["score"] for c in data["corridors"]]
    assert scores == sorted(scores, reverse=True)


def test_api_explain_ranking_endpoint():
    """Test POST /api/corridors/explain-ranking deterministic mathematical breakdown."""
    payload = {
        "name": "Outer Ring Road (Nehru Place to IIT Gate)",
        "district": "South",
        "heat_weight": 0.75,
        "heat": 0.82,
        "ndvi": 0.15,
        "green_deficit": 0.85,
        "score": 0.8275,
        "rank": 1,
        "baseline_rank": 3,
        "rank_change": 2,
    }
    res = client.post("/api/corridors/explain-ranking", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "explanation" in data
    assert "Outer Ring Road" in data["explanation"]
    assert "0.75" in data["explanation"]


def test_api_prediction_horizons():
    """Test GET /api/prediction/scenarios."""
    res = client.get("/api/prediction/scenarios")
    assert res.status_code == 200
    horizons = res.json()
    assert len(horizons) == 5
    ids = [h["id"] for h in horizons]
    assert "horizon_1yr_2027" in ids
    assert "horizon_3yr_2029" in ids
    assert "horizon_5yr_2031" in ids
    assert "extreme_heatwave_2030" in ids
    assert "vansetu_greened_2028" in ids


def test_api_prediction_corridor():
    """Test predictive model for C-14."""
    res = client.get("/api/prediction/corridor/delhi_corridor_014?horizon_id=horizon_3yr_2029")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "observed_metrics" in data
    assert "predicted_metrics" in data
    assert "feature_attributions" in data
    assert "intervention_mitigation_potential" in data

    pred = data["predicted_metrics"]
    assert pred["lst_celsius"] > 0.0
    assert len(pred["confidence_interval_90"]) == 2
    assert pred["confidence_interval_90"][0] < pred["confidence_interval_90"][1]


def test_api_community_and_health_data():
    """Test community and health data submission and retrieval."""
    # 1. Districts list
    r_dist = client.get("/api/districts")
    assert r_dist.status_code == 200
    assert len(r_dist.json()["districts"]) == 11

    from uuid import uuid4
    # 2. Community observation submit
    r_comm = client.post(
        "/api/community-data",
        json={
            "city": "Delhi",
            "ward": "Central",
            "street": f"Barakhamba Crossing {uuid4().hex[:6]}",
            "heatLevel": "Extreme",
            "shadeLevel": "Minimal Shade",
        },
    )
    assert r_comm.status_code == 200
    assert r_comm.json()["status"] == "success"

    # 3. Community observations get
    r_comm_list = client.get("/api/community-data")
    assert r_comm_list.status_code == 200
    assert isinstance(r_comm_list.json(), list)

    # 4. Health data submit
    r_health = client.post(
        "/api/health-data",
        json={
            "district": "Central",
            "area": "LNJP Hospital",
            "heatstroke_cases": 8,
            "dehydration_cases": 19,
            "respiratory_cases": 32,
        },
    )
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "success"

    # 5. Health data query
    r_health_q = client.get("/api/health-data/Central")
    assert r_health_q.status_code == 200
    assert len(r_health_q.json()) > 0
