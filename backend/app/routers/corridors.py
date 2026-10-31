"""
VanSetu GreenTech — Corridor Prioritization, Sensitivity & District Router.
"""
import json
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.services.corridor_service import corridor_service
from app.services.scoring_service import scoring_service

router = APIRouter(prefix="/api", tags=["Corridor Prioritization & Scenarios"])


class CustomScoreRequest(BaseModel):
    """Request body for scoring a corridor or custom indicator set."""
    lst_norm: Optional[float] = Field(None, description="Normalized heat exposure [0, 1] or None")
    ndvi_norm: Optional[float] = Field(None, description="Normalized NDVI [0, 1] or None")
    aqi_norm: Optional[float] = Field(None, description="Normalized AQI [0, 1] or None")
    highway_type: str = Field("secondary", description="OSM highway class")
    district: str = Field("Central Delhi", description="NCT Delhi administrative district")
    pedestrian_override: Optional[float] = Field(None, description="Optional direct pedestrian score [0, 1]")
    vulnerability_override: Optional[float] = Field(None, description="Optional direct vulnerability score [0, 1]")
    health_risk_override: Optional[float] = Field(None, description="Optional direct health risk score [0, 1]")
    length_m: float = Field(1000.0, gt=0)
    scenario: str = Field("baseline")
    custom_weights: Optional[Dict[str, float]] = None


@router.get("/corridors")
@router.get("/roads/corridors")
def get_prioritized_corridors(
    district: Optional[str] = Query(None, description="Filter by NCT Delhi administrative district"),
    scenario: str = Query("baseline", description="Policy scenario id"),
    heat_weight: Optional[float] = Query(None, description="Optional two-factor What-If heat weight in [0, 1]"),
    limit: Optional[int] = Query(None, ge=1, le=200),
    w_heat: Optional[float] = Query(None, ge=0.0),
    w_green_deficit: Optional[float] = Query(None, ge=0.0),
    w_pollution: Optional[float] = Query(None, ge=0.0),
    w_pedestrian: Optional[float] = Query(None, ge=0.0),
    w_health_risk: Optional[float] = Query(None, ge=0.0),
    w_vulnerable_pop: Optional[float] = Query(None, ge=0.0),
):
    """
    Retrieve prioritized urban corridors with GeoJSON geometries, Tri-Vector scores,
    explicit calculation breakdowns, and 5-category intervention plans.
    """
    custom_weights: Optional[Dict[str, float]] = None
    if any(
        w is not None
        for w in (w_heat, w_green_deficit, w_pollution, w_pedestrian, w_health_risk, w_vulnerable_pop)
    ):
        custom_weights = {
            "heat": w_heat if w_heat is not None else 0.25,
            "green_deficit": w_green_deficit if w_green_deficit is not None else 0.20,
            "pollution": w_pollution if w_pollution is not None else 0.20,
            "pedestrian": w_pedestrian if w_pedestrian is not None else 0.15,
            "health_risk": w_health_risk if w_health_risk is not None else 0.12,
            "vulnerable_pop": w_vulnerable_pop if w_vulnerable_pop is not None else 0.08,
        }

    try:
        return corridor_service.get_corridors(
            district=district,
            scenario=scenario,
            custom_weights=custom_weights,
            heat_weight=heat_weight,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors/scenarios")
@router.get("/roads/scenarios")
def list_scenarios():
    """Return metadata and weight distributions for all 5 policy scenarios."""
    return scoring_service.get_scenarios_metadata()


@router.get("/corridors/sensitivity")
@router.get("/roads/sensitivity")
def get_sensitivity_analysis(
    scenario: str = Query("baseline", description="Active focus scenario for comparative ranking"),
    district: Optional[str] = Query(None, description="Optional district filter"),
):
    """
    Run multi-scenario sensitivity analysis across all 5 policy scenarios
    (baseline, heat_resilience, air_quality, pedestrian_equity, extreme_vulnerability).
    Returns comparative rankings, score changes, rank shifts, and Stability Index S in [0, 1].
    """
    try:
        base_corridors = corridor_service._ensure_enriched_corridors()
        if district and district.strip().lower() not in ("all", "all districts", ""):
            target = district.strip().lower()
            base_corridors = [c for c in base_corridors if c["district"].strip().lower() == target]
        return scoring_service.run_sensitivity_analysis(base_corridors, focus_scenario=scenario)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors/districts")
def get_districts_summary(scenario: str = Query("baseline")):
    """Return district-level corridor priority, thermal, NDVI, and AQI aggregates."""
    try:
        return {
            "scenario": scoring_service.resolve_scenario_id(scenario),
            "districts": corridor_service.get_districts_summary(scenario=scenario),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors/districts/geojson")
def get_districts_geojson():
    """Return NCT Delhi administrative district boundaries GeoJSON."""
    path = settings.districts_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Districts GeoJSON file not found.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/corridors/raster-zones")
def get_raster_hotspot_zones(
    percentile: float = Query(85.0, ge=50.0, le=99.0),
    max_zones: int = Query(25, ge=1, le=100),
):
    """Return contiguous raster-derived high-priority heat/green-deficit hotspot polygons."""
    return corridor_service.get_raster_priority_zones_geojson(
        percentile_threshold=percentile, max_zones=max_zones
    )


@router.post("/corridors/score")
def evaluate_custom_score(req: CustomScoreRequest):
    """
    Directly evaluate the explainable scoring framework on custom inputs,
    verifying missing-data weight re-normalization and formula trace transparency.
    """
    try:
        return scoring_service.compute_corridor_score(
            lst_norm=req.lst_norm,
            ndvi_norm=req.ndvi_norm,
            aqi_norm=req.aqi_norm,
            highway_type=req.highway_type,
            district=req.district,
            pedestrian_override=req.pedestrian_override,
            vulnerability_override=req.vulnerability_override,
            health_risk_override=req.health_risk_override,
            length_m=req.length_m,
            scenario=req.scenario,
            custom_weights=req.custom_weights,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors/{corridor_id}")
@router.get("/roads/corridors/{corridor_id}")
def get_single_corridor(corridor_id: str, scenario: str = Query("baseline")):
    """Get complete corridor details, calculation breakdown, sensitivity profile, and intervention plan."""
    try:
        return corridor_service.get_corridor_by_id(corridor_id, scenario=scenario)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors/{corridor_id}/explain")
def explain_single_corridor(corridor_id: str, scenario: str = Query("baseline")):
    """Return a deterministic mathematical breakdown of why a corridor received its rank and score."""
    try:
        detail = corridor_service.get_corridor_by_id(corridor_id, scenario=scenario)
        return detail["explanation"]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class SuggestionCreate(BaseModel):
    text: str = Field(..., min_length=3, max_length=300, description="Community suggestion text")


@router.get("/roads/simple")
def get_roads_simple():
    """Get raw walkable road geometries for base map vector rendering."""
    return corridor_service.get_walkable_roads_simple()


@router.get("/corridors/{corridor_id}/upvotes")
def get_corridor_upvotes(corridor_id: str):
    """Get community upvote count for a corridor."""
    return corridor_service.get_corridor_upvotes(corridor_id)


@router.post("/corridors/{corridor_id}/upvote")
def upvote_corridor(corridor_id: str, request: Request):
    """Cast an upvote for a corridor."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    return corridor_service.upvote_corridor(corridor_id, client_ip)


@router.get("/corridors/{corridor_id}/suggestions")
def get_corridor_suggestions(corridor_id: str):
    """Get community suggestions for a corridor."""
    return corridor_service.get_corridor_suggestions(corridor_id)


@router.post("/corridors/{corridor_id}/suggestions")
def add_corridor_suggestion(corridor_id: str, body: SuggestionCreate, request: Request):
    """Submit a community suggestion for a corridor."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    return corridor_service.add_corridor_suggestion(corridor_id, body.text, client_ip)

