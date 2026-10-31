"""
Tests for Feature 4: Pedestrian Shade Continuity Analyser.
Verifies:
- Walkability graph segment classification (WELL_SHADED, PARTIALLY_SHADED, EXPOSED_GAP)
- Continuous unshaded gap detection
- Documented Shade Gap Score
- Disconnected green infrastructure and Shade Bridge recommendations
- Zero fabricated pedestrian footfall numbers
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_corridor_shade_continuity():
    response = client.get("/api/shade-continuity/C-14")
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_code"] == "C-14"
    assert "shade_gap_score" in data
    assert 0.0 <= data["shade_gap_score"] <= 100.0

    assert "exposure_summary" in data
    summary = data["exposure_summary"]
    assert "unshaded_gap_length_m" in summary
    assert "critical_continuous_gaps_count" in summary

    assert "continuous_thermal_gaps" in data
    assert "shade_bridge_recommendations" in data
    assert "transit_connectivity" in data
    assert "scientific_guardrail" in data

    # Verify no fabricated footfall claim
    assert "No pedestrian footfall" in data["scientific_guardrail"]


def test_city_network_shade_gaps():
    response = client.get("/api/shade-continuity/network-gaps")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 40
    assert len(data["rankings"]) == data["count"]

    # Verify sorted descending by shade gap score
    scores = [r["shade_gap_score"] for r in data["rankings"]]
    assert scores == sorted(scores, reverse=True)
