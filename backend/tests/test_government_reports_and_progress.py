import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_government_reports():
    response = client.get("/api/reports")
    assert response.status_code == 200
    data = response.json()
    assert "reports" in data
    assert "count" in data
    assert data["count"] >= 4
    first = data["reports"][0]
    assert "report_id" in first
    assert "status" in first
    assert "district" in first


def test_create_and_review_government_report():
    payload = {
        "title": "East Delhi Vikas Marg Canopy Survival Verification",
        "district": "East Delhi",
        "corridor_ids": ["C-03"],
        "report_type": "COMPLETION_AUDIT",
        "author_name": "Er. Arvind Kumar",
        "author_role": "Executive Engineer",
        "author_id": "EE_EAST_03",
        "budget_impact_lakh": 14.0,
        "summary": "Phase 1 native neem and pilkhan canopy planting inspected. 92% sapling survival noted.",
        "status": "Submitted",
    }
    create_res = client.post("/api/reports", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    report = created_data["report"]
    report_id = report["report_id"]
    assert report_id.startswith("REP-2026-")
    assert report["status"] == "Submitted"

    # Review report -> Approve
    review_payload = {
        "action": "Approved",
        "reviewer_name": "Dr. Kunal Sharma",
        "reviewer_role": "Government Admin",
        "notes": "Verified against ground survey. Sanction cleared.",
    }
    review_res = client.post(f"/api/reports/{report_id}/review", json=review_payload)
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["report"]["status"] == "Approved"
    assert len(reviewed_data["report"]["review_history"]) >= 2


def test_get_report_stats():
    res = client.get("/api/reports/stats")
    assert res.status_code == 200
    stats = res.json()
    assert "total" in stats
    assert "submitted" in stats
    assert "approved" in stats
    assert stats["total"] >= 4


def test_update_tender_progress():
    # Update progress on seeded tender TND-2026-C14-01
    payload = {
        "progress_pct": 55.0,
        "status": "In Progress",
        "notes": "Phase 2 linear tree pit excavation 55% completed.",
    }
    res = client.post("/api/tenders/TND-2026-C14-01/progress", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "In Progress"
