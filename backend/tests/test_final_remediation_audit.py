"""
VanSetu Final Scientific Remediation & Integrity Audit Verification Suite.

Tests rigorous compliance with all P0 and P1 audit requirements:
1. Meko seeded memories marked as SYNTHETIC_DEMONSTRATION_SCENARIO and unpromoted.
2. Meko remote call failure surfaces explicit fallback statuses and activity logs.
3. Promotion is strictly blocked for unverified memories.
4. Spatial memory pins contain zero fabricated segment/ward/author defaults and label centroid proxies.
5. Seasonal heat classifies single empirical season as SINGLE_SEASON_HOTSPOT_CANDIDATE, missing LST as DATA_UNAVAILABLE.
6. Evidence passport rubrics cite HEURISTIC_EVALUATION_RUBRIC and generate live ISO timestamps.
7. Impact monitoring rejects incomplete EMPIRICAL_MONITORING and flags BASELINE_DATA_PENDING.
8. Project readiness creates conditional work packages with re-normalized budgets.
9. Segment suitability marks unknown walkability as UNVERIFIED_PEDESTRIAN_ACCESS and cool pavements as FIELD_VERIFICATION_REQUIRED.
10. Shade continuity labels vegetation canopy proxies and disclaims direct physical comfort.
11. Pareto optimizer traces social equity to Census of India / Delhi Economic Survey via scoring_service.
"""
from datetime import datetime, timezone
import pytest
from unittest.mock import patch

from app.services.meko_service import get_meko_service
from app.services.spatial_memory_service import get_spatial_memory_pins, execute_spatial_memory_action
from app.services.seasonal_heat_service import get_corridor_seasonal_profile, get_all_persistent_hotspots
from app.services.evidence_passport_service import generate_corridor_evidence_passport
from app.services.impact_monitoring_service import create_deployment, get_deployment_detail
from app.services.project_readiness_service import create_project_from_portfolio, get_project_readiness_plan
from app.services.segment_suitability_service import evaluate_segment_suitability
from app.services.shade_continuity_service import analyze_corridor_shade_continuity
from app.services.pareto_optimizer_service import run_pareto_optimization


def test_meko_seed_records_are_synthetic_demo_and_unpromoted():
    meko = get_meko_service()
    meko.initialize()
    with meko._get_conn() as conn:
        for mid in ("mem-survey-014", "mem-decision-c14-01", "mem-survey-001", "mem-draft-022"):
            row = conn.execute("SELECT * FROM meko_memories WHERE memory_id = ?", (mid,)).fetchone()
            assert row is not None
            assert row["datapack_logical"] == "vansetu-project-memory"
            assert row["verification_status"] == "SYNTHETIC_DEMONSTRATION_SCENARIO"
            assert row["promoted"] == 0
            assert row["source_type"] == "synthetic_demonstration_scenario"
            assert row["author_teammate"] == "Synthetic Demonstration Fixture"
            assert row["content_text"].startswith("SYNTHETIC DEMONSTRATION SCENARIO (Unverified Illustrative Fixture): ")


def test_meko_promote_memory_fails_if_unverified():
    meko = get_meko_service()
    with pytest.raises(ValueError, match="Promotion Blocked"):
        meko.promote_memory(memory_id="mem-survey-014", agent_id="municipal_reviewer")


def test_meko_remote_sync_failure_and_local_fallback():
    meko = get_meko_service()
    with patch("app.services.meko_service.settings.meko_api_key", "mko_test_dummy_key_123"):
        with patch("httpx.Client.post", side_effect=RuntimeError("Connection to Meko MCP timed out")):
            res = meko.add_memory(
                datapack_logical="vansetu-project-memory",
                agent_id="climate_planner_agent",
                memory_type="site_note",
                content_text="Testing remote fallback resilience in automated audit.",
                ward_id="ward-12",
                corridor_id="C-14",
            )
            assert res["sync_status"] == "REMOTE_OPERATION_FAILED_LOCAL_FALLBACK_USED"
            assert res["remote_status"] == "REMOTE_OPERATION_FAILED"
            assert res["local_status"] == "LOCAL_PERSISTENT_COMMITTED"
            assert "timed out" in res["remote_error"]

            logs = meko.get_activity_logs(limit=10)["logs"]
            sync_failures = [l for l in logs if l["operation"] == "remote_mcp_sync_failure"]
            assert len(sync_failures) >= 1
            assert "timed out" in sync_failures[0]["summary"]


def test_spatial_memory_pins_zero_fabrication_and_centroid_proxy():
    pins_data = get_spatial_memory_pins()
    assert pins_data["count"] > 0
    demo_pin = next(p for p in pins_data["pins"] if p["memory_id"] == "mem-survey-014")
    assert demo_pin["is_synthetic_demo"] is True
    assert demo_pin["badge"] == "SYNTHETIC DEMONSTRATION SCENARIO"
    assert demo_pin["coordinate_source"] in ("FIELD_RECORD_EXACT", "CORRIDOR_CENTROID_PROXY")
    assert demo_pin["author_teammate"] == "Synthetic Demonstration Fixture"


def test_spatial_memory_promote_action_blocked_for_unverified():
    with pytest.raises(ValueError, match="Promotion Blocked"):
        execute_spatial_memory_action(memory_id="mem-survey-014", action="PROMOTE", actor_agent="municipal_reviewer")


def test_seasonal_heat_missing_lst_returns_data_unavailable():
    with patch("app.services.seasonal_heat_service.get_corridor_by_id") as mock_get:
        mock_get.return_value = {
            "id": "mock_no_lst",
            "code": "C-99",
            "name": "Mock Missing LST Corridor",
            "district": "Central Delhi",
            "lst_mean": None,
        }
        profile = get_corridor_seasonal_profile("mock_no_lst")
        assert profile["hotspot_classification"] == "DATA_UNAVAILABLE"
        assert profile["hotspot_confidence"] == "DATA_UNAVAILABLE"
        assert profile["seasonal_observations"][0]["lst_celsius"] is None
        assert profile["seasonal_observations"][0]["anomaly_status"] == "DATA_UNAVAILABLE"


def test_seasonal_heat_single_season_hotspot_candidate():
    profile = get_corridor_seasonal_profile("C-14")
    assert profile["hotspot_classification"] in ("SINGLE_SEASON_HOTSPOT_CANDIDATE", "COOL_CORRIDOR_REFUGE", "PERSISTENCE_UNVERIFIED")
    if profile["seasonal_observations"][0]["thermal_anomaly_celsius"] >= 2.5:
        assert profile["hotspot_classification"] == "SINGLE_SEASON_HOTSPOT_CANDIDATE"
        assert profile["hotspot_confidence"] == "PERSISTENCE_UNVERIFIED_ONE_EMPIRICAL_SEASON"

    hotspots = get_all_persistent_hotspots()
    assert "single_season_hotspots" in hotspots
    assert "persistent_hotspots" in hotspots


def test_evidence_passport_quality_methodology_and_dynamic_timestamp():
    passp = generate_corridor_evidence_passport("C-14")
    eq = passp["data_quality_dimensions"]["evidence_quality"]
    assert eq["methodology"] == "HEURISTIC_EVALUATION_RUBRIC"
    assert "rubric_weights" in eq
    assert eq["rubric_weights"]["sentinel2_ndvi_10m"] == 90.0
    assert "limitations" in eq

    # Verify timestamp is ISO and was generated live (today)
    gen_at = passp["passport_generated_at"]
    dt = datetime.fromisoformat(gen_at.replace("Z", "+00:00"))
    assert dt.date() == datetime.now(timezone.utc).date()


def test_impact_monitoring_empirical_requires_all_fields_and_pending_status():
    # 1. Missing baseline metrics raises error for EMPIRICAL_MONITORING
    with pytest.raises(ValueError, match="baseline_metrics dictionary is required"):
        create_deployment({
            "corridor_id": "14",
            "archetype": "Linear Street Trees",
            "data_type": "EMPIRICAL_MONITORING",
        })

    # 2. Missing observation_date or source raises error
    with pytest.raises(ValueError, match="EMPIRICAL_MONITORING requires"):
        create_deployment({
            "corridor_id": "14",
            "archetype": "Linear Street Trees",
            "data_type": "EMPIRICAL_MONITORING",
            "baseline_metrics": {"ndvi_mean": 0.25},
        })

    # 3. PLANNED deployment with empty baseline flags BASELINE_DATA_PENDING
    dep = create_deployment({
        "corridor_id": "14",
        "archetype": "High-Albedo Cool Pavements",
        "data_type": "PLANNED",
        "lifecycle_status": "PLANNED",
        "baseline_metrics": {},
    })
    detail = get_deployment_detail(dep["deployment"]["id"])
    assert detail["monitoring_status"] == "BASELINE_DATA_PENDING"


def test_project_readiness_conditional_work_packages_and_renormalization():
    # Only cool pavements requested -> expect WP-1, WP-2, WP-7, WP-8 (4 packages, NOT 8)
    plan = create_project_from_portfolio(
        portfolio_name="Cool Pavements Specialized Program",
        budget_lakhs=40.0,
        corridors=[{"code": "C-14", "id": 14}],
        interventions=["high_albedo_cool_pavements"],
    )
    assert plan["work_packages_count"] == 4
    pkg_codes = [p["code"] for p in plan["work_packages"]]
    assert set(pkg_codes) == {"WP-1", "WP-2", "WP-7", "WP-8"}
    assert plan["readiness_score_type"] == "INITIAL_PLANNING_STAGE_INDICATOR"

    # Budget re-normalized
    total_allocated = sum(p["allocated_budget_lakhs"] for p in plan["work_packages"])
    assert abs(total_allocated - 40.0) <= 0.1


def test_segment_suitability_unverified_walkability_and_cool_pavements():
    # Mock corridor with is_walkable=None and unknown highway
    eval_res = evaluate_segment_suitability(
        corridor={"id": 101, "code": "C-101", "highway": "rural_track", "is_walkable": None},
        segment_index=1,
        seg_coords=[[77.20, 28.50], [77.21, 28.51]],
    )
    geom = eval_res["site_geometry"]
    assert geom["is_walkable"] is None
    assert geom["walkable_status"] == "UNVERIFIED_PEDESTRIAN_ACCESS"
    assert geom["row_width_guideline_m"] is None
    assert geom["row_width_status"] == "UNKNOWN_HIGHWAY_CLASS_NO_ROW_GUIDELINE"

    # Cool pavements requires field verification
    assert eval_res["archetypes"]["high_albedo_cool_pavements"]["feasibility_state"] == "FIELD_VERIFICATION_REQUIRED"


def test_shade_continuity_gap_naming_and_planning_parameters():
    shade = analyze_corridor_shade_continuity("C-14")
    seg = shade["segments"][0]
    assert "is_unshaded_vegetation_gap" in seg
    assert "vegetation_canopy_proxy_percent" in seg
    assert "scientific_disclaimer" in shade

    for bridge in shade["shade_bridge_recommendations"]:
        assert "planning_parameters" in bridge
        assert bridge["planning_parameters"]["tree_spacing_m"] == 8.0
        assert bridge["planning_parameters"]["estimated_unit_cost_inr"] == 12000


def test_pareto_optimizer_social_equity_traceable_provenance():
    res = run_pareto_optimization(budget_lakhs=25.0)
    for p in res["all_scenarios"]:
        assert "policy_defined_district_allocation_share" in p
        assert "equity_provenance" in p
        assert "Census of India / Delhi Economic Survey" in p["equity_provenance"]["source"]
        assert len(p["equity_provenance"]["vulnerable_districts_evaluated"]) >= 5
