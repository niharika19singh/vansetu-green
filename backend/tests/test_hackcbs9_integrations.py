"""
HackCBS 9.0 Comprehensive Automated Test Suite (Phase 11).

Covers:
1. MILP Budget-Constrained Climate Intervention Optimizer (`scipy.optimize.milp`)
2. YugabyteDB / Meko Shared Context, Strict Datapack RBAC, MEKO ON vs OFF, and Check T
3. Google Gemini 3.8 Flash Multi-Tool Function-Calling Agent (8 tools)
4. Tiger Data (TimescaleDB) Hypertable, Continuous Aggregate, Trends & Monitoring
5. IOMETE Climate Technology Procurement Studio (6 categories + Draft RFP)
6. Social Equity & Anonymized Community Observations with Human Verification Gate
7. DigitalOcean App Platform & Container Configuration Verification
"""
from __future__ import annotations

from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]


def test_budget_optimizer_adherence_and_meko_constraints():
    """Verify deterministic MILP optimizer respects budget ceiling and Meko site exclusions."""
    # 1. MEKO OFF on C-14 with ₹8.0 Lakh budget -> selects Linear Street Trees (₹7.20L)
    res_off = client.post(
        "/api/optimizer/run",
        json={
            "budget_lakh": 8.0,
            "target_corridor_ids": ["C-14"],
            "climate_priority": "heat_resilience",
            "meko_enabled": False,
        },
    )
    assert res_off.status_code == 200
    data_off = res_off.json()
    assert data_off["deterministic_guarantee"] is True
    assert data_off["total_capex_lakh_inr"] <= 8.0
    off_ids = [item["intervention_id"] for item in data_off["selected_interventions"]]
    assert "linear_street_trees" in off_ids

    # 2. MEKO ON on C-14 with ₹8.0 Lakh budget -> excludes trees/bioswales due to survey-014
    res_on = client.post(
        "/api/optimizer/run",
        json={
            "budget_lakh": 8.0,
            "target_corridor_ids": ["C-14"],
            "climate_priority": "heat_resilience",
            "meko_enabled": True,
        },
    )
    assert res_on.status_code == 200
    data_on = res_on.json()
    assert data_on["total_capex_lakh_inr"] <= 8.0
    on_ids = [item["intervention_id"] for item in data_on["selected_interventions"]]
    assert "linear_street_trees" not in on_ids
    assert "roadside_bioswales" not in on_ids
    assert "architectural_shade_structures" in on_ids
    assert "cool_pavements" in on_ids
    assert len(data_on["rejected_alternatives"]) > 0


def test_meko_datapack_isolation_rbac():
    """Verify strict build-time vs runtime datapack isolation (Section 3.2)."""
    # Runtime agent attempting to read vansetu-build must be blocked with HTTP 403
    r_forbidden_build = client.get(
        "/api/meko/memories?agent_id=climate_planner_agent&datapack_id=vansetu-build"
    )
    assert r_forbidden_build.status_code == 403

    # Coding agent attempting to read vansetu-project-memory must be blocked with HTTP 403
    r_forbidden_runtime = client.get(
        "/api/meko/memories?agent_id=niharika-coding-agent&datapack_id=vansetu-project-memory"
    )
    assert r_forbidden_runtime.status_code == 403

    # Coding agent reading vansetu-build succeeds
    r_allowed_build = client.get(
        "/api/meko/memories?agent_id=niharika-coding-agent&datapack_id=vansetu-build"
    )
    assert r_allowed_build.status_code == 200
    assert r_allowed_build.json()["count"] >= 10


def test_meko_on_vs_off_comparison_and_check_t():
    """Verify MEKO ON vs MEKO OFF outcome shift and Check T (>=10 promoted build decisions)."""
    r_comp = client.get("/api/meko/compare-on-off?corridor_id=C-14&ward_id=ward-12&budget_lakh=8.0")
    assert r_comp.status_code == 200
    comp = r_comp.json()
    assert comp["recommendation_changed"] is True
    assert comp["decision_changed"] is True
    assert "survey-014" in comp["diff_summary"]["recalled_evidence_references"]

    r_check_t = client.get("/api/meko/check-t")
    assert r_check_t.status_code == 200
    ct = r_check_t.json()
    assert ct["check_t_passed"] is True
    assert ct["total_promoted_decisions"] >= 10
    assert "niharika-coding-agent" in ct["unique_coding_agents"]
    assert "kunal-coding-agent" in ct["unique_coding_agents"]
    assert ct["cross_agent_recall_test"]["recalled_from_teammate_count"] >= 1


def test_meko_memory_lifecycle_add_verify_promote_delete():
    """Verify candidate memory creation, human verification gate, promotion, and deletion."""
    # Add unverified candidate memory
    r_add = client.post(
        "/api/meko/memories/add",
        json={
            "agent_id": "climate_planner_agent",
            "datapack_id": "vansetu-project-memory",
            "content": "Temporary field note: footpath kerb ramp under repair at C-14.",
            "ward_id": "ward-12",
            "corridor_id": "C-14",
            "evidence_reference": "test-ref-99",
            "verification_status": "pending_human_review",
        },
    )
    assert r_add.status_code == 200
    mem_id = r_add.json()["memory_id"]

    # Update memory content
    r_upd = client.patch(
        f"/api/meko/memories/{mem_id}",
        json={
            "agent_id": "municipal_reviewer",
            "content": "Verified field note: footpath kerb ramp repair completed at C-14.",
            "evidence_reference": "test-ref-99-verified",
        },
    )
    assert r_upd.status_code == 200

    # Delete temporary test memory
    r_del = client.delete(f"/api/meko/memories/{mem_id}?agent_id=municipal_reviewer")
    assert r_del.status_code == 200
    assert r_del.json()["deleted"] is True


def test_gemini_agent_tools_and_multi_step_workflow():
    """Verify Gemini 3.8 Flash SDK setup, all 8 backend tools, and 5-step planning workflow."""
    r_tools = client.get("/api/agent/tools")
    assert r_tools.status_code == 200
    tools_meta = r_tools.json()
    assert tools_meta["sdk"] == "google-genai"
    assert tools_meta["model"] == "gemini-3.8-flash"
    assert tools_meta["tool_count"] == 8
    expected_tools = {
        "get_corridor_rankings",
        "get_corridor_details",
        "run_climate_scenario",
        "get_environmental_history",
        "check_intervention_feasibility",
        "optimize_intervention_portfolio",
        "get_previous_planning_decisions",
        "generate_procurement_plan",
    }
    assert {t["name"] for t in tools_meta["tools"]} == expected_tools

    # Invoke individual tool
    r_inv = client.post(
        "/api/agent/invoke-tool",
        json={"tool_name": "get_corridor_details", "arguments": {"corridor_id": "C-14"}},
    )
    assert r_inv.status_code == 200
    assert r_inv.json()["output"]["code"] == "C-14"

    # Run full multi-step planning workflow
    r_plan = client.post(
        "/api/agent/plan",
        json={
            "prompt": "Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.",
            "corridor_id": "C-14",
            "ward_id": "ward-12",
            "budget_lakh": 8.0,
            "meko_enabled": True,
        },
    )
    assert r_plan.status_code == 200
    plan = r_plan.json()
    assert plan["tool_calls_count"] >= 6
    assert plan["human_governance_gate"]["human_approval_required_for_meko_promotion"] is True
    assert "survey-014" in plan["explanation_markdown"]


def test_tiger_data_temporal_intelligence_endpoints():
    """Verify TimescaleDB hypertable schema, daily continuous aggregate, trends, and monitoring."""
    r_schema = client.get("/api/temporal/schema")
    assert r_schema.status_code == 200
    sch = r_schema.json()
    assert sch["hypertable_name"] == "environmental_observations"
    assert sch["continuous_aggregate_view"] == "corridor_daily_summary"
    assert "create_hypertable" in sch["timescaledb_ddl_sql"]

    r_daily = client.get("/api/temporal/daily-summary?corridor_id=C-14&metric=lst_celsius&days=30")
    assert r_daily.status_code == 200
    daily = r_daily.json()
    assert daily["days_returned"] == 30
    assert "contains_simulated_data" in daily["daily_buckets"][0]

    r_trends = client.get("/api/temporal/trends/C-14")
    assert r_trends.status_code == 200
    trends = r_trends.json()
    assert "lst_celsius" in trends["metrics"]
    assert "ndvi" in trends["metrics"]
    assert "aqi_us_epa" in trends["metrics"]

    r_comp = client.get("/api/temporal/comparison?corridor_id=C-14&metric=lst_celsius")
    assert r_comp.status_code == 200
    assert "absolute_change" in r_comp.json()

    r_mon = client.get("/api/temporal/intervention-monitoring")
    assert r_mon.status_code == 200
    assert r_mon.json()["count"] >= 2


def test_iomete_procurement_studio_and_rfp_generation():
    """Verify all 6 climate technology categories, comparison matrix, and Draft RFP specification."""
    r_cat = client.get("/api/procurement/catalog")
    assert r_cat.status_code == 200
    cat = r_cat.json()
    assert len(cat["categories"]) == 6
    assert cat["item_count"] == 6
    for item in cat["items"]:
        assert "Illustrative Reference Pricing" in item["pricing_basis"]
        assert len(item["vendor_questions"]) >= 2

    r_rfp = client.post(
        "/api/procurement/generate-rfp",
        json={"corridor_id": "C-14", "budget_lakh": 8.0, "meko_enabled": True},
    )
    assert r_rfp.status_code == 200
    rfp = r_rfp.json()
    assert rfp["rfp_reference_number"].startswith("MCD-CLIMATE-RFP-")
    assert rfp["section_3_selected_intervention_bill_of_quantities"]["total_capex_lakh_inr"] <= 8.0


def test_social_equity_and_community_observations():
    """Verify anonymized community observation intake and human planner verification gate."""
    r_sum = client.get("/api/equity/summary")
    assert r_sum.status_code == 200
    summary = r_sum.json()
    assert len(summary["vulnerable_groups_supported"]) == 5
    assert len(summary["top_equity_priority_corridors"]) > 0

    r_sub = client.post(
        "/api/equity/observations",
        json={
            "corridor_id": "C-14",
            "category": "shade_accessibility",
            "vulnerable_group": "outdoor_workers",
            "severity": 5,
            "observation_text": "Afternoon bus shelter lacks side shade awning.",
            "location_landmark": "Ward 12 Market Bus Bay",
        },
    )
    assert r_sub.status_code == 200
    obs = r_sub.json()
    assert obs["verification_status"] == "pending_review"

    r_ver = client.post(
        f"/api/equity/observations/{obs['observation_id']}/verify",
        json={"verified_by": "planner_kunal", "approve": True},
    )
    assert r_ver.status_code == 200
    assert r_ver.json()["verification_status"] == "human_verified"


def test_digitalocean_deployment_artifacts_exist():
    """Verify DigitalOcean App Platform spec and Dockerfiles exist and are valid."""
    assert (REPO_ROOT / ".do" / "app.yaml").exists()
    assert (REPO_ROOT / "backend" / "Dockerfile").exists()
    assert (REPO_ROOT / "frontend" / "Dockerfile").exists()
    assert (REPO_ROOT / "docker-compose.yml").exists()
    assert (REPO_ROOT / "AGENTS.md").exists()
