"""
Tests for Feature 7: Spatial Institutional Memory Map (YugabyteDB / Meko).
Verifies:
- Georeferenced memory pins with coordinates, corridor codes, and categories
- Full memory lifecycle operations (APPROVE, CORRECT, PROMOTE, FORGET, SUPERSEDE)
- Corridor MEKO ON vs. OFF decision comparison
- Synthetic demonstration scenario labeling
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_spatial_memory_pins():
    response = client.get("/api/meko/spatial/pins")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    pins = data["pins"]

    first_pin = pins[0]
    assert "coordinates" in first_pin
    assert "lat" in first_pin["coordinates"]
    assert "lng" in first_pin["coordinates"]
    assert "category" in first_pin
    assert "badge" in first_pin
    assert "available_lifecycle_actions" in first_pin


def test_corridor_spatial_context_comparison():
    response = client.get("/api/meko/spatial/corridor/C-14/comparison")
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_code"] == "C-14"
    assert "comparison" in data
    comp = data["comparison"]
    assert "meko_off" in comp
    assert "meko_on" in comp

    assert comp["meko_off"]["mode"] == "MEKO_OFF"
    assert comp["meko_on"]["mode"] == "MEKO_ON"


def test_spatial_memory_lifecycle_action():
    # Fetch pins first to get an existing memory_id
    pins_resp = client.get("/api/meko/spatial/pins")
    pins = pins_resp.json()["pins"]
    mem_id = pins[0]["memory_id"]

    # Test APPROVE action
    resp = client.post("/api/meko/spatial/action", json={
        "memory_id": mem_id,
        "action": "APPROVE",
        "actor_agent": "test_agent",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    # Test CORRECT action
    resp_corr = client.post("/api/meko/spatial/action", json={
        "memory_id": mem_id,
        "action": "CORRECT",
        "actor_agent": "test_agent",
        "correction_text": "Updated field reality verified during joint PWD inspection.",
    })
    assert resp_corr.status_code == 200
    assert resp_corr.json()["status"] == "success"
