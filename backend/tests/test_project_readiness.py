"""
Tests for Feature 8: Climate Project Implementation & Readiness Planner.
Verifies:
- Creation of implementation projects from portfolios
- 8 standard municipal work packages (WP-1 to WP-8)
- 8 readiness lifecycle gates
- Advancing gates on work packages
- IOMETE Procurement Studio specifications link
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_and_fetch_readiness_project():
    payload = {
        "portfolio_name": "Test Priority Corridor Greening",
        "budget_lakhs": 45.0,
        "corridors": [{"id": 14, "code": "C-14"}, {"id": 1, "code": "C-01"}],
    }
    resp = client.post("/api/readiness/projects/from-portfolio", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["work_packages_count"] == 8
    packages = data["work_packages"]
    codes = [p["code"] for p in packages]
    assert "WP-1" in codes
    assert "WP-4" in codes
    assert "WP-8" in codes

    assert "iomete_procurement_integration" in data
    assert data["overall_readiness_percentage"] > 0

    proj_id = data["project"]["project_id"]
    fetch_resp = client.get(f"/api/readiness/projects/{proj_id}")
    assert fetch_resp.status_code == 200


def test_advance_work_package_gate():
    payload = {
        "portfolio_name": "Gate Advance Test",
        "budget_lakhs": 30.0,
        "corridors": [{"id": 8, "code": "C-08"}],
    }
    created = client.post("/api/readiness/projects/from-portfolio", json=payload).json()
    first_pkg = created["work_packages"][0]
    pkg_id = first_pkg["package_id"]

    # Advance gate
    adv_resp = client.patch(
        f"/api/readiness/package/{pkg_id}/gate",
        json={"new_gate": "4_STAKEHOLDER_APPROVED"},
    )
    assert adv_resp.status_code == 200
    updated_plan = adv_resp.json()
    upd_pkg = next(p for p in updated_plan["work_packages"] if p["package_id"] == pkg_id)
    assert upd_pkg["current_gate"] == "4_STAKEHOLDER_APPROVED"
