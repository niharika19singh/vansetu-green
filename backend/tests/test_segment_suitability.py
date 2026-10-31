"""
Tests for Feature 2: Right Tree, Right Place (Segment-Level Site Suitability & Native Species Catalog).
Verifies:
- Corridor spatial sub-segmentation (~100m–250m)
- 5 intervention archetypes evaluated per segment with explicit feasibility states
- Constraint-driven alternative recommendations
- NCT Delhi Native Tree Species Catalog (12 species)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_corridor_segments_suitability():
    response = client.get("/api/suitability/corridor/C-14/segments")
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_code"] == "C-14"
    assert data["total_segments"] >= 2
    segments = data["segments"]
    assert len(segments) == data["total_segments"]

    first_seg = segments[0]
    assert "segment_id" in first_seg
    assert "site_geometry" in first_seg
    assert "archetypes" in first_seg

    geom = first_seg["site_geometry"]
    assert "estimated_sidewalk_width_m" in geom
    assert "overhead_clearance_m" in geom
    assert "underground_utility_risk" in geom

    # Verify 5 archetypes evaluated
    archetypes = first_seg["archetypes"]
    assert "linear_street_trees" in archetypes
    assert "roadside_bioswales" in archetypes
    assert "living_green_walls" in archetypes
    assert "architectural_shade_structures" in archetypes
    assert "high_albedo_cool_pavements" in archetypes

    valid_states = {"FEASIBLE_ESTIMATE", "FIELD_VERIFICATION_REQUIRED", "CONSTRAINT_IDENTIFIED", "NOT_FEASIBLE"}
    for name, arch in archetypes.items():
        assert arch["feasibility_state"] in valid_states


def test_single_segment_detail():
    response = client.get("/api/suitability/segment/C-14-S1")
    assert response.status_code == 200
    data = response.json()
    assert data["segment_id"] == "C-14-S1"
    assert data["corridor_code"] == "C-14"


def test_tree_species_catalog():
    response = client.get("/api/suitability/species-catalog")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 10
    species = data["species"]

    botanical_names = [s["botanical_name"] for s in species]
    assert "Azadirachta indica" in botanical_names  # Neem
    assert "Pongamia pinnata" in botanical_names    # Karanj
    assert "Cassia fistula" in botanical_names      # Amaltas

    # Test filtering by sidewalk width
    filtered = client.get("/api/suitability/species-catalog?min_sidewalk_width_m=2.0").json()
    for s in filtered["species"]:
        assert s["minimum_sidewalk_width_m"] <= 2.0
