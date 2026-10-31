"""
MLH — Best Use of Tiger Data (TimescaleDB) Temporal Environmental Intelligence Router (Phase 5).
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.tiger_data_service import get_tiger_data_service

router = APIRouter(prefix="/api/temporal", tags=["Tiger Data (TimescaleDB) Temporal Intelligence"])


class IngestObservationRequest(BaseModel):
    corridor_id: str = Field(default="C-14")
    metric: str = Field(default="lst_celsius")
    value: float
    source: str = Field(default="Municipal_Field_Logger")
    unit: Optional[str] = None
    quality_flag: str = Field(default="VALID")
    is_simulated: bool = Field(default=False)
    observed_at: Optional[str] = None


@router.get("/schema")
async def get_tiger_data_schema() -> Dict[str, Any]:
    """Return TimescaleDB hypertable DDL, continuous aggregate definition, and connection status."""
    svc = get_tiger_data_service()
    return svc.get_schema_and_status()


@router.get("/observations")
async def query_temporal_observations(
    corridor_id: str = Query(default="C-14"),
    metric: Optional[str] = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    include_simulated: bool = Query(default=True),
) -> Dict[str, Any]:
    """Query time-series environmental observations for a corridor."""
    svc = get_tiger_data_service()
    return svc.query_observations(
        corridor_id=corridor_id,
        metric=metric,
        days=days,
        include_simulated=include_simulated,
    )


@router.post("/observations")
async def ingest_temporal_observation(req: IngestObservationRequest) -> Dict[str, Any]:
    """Ingest a new environmental time-series observation into `environmental_observations`."""
    svc = get_tiger_data_service()
    return svc.ingest_observation(
        corridor_id=req.corridor_id,
        metric=req.metric,
        value=req.value,
        source=req.source,
        unit=req.unit,
        quality_flag=req.quality_flag,
        is_simulated=req.is_simulated,
        observed_at=req.observed_at,
    )


@router.get("/daily-summary")
async def get_daily_summary(
    corridor_id: str = Query(default="C-14"),
    metric: str = Query(default="lst_celsius"),
    days: int = Query(default=30, ge=1, le=365),
) -> Dict[str, Any]:
    """Query the `corridor_daily_summary` continuous aggregate rollup."""
    svc = get_tiger_data_service()
    return svc.get_daily_summary(corridor_id=corridor_id, metric=metric, days=days)


@router.get("/trends/{corridor_id}")
async def get_corridor_trends(corridor_id: str) -> Dict[str, Any]:
    """Return 30-day multi-metric trends, heatwave persistence days, and anomaly diagnostics."""
    svc = get_tiger_data_service()
    return svc.get_corridor_trends(corridor_id=corridor_id)


@router.get("/comparison")
async def compare_historical_periods(
    corridor_id: str = Query(default="C-14"),
    metric: str = Query(default="lst_celsius"),
    recent_days: int = Query(default=7, ge=1, le=30),
    baseline_days: int = Query(default=14, ge=1, le=60),
) -> Dict[str, Any]:
    """Compare a recent window (e.g. last 7 days) against a prior baseline window."""
    svc = get_tiger_data_service()
    return svc.compare_historical_periods(
        corridor_id=corridor_id,
        metric=metric,
        recent_days=recent_days,
        baseline_days=baseline_days,
    )


@router.get("/intervention-monitoring")
async def get_intervention_monitoring(
    corridor_id: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """Return pre- vs post-intervention microclimate effectiveness monitoring."""
    svc = get_tiger_data_service()
    return svc.get_intervention_monitoring(corridor_id=corridor_id)
