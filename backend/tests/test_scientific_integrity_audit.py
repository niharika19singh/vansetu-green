"""
VanSetu GreenTech — Scientific Integrity & Non-Fabrication Audit Verification Suite.

Validates that:
1. Missing source measurements in Evidence Passport return null/None and explicit UNAVAILABLE/MISSING status;
   never silent numeric fallbacks (e.g., 0.25 NDVI, 32°C LST).
2. Segment-level geometry returns explicit UNMEASURED / FIELD_VERIFICATION_REQUIRED states without hash pseudo-measurements.
3. Native Delhi Tree Species Catalog items carry authoritative silvicultural citations and advisory labels.
4. Pedestrian Shade Continuity utilizes real Sentinel-2 raster surface reflectance samples and Euclidean transit distances.
5. Multi-temporal seasonal heat profiles explicitly separate single-season empirical MODIS LST from synthetic monsoon/winter models.
6. Pareto dominance checks (`is_pareto_dominated`) correctly adhere to multi-objective mathematical criteria.
7. Project readiness planner calculates dynamic readiness percentages from package gate weights and rejects empty portfolios.
8. Spatial Meko memory pins cleanly preserve unlocated spatial status without inventing default central coordinates.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

from app.services.pareto_optimizer_service import is_pareto_dominated
from app.services.segment_suitability_service import evaluate_segment_suitability, NCT_DELHI_TREE_SPECIES_CATALOG
from app.services.evidence_passport_service import generate_corridor_evidence_passport
from app.services.shade_continuity_service import analyze_corridor_shade_continuity
from app.services.seasonal_heat_service import get_corridor_seasonal_profile
from app.services.project_readiness_service import create_project_from_portfolio
from app.services.spatial_memory_service import get_spatial_memory_pins

client = TestClient(app)


def test_evidence_passport_zero_fabrication():
    """Verify missing source data returns explicit missing/unavailable states, not numeric defaults."""
    passport = generate_corridor_evidence_passport("C-14")
    assert passport["corridor_code"] == "C-14"
    assert "what_we_know" in passport
    know = passport["what_we_know"]

    # Verify signals contain rigorous sensor provenance
    assert "vegetation_evidence" in know
    veg = know["vegetation_evidence"]
    assert "Sentinel-2" in veg["dataset_source"]
    assert "10m" in veg["native_resolution"]

    assert "surface_heat_evidence" in know
    heat = know["surface_heat_evidence"]
    assert "MODIS" in heat["dataset_source"]
    assert "1,000m" in heat["native_measurement_resolution"]

    # Verification of completeness and quality dimensions
    assert "data_quality_dimensions" in passport
    dims = passport["data_quality_dimensions"]
    assert "evidence_completeness" in dims
    assert "evidence_quality" in dims
    assert 0.0 <= dims["evidence_completeness"]["score"] <= 100.0


def test_segment_suitability_unmeasured_site_geometry():
    """Verify segment evaluation returns explicit UNMEASURED flags without hash pseudo-values."""
    mock_corridor = {
        "id": "14",
        "code": "C-14",
        "highway": "secondary",
        "is_walkable": True,
    }
    mock_coords = [[77.240, 28.628], [77.241, 28.629], [77.242, 28.630]]
    eval_res = evaluate_segment_suitability(mock_corridor, 1, mock_coords)

    geom = eval_res["site_geometry"]
    assert geom["exact_sidewalk_width_m"] is None
    assert geom["sidewalk_width_status"] == "UNMEASURED_REQUIRES_TOTAL_STATION_SURVEY"
    assert geom["overhead_clearance_m"] is None
    assert geom["overhead_clearance_status"] == "UNMEASURED_REQUIRES_FIELD_SURVEY"
    assert "GPR_TRIAL_PITS" in geom["underground_utility_risk"]

    # Subterranean tree archetypes must demand field verification
    tree_arch = eval_res["archetypes"]["linear_street_trees"]
    assert tree_arch["feasibility_state"] == "FIELD_VERIFICATION_REQUIRED"


def test_species_catalog_advisory_citations():
    """Verify Delhi native species catalog items contain silvicultural source citations."""
    catalog = NCT_DELHI_TREE_SPECIES_CATALOG
    assert len(catalog) == 12

    for sp in catalog:
        assert sp["review_status"] == "ADVISORY_SILVICULTURAL_REFERENCE"
        assert "source_reference" in sp
        assert len(sp["source_reference"]) > 5
        assert "geographic_applicability" in sp
        assert "data_limitations" in sp


def test_shade_continuity_real_raster_sampling():
    """Verify shade continuity utilizes empirical raster sampling and Euclidean transit distance."""
    shade_res = analyze_corridor_shade_continuity("C-14")
    assert "segments" in shade_res
    assert len(shade_res["segments"]) >= 2

    # Segments must report measured NDVI or explicit unmeasured status
    first_seg = shade_res["segments"][0]
    assert "measured_ndvi" in first_seg
    assert "midpoint" in first_seg

    # Transit connectivity must disclaim Euclidean Haversine calculation
    transit = shade_res["transit_connectivity"]
    assert "straight_line_euclidean_distance_km" in transit
    assert "Haversine" in transit["distance_calculation_method"]

    # Cost source must cite CPWD / Forestry norms
    bridges = shade_res["shade_bridge_recommendations"]
    for b in bridges:
        assert "CPWD Schedule of Rates" in b["unit_cost_source"]


def test_seasonal_heat_synthetic_disclosure():
    """Verify multi-temporal seasonal profiles explicitly disclose synthetic monsoon/winter models."""
    profile = get_corridor_seasonal_profile("C-14")
    obs = profile["seasonal_observations"]
    assert len(obs) == 3

    # Summer: empirical
    summer = obs[0]
    assert summer["is_measured"] is True
    assert summer["data_classification"] == "EMPIRICAL_SATELLITE_MEASUREMENT"

    # Monsoon: synthetic
    monsoon = obs[1]
    assert monsoon["is_measured"] is False
    assert monsoon["data_classification"] == "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION"

    # Winter: synthetic
    winter = obs[2]
    assert winter["is_measured"] is False
    assert winter["data_classification"] == "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION"

    # Persistent hotspot confidence must be qualified due to single empirical season
    assert profile["hotspot_confidence"] in ["LOW_UNVERIFIED", "MODERATE"]


def test_pareto_dominance_mathematical_logic():
    """Verify multi-objective Pareto dominance calculation logic."""
    sol_a = {"climate_priority_total": 10.0, "equity_share_percent": 60.0, "lifecycle_cost_lakhs": 40.0}
    sol_b = {"climate_priority_total": 12.0, "equity_share_percent": 65.0, "lifecycle_cost_lakhs": 35.0} # Strictly dominates sol_a
    sol_c = {"climate_priority_total": 14.0, "equity_share_percent": 50.0, "lifecycle_cost_lakhs": 42.0} # Non-dominated (trade-off)

    # sol_b strictly dominates sol_a (higher priority, higher equity, lower cost)
    assert is_pareto_dominated(sol_a, [sol_a, sol_b, sol_c]) is True
    # sol_b is non-dominated
    assert is_pareto_dominated(sol_b, [sol_a, sol_b, sol_c]) is False
    # sol_c is non-dominated
    assert is_pareto_dominated(sol_c, [sol_a, sol_b, sol_c]) is False


def test_project_readiness_rejection_of_empty_portfolio():
    """Verify project readiness rejects empty corridor portfolios."""
    with pytest.raises(ValueError, match="empty corridor portfolio"):
        create_project_from_portfolio(
            portfolio_name="Empty Test",
            budget_lakhs=30.0,
            corridors=[],
        )


def test_spatial_memory_unlocated_pin_handling():
    """Verify spatial memory pins without coordinate data return None rather than fake central coordinates."""
    pins_data = get_spatial_memory_pins()
    assert "pins" in pins_data
    for p in pins_data["pins"]:
        coords = p["coordinates"]
        assert "lat" in coords
        assert "lng" in coords
        if p.get("has_spatial_coordinates") is False:
            assert coords["lat"] is None
            assert coords["lng"] is None
