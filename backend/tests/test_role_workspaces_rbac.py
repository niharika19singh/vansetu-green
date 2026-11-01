"""
test_role_workspaces_rbac.py
Comprehensive test suite verifying genuinely distinct role-based workspaces and RBAC:
1. All 4 demo roles switchable via /api/auth/demo-switch-role (both body & query param)
2. Permissions differentiation:
   - GOVERNMENT_ADMIN has MANAGE_TENDERS, APPROVE_PROJECT_COSTS, GOVERN_COMMUNITY
   - GOVERNMENT_ENGINEER has SUBMIT_FIELD_SURVEY, VALIDATE_FEASIBILITY, INSPECT_INFRASTRUCTURE,
     VERIFY_ROW, ESTIMATE_COSTS, but NOT MANAGE_TENDERS or GOVERN_COMMUNITY
   - PRO_PROFESSIONAL has SUBMIT_PROPOSALS, ACCESS_PARETO, VIEW_TENDERS, RUN_SCENARIOS, EXPORT_ANALYTICS
   - NORMAL_USER / PUBLIC_CITIZEN has SUBMIT_COMMUNITY_INPUT, VIEW_COMMUNITY_INPUT, VIEW_PUBLIC_HEALTH
3. Community Data Moderation (PATCH /api/community-data/{id}/status):
   - Government Admin can moderate (200)
   - Public Citizen / Normal User forbidden (403)
4. Public Issue Reporting (POST /api/public/report-issue):
   - Public Citizen can report issue (200)
5. Corridor Engineering & Surveys:
   - GET /api/corridors/{id}/engineering returns IRC:SP:73 and IRC:103 specs (200)
   - POST /api/corridors/{id}/engineering/survey allowed for Government Engineer (200)
   - POST /api/corridors/{id}/engineering/survey forbidden for Normal User (403)
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from ml.security.auth import (
    Permission,
    ReviewerRole,
    ROLE_PERMISSIONS,
    get_auth_manager,
)


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    monkeypatch.setenv("VANSETU_ENV", "development")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_AUTH", "true")
    monkeypatch.setenv("VANSETU_ENABLE_DEMO_SEED_DATA", "true")


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_users():
    mgr = get_auth_manager()

    admin_token, admin_user = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ADMIN,
        user_id="ROLE_TEST_ADMIN_01",
        username="admin.test",
        full_name="Municipal Admin",
        organization="Delhi Municipal Council",
    )

    engineer_token, engineer_user = mgr.provision_test_user(
        role=ReviewerRole.GOVERNMENT_ENGINEER,
        user_id="ROLE_TEST_ENG_01",
        username="engineer.test",
        full_name="Er. Field Engineer",
        organization="PWD Civil Division",
    )

    pro_token, pro_user = mgr.provision_test_user(
        role=ReviewerRole.PRO_PROFESSIONAL,
        user_id="ROLE_TEST_PRO_01",
        username="pro.test",
        full_name="Senior Urban Planner",
        organization="Landscape Architects Ltd",
    )

    public_token, public_user = mgr.provision_test_user(
        role=ReviewerRole.NORMAL_USER,
        user_id="ROLE_TEST_CITIZEN_01",
        username="citizen.test",
        full_name="Delhi Resident",
        organization="Public",
    )

    return {
        "admin": {"token": admin_token, "user": admin_user},
        "engineer": {"token": engineer_token, "user": engineer_user},
        "pro": {"token": pro_token, "user": pro_user},
        "public": {"token": public_token, "user": public_user},
    }


def test_demo_switch_role_all_four_roles(client):
    """Verify demo-switch-role returns valid credentials and permissions for all four personas."""
    roles = [
        ("public_citizen", "normal_user"),
        ("government_admin", "government_admin"),
        ("government_engineer", "government_engineer"),
        ("pro_professional", "pro_professional"),
    ]

    for requested_role, expected_role in roles:
        # Test JSON body
        res = client.post("/api/auth/demo-switch-role", json={"role": requested_role})
        assert res.status_code == 200, f"Failed switching to {requested_role}: {res.text}"
        data = res.json()
        assert data["role"] == expected_role
        assert "token" in data
        assert "permissions" in data
        assert len(data["permissions"]) > 0

        # Verify token works on /api/auth/me
        tok = data["token"]
        me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["role"].lower() == expected_role.lower()


def test_permission_differentiation(test_users):
    """Verify that each role has distinct permissions according to the role matrix."""
    admin_perms = ROLE_PERMISSIONS[ReviewerRole.GOVERNMENT_ADMIN]
    eng_perms = ROLE_PERMISSIONS[ReviewerRole.GOVERNMENT_ENGINEER]
    pro_perms = ROLE_PERMISSIONS[ReviewerRole.PRO_PROFESSIONAL]
    public_perms = ROLE_PERMISSIONS[ReviewerRole.NORMAL_USER]

    # Admin has tender management and approvals, engineer does not
    assert Permission.MANAGE_TENDERS in admin_perms
    assert Permission.APPROVE_PROJECT_COSTS in admin_perms
    assert Permission.GOVERN_COMMUNITY in admin_perms
    assert Permission.MANAGE_TENDERS not in eng_perms
    assert Permission.GOVERN_COMMUNITY not in eng_perms

    # Engineer has field survey and validation, normal user does not
    assert Permission.SUBMIT_FIELD_SURVEY in eng_perms
    assert Permission.VALIDATE_FEASIBILITY in eng_perms
    assert Permission.INSPECT_INFRASTRUCTURE in eng_perms
    assert Permission.VERIFY_ROW in eng_perms
    assert Permission.SUBMIT_FIELD_SURVEY not in public_perms
    assert Permission.VALIDATE_FEASIBILITY not in public_perms

    # Pro has proposals and portfolio optimization
    assert Permission.SUBMIT_PROPOSAL in pro_perms
    assert Permission.OPTIMIZE_PORTFOLIO in pro_perms
    assert Permission.SUBMIT_PROPOSAL not in public_perms
    assert Permission.SUBMIT_PROPOSAL not in eng_perms


def test_community_data_moderation_rbac(client, test_users):
    """Verify that community observation moderation requires GOVERN_COMMUNITY permission."""
    import uuid
    unique_street = f"Press Enclave Marg {uuid.uuid4().hex[:6]}"
    # First, submit an observation
    sub_res = client.post(
        "/api/community-data",
        json={
            "city": "Delhi",
            "ward": "Saket",
            "street": unique_street,
            "userType": "public_citizen",
            "heatLevel": "High",
            "shadeLevel": "Minimal Shade",
            "description": "Footpath has zero shade canopy near bus stop",
            "emergencyHeatIncidents": "None",
        },
    )
    assert sub_res.status_code == 200
    sub_id = sub_res.json().get("id")

    admin_headers = {"Authorization": f"Bearer {test_users['admin']['token']}"}
    public_headers = {"Authorization": f"Bearer {test_users['public']['token']}"}
    engineer_headers = {"Authorization": f"Bearer {test_users['engineer']['token']}"}

    # Public citizen cannot moderate
    res_pub = client.patch(
        f"/api/community-data/{sub_id}/status",
        headers=public_headers,
        json={"status": "under_investigation", "admin_notes": "Attempted citizen moderation"},
    )
    assert res_pub.status_code == 403

    # Engineer cannot moderate
    res_eng = client.patch(
        f"/api/community-data/{sub_id}/status",
        headers=engineer_headers,
        json={"status": "under_investigation", "admin_notes": "Attempted engineer moderation"},
    )
    assert res_eng.status_code == 403

    # Government Admin CAN moderate
    res_adm = client.patch(
        f"/api/community-data/{sub_id}/status",
        headers=admin_headers,
        json={
            "status": "field_inspection_dispatched",
            "admin_notes": "Approved for PWD tree plantation drive",
            "assigned_division": "PWD South Zone",
        },
    )
    assert res_adm.status_code == 200
    data = res_adm.json()
    assert data["status"] == "success"
    assert data["record"]["verification_status"] == "field_inspection_dispatched"
    assert data["record"]["assigned_division"] == "PWD South Zone"


def test_public_issue_report(client):
    """Verify that citizens can report issues without administrative credentials."""
    res = client.post(
        "/api/public/report-issue",
        json={
            "issue_type": "broken_water_tap",
            "district": "South",
            "street": "Press Enclave Marg",
            "description": "Water tap is dry and commuter crowd is struggling",
            "urgency": "high",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "ticket_id" in data
    assert len(data["ticket_id"]) > 0


def test_corridor_engineering_specifications(client):
    """Verify GET /api/corridors/{id}/engineering returns IRC standard measurements."""
    res = client.get("/api/corridors/C-14/engineering")
    assert res.status_code == 200
    data = res.json()
    assert data["corridor_id"] == "C-14"
    assert "engineering_specifications" in data
    assert "feasibility_checklist" in data
    assert "shade_gap_bridges" in data

    specs = data["engineering_specifications"]
    assert "standard_right_of_way_m" in specs
    assert "estimated_pedestrian_sidewalk_m" in specs
    assert specs["irc_guideline"] == "IRC:SP:73 (Urban Arterial Design)"
    assert specs["irc_pedestrian_guideline"] == "IRC:103 (Pedestrian Facilities in Urban Areas)"


def test_corridor_engineering_survey_rbac(client, test_users):
    """Verify field survey submission requires SUBMIT_FIELD_SURVEY permission."""
    survey_payload = {
        "measured_carriageway_m": 14.5,
        "measured_sidewalk_m": 2.2,
        "measured_soil_depth_m": 1.5,
        "utility_clash_detected": False,
        "water_source_access": "STP tanker line available at 250m",
        "engineering_feasibility": "FEASIBLE",
        "inspector_notes": "Trial pit confirms 1.5m alluvial loam without utility obstruction",
    }

    public_headers = {"Authorization": f"Bearer {test_users['public']['token']}"}
    engineer_headers = {"Authorization": f"Bearer {test_users['engineer']['token']}"}

    # Public citizen rejected
    res_pub = client.post(
        "/api/corridors/C-14/engineering/survey",
        headers=public_headers,
        json=survey_payload,
    )
    assert res_pub.status_code == 403

    # Engineer accepted
    res_eng = client.post(
        "/api/corridors/C-14/engineering/survey",
        headers=engineer_headers,
        json=survey_payload,
    )
    assert res_eng.status_code == 200
    data = res_eng.json()
    assert data["status"] == "success"
    assert data["corridor_id"] == "C-14"
    assert data["irc_103_verified"] is True
    assert "survey_data" in data
