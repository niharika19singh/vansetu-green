"""
Tests for Feature 5: Seasonal Urban Heat Intelligence.
Verifies:
- Multi-temporal observations across 3 climate windows (Pre-Monsoon, Monsoon, Post-Monsoon/Winter)
- Persistent thermal hotspot detection
- MODIS 1,000m native vs 10m display resolution documentation
- Strict human thermal comfort (UTCI/WBGT) disclaimer
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_corridor_seasonal_profile():
    response = client.get("/api/seasonal/corridor/C-14")
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_code"] == "C-14"
    assert "hotspot_classification" in data
    assert data["hotspot_classification"] in ["PERSISTENT_THERMAL_HOTSPOT", "TRANSIENT_THERMAL_ANOMALY", "COOL_CORRIDOR_REFUGE"]

    # Check 3 seasonal observations
    obs = data["seasonal_observations"]
    assert len(obs) == 3
    seasons = [o["season"] for o in obs]
    assert any("Pre-Monsoon" in s for s in seasons)
    assert any("Monsoon" in s for s in seasons)
    assert any("Winter" in s for s in seasons)

    # Resolution provenance
    prov = data["multi_sensor_provenance"]
    assert "1,000m" in prov["native_spatial_resolution"]
    assert "Landsat" in prov["landsat_comparison"]["sensor"]

    # Human thermal comfort disclaimer
    disc = data["scientific_disclaimer"]
    assert disc["utci_status"] == "NOT_AVAILABLE"
    assert disc["wbgt_status"] == "NOT_AVAILABLE"
    assert "skin" in disc["mandatory_notice"].lower()


def test_seasonal_hotspots():
    response = client.get("/api/seasonal/hotspots")
    assert response.status_code == 200
    data = response.json()
    assert "persistent_hotspots" in data
    assert data["count"] == len(data["persistent_hotspots"])


def test_seasonal_baselines():
    response = client.get("/api/seasonal/baselines")
    assert response.status_code == 200
    data = response.json()
    assert "pre_monsoon" in data["seasons"]
    assert "monsoon" in data["seasons"]
    assert "post_monsoon_winter" in data["seasons"]
