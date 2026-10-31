"""
Feature 2: Right Tree, Right Place (Segment-Level Site Suitability) Router.
Exposes endpoints for sub-segment suitability, 5-archetype evaluation, and NCT Delhi tree species catalog.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Path, Query

from app.services.segment_suitability_service import (
    NCT_DELHI_TREE_SPECIES_CATALOG,
    get_corridor_segments_suitability,
    get_single_segment_suitability,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suitability", tags=["Site Suitability"])


@router.get("/corridor/{corridor_id}/segments", summary="Get Segment Suitability for Corridor")
def get_corridor_segments(
    corridor_id: str = Path(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
) -> Dict[str, Any]:
    """
    Subdivides corridor into ~100m–250m micro-segments and evaluates site feasibility across
    5 intervention archetypes with explicit status:
    - FEASIBLE_ESTIMATE
    - FIELD_VERIFICATION_REQUIRED
    - CONSTRAINT_IDENTIFIED
    - NOT_FEASIBLE
    """
    try:
        return get_corridor_segments_suitability(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error evaluating segments for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to evaluate corridor segments: {e}")


@router.get("/segment/{segment_id}", summary="Get Single Segment Suitability Details")
def get_segment_detail(
    segment_id: str = Path(..., description="Segment ID (e.g. 'C-14-S1')")
) -> Dict[str, Any]:
    """
    Retrieve deep site feasibility, physical sidewalk dimensions, utility conflict flags,
    and constraint-driven alternatives for a specific segment.
    """
    try:
        return get_single_segment_suitability(segment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching segment {segment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve segment: {e}")


@router.get("/species-catalog", summary="Get NCT Delhi Native Tree Species Catalog")
def get_tree_species_catalog(
    min_sidewalk_width_m: Optional[float] = Query(None, description="Filter species by maximum sidewalk width available"),
    drought_tolerance: Optional[str] = Query(None, description="Filter by drought tolerance (e.g. 'HIGH', 'VERY_HIGH')"),
    max_height_m: Optional[float] = Query(None, description="Filter by maximum mature height (for low overhead clearance)"),
) -> Dict[str, Any]:
    """
    Retrieve research-backed catalog of 12 native NCT Delhi urban tree species.
    Includes botanical names, canopy spread, mature height, root architecture,
    sidewalk width thresholds, PM2.5 filtration, and planting guidelines.
    """
    species = list(NCT_DELHI_TREE_SPECIES_CATALOG)

    if min_sidewalk_width_m is not None:
        species = [s for s in species if s["minimum_sidewalk_width_m"] <= min_sidewalk_width_m]

    if drought_tolerance:
        dt_upper = drought_tolerance.upper()
        species = [s for s in species if dt_upper in s["drought_tolerance"]]

    if max_height_m is not None:
        species = [s for s in species if s["mature_height_m"] <= max_height_m]

    return {
        "count": len(species),
        "standards": "Delhi Urban Greening Guidelines & Central Pollution Control Board (CPCB) Green Belt Norms",
        "species": species,
    }
