"""
Tests for Explainable Corridor Prioritization & Missing-Data Handling (Section 4B & 7).
"""
import math
import pytest
from app.services.scoring_service import scoring_service


def test_missing_data_never_interpreted_as_zero():
    """
    Prove that missing (None or NaN) indicators are dynamically excluded and
    re-weighted rather than silently treated as 0.0.
    """
    # Case A: Pollution (AQI) is missing (None)
    res_missing_aqi = scoring_service.compute_corridor_score(
        lst_norm=0.85,
        ndvi_norm=0.15,  # green_deficit = 0.85
        aqi_norm=None,
        highway_type="secondary",
        district="Central Delhi",
        scenario="baseline",
    )

    # Case B: Pollution (AQI) is explicitly 0.0
    res_zero_aqi = scoring_service.compute_corridor_score(
        lst_norm=0.85,
        ndvi_norm=0.15,
        aqi_norm=0.0,
        highway_type="secondary",
        district="Central Delhi",
        scenario="baseline",
    )

    assert "pollution" in res_missing_aqi["data_completeness"]["missing_signals"]
    assert res_missing_aqi["calculation_breakdown"]["active_weights"]["pollution"] == 0.0
    assert res_missing_aqi["calculation_breakdown"]["weighted_contributions"]["pollution"] is None

    # Active weights on remaining 5 indicators must sum to 1.0
    active_w_sum = sum(res_missing_aqi["calculation_breakdown"]["active_weights"].values())
    assert math.isclose(active_w_sum, 1.0, rel_tol=1e-3)

    # Because heat and green_deficit are high (0.85), re-normalizing over available signals
    # must produce a significantly HIGHER score than treating missing AQI as 0.0!
    assert res_missing_aqi["priority_score"] > res_zero_aqi["priority_score"] + 0.10


def test_nan_inputs_handled_identically_to_none():
    """Verify float('nan') inputs are treated as missing, never propagating NaN or 0."""
    res = scoring_service.compute_corridor_score(
        lst_norm=float("nan"),
        ndvi_norm=0.20,
        aqi_norm=0.75,
        highway_type="pedestrian",
        district="East Delhi",
    )
    assert res["priority_score"] is not None
    assert not math.isnan(res["priority_score"])
    assert "heat" in res["data_completeness"]["missing_signals"]
    assert res["calculation_breakdown"]["normalized_inputs"]["heat"] is None


def test_all_signals_missing_returns_none_not_zero():
    """Verify that when all 6 signals are missing, priority_score is None (never 0.0)."""
    res = scoring_service.compute_corridor_score(
        lst_norm=None,
        ndvi_norm=None,
        aqi_norm=None,
        highway_type="unknown_type_without_proxy",
        district="Unknown_District_Without_Lookup",
        pedestrian_override=None,
        vulnerability_override=None,
        health_risk_override=None,
    )
    assert res["priority_score"] is None
    assert res["severity"] == "Insufficient Data"


def test_evidence_confidence_penalties_explicitly_tracked():
    """Verify MODIS 1km thermal penalty (-0.12) and missing data penalties are recorded."""
    res = scoring_service.compute_corridor_score(
        lst_norm=0.70,
        ndvi_norm=0.30,
        aqi_norm=0.60,
        aqi_distance_km=14.5,  # >10km triggers -0.10 penalty
        aqi_is_live=False,     # historical baseline triggers -0.06 penalty
        lst_native_resolution_m=1000.0,  # 1km MODIS triggers -0.12 penalty
    )
    penalties = res["calculation_breakdown"]["confidence_breakdown"]["penalties"]
    reasons = {p["reason"] for p in penalties}
    assert "coarse_thermal_resolution" in reasons
    assert "distant_aqi_station" in reasons
    assert "historical_aqi_baseline" in reasons
    assert 0.10 <= res["confidence_score"] < 0.85


def test_custom_weights_validation():
    """Verify invalid indicator names or negative weights raise ValueError."""
    with pytest.raises(ValueError):
        scoring_service.normalize_custom_weights({"invalid_factor": 0.5})
    with pytest.raises(ValueError):
        scoring_service.normalize_custom_weights({"heat": -0.2, "pollution": 0.8})
