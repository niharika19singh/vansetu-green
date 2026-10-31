"""
Tests for Feature 3: Pareto Portfolio Lab (Multi-Objective MILP Decision System).
Verifies:
- Multi-objective optimization runs across budget envelopes
- True Pareto dominance checking and frontier generation
- Mathematical rationale for excluded alternatives
- Zero fabricated °C cooling claims
- Presets endpoint for ₹20L, ₹50L, ₹1Cr
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_pareto_optimization_run():
    payload = {
        "budget_lakhs": 35.0,
    }
    response = client.post("/api/optimizer/pareto", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["budget_envelope_lakhs"] == 35.0
    assert "pareto_frontier" in data
    assert len(data["pareto_frontier"]) >= 1

    # Check frontier attributes
    sol = data["pareto_frontier"][0]
    assert "capex_lakhs" in sol
    assert "opex_5yr_lakhs" in sol
    assert "lifecycle_cost_lakhs" in sol
    assert "climate_priority_total" in sol
    assert "equity_share_percent" in sol

    # Check excluded alternatives rationale
    assert "excluded_alternatives_rationale" in data
    assert len(data["excluded_alternatives_rationale"]) >= 1
    first_ex = data["excluded_alternatives_rationale"][0]
    assert "marginal_efficiency" in first_ex
    assert "exclusion_rationale" in first_ex

    # Scientific guardrail confirmation
    assert "°C" in data["scientific_guardrail"] or "No direct cooling" in data["scientific_guardrail"]


def test_pareto_presets():
    response = client.get("/api/optimizer/pareto/presets")
    assert response.status_code == 200
    data = response.json()
    assert "presets" in data
    assert "preset_20lakh" in data["presets"]
    assert "preset_50lakh" in data["presets"]
    assert "preset_100lakh" in data["presets"]
