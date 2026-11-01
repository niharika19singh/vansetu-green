"""
Feature 5: Seasonal Urban Heat Intelligence Router.
Exposes endpoints for multi-temporal seasonal observations, persistent thermal hotspot detection,
and sensor resolution provenance.
"""
from __future__ import annotations

import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Path

from app.services.seasonal_heat_service import (
    get_corridor_seasonal_profile,
    get_all_persistent_hotspots,
    DELHI_SEASONAL_BASELINES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/seasonal", tags=["Seasonal Urban Heat"])


@router.get("/hotspots", summary="Get All Persistent Thermal Hotspots")
def get_hotspots() -> Dict[str, Any]:
    """
    Retrieve all NCT Delhi corridors classified as Persistent Thermal Hotspots based on
    consistent multi-seasonal radiometric thermal observations.
    """
    try:
        return get_all_persistent_hotspots()
    except Exception as e:
        logger.error(f"Error fetching persistent hotspots: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch persistent hotspots: {e}")


@router.get("/baselines", summary="Get Regional Seasonal Climate Baselines")
def get_seasonal_baselines() -> Dict[str, Any]:
    """
    Retrieve baseline thermal metrics for Delhi's 3 distinct climate windows:
    Pre-Monsoon, Monsoon, and Post-Monsoon / Winter.
    """
    return {
        "city": "National Capital Territory of Delhi",
        "seasons": DELHI_SEASONAL_BASELINES,
    }


@router.get("/corridor/{corridor_id}", summary="Get Corridor Seasonal Heat Profile")
def get_corridor_profile(
    corridor_id: str = Path(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
) -> Dict[str, Any]:
    """
    Retrieve multi-temporal seasonal thermal observations, persistent hotspot status,
    sensor resolution breakdown, and human thermal comfort disclaimers for a corridor.
    """
    try:
        return get_corridor_seasonal_profile(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating seasonal profile for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve seasonal profile: {e}")
