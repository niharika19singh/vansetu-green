"""
Budget-Constrained Climate Intervention Optimizer Router (Phase 2.4).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.corridor_service import get_all_corridors, get_corridor_by_id
from app.services.meko_service import get_meko_service
from app.services.optimizer_service import (
    INTERVENTION_SPECS,
    optimize_corridor_portfolio,
)

router = APIRouter(prefix="/api/optimizer", tags=["Budget Optimizer"])


class SiteRestrictionInput(BaseModel):
    corridor_id: str
    excluded_interventions: List[str]
    reason: str
    evidence_reference: str = "manual_input"


class OptimizerRunRequest(BaseModel):
    budget_lakh: float = Field(default=8.0, ge=0.0, le=5000.0)
    target_corridor_ids: List[str] = Field(default_factory=lambda: ["C-14"])
    climate_priority: str = Field(default="heat_resilience")
    equity_weight: float = Field(default=0.25, ge=0.0, le=1.0)
    meko_enabled: bool = Field(default=True)
    include_demo_scenarios: bool = Field(
        default=False,
        description="Explicit demo-only toggle to simulate synthetic demonstration scenarios (e.g., Survey-014). Normal runs must set to False."
    )
    site_restrictions: Optional[List[SiteRestrictionInput]] = None


@router.get("/presets")
async def get_optimizer_presets() -> Dict[str, Any]:
    """Return intervention specifications, climate priority presets, and sample scenarios."""
    return {
        "solver": "scipy.optimize.milp (HiGHS Deterministic Mixed-Integer Linear Programming)",
        "interventions": list(INTERVENTION_SPECS.values()),
        "climate_priorities": [
            {"id": "heat_resilience", "label": "Heat Resilience (Thermal Reduction Priority)"},
            {"id": "air_quality", "label": "Air Quality (PM2.5/PM10 Filtration Priority)"},
            {"id": "pedestrian_equity", "label": "Pedestrian & Social Equity Priority"},
            {"id": "baseline", "label": "Balanced Multi-Hazard Baseline"},
        ],
        "featured_scenarios": [
            {
                "name": "Ward 12 / Corridor C-14 (₹8.0 Lakh Municipal Budget)",
                "target_corridor_ids": ["C-14"],
                "budget_lakh": 8.0,
                "climate_priority": "heat_resilience",
            },
            {
                "name": "Multi-Corridor Priority Cluster C-01, C-03, C-14 (₹22.0 Lakh Budget)",
                "target_corridor_ids": ["C-01", "C-03", "C-14"],
                "budget_lakh": 22.0,
                "climate_priority": "pedestrian_equity",
            },
        ],
    }


@router.post("/run")
async def run_budget_optimizer(req: OptimizerRunRequest) -> Dict[str, Any]:
    """Run deterministic MILP portfolio optimization under a fixed municipal budget."""
    corridors = []
    for cid in req.target_corridor_ids:
        corr = get_corridor_by_id(cid)
        if corr:
            corridors.append(corr)

    if not corridors:
        all_c = get_all_corridors()
        corridors = all_c[:3]

    applied_restrictions: List[Dict[str, Any]] = []
    demo_scenarios_active = False

    if req.site_restrictions:
        for r in req.site_restrictions:
            d = r.model_dump()
            d["source_datapack"] = "user_input"
            d["verification_status"] = "MANUAL_INPUT"
            d["is_synthetic_demo"] = False
            d["memory_id"] = None
            applied_restrictions.append(d)

    if req.meko_enabled:
        meko = get_meko_service()
        for corr in corridors:
            recalled = meko.recall_memories(
                agent_id="intervention_planning_agent",
                datapack_ids=["vansetu-project-memory", "vansetu-climate-knowledge"],
                corridor_id=corr["id"],
                ward_id=corr.get("ward_id"),
                only_verified=False,
            )
            for mem in recalled:
                ver_status = mem.get("verification_status")
                sp = mem.get("structured_payload") or {}
                is_demo = (
                    bool(sp.get("is_synthetic_demo"))
                    or ver_status == "SYNTHETIC_DEMONSTRATION_SCENARIO"
                    or (mem.get("memory_id") in ("mem-survey-014", "mem-decision-c14-01", "mem-survey-001", "mem-draft-022"))
                )

                # P0 Requirement: Normal optimization must apply only genuinely human_verified memories.
                # Synthetic demonstration scenarios must NEVER be applied in normal runs.
                if is_demo and not req.include_demo_scenarios:
                    continue
                if not is_demo and ver_status != "human_verified":
                    continue

                r_ints = sp.get("restricted_interventions") or []
                txt_lower = (mem.get("content") or mem.get("content_text") or "").lower()
                if r_ints or "underground utility" in txt_lower or "66kv" in txt_lower or "tree-pit" in txt_lower:
                    if is_demo:
                        demo_scenarios_active = True
                    applied_restrictions.append(
                        {
                            "corridor_id": corr["id"],
                            "excluded_interventions": list(r_ints) if r_ints else ["linear_street_trees", "roadside_bioswales"],
                            "reason": mem.get("content") or mem.get("content_text") or "",
                            "evidence_reference": mem.get("evidence_reference"),
                            "verification_status": ver_status,
                            "is_synthetic_demo": is_demo,
                            "source_datapack": mem.get("datapack_logical", "vansetu-project-memory"),
                            "memory_id": mem.get("memory_id"),
                        }
                    )

    # Format restrictions for the MILP solver
    solver_restrictions = [
        {
            "corridor_id": r["corridor_id"],
            "excluded_interventions": r["excluded_interventions"],
            "reason": r["reason"],
            "evidence_reference": r.get("evidence_reference"),
        }
        for r in applied_restrictions
    ]

    result = optimize_corridor_portfolio(
        corridors=corridors,
        budget_lakh=req.budget_lakh,
        climate_priority=req.climate_priority,
        site_restrictions=solver_restrictions,
        equity_weight=req.equity_weight,
    )
    result["meko_enabled"] = req.meko_enabled
    result["include_demo_scenarios"] = req.include_demo_scenarios
    result["demo_scenarios_active"] = demo_scenarios_active
    result["applied_site_restrictions"] = applied_restrictions
    if demo_scenarios_active:
        result["demo_scenario_warning"] = (
            "DEMONSTRATION SCENARIO ACTIVE: Recommendations are being shaped by unverified synthetic demonstration fixtures "
            "(e.g., Survey-014 underground utility conflict). In genuine operations without verified municipal surveys, "
            "standard feasibility applies."
        )
    return result
