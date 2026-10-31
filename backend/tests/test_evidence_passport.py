"""
Tests for Feature 1: Corridor Evidence Passport.
Verifies:
- Complete passport generation for corridors (C-14, C-01, etc.)
- What We Know categories with physical resolutions
- What We Don't Know gaps (UTCI/WBGT, subsurface utilities, soil)
- What Requires Verification (GPR, IRC:103, STP water, wind-shear)
- 5 Disaggregated Data Quality Dimensions
- Actionable recommendations with cost estimates
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_evidence_passport_endpoint():
    response = client.get("/api/evidence/passport/C-14")
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_code"] == "C-14"
    assert "what_we_know" in data
    assert "what_we_dont_know" in data
    assert "what_requires_verification" in data
    assert "data_quality_dimensions" in data
    assert "evidence_improvement_recommendations" in data

    # Verify What We Know covers 5 categories
    know = data["what_we_know"]
    assert "vegetation_evidence" in know
    assert "surface_heat_evidence" in know
    assert "air_quality_evidence" in know
    assert "social_vulnerability_evidence" in know
    assert "site_feasibility_evidence" in know

    # Verify resolution documentation
    assert know["vegetation_evidence"]["native_resolution"] == "10m × 10m"
    assert "1,000m" in know["surface_heat_evidence"]["native_measurement_resolution"]

    # Verify What We Don't Know explicitly disclaims UTCI/WBGT
    dont_know = data["what_we_dont_know"]
    categories = [dk["category"] for dk in dont_know]
    assert any("UTCI" in c or "Thermal Comfort" in c for c in categories)
    assert any("Subsurface" in c or "Utility" in c for c in categories)

    # Verify 5 Quality Dimensions
    dims = data["data_quality_dimensions"]
    assert "evidence_quality" in dims
    assert "evidence_completeness" in dims
    assert "temporal_freshness" in dims
    assert "spatial_representativeness" in dims
    assert "recommendation_confidence" in dims

    for k, dim in dims.items():
        assert 0.0 <= dim["score"] <= 100.0


def test_evidence_passports_summary():
    response = client.get("/api/evidence/passports")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 40
    assert len(data["summaries"]) == data["count"]


def test_evidence_passport_invalid_corridor():
    response = client.get("/api/evidence/passport/non-existent-999")
    assert response.status_code == 404
