"""
Feature 4: Pedestrian Shade Continuity Router.
Exposes endpoints for walkability network gap analysis, continuous thermal gap identification,
and shade bridge recommendations.
"""
from __future__ import annotations

import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Path

from app.services.shade_continuity_service import (
    analyze_corridor_shade_continuity,
    get_city_network_shade_gaps,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shade-continuity", tags=["Shade Continuity"])


@router.get("/network-gaps", summary="Get City-Wide Shade Gap Rankings")
def get_network_gaps() -> Dict[str, Any]:
    """
    Retrieve ranked list of all 44 NCT Delhi corridors sorted by Shade Gap Score.
    Identifies systemic gaps in pedestrian canopy continuity and transit connection routes.
    """
    try:
        return get_city_network_shade_gaps()
    except Exception as e:
        logger.error(f"Error fetching city network shade gaps: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch shade gaps: {e}")


@router.get("/{corridor_id}", summary="Get Corridor Shade Continuity Analysis")
def get_corridor_shade(
    corridor_id: str = Path(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
) -> Dict[str, Any]:
    """
    Analyze pedestrian shade continuity, continuous unshaded gaps, and shade bridge
    recommendations for a specific corridor.
    """
    try:
        return analyze_corridor_shade_continuity(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing shade continuity for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze corridor shade continuity: {e}")
