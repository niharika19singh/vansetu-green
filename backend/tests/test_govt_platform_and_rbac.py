"""
VanSetu GreenTech — Government Platform, RBAC, Tenders & Health Intelligence Test Suite.

Validates:
1. Role-Based Access Control (RBAC):
   - Government Admin full access
   - Pro Professional workspace access with strict administrative denial
   - Normal User public access with strict professional & administrative denial
2. Government Tender & Corridor Allocation:
   - Creation of tenders
   - Exclusive corridor allocation states (AVAILABLE, TENDER_OPEN, ALLOCATED)
   - Exclusivity conflict prevention (HTTP 409 Conflict on duplicate active tender or assignment)
   - Pro proposal submission and bid confidentiality
   - Atomic tender award and status transition
3. Corridor Cost Optimisation:
   - Dedicated corridor-level MILP solver execution
   - CapEx, OpEx, and lifecycle costing
   - Separate labeling of indicative estimates vs government-approved budgets
4. Regional Health Intelligence & ABDM Readiness:
   - Hospital-contributed aggregate data retrieval
   - Truthful HEALTH_DATA_NOT_AVAILABLE states
   - Rejection of invalid districts and validation rules
   - Truthful ABHA/ABDM ecosystem readiness status
"""
from __future__ import annotations

import io
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    ReviewerRole,
    get_auth_manager,
)


@pytest.fixture(autouse=True)
def isolate_test_services(tmp_path, monkeypatch):
    """Ensure clean isolated SQLite databases and development environment for each test run."""
    from app.services.tender_service import reset_tender_service
    from app.services.hospital_health_service import reset_hospital_health_service

    monkeypatch.setenv("VANSETU_ENV", "development")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_SEED_DATA", "true")
    monkeypatch.setenv("VANSETU_ABDM_SANDBOX_ENABLED", "true")

    reset_tender_service(tmp_path / "test_tenders.sqlite")
    reset_hospital_health_service(tmp_path / "test_health.sqlite")
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_tokens():
    """Provision isolated test tokens for Government Admin, Engineer, Pro Professionals, Senior Reviewer, and Normal User."""
    mgr = get_auth_manager()

    govt_tok, govt_user = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ADMIN,
        user_id="TEST_GOVT_ENG_001",
        username="govt.engineer",
        full_name="Er. Test Engineer",
        organization="Delhi Public Works Department (South Zone)",
    )

    eng_tok, eng_user = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ENGINEER,
        user_id="TEST_GOVT_ENG_FIELD_02",
        username="govt.field.engineer",
        full_name="Er. Field Test Engineer",
        organization="Delhi PWD Civil Maintenance Division",
    )

    pro_tok_1, pro_user_1 = mgr.provision_test_user(
        role=ReviewerRole.PRO_PROFESSIONAL,
        user_id="TEST_PRO_ARCH_01",
        username="pro.architect.1",
        full_name="Ar. Test Architect",
        organization="Studio Vriksh & Urban Resiliency Partners",
    )

    pro_tok_2, pro_user_2 = mgr.provision_test_user(
        role=ReviewerRole.PRO_PROFESSIONAL,
        user_id="TEST_PRO_COMPETITOR_02",
        username="pro.architect.2",
        full_name="Ar. Competitor Architect",
        organization="Competing Design Studio LLP",
    )

    senior_tok, senior_user = mgr.provision_test_user(
        role=ReviewerRole.SENIOR_REVIEWER,
        user_id="TEST_SR_REVIEWER_01",
        username="sr.reviewer",
        full_name="Dr. Senior ML Reviewer",
        organization="Delhi Environmental Data Council",
    )

    normal_tok, normal_user = mgr.provision_test_user(
        role=ReviewerRole.NORMAL_USER,
        user_id="TEST_CITIZEN_01",
        username="citizen.user",
        full_name="Citizen Tester",
        organization="General Public",
    )

    return {
        "govt_tok": govt_tok,
        "govt_user": govt_user,
        "eng_tok": eng_tok,
        "eng_user": eng_user,
        "pro_tok_1": pro_tok_1,
        "pro_user_1": pro_user_1,
        "pro_tok_2": pro_tok_2,
        "pro_user_2": pro_user_2,
        "senior_tok": senior_tok,
        "senior_user": senior_user,
        "normal_tok": normal_tok,
        "normal_user": normal_user,
    }


# =============================================================================
# 1. RBAC & Profile Verification
# =============================================================================

def test_auth_me_profiles_and_scoping(client, auth_tokens):
    # 1. Unauthenticated request defaults to NORMAL_USER public guest
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 200
    guest = unauth_res.json()
    assert guest["role"] == "NORMAL_USER"
    assert "VIEW_PUBLIC_MAP" in guest["permissions"]
    assert "MANAGE_TENDERS" not in guest["permissions"]

    # 2. Government Admin profile
    govt_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_tokens['govt_tok']}"})
    assert govt_res.status_code == 200
    g_data = govt_res.json()
    assert g_data["role"] == "GOVERNMENT_ADMIN"
    assert "MANAGE_TENDERS" in g_data["permissions"]
    assert "ASSIGN_TENDER" in g_data["permissions"]
    assert "APPROVE_PROJECT_COSTS" in g_data["permissions"]

    # 3. Pro Professional profile
    pro_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"})
    assert pro_res.status_code == 200
    p_data = pro_res.json()
    assert p_data["role"] == "PRO_PROFESSIONAL"
    assert "SUBMIT_PROPOSAL" in p_data["permissions"]
    assert "OPTIMIZE_CORRIDOR_COST" in p_data["permissions"]
    assert "MANAGE_TENDERS" not in p_data["permissions"]
    assert "ASSIGN_TENDER" not in p_data["permissions"]


def test_rbac_administrative_route_guards(client, auth_tokens):
    """Verify that Normal Users and Pro Professionals are strictly rejected from admin endpoints."""
    tender_payload = {
        "corridor_id": "C-05",
        "title": "Unauthorized Tender Attempt",
        "scope_of_work": "Testing RBAC route guard",
        "estimated_cost_lakh": 15.0,
        "approved_budget_lakh": 14.0,
        "required_interventions": ["linear_street_trees"],
        "eligibility_requirements": "None",
        "opening_date": "2026-11-01",
        "closing_date": "2026-11-30",
        "issuing_authority": "PWD",
    }

    # 1. Normal User rejected from creating tender (HTTP 403 Forbidden)
    res_normal = client.post(
        "/api/tenders",
        json=tender_payload,
        headers={"Authorization": f"Bearer {auth_tokens['normal_tok']}"},
    )
    assert res_normal.status_code == 403
    assert "Access Denied" in res_normal.json()["detail"]

    # 2. Pro Professional rejected from creating tender (HTTP 403 Forbidden)
    res_pro = client.post(
        "/api/tenders",
        json=tender_payload,
        headers={"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"},
    )
    assert res_pro.status_code == 403
    assert "Access Denied" in res_pro.json()["detail"]

    # 3. Pro Professional rejected from viewing all assignments (HTTP 403 Forbidden)
    res_assign = client.get(
        "/api/admin/corridor-assignments",
        headers={"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"},
    )
    assert res_assign.status_code == 403

    # 4. Pro Professional rejected from managing hospital sources (HTTP 403 Forbidden)
    res_hosp = client.get(
        "/api/admin/health-data/sources",
        headers={"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"},
    )
    assert res_hosp.status_code == 403

    # 5. Pro Professional rejected from direct corridor allocation (HTTP 403 Forbidden)
    res_direct = client.post(
        "/api/admin/corridor-assignments",
        json={"corridor_id": "C-05", "assigned_org": "My Firm", "scope_summary": "Test", "approved_budget_lakh": 10.0},
        headers={"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"},
    )
    assert res_direct.status_code == 403


# =============================================================================
# 2. Government Tender Lifecycle & Exclusivity Conflict Prevention
# =============================================================================

def test_tender_creation_proposal_award_and_exclusivity(client, auth_tokens):
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}
    pro1_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}
    pro2_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_2']}"}

    # 1. Corridor C-02 is initially AVAILABLE
    avail_before = client.get("/api/corridors/C-02/availability").json()
    assert avail_before["status"] == "AVAILABLE"
    assert avail_before["is_available"] is True
    assert "CORRIDOR AVAILABLE" in avail_before["message"]

    # 2. Government Admin creates tender for Corridor C-02
    tender_payload = {
        "corridor_id": "C-02",
        "title": "Kashmere Gate Multimodal Heat Shelter & Shaded Walkway",
        "scope_of_work": "Design and execution of linear street trees, roadside bioswales, and high-albedo pavements.",
        "estimated_cost_lakh": 25.0,
        "approved_budget_lakh": 22.5,
        "required_interventions": ["linear_street_trees", "roadside_bioswales", "high_albedo_cool_pavements"],
        "eligibility_requirements": "Accredited architectural firm with urban transit corridor credentials.",
        "opening_date": "2026-11-01",
        "closing_date": "2026-11-30",
        "issuing_authority": "Delhi Public Works Department (North Zone)",
    }
    t_res = client.post("/api/tenders", json=tender_payload, headers=govt_headers)
    assert t_res.status_code == 201
    tender_data = t_res.json()
    tender_id = tender_data["tender_id"]
    assert tender_id.startswith("TND-")

    # 3. Corridor C-02 status is now TENDER_OPEN
    avail_tender = client.get("/api/corridors/C-02/availability").json()
    assert avail_tender["status"] == "TENDER_OPEN"
    assert avail_tender["is_available"] is True

    # 4. DUPLICATE TENDER EXCLUSIVITY: Attempting to publish another tender on C-02 MUST fail with HTTP 409 Conflict
    dup_res = client.post("/api/tenders", json=tender_payload, headers=govt_headers)
    assert dup_res.status_code == 409
    assert "already in active status" in dup_res.json()["detail"]

    # 5. Pro Professional 1 browses tenders and sees C-02 tender
    t_list = client.get("/api/tenders", headers=pro1_headers).json()
    assert any(t["tender_id"] == tender_id for t in t_list["tenders"])

    # 6. Pro Professional 1 submits proposal
    prop_payload_1 = {
        "proposed_cost_lakh": 21.8,
        "technical_proposal_summary": "Modular structural tree cells, permeable bioswales, and solar reflective pavers.",
        "timeline_weeks": 12,
        "intervention_quantities": {
            "linear_street_trees": 140,
            "roadside_bioswales": 450,
            "high_albedo_cool_pavements": 1200,
        },
    }
    prop_res1 = client.post(f"/api/tenders/{tender_id}/proposals", json=prop_payload_1, headers=pro1_headers)
    assert prop_res1.status_code == 201
    prop_id_1 = prop_res1.json()["proposal_id"]

    # Duplicate proposal from same firm is rejected
    dup_prop = client.post(f"/api/tenders/{tender_id}/proposals", json=prop_payload_1, headers=pro1_headers)
    assert dup_prop.status_code == 400
    assert "already submitted proposal" in dup_prop.json()["detail"]

    # 7. Pro Professional 2 submits competing proposal
    prop_payload_2 = {
        "proposed_cost_lakh": 22.2,
        "technical_proposal_summary": "Architectural shade sails and living green walls with micro-irrigation.",
        "timeline_weeks": 14,
        "intervention_quantities": {
            "architectural_shade_structures": 8,
            "living_green_walls": 350,
        },
    }
    prop_res2 = client.post(f"/api/tenders/{tender_id}/proposals", json=prop_payload_2, headers=pro2_headers)
    assert prop_res2.status_code == 201
    prop_id_2 = prop_res2.json()["proposal_id"]

    # 8. BID CONFIDENTIALITY: Pro 2 cannot see Pro 1's bid
    t_view_pro2 = client.get(f"/api/tenders/{tender_id}", headers=pro2_headers).json()
    assert len(t_view_pro2["proposals"]) == 1
    assert t_view_pro2["proposals"][0]["proposal_id"] == prop_id_2
    assert t_view_pro2["proposals"][0]["pro_organization"] == "Competing Design Studio LLP"

    # Government Admin can see BOTH bids
    t_view_govt = client.get(f"/api/tenders/{tender_id}", headers=govt_headers).json()
    assert len(t_view_govt["proposals"]) == 2

    # 9. Government Admin awards tender to Pro 1 (Studio Vriksh)
    award_payload = {
        "proposal_id": prop_id_1,
        "award_notes": "Studio Vriksh ranked first in technical and lifecycle feasibility.",
    }
    award_res = client.post(f"/api/tenders/{tender_id}/award", json=award_payload, headers=govt_headers)
    assert award_res.status_code == 200
    assert award_res.json()["status"] == "AWARDED"
    assert award_res.json()["awarded_to_org"] == "Studio Vriksh & Urban Resiliency Partners"

    # 10. CORRIDOR ALLOCATION CONFLICT RULE:
    # Corridor C-02 is now ALLOCATED
    avail_after = client.get("/api/corridors/C-02/availability", headers=pro2_headers).json()
    assert avail_after["status"] == "ALLOCATED"
    assert avail_after["is_available"] is False
    assert "CORRIDOR ALREADY ALLOCATED — NOT AVAILABLE" in avail_after["message"]

    # Attempting direct allocation on C-02 fails with HTTP 409 Conflict
    direct_dup = client.post(
        "/api/admin/corridor-assignments",
        json={"corridor_id": "C-02", "assigned_org": "Another Agency", "scope_summary": "Conflict test", "approved_budget_lakh": 15.0},
        headers=govt_headers,
    )
    assert direct_dup.status_code == 409
    assert "CORRIDOR ALREADY ALLOCATED" in direct_dup.json()["detail"]


# =============================================================================
# 3. Corridor Cost Optimisation & Lifecycle Budgets
# =============================================================================

def test_corridor_cost_optimisation_workflow(client, auth_tokens):
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}
    pro_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}

    # 1. Baseline cost query
    base_res = client.get("/api/corridors/C-14/cost-optimisation", headers=pro_headers)
    assert base_res.status_code == 200
    base_data = base_res.json()
    assert base_data["corridor_id"] == "C-14"
    assert "benchmarks" in base_data
    assert len(base_data["benchmarks"]) >= 5

    # 2. Run corridor cost optimization with MILP solver
    opt_payload = {
        "budget_lakh": 15.0,
        "climate_priority": "heat_resilience",
        "lifecycle_years": 10,
        "restricted_interventions": ["living_green_walls"],
    }
    opt_res = client.post("/api/corridors/C-14/cost-optimisation", json=opt_payload, headers=pro_headers)
    assert opt_res.status_code == 200
    opt_data = opt_res.json()

    assert opt_data["corridor_id"] == "C-14"
    assert opt_data["cost_classification"]["is_indicative_estimate"] is True
    assert opt_data["cost_classification"]["is_government_approved"] is False

    summary = opt_data["optimization_summary"]
    assert "scipy.optimize.milp" in summary["solver"]
    assert summary["total_capex_lakh"] <= 15.0
    assert summary["lifecycle_cost_lakh"] > summary["total_capex_lakh"]
    assert "capex_breakdown" in summary
    assert "living_green_walls" not in summary["capex_breakdown"]  # Respected constraint
    assert len(opt_data["trade_off_alternatives"]) >= 1

    # 3. Government Engineer records approved budget
    appr_payload = {
        "action": "APPROVE",
        "approved_budget_lakh": 14.5,
        "approval_notes": "Approved following technical corridor committee review.",
    }
    appr_res = client.post("/api/corridors/C-14/budget-approval", json=appr_payload, headers=govt_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "BUDGET_APPROVED"
    assert appr_res.json()["approved_budget_lakh"] == 14.5


# =============================================================================
# 4. Regional Health Intelligence & ABDM Readiness
# =============================================================================

def test_regional_health_indicators_and_missing_data_truthfulness(client, auth_tokens):
    # 1. Regional health indicators
    res = client.get("/api/health/regional-indicators")
    assert res.status_code == 200
    data = res.json()
    assert data["reporting_year"] == "2026"
    assert len(data["indicators"]) >= 4
    assert any(i["district"] == "South Delhi" for i in data["indicators"])
    assert any(i["heatstroke_emergency_attendances"] > 0 for i in data["indicators"])

    # Truthful missing data reporting: districts without surveillance feeds must report HEALTH_DATA_NOT_AVAILABLE
    assert len(data["missing_districts"]) > 0
    assert all(m["status"] == "HEALTH_DATA_NOT_AVAILABLE" for m in data["missing_districts"])

    # 2. Corridor health factor for monitored district (South Delhi)
    corr_health = client.get("/api/health/corridors/South Delhi/health-factor").json()
    assert corr_health["status"] == "HEALTH_DATA_ACTIVE"
    assert corr_health["health_factor_multiplier"] >= 1.0
    assert "AIIMS" in corr_health["reporting_hospital"]

    # 3. Corridor health factor for unmonitored district (Truthfully reports not available)
    unmonitored = client.get("/api/health/corridors/North West Delhi/health-factor").json()
    assert unmonitored["status"] == "HEALTH_DATA_NOT_AVAILABLE"
    assert unmonitored["health_factor_multiplier"] == 1.0
    assert "NEUTRAL" in unmonitored["priority_weight_impact"]


def test_abha_abdm_truthful_readiness_status(client):
    """Verify ABHA / ABDM ecosystem integration status is truthful and guarantees zero PII."""
    res = client.get("/api/health/abha-status")
    assert res.status_code == 200
    abdm = res.json()
    assert abdm["integration_state"] == "SANDBOX_CONFIGURED"
    assert abdm["is_live_production"] is False  # Must NOT make fake live claims
    assert abdm["privacy_architecture"]["patient_pii_in_climate_layer"] is False
    assert abdm["privacy_architecture"]["individual_abha_id_storage"] is False
    assert abdm["privacy_architecture"]["aadhaar_storage"] is False
    assert len(abdm["milestones"]) >= 4


def test_hospital_dataset_ingestion_and_validation(client, auth_tokens):
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}

    # 1. Successful aggregate dataset ingestion
    valid_payload = {
        "provider_id": "HOSP-AIIMS-01",
        "district": "South Delhi",
        "reporting_period": "2026-Q3",
        "heat_illness_visits": 950,
        "heatstroke_emergency_attendances": 140,
        "respiratory_emergency_visits": 2100,
        "total_emergency_admissions": 8900,
        "population_denominator": 2731929,
        "provenance_notes": "AIIMS Q3 post-monsoon thermal surveillance aggregate data.",
    }
    ing_res = client.post("/api/admin/health-data/uploads", json=valid_payload, headers=govt_headers)
    assert ing_res.status_code == 201
    assert ing_res.json()["status"] == "INGESTED_AND_APPROVED"
    assert "PASSED" in ing_res.json()["privacy_verification"]

    # 2. Invalid district rejected
    bad_district = dict(valid_payload, district="Mumbai South")
    res_bad_dist = client.post("/api/admin/health-data/uploads", json=bad_district, headers=govt_headers)
    assert res_bad_dist.status_code == 400
    assert "Must be one of NCT Delhi's 11 administrative districts" in res_bad_dist.json()["detail"]

    # 3. Invalid logic: heatstroke > total heat illness visits rejected
    bad_counts = dict(valid_payload, heat_illness_visits=10, heatstroke_emergency_attendances=50)
    res_bad_counts = client.post("/api/admin/health-data/uploads", json=bad_counts, headers=govt_headers)
    assert res_bad_counts.status_code == 400
    assert "Heatstroke attendances cannot exceed" in res_bad_counts.json()["detail"]


# =============================================================================
# 5. Demo Role Switch, Token Lifecycle & Expiration Tests
# =============================================================================

def test_demo_switch_role_environment_guard_and_expiry(client, monkeypatch):
    """Verify demo persona endpoint is strictly disabled in production and returns expiring tokens in dev."""
    # 1. In production, demo switch MUST fail with HTTP 403 Forbidden
    monkeypatch.setenv("VANSETU_ENV", "production")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_AUTH", "false")
    prod_res = client.post("/api/auth/demo-switch-role", json={"role": "government_admin"})
    assert prod_res.status_code == 403
    assert "Access Denied" in prod_res.json()["detail"]

    # 2. In development with flag enabled, demo switch succeeds
    monkeypatch.setenv("VANSETU_ENV", "development")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_AUTH", "true")

    # Govt Admin persona
    admin_res = client.post("/api/auth/demo-switch-role", json={"role": "government_admin"})
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["expires_in"] == 900
    assert admin_data["user"]["role"] == "GOVERNMENT_ADMIN"
    assert admin_data["user"]["is_demo"] is True
    admin_tok = admin_data["access_token"]

    # Verify token works on /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_tok}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "GOVERNMENT_ADMIN"

    # Govt Engineer persona
    eng_res = client.post("/api/auth/demo-switch-role", json={"role": "government_engineer"})
    assert eng_res.status_code == 200
    assert eng_res.json()["user"]["role"] == "GOVERNMENT_ENGINEER"

    # Pro Professional persona
    pro_res = client.post("/api/auth/demo-switch-role", json={"role": "pro_professional"})
    assert pro_res.status_code == 200
    assert pro_res.json()["user"]["role"] == "PRO_PROFESSIONAL"

    # Normal User persona
    norm_res = client.post("/api/auth/demo-switch-role", json={"role": "normal_user"})
    assert norm_res.status_code == 200
    assert norm_res.json()["user"]["role"] == "NORMAL_USER"

    # Invalid role rejected with HTTP 400
    bad_res = client.post("/api/auth/demo-switch-role", json={"role": "superuser"})
    assert bad_res.status_code == 400


def test_token_lifecycle_revocation_and_expiration(client):
    """Verify expired, revoked, and malformed credentials fail closed with HTTP 401."""
    mgr = get_auth_manager()

    # 1. Malformed / non-existent token rejected
    bad_res = client.get("/api/corridors/C-14/cost-optimisation", headers={"Authorization": "Bearer vs_invalid_random_token_999"})
    assert bad_res.status_code == 401

    # 2. Expired token rejected
    exp_tok, _ = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ADMIN,
        expires_in_seconds=-30,  # Expired in past
    )
    exp_res = client.get("/api/corridors/C-14/cost-optimisation", headers={"Authorization": f"Bearer {exp_tok}"})
    assert exp_res.status_code == 401

    # 3. Revoked token rejected
    valid_tok, _ = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ADMIN,
        expires_in_seconds=600,
    )
    # Works before revocation
    ok_res = client.get("/api/corridors/C-14/cost-optimisation", headers={"Authorization": f"Bearer {valid_tok}"})
    assert ok_res.status_code == 200

    # Revoke
    mgr.revoke_token(valid_tok)

    # Rejection after revocation
    rev_res = client.get("/api/corridors/C-14/cost-optimisation", headers={"Authorization": f"Bearer {valid_tok}"})
    assert rev_res.status_code == 401


# =============================================================================
# 6. Least-Privilege Role Matrix Verification
# =============================================================================

def test_least_privilege_matrix_for_all_roles(client, auth_tokens):
    """Verify exact boundaries for Govt Admin, Govt Engineer, Pro, and Senior Reviewer."""
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}
    eng_headers = {"Authorization": f"Bearer {auth_tokens['eng_tok']}"}
    pro_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}
    sr_headers = {"Authorization": f"Bearer {auth_tokens['senior_tok']}"}

    # 1. Government Admin CANNOT submit competitive tender proposals (conflict of interest)
    prop_payload = {
        "proposed_cost_lakh": 18.0,
        "technical_proposal_summary": "Admin proposal attempt",
        "timeline_weeks": 10,
    }
    govt_prop_res = client.post("/api/tenders/TND-2026-C14-01/proposals", json=prop_payload, headers=govt_headers)
    assert govt_prop_res.status_code == 403

    # 2. Government Engineer CANNOT approve budgets (budget authority is Admin only)
    appr_payload = {"action": "APPROVE", "approved_budget_lakh": 15.0, "approval_notes": "Engineer attempt"}
    eng_appr_res = client.post("/api/corridors/C-14/budget-approval", json=appr_payload, headers=eng_headers)
    assert eng_appr_res.status_code == 403

    # 3. Government Engineer CANNOT publish tenders
    tender_payload = {
        "corridor_id": "C-08",
        "title": "Engineer Tender Attempt",
        "scope_of_work": "Test",
        "estimated_cost_lakh": 12.0,
        "approved_budget_lakh": 10.0,
        "required_interventions": ["linear_street_trees"],
        "opening_date": "2026-11-01",
        "closing_date": "2026-11-30",
    }
    eng_tnd_res = client.post("/api/tenders", json=tender_payload, headers=eng_headers)
    assert eng_tnd_res.status_code == 403

    # 4. Senior Reviewer (ML lead) CANNOT approve government budgets or view admin audit logs
    sr_appr_res = client.post("/api/corridors/C-14/budget-approval", json=appr_payload, headers=sr_headers)
    assert sr_appr_res.status_code == 403

    sr_audit_res = client.get("/api/admin/audit-logs", headers=sr_headers)
    assert sr_audit_res.status_code == 403


# =============================================================================
# 7. Pro Workspace Endpoints & Corridor Exclusivity Isolation
# =============================================================================

def test_pro_my_corridor_assignments_and_proposals_isolation(client, auth_tokens):
    """Verify /api/me/corridor-assignments and /api/me/proposals enforce organizational isolation."""
    pro1_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}
    pro2_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_2']}"}
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}

    # 1. Unauthenticated requests to /api/me/* return 401
    assert client.get("/api/me/corridor-assignments").status_code == 401
    assert client.get("/api/me/proposals").status_code == 401

    # 2. Allocate Corridor C-03 to Pro 1's organization via direct allocation
    alloc_res = client.post(
        "/api/admin/corridor-assignments",
        json={
            "corridor_id": "C-03",
            "assigned_org": auth_tokens["pro_user_1"].organization,
            "scope_summary": "Direct allocation for South Zone greening",
            "approved_budget_lakh": 16.5,
        },
        headers=govt_headers,
    )
    assert alloc_res.status_code == 201

    # 3. Pro 1 checks /api/me/corridor-assignments -> sees Corridor C-03
    my_assign_res1 = client.get("/api/me/corridor-assignments", headers=pro1_headers)
    assert my_assign_res1.status_code == 200
    assignments_1 = my_assign_res1.json()["assignments"]
    assert any(a["corridor_id"] == "C-03" for a in assignments_1)

    # 4. Pro 2 (competitor) checks /api/me/corridor-assignments -> DOES NOT see Corridor C-03
    my_assign_res2 = client.get("/api/me/corridor-assignments", headers=pro2_headers)
    assert my_assign_res2.status_code == 200
    assignments_2 = my_assign_res2.json()["assignments"]
    assert not any(a["corridor_id"] == "C-03" for a in assignments_2)

    # 5. Pro 1 checks /api/me/proposals
    my_props_res = client.get("/api/me/proposals", headers=pro1_headers)
    assert my_props_res.status_code == 200
    assert "proposals" in my_props_res.json()


# =============================================================================
# 8. Budget Approval Persistence & Rate Benchmark Disclosure
# =============================================================================

def test_corridor_budget_approval_persistence_and_audit(client, auth_tokens):
    """Verify budget approval persists into table, updates corridor allocation, and writes to audit logs."""
    govt_headers = {"Authorization": f"Bearer {auth_tokens['govt_tok']}"}
    pro_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}

    # 1. Record budget approval for C-14
    appr_payload = {
        "action": "APPROVE",
        "approved_budget_lakh": 17.2,
        "approval_notes": "Sanctioned under Delhi Urban Greening Mission 2026.",
    }
    appr_res = client.post("/api/corridors/C-14/budget-approval", json=appr_payload, headers=govt_headers)
    assert appr_res.status_code == 200
    data = appr_res.json()
    assert data["status"] == "BUDGET_APPROVED"
    assert data["approved_budget_lakh"] == 17.2

    # 2. Check cost baseline reflects approved budget and CPWD DSR 2023 benchmark disclosure
    base_res = client.get("/api/corridors/C-14/cost-optimisation", headers=pro_headers)
    assert base_res.status_code == 200
    base_data = base_res.json()
    assert base_data["government_approved_budget_lakh"] == 17.2
    assert "CPWD Delhi Schedule of Rates (DSR 2023)" in base_data["benchmark_source"]

    # 3. Check audit log records budget decision
    audit_res = client.get("/api/admin/audit-logs?entity_type=BUDGET_APPROVAL", headers=govt_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_logs"]
    assert any(log["entity_id"] == "C-14" and "BUDGET_APPROVE" in log["action"] for log in logs)


# =============================================================================
# 9. Seed Data Environment Gating
# =============================================================================

def test_seed_data_gating(tmp_path, monkeypatch):
    """Verify demo seed data is strictly suppressed in production and initialized in development."""
    from app.services.tender_service import TenderService
    from app.services.hospital_health_service import HospitalHealthService

    # 1. Production environment: zero seeded records
    monkeypatch.setenv("VANSETU_ENV", "production")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_SEED_DATA", "false")

    prod_tender_svc = TenderService(db_path=tmp_path / "prod_tenders.sqlite")
    assert len(prod_tender_svc.list_professionals()) == 0
    assert len(prod_tender_svc.list_tenders()) == 0
    assert len(prod_tender_svc.list_corridor_allocations()) == 0

    prod_health_svc = HospitalHealthService(db_path=tmp_path / "prod_health.sqlite")
    assert len(prod_health_svc.list_providers()) == 0

    # 2. Development environment with flag: seeds demo records
    monkeypatch.setenv("VANSETU_ENV", "development")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_SEED_DATA", "true")

    dev_tender_svc = TenderService(db_path=tmp_path / "dev_tenders.sqlite")
    assert len(dev_tender_svc.list_professionals()) >= 3
    assert len(dev_tender_svc.list_corridor_allocations()) >= 1

    dev_health_svc = HospitalHealthService(db_path=tmp_path / "dev_health.sqlite")
    assert len(dev_health_svc.list_providers()) >= 4


# =============================================================================
# 10. Real MILP Solver Trade-Off Alternatives
# =============================================================================

def test_corridor_cost_solver_alternatives(client, auth_tokens):
    """Verify corridor cost optimizer returns distinct MILP solver trade-off packages."""
    pro_headers = {"Authorization": f"Bearer {auth_tokens['pro_tok_1']}"}

    opt_payload = {
        "budget_lakh": 16.0,
        "climate_priority": "heat_resilience",
        "lifecycle_years": 10,
    }
    res = client.post("/api/corridors/C-14/cost-optimisation", json=opt_payload, headers=pro_headers)
    assert res.status_code == 200
    data = res.json()

    alternatives = data["trade_off_alternatives"]
    assert len(alternatives) >= 2
    for alt in alternatives:
        assert alt["is_solver_optimized"] is True
        assert alt["capex_lakh"] > 0.0
        assert alt["lifecycle_cost_lakh"] >= alt["capex_lakh"]
        assert len(alt["selected_interventions"]) > 0
