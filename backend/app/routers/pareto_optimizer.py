"""
Feature 3: Pareto Portfolio Lab Router.
Exposes endpoints for multi-objective MILP optimization, Pareto frontier discovery, and budget presets.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

from app.services.pareto_optimizer_service import run_pareto_optimization, get_pareto_presets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/optimizer/pareto", tags=["Pareto Portfolio Lab"])


class ParetoRequest(BaseModel):
    budget_lakhs: float = Field(50.0, description="Municipal capital budget limit in INR Lakhs", gt=0)
    district: Optional[str] = Field(None, description="Optional target district filter")
    site_restrictions: Optional[Dict[str, List[str]]] = Field(None, description="Corridor-specific restricted archetypes")


@router.post("", summary="Run Multi-Objective Pareto Optimization")
def calculate_pareto_frontier(req: ParetoRequest) -> Dict[str, Any]:
    """
    Execute multi-objective MILP solver (`scipy.optimize.milp`) across 4 policy scenarios:
    1. Maximum Climate Priority
    2. Balanced Tri-Vector
    3. Maximum Social Equity
    4. Lifecycle OpEx Optimized

    Filters non-dominated solutions forming the true Pareto Frontier, computes trade-offs,
    and returns mathematical justification for excluded alternatives.
    """
    try:
        return run_pareto_optimization(
            budget_lakhs=req.budget_lakhs,
            district=req.district,
            site_restrictions=req.site_restrictions,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing Pareto frontier: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to compute Pareto frontier: {e}")


@router.get("/presets", summary="Get Precomputed Multi-Objective Budget Presets")
def get_budget_presets() -> Dict[str, Any]:
    """
    Retrieve pre-solved Pareto frontiers across ₹20 Lakh, ₹50 Lakh, and ₹1 Crore budget tiers.
    """
    try:
        return get_pareto_presets()
    except Exception as e:
        logger.error(f"Error fetching Pareto presets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Pareto presets: {e}")
