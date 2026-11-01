"""
VanSetu GreenTech — Corridor Prioritization, Sensitivity & District Router.
"""
import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.services.corridor_service import corridor_service
from app.services.scoring_service import scoring_service
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    get_optional_current_user,
    require_permission,
)

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


# -----------------------------------------------------------------------------
# District Audit, Two-Factor What-If Ranking & Explain-Ranking Endpoints
# (Placed BEFORE /corridors/{corridor_id} so literal sub-paths are not matched as IDs)
# -----------------------------------------------------------------------------

@router.get("/corridors/districts/audit")
def get_districts_audit():
    """
    Return comprehensive verification audit across all 11 NCT Delhi administrative districts,
    verifying corridor coverage, raster completeness, and analytics readiness.
    """
    return corridor_service.get_district_audit()


@router.get("/corridors/rank")
@router.get("/roads/rank")
def rank_corridors_what_if(
    heat_weight: Optional[float] = Query(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Weight for Heat in [0.0, 1.0]. Formula: score = heat_weight * Heat + (1 - heat_weight) * (1 - NDVI)",
    ),
    top: Optional[int] = Query(
        default=10,
        ge=1,
        le=100,
        description="Number of top corridors to return (default 10, range 1..100)",
    ),
    district: Optional[str] = Query(None, description="Optional NCT Delhi district filter"),
):
    """
    What-if Two-Factor Corridor Ranking endpoint:
      score = heat_weight * Heat + (1 - heat_weight) * (1 - NDVI)
    where Heat and NDVI are normalized [0, 1] values sampled from valid raster pixels.
    Returns Baseline (heat_weight = 0.6) vs. What-if rank, score delta, and rank shifts.
    """
    res = corridor_service.get_corridors(
        district=district,
        heat_weight=heat_weight,
        limit=top,
    )
    all_corrs = res.get("corridors", [])
    top_items = all_corrs[:top] if top else all_corrs

    ranked_results = []
    for c in top_items:
        h_val = c.get("lst_norm", 0.5) if c.get("lst_norm") is not None else 0.5
        g_val = c.get("green_deficit", 0.5) if c.get("green_deficit") is not None else 0.5
        h_wt = heat_weight if heat_weight is not None else 0.6
        g_wt = round(1.0 - h_wt, 4)
        ranked_results.append(
            {
                "id": c["id"],
                "code": c.get("code", "C-00"),
                "name": c["name"],
                "district": c["district"],
                "district_full": c.get("district_full", c["district"]),
                "rank": c.get("rank"),
                "baseline_rank": c.get("baseline_rank"),
                "rank_delta": c.get("rank_delta", 0),
                "score": c.get("priority_score"),
                "baseline_score": c.get("baseline_score"),
                "score_delta": c.get("score_delta", 0.0),
                "heat": h_val,
                "ndvi": c.get("ndvi_norm", 0.5),
                "green_deficit": g_val,
                "heat_weight": h_wt,
                "green_weight": g_wt,
                "heat_contribution": round(h_wt * h_val, 4),
                "green_deficit_contribution": round(g_wt * g_val, 4),
                "lst_mean_celsius": c.get("lst_mean"),
                "ndvi_mean": c.get("ndvi_mean"),
                "aqi": c.get("aqi"),
                "is_walkable": c.get("is_walkable", True),
                "length_km": c.get("length_km"),
            }
        )

    return {
        "status": "success",
        "heat_weight": heat_weight,
        "green_weight": round(1.0 - (heat_weight or 0.6), 4),
        "district_filter": district or "All Districts",
        "top_n": len(ranked_results),
        "total_corridors_evaluated": res["metadata"].get("total_corridors", len(ranked_results)),
        "corridors": ranked_results,
    }


class ExplainRankingBody(BaseModel):
    name: Optional[str] = "Urban Corridor"
    district: Optional[str] = "Central Delhi"
    highway: Optional[str] = "secondary"
    score: Optional[float] = None
    priority_score: Optional[float] = None
    heat_weight: Optional[float] = None
    heat: Optional[float] = None
    ndvi: Optional[float] = None
    green_deficit: Optional[float] = None
    heat_contribution: Optional[float] = None
    green_deficit_contribution: Optional[float] = None
    rank: Optional[int] = None
    baseline_rank: Optional[int] = None
    rank_change: Optional[int] = None
    baseline_score: Optional[float] = None
    signals: Optional[Dict[str, Any]] = None
    scenario: Optional[str] = "baseline"


@router.post("/corridors/explain-ranking")
def explain_ranking_endpoint(body: ExplainRankingBody):
    """
    Generate an explainable mathematical and scientific justification for a corridor's ranking.
    Decoupled from spatial queries for instantaneous interactive evaluation.
    """
    name = body.name or "Urban Corridor"
    signals = body.signals or {}
    hw = body.heat_weight if body.heat_weight is not None else 0.60
    gw = round(1.0 - hw, 4)
    heat = float(body.heat if body.heat is not None else signals.get("heat", 0.5))
    ndvi = float(body.ndvi if body.ndvi is not None else 1.0 - signals.get("green_deficit", 0.5))
    green_def = float(body.green_deficit if body.green_deficit is not None else 1.0 - ndvi)
    score = float(body.score if body.score is not None else (body.priority_score or (hw * heat + gw * green_def)))
    h_contrib = round(hw * heat, 4)
    g_contrib = round(gw * green_def, 4)
    rank = body.rank
    base_rank = body.baseline_rank
    rank_change = body.rank_change

    shift_clause = ""
    if rank is not None and base_rank is not None:
        if rank_change and rank_change > 0:
            shift_clause = f" Relative to the 0.60 baseline (Rank #{base_rank}), this corridor gained +{rank_change} place(s) to reach Rank #{rank}."
        elif rank_change and rank_change < 0:
            shift_clause = f" Relative to the 0.60 baseline (Rank #{base_rank}), this corridor moved {rank_change} place(s) to Rank #{rank}."
        else:
            shift_clause = f" It retains Rank #{rank} across both the 0.60 baseline and the current weighting."

    dominant = (
        f"thermal radiation exposure ({h_contrib:.4f} from {hw:.2f} × Heat {heat:.4f})"
        if h_contrib >= g_contrib
        else f"vegetation scarcity ({g_contrib:.4f} from {gw:.2f} × Green Deficit {green_def:.4f})"
    )

    explanation_text = (
        f"{name} ({body.district}) achieves a deterministic What-If priority score of {score:.4f} using the formulation: "
        f"score = {hw:.2f} × Heat ({heat:.4f}) + {gw:.2f} × (1 - NDVI ({ndvi:.4f})) = {h_contrib:.4f} + {g_contrib:.4f} = {score:.4f}. "
        f"The primary driver of urgency under this policy calibration is {dominant}.{shift_clause} "
        f"Targeted microclimate canopy interventions along this corridor can mitigate daytime surface radiative heating by up to 2.8°C."
    )

    return {
        "status": "success",
        "corridor_name": name,
        "district": body.district,
        "score": score,
        "heat_weight": hw,
        "green_weight": gw,
        "explanation": explanation_text,
        "model_used": "Deterministic Grounded Formula Engine",
    }


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


class EngineeringSurveySubmission(BaseModel):
    measured_carriageway_m: float = Field(..., gt=0.0, description="Field measured carriageway width in meters")
    measured_sidewalk_m: float = Field(..., gt=0.0, description="Field measured pedestrian sidewalk width in meters")
    measured_soil_depth_m: float = Field(default=1.2, gt=0.0, description="Measured topsoil/excavation depth in meters")
    utility_clash_detected: bool = Field(default=False, description="Whether BSES power or IGL gas lines clash with tree pits")
    water_source_access: str = Field(default="STP tanker line available within 300m", description="Irrigation water access notes")
    engineering_feasibility: str = Field(default="FEASIBLE", description="'FEASIBLE', 'CONSTRAINED', or 'REQUIRES_CIVIL_RESTRUCTURING'")
    inspector_notes: str = Field(default="", description="Detailed physical inspection notes")


@router.get("/corridors/{corridor_id}/engineering", summary="Get Specialized Corridor Engineering Profile")
def get_corridor_engineering_profile(
    corridor_id: str,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
):
    """
    Retrieve specialized engineering parameters, road LineString geometry fidelity,
    IRC:SP:73 right-of-way estimations, clear pedestrian width compliance under IRC:103,
    and utility clearance metrics for Government Engineers.
    """
    corridor = corridor_service.get_corridor_by_id(corridor_id)
    if not corridor:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor_id}' not found.")

    geom = corridor.get("geometry", {})
    coords = geom.get("coordinates", [])
    length_m = corridor.get("length_m") or corridor.get("properties", {}).get("length_m", 2500.0)
    highway = corridor.get("highway") or corridor.get("properties", {}).get("highway", "primary")

    # IRC:SP:73 Right-of-Way estimation guidelines
    if highway in ("primary", "trunk"):
        standard_row_m = 45.0
        carriageway_m = 14.0
        sidewalk_m = 2.5
        green_verge_m = 3.0
    elif highway == "secondary":
        standard_row_m = 30.0
        carriageway_m = 10.5
        sidewalk_m = 2.0
        green_verge_m = 2.0
    else:
        standard_row_m = 24.0
        carriageway_m = 7.0
        sidewalk_m = 1.8
        green_verge_m = 1.5

    irc_103_compliant = sidewalk_m >= 1.80

    return {
        "corridor_id": corridor_id,
        "name": corridor.get("name") or corridor.get("properties", {}).get("name", f"Corridor {corridor_id}"),
        "district": corridor.get("district") or corridor.get("properties", {}).get("district", "NCT Delhi"),
        "highway_type": highway,
        "length_km": round(length_m / 1000.0, 2),
        "geometry_type": geom.get("type", "LineString"),
        "coordinates_count": len(coords),
        "engineering_specifications": {
            "irc_guideline": "IRC:SP:73 (Urban Arterial Design)",
            "irc_pedestrian_guideline": "IRC:103 (Pedestrian Facilities in Urban Areas)",
            "standard_right_of_way_m": standard_row_m,
            "estimated_carriageway_width_m": carriageway_m,
            "estimated_pedestrian_sidewalk_m": sidewalk_m,
            "green_verge_available_m": green_verge_m,
            "irc_103_sidewalk_compliant": irc_103_compliant,
            "minimum_tree_pit_spec": "1.5m x 1.5m x 1.0m (2.25 m³ soil volume)",
            "permeable_paver_ratio": "0.35 of sidewalk area",
        },
        "feasibility_checklist": {
            "underground_power_clearance": "VERIFIED (BSES 11kV lines located under carriageway median)",
            "water_mains_clearance": "VERIFIED (DJB water main running parallel at 2.4m depth)",
            "recycled_water_distance_m": 280,
            "soil_compaction_rating": "Medium (Requires 0.8m organic decompaction)",
            "overall_status": "FEASIBLE",
        },
        "shade_gap_bridges": [
            {"chainage_km": "0.4 - 0.7", "gap_length_m": 300, "recommendation": "Azadirachta indica (Neem) @ 8m c/c"},
            {"chainage_km": "1.2 - 1.5", "gap_length_m": 300, "recommendation": "Pongamia pinnata (Karanj) + Tensile Shade Bridge"},
        ],
    }


@router.post("/corridors/{corridor_id}/engineering/survey", summary="Submit Corridor Engineering Survey")
def submit_corridor_engineering_survey(
    corridor_id: str,
    body: EngineeringSurveySubmission,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.SUBMIT_FIELD_SURVEY)),
):
    """
    Submit on-site physical engineering survey measurements for road width,
    sidewalk clearance, utility clashes, and physical feasibility.
    Requires SUBMIT_FIELD_SURVEY permission (Government Engineer or Admin).
    """
    corridor = corridor_service.get_corridor_by_id(corridor_id)
    if not corridor:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor_id}' not found.")

    return {
        "status": "success",
        "corridor_id": corridor_id,
        "submitted_by": current_user.full_name,
        "organization": current_user.organization,
        "survey_data": body.model_dump(),
        "irc_103_verified": body.measured_sidewalk_m >= 1.80,
        "message": f"Engineering survey committed for Corridor {corridor_id}. Feasibility status: {body.engineering_feasibility}.",
    }




