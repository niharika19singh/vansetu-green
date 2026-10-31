"""
VanSetu GreenTech — Corridor Cost Optimisation & Lifecycle Budget Router.

Provides:
- GET /api/corridors/{corridor_id}/cost-optimisation: Corridor cost baselines, approved budget, active proposals.
- POST /api/corridors/{corridor_id}/cost-optimisation: Run deterministic MILP cost solver on a specific corridor.
- POST /api/corridors/{corridor_id}/cost-proposals: Pro Professional submits cost proposal estimate.
- POST /api/corridors/{corridor_id}/budget-approval: Government Engineer approves/rejects budget proposal.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.corridor_service import get_corridor_by_id
from app.services.optimizer_service import (
    INTERVENTION_SPECS,
    optimize_corridor_portfolio,
)
from app.services.tender_service import get_tender_service
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    ReviewerRole,
    get_current_user,
    require_permission,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

logger = logging.getLogger("vansetu.routers.corridor_cost")

router = APIRouter(prefix="/api/corridors", tags=["Corridor Cost Optimisation"])


class CorridorCostOptimizeRequest(BaseModel):
    budget_lakh: float = Field(default=12.0, gt=0.5, le=500.0, description="Target budget in INR Lakhs")
    climate_priority: str = Field(default="heat_resilience", description="Priority objective")
    lifecycle_years: int = Field(default=10, ge=1, le=25, description="Lifecycle evaluation horizon")
    restricted_interventions: Optional[List[str]] = Field(default=None, description="Excluded archetypes due to site constraints")


class CostProposalSubmitRequest(BaseModel):
    proposed_budget_lakh: float = Field(gt=0.0)
    capex_breakdown: Dict[str, float]
    opex_annual_lakh: float = Field(ge=0.0)
    lifecycle_cost_lakh: float = Field(gt=0.0)
    recommended_interventions: List[str]
    proposal_notes: str


class BudgetApprovalRequest(BaseModel):
    proposal_id: Optional[str] = None
    action: str = Field(description="'APPROVE' or 'REJECT'")
    approved_budget_lakh: float = Field(gt=0.0)
    approval_notes: str


@router.get("/{corridor_id}/cost-optimisation")
def get_corridor_cost_baseline(
    corridor_id: str,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.OPTIMIZE_CORRIDOR_COST)),
) -> Dict[str, Any]:
    """
    Retrieve corridor length, default cost baselines, approved government budget (if any),
    and active professional cost proposals.
    """
    corr = get_corridor_by_id(corridor_id)
    if not corr:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor_id}' not found.")

    tender_svc = get_tender_service()
    avail = tender_svc.get_corridor_availability(corridor_id, current_user=current_user)

    recent_approvals = tender_svc.list_budget_approvals(corridor_id)
    latest_approval = recent_approvals[0] if recent_approvals else None
    approved_budget = (
        latest_approval["approved_budget_lakh"]
        if latest_approval and latest_approval["action"] == "APPROVE"
        else avail.get("approved_budget_lakh")
    )

    # Standard per-km indicative intervention benchmarks
    interventions_benchmark = []
    for k, spec in INTERVENTION_SPECS.items():
        if isinstance(spec, dict):
            name = spec.get("name", k)
            cost_params = spec.get("cost_parameters", {})
            capex_val = cost_params.get("capex_inr_lakhs_per_km", 5.0)
            opex_pct = cost_params.get("opex_annual_pct", 5.0)
            unit_val = cost_params.get("unit_basis_per_km", "per km")
            cooling = spec.get("cooling_effect_celsius", 1.5)
            air_filt = spec.get("air_filtration_score", 0.7)
        else:
            name = getattr(spec, "name", k)
            capex_val = getattr(spec, "capex_per_unit_inr", 500000) / 100000.0
            opex_pct = getattr(spec, "opex_annual_pct", 5.0)
            unit_val = getattr(spec, "unit", "per km")
            cooling = getattr(spec, "cooling_efficacy_c", 1.5)
            air_filt = getattr(spec, "air_filtration_score", 0.7)

        interventions_benchmark.append({
            "archetype": k,
            "name": name,
            "capex_inr_lakhs_per_km": capex_val,
            "opex_annual_pct": opex_pct,
            "unit": unit_val,
            "cooling_efficacy_c": cooling,
            "air_filtration_score": air_filt,
        })

    return {
        "corridor_id": corridor_id,
        "name": corr.get("name", corridor_id),
        "district": corr.get("district", "NCT Delhi"),
        "length_m": corr.get("length_m", 1000.0),
        "current_allocation_status": avail["status"],
        "government_approved_budget_lakh": approved_budget,
        "latest_budget_decision": latest_approval,
        "assigned_org": avail.get("assigned_org"),
        "benchmarks": interventions_benchmark,
        "benchmark_source": "CPWD Delhi Schedule of Rates (DSR 2023) and municipal green infrastructure standards",
        "default_recommended_budget_lakh": round((corr.get("length_m", 1000.0) / 1000.0) * 12.0, 1),
    }


@router.post("/{corridor_id}/cost-optimisation")
def optimize_corridor_cost(
    corridor_id: str,
    req: CorridorCostOptimizeRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.OPTIMIZE_CORRIDOR_COST)),
) -> Dict[str, Any]:
    """
    Run deterministic MILP optimization on a specific corridor under a given budget.
    Computes CapEx breakdown, annual OpEx, lifecycle cost, and non-dominated alternatives.
    Reuses the core scipy MILP solver.
    """
    corr = get_corridor_by_id(corridor_id)
    if not corr:
        raise HTTPException(status_code=404, detail=f"Corridor '{corridor_id}' not found.")

    site_restrictions = None
    if req.restricted_interventions:
        site_restrictions = [{
            "corridor_id": corridor_id,
            "excluded_interventions": req.restricted_interventions,
            "reason": "Site engineering constraints",
            "source_datapack": "user_input",
            "verification_status": "MANUAL_INPUT",
            "is_synthetic_demo": False,
        }]

    # Run MILP solver for target corridor
    solver_result = optimize_corridor_portfolio(
        corridors=[corr],
        budget_lakh=req.budget_lakh,
        climate_priority=req.climate_priority,
        equity_weight=0.25,
        site_restrictions=site_restrictions,
    )

    # Calculate detailed lifecycle figures from MILP recommended interventions
    selected_items = solver_result.get("selected_interventions", [])
    capex_breakdown: Dict[str, float] = {}
    opex_annual_breakdown: Dict[str, float] = {}
    total_capex = 0.0
    total_opex_annual = 0.0

    for item in selected_items:
        arch = item.get("intervention_id") or item.get("archetype", "unknown")
        cost = float(item.get("capex_inr_lakhs") or item.get("capex_lakh_inr") or item.get("total_cost_lakh") or 0.0)
        annual_opex = float(item.get("annual_opex_inr_lakhs") or item.get("annual_opex_lakh_inr") or (cost * 0.08))

        capex_breakdown[arch] = round(cost, 2)
        opex_annual_breakdown[arch] = round(annual_opex, 3)
        total_capex += cost
        total_opex_annual += annual_opex

    lifecycle_total = round(total_capex + (total_opex_annual * req.lifecycle_years), 2)

    # Solve realistic alternative trade-off packages using actual MILP solver instances
    alt1_res = optimize_corridor_portfolio(
        corridors=[corr],
        budget_lakh=req.budget_lakh,
        climate_priority="air_quality",
        equity_weight=0.25,
        site_restrictions=site_restrictions,
    )
    alt1_items = alt1_res.get("selected_interventions", [])
    alt1_capex = sum(float(it.get("capex_inr_lakhs") or it.get("capex_lakh_inr") or it.get("total_cost_lakh") or 0.0) for it in alt1_items)
    alt1_opex = sum(float(it.get("annual_opex_inr_lakhs") or it.get("annual_opex_lakh_inr") or (float(it.get("capex_inr_lakhs") or it.get("total_cost_lakh") or 0.0) * 0.08)) for it in alt1_items)
    alt1_lifecycle = round(alt1_capex + (alt1_opex * req.lifecycle_years), 2)

    alt2_res = optimize_corridor_portfolio(
        corridors=[corr],
        budget_lakh=round(req.budget_lakh * 0.85, 2),
        climate_priority="heat_resilience",
        equity_weight=0.5,
        site_restrictions=site_restrictions,
    )
    alt2_items = alt2_res.get("selected_interventions", [])
    alt2_capex = sum(float(it.get("capex_inr_lakhs") or it.get("capex_lakh_inr") or it.get("total_cost_lakh") or 0.0) for it in alt2_items)
    alt2_opex = sum(float(it.get("annual_opex_inr_lakhs") or it.get("annual_opex_lakh_inr") or (float(it.get("capex_inr_lakhs") or it.get("total_cost_lakh") or 0.0) * 0.08)) for it in alt2_items)
    alt2_lifecycle = round(alt2_capex + (alt2_opex * req.lifecycle_years), 2)

    alternatives = [
        {
            "portfolio_name": "Air Quality Maximization Package (Street Trees & Bioswales)",
            "capex_lakh": round(alt1_capex, 2),
            "annual_opex_lakh": round(alt1_opex, 3),
            "lifecycle_cost_lakh": alt1_lifecycle,
            "trade_off": "Prioritizes PM2.5/PM10 air filtration and stormwater retention; requires utility coordination.",
            "is_solver_optimized": True,
            "selected_interventions": [it.get("archetype") or it.get("intervention_id") for it in alt1_items],
        },
        {
            "portfolio_name": "Constrained Capital Resilience Package (85% Budget Ceiling)",
            "capex_lakh": round(alt2_capex, 2),
            "annual_opex_lakh": round(alt2_opex, 3),
            "lifecycle_cost_lakh": alt2_lifecycle,
            "trade_off": "Rapid deployment under constrained capital allocation; focuses strictly on highest thermal impact nodes.",
            "is_solver_optimized": True,
            "selected_interventions": [it.get("archetype") or it.get("intervention_id") for it in alt2_items],
        },
    ]

    tender_svc = get_tender_service()
    avail = tender_svc.get_corridor_availability(corridor_id, current_user=current_user)

    return {
        "corridor_id": corridor_id,
        "corridor_name": corr.get("name", corridor_id),
        "requested_budget_lakh": req.budget_lakh,
        "cost_classification": {
            "is_indicative_estimate": True,
            "is_government_approved": False,
            "government_approved_budget_lakh": avail.get("approved_budget_lakh"),
        },
        "optimization_summary": {
            "solver": solver_result.get("solver", "scipy.optimize.milp"),
            "status": solver_result.get("status", "optimal"),
            "recommended_package": selected_items,
            "total_capex_lakh": round(total_capex, 2),
            "annual_opex_lakh": round(total_opex_annual, 3),
            "lifecycle_period_years": req.lifecycle_years,
            "lifecycle_cost_lakh": lifecycle_total,
            "capex_breakdown": capex_breakdown,
            "opex_annual_breakdown": opex_annual_breakdown,
        },
        "trade_off_alternatives": alternatives,
        "missing_cost_data_disclosures": {
            "gpr_utility_survey_cost": "Excluded from CapEx (Municipal survey overhead)",
            "demolition_cost": "Included in high_albedo_cool_pavements baseline estimate",
        },
    }


@router.post("/{corridor_id}/budget-approval")
def approve_or_reject_corridor_budget(
    corridor_id: str,
    req: BudgetApprovalRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.APPROVE_PROJECT_COSTS)),
) -> Dict[str, Any]:
    """
    Approve or reject a corridor project budget.
    Requires APPROVE_PROJECT_COSTS (Government Admin only).
    Persists decision to corridor_budget_approvals, updates allocation, and writes to audit logs.
    """
    tender_svc = get_tender_service()
    return tender_svc.record_budget_approval(
        corridor_id=corridor_id,
        action=req.action,
        approved_budget_lakh=req.approved_budget_lakh,
        approval_notes=req.approval_notes,
        user=current_user,
        proposal_id=req.proposal_id,
    )
