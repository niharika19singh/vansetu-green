"""
Tests for 5-Scenario Sensitivity Analysis & Ranking Consistency (Section 4C & 7).
"""
import math
from app.services.scoring_service import scoring_service, POLICY_SCENARIOS
from app.services.corridor_service import corridor_service


def test_all_five_required_scenarios_configured_and_normalized():
    """Verify the 5 required scenarios exist and their weights sum to 1.00."""
    required = {
        "baseline",
        "heat_resilience",
        "air_quality",
        "pedestrian_equity",
        "extreme_vulnerability",
    }
    assert required.issubset(set(POLICY_SCENARIOS.keys()))
    for sc_id, sc_meta in POLICY_SCENARIOS.items():
        w_sum = sum(sc_meta["weights"].values())
        assert math.isclose(w_sum, 1.0, rel_tol=1e-5), f"Scenario {sc_id} weights sum to {w_sum}"


def test_scenario_comparison_and_stability_index():
    """Verify multi-scenario sensitivity across all 44 NCT Delhi corridors."""
    corridors = corridor_service._ensure_enriched_corridors()
    assert len(corridors) == 44

    sens = scoring_service.run_sensitivity_analysis(corridors, focus_scenario="heat_resilience")
    assert sens["active_scenario"] == "heat_resilience"
    assert sens["total_corridors"] == 44
    assert 0.0 <= sens["summary"]["mean_stability_index"] <= 1.0

    # Verify rank order is strictly 1..44
    ranks = [c["active_rank"] for c in sens["corridors"]]
    assert ranks == list(range(1, 45))

    # Check each corridor has all 5 scenarios in scenario_comparison
    first = sens["corridors"][0]
    for sc_key in ("baseline", "heat_resilience", "air_quality", "pedestrian_equity", "extreme_vulnerability"):
        assert sc_key in first["scenario_comparison"]
        sc_entry = first["scenario_comparison"][sc_key]
        assert 1 <= sc_entry["rank"] <= 44
        assert 0.0 <= sc_entry["score"] <= 1.0


def test_what_if_two_factor_ranking_consistency():
    """Verify What-If heat_weight slider produces deterministic rank deltas vs 0.60 baseline."""
    res_base = corridor_service.get_corridors(heat_weight=0.60)
    for c in res_base["corridors"]:
        assert c["rank_delta"] == 0
        assert math.isclose(c["score_delta"], 0.0, abs_tol=1e-5)

    res_heat = corridor_service.get_corridors(heat_weight=1.0)
    scores = [c["priority_score"] for c in res_heat["corridors"]]
    assert scores == sorted(scores, reverse=True)
