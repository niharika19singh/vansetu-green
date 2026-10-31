"""
Tests for GreenTech Intervention Categories & CPWD DSR 2023 Lifecycle Costs (Section 4D & 7).
"""
import math
from app.services.intervention_service import intervention_service, INTERVENTION_CATALOG


def test_five_required_intervention_categories_present():
    """Verify all 5 required GreenTech intervention categories are present."""
    expected_ids = {
        "linear_street_trees",
        "architectural_shade_structures",
        "roadside_bioswales",
        "living_green_walls",
        "cool_pavements",
    }
    assert set(INTERVENTION_CATALOG.keys()) == expected_ids


def test_intervention_cost_calculations_and_length_scaling():
    """
    Verify CapEx, OpEx, and 5-year lifecycle cost formulas:
    1. 5-year lifecycle per km == CapEx per km + 5 * Annual OpEx per km
    2. Total corridor costs scale linearly with corridor_length_m / 1000.0
    """
    plan_1km = intervention_service.evaluate_corridor_interventions(
        heat_norm=0.75,
        green_deficit_norm=0.70,
        aqi_norm=0.65,
        pedestrian_norm=0.80,
        length_m=1000.0,
    )
    plan_2_5km = intervention_service.evaluate_corridor_interventions(
        heat_norm=0.75,
        green_deficit_norm=0.70,
        aqi_norm=0.65,
        pedestrian_norm=0.80,
        length_m=2500.0,
    )

    by_id_1km = {i["id"]: i for i in plan_1km["all_interventions"]}
    by_id_2_5km = {i["id"]: i for i in plan_2_5km["all_interventions"]}

    for int_id, item1 in by_id_1km.items():
        cb1 = item1["cost_breakdown"]
        cb25 = by_id_2_5km[int_id]["cost_breakdown"]

        # Verify 5-yr lifecycle = CapEx + 5 * Annual OpEx
        expected_5yr_unit = cb1["capex_inr_lakhs_per_km"] + 5.0 * cb1["annual_opex_inr_lakhs_per_km"]
        assert math.isclose(cb1["five_year_lifecycle_inr_lakhs_per_km"], expected_5yr_unit, rel_tol=1e-4)

        # Verify 2.5km corridor costs are 2.5x 1km corridor costs
        assert math.isclose(
            cb25["total_five_year_lifecycle_inr_lakhs"],
            cb1["five_year_lifecycle_inr_lakhs_per_km"] * 2.5,
            rel_tol=1e-3,
        )

        # Verify constraints, pre-installation verification, and confidence limitations exist
        assert len(item1["site_constraints"]) >= 2
        assert len(item1["pre_installation_verification"]) >= 2
        assert len(item1["evidence_and_confidence_limitations"]) >= 2
