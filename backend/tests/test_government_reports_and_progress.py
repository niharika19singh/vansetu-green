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
    # Ensure seeded or active tender exists in the active SQLite service instance
    from app.services.tender_service import get_tender_service
    svc = get_tender_service()
    try:
        svc.get_tender("TND-2026-C14-01")
    except KeyError:
        with svc._get_conn() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO tenders (
                    tender_id, corridor_id, title, scope_of_work, estimated_cost_lakh,
                    approved_budget_lakh, required_interventions_json, eligibility_requirements,
                    opening_date, closing_date, status, issuing_authority,
                    created_by_user_id, awarded_proposal_id, awarded_to_org, awarded_at,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "TND-2026-C14-01",
                    "C-14",
                    "Ward 12 Urban Heat Resilience & Pedestrian Shade Infrastructure",
                    "Design and execution of linear street tree planters, roadside bioswales, and reflective pavements.",
                    20.0,
                    18.5,
                    '["linear_street_trees", "roadside_bioswales", "high_albedo_cool_pavements"]',
                    "Registered landscape architect or urban planning consultancy.",
                    "2026-09-01",
                    "2026-09-30",
                    "AWARDED",
                    "Delhi Public Works Department (South Zone)",
                    "PWD_CHIEF_ENG_001",
                    "prop-c14-vriksh-01",
                    "Studio Vriksh & Urban Resiliency Partners",
                    "2026-09-30T10:00:00Z",
                    "2026-09-30T10:00:00Z",
                    "2026-09-30T10:00:00Z",
                ),
            )

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
