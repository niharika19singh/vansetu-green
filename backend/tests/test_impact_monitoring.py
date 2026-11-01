"""
Tests for Feature 6: Climate Intervention Impact Monitoring.
Verifies:
- Persistent lifecycle registry (PLANNED, UNDER_CONSTRUCTION, OPERATIONAL, MAINTENANCE_REQUIRED)
- Empirical before-and-after delta computation
- Control corridor comparison
- Non-causal attribution honesty disclaimer
- Registration and lifecycle status updates
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_impact_registry():
    response = client.get("/api/impact/registry")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert len(data["deployments"]) == data["count"]

    # Verify demo record is present
    first = data["deployments"][0]
    assert "lifecycle_status" in first
    assert "baseline_metrics" in first


def test_deployment_detail_and_attribution():
    response = client.get("/api/impact/deployment/DEP-DEL-C14-2024-01")
    assert response.status_code == 200
    data = response.json()

    assert "empirical_deltas" in data
    assert "control_corridor_comparison" in data
    assert "attribution_honesty_disclaimer" in data

    # Verify attribution disclaimer mentions non-causality
    assert "DOES NOT claim sole causality" in data["attribution_honesty_disclaimer"]


def test_create_and_update_deployment_lifecycle():
    new_dep = {
        "corridor_id": "8",
        "archetype": "Roadside Bioswales",
        "lifecycle_status": "PLANNED",
        "planned_date": "2024-11-01",
        "capex_inr_lakhs": 22.0,
        "opex_annual_lakhs": 1.8,
        "units_deployed": 4,
        "control_corridor_id": "12",
        "notes": "Test Deployment",
    }
    resp = client.post("/api/impact/deployments", json=new_dep)
    assert resp.status_code == 200
    created = resp.json()["deployment"]
    dep_id = created["id"]
    assert created["lifecycle_status"] == "PLANNED"

    # Transition to UNDER_CONSTRUCTION
    upd_resp = client.patch(
        f"/api/impact/deployment/{dep_id}/status",
        json={"lifecycle_status": "UNDER_CONSTRUCTION", "notes": "Civil works begun."},
    )
    assert upd_resp.status_code == 200
    updated = upd_resp.json()["deployment"]
    assert updated["lifecycle_status"] == "UNDER_CONSTRUCTION"
