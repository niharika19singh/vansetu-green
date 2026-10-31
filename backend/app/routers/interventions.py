"""
VanSetu GreenTech — Green Infrastructure Intervention Planning Router.
"""
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.intervention_service import intervention_service

router = APIRouter(prefix="/api/interventions", tags=["Intervention Planning"])


class InterventionEvalRequest(BaseModel):
    """Parameters for evaluating intervention suitability and CPWD lifecycle costs."""
    heat_norm: Optional[float] = Field(0.65, ge=0.0, le=1.0)
    green_deficit_norm: Optional[float] = Field(0.60, ge=0.0, le=1.0)
    aqi_norm: Optional[float] = Field(0.70, ge=0.0, le=1.0)
    pedestrian_norm: Optional[float] = Field(0.75, ge=0.0, le=1.0)
    feasibility_score: float = Field(0.80, ge=0.0, le=1.0)
    confidence_score: float = Field(0.78, ge=0.0, le=1.0)
    highway_type: str = Field("secondary")
    length_m: float = Field(1000.0, gt=0)
    district: str = Field("Central Delhi")


@router.get("/catalog")
def get_intervention_catalog():
    """Return all 5 GreenTech intervention archetypes, CPWD DSR 2023 cost rates, and constraints."""
    return intervention_service.get_catalog()


@router.post("/evaluate")
def evaluate_interventions(req: InterventionEvalRequest):
    """Evaluate suitability, CapEx, OpEx, and 5-year lifecycle costs for a custom corridor profile."""
    return intervention_service.evaluate_corridor_interventions(
        heat_norm=req.heat_norm,
        green_deficit_norm=req.green_deficit_norm,
        aqi_norm=req.aqi_norm,
        pedestrian_norm=req.pedestrian_norm,
        feasibility_score=req.feasibility_score,
        confidence_score=req.confidence_score,
        highway_type=req.highway_type,
        length_m=req.length_m,
        district=req.district,
    )
