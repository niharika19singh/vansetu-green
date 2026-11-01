"""
Feature 7: Spatial Institutional Memory Map Router.
Exposes endpoints for georeferenced Meko pins, interactive lifecycle operations,
and corridor MEKO ON vs. OFF decision comparisons.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Path, Query, Body

from app.services.spatial_memory_service import (
    get_spatial_memory_pins,
    execute_spatial_memory_action,
    get_corridor_spatial_context_comparison,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meko/spatial", tags=["Spatial Memory Map"])


class SpatialMemoryActionRequest(BaseModel):
    memory_id: str = Field(..., description="Meko Memory ID")
    action: str = Field(..., description="APPROVE | CORRECT | PROMOTE | FORGET | SUPERSEDE")
    actor_agent: Optional[str] = Field("municipal_reviewer", description="Calling agent or user identity")
    correction_text: Optional[str] = Field(None, description="Correction string for CORRECT action")


@router.get("/pins", summary="Get Georeferenced Memory Pins for Map")
def get_pins(
    category: Optional[str] = Query(None, description="SITE_CONSTRAINT | COMMUNITY_FEEDBACK | PAST_FAILURE | SUCCESSFUL_PRECEDENT | REGULATORY_RESTRICTION"),
    corridor_id: Optional[str] = Query(None, description="Filter by corridor ID or code"),
    datapack: Optional[str] = Query(None, description="Filter by logical datapack name"),
) -> Dict[str, Any]:
    """
    Retrieve all georeferenced institutional memory pins across the 4 Meko datapacks.
    Includes coordinate locations, categories, author attribution, and synthetic demo badges.
    """
    try:
        return get_spatial_memory_pins(category=category, corridor_id=corridor_id, datapack=datapack)
    except Exception as e:
        logger.error(f"Error fetching spatial pins: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch spatial memory pins: {e}")


@router.post("/action", summary="Execute Lifecycle Action on Memory Pin")
def execute_action(req: SpatialMemoryActionRequest = Body(...)) -> Dict[str, Any]:
    """
    Execute full lifecycle control over a spatial institutional memory:
    - APPROVE: verify and certify field observation
    - CORRECT: fix inaccuracies with verified local ground truth
    - PROMOTE: graduate memory into shared multi-agent cross-datapack context
    - FORGET: revoke invalid or outdated memory from agent retrieval
    - SUPERSEDE: replace with newer ground-truth survey
    """
    try:
        return execute_spatial_memory_action(
            memory_id=req.memory_id,
            action=req.action,
            actor_agent=req.actor_agent,
            correction_text=req.correction_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing action on {req.memory_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute memory action: {e}")


@router.get("/corridor/{corridor_id}/comparison", summary="Get Corridor MEKO ON vs OFF Decision Impact")
def get_corridor_comparison(
    corridor_id: str = Path(..., description="Corridor ID or code (e.g. 'C-14')")
) -> Dict[str, Any]:
    """
    Compare recommendation for a corridor when Meko spatial memory is ON vs. OFF.
    Reveals the exact retrieved memories responsible for preventing costly mistakes or altering archetypes.
    """
    try:
        return get_corridor_spatial_context_comparison(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error comparing MEKO ON/OFF for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate ON/OFF comparison: {e}")
