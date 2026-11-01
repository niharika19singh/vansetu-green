"""
VanSetu GreenTech — Corridor Predictive Microclimate Intelligence Router.

Exposes predictive machine learning and empirical regression models across 5 horizons:
1. GET  /api/prediction/scenarios (or /api/prediction/horizons)
2. GET  /api/prediction/corridor/{corridor_id}
3. POST /api/prediction/corridor
4. GET  /api/prediction/corridors
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.prediction_service import prediction_service, PREDICTION_HORIZONS

router = APIRouter(prefix="/api/prediction", tags=["Corridor Climate Prediction"])


class PredictCorridorRequest(BaseModel):
    corridor_id: str = Field(..., description="Target corridor ID or code, e.g. 'delhi_corridor_014' or 'C-14'")
    horizon_id: str = Field(default="horizon_3yr_2029", description="One of: horizon_1yr_2027, horizon_3yr_2029, horizon_5yr_2031, extreme_heatwave_2030, vansetu_greened_2028")


@router.get("/scenarios")
@router.get("/horizons")
def list_prediction_horizons() -> List[Dict[str, Any]]:
    """Return metadata and parameters for all 5 climate prediction horizons."""
    return prediction_service.list_horizons()


@router.get("/corridor/{corridor_id}")
def get_corridor_prediction(
    corridor_id: str,
    horizon_id: str = Query("horizon_3yr_2029", description="Prediction horizon"),
) -> Dict[str, Any]:
    """Execute predictive model for a corridor under a specific horizon."""
    try:
        return prediction_service.predict_corridor(corridor_id=corridor_id, horizon_id=horizon_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/corridor")
def run_corridor_prediction(body: PredictCorridorRequest) -> Dict[str, Any]:
    """Execute predictive model via POST for custom or interactive execution."""
    try:
        return prediction_service.predict_corridor(corridor_id=body.corridor_id, horizon_id=body.horizon_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/corridors")
def predict_all_corridors(
    horizon_id: str = Query("horizon_3yr_2029", description="Prediction horizon"),
    district: Optional[str] = Query(None, description="Optional NCT Delhi administrative district"),
) -> Dict[str, Any]:
    """Execute predictive model across all corridors (or filtered by district) for batch analytics."""
    try:
        return prediction_service.predict_all_corridors(horizon_id=horizon_id, district=district)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
