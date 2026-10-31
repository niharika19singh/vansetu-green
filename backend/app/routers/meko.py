"""
YugabyteDB / Meko AI Agent Challenge Router (Phase 3 — Track A: Open Project).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.meko_service import PermissionDeniedError, get_meko_service

router = APIRouter(prefix="/api/meko", tags=["Meko Institutional Memory"])


class AddMemoryRequest(BaseModel):
    agent_id: str = Field(default="climate_planner_agent")
    datapack_id: str = Field(default="vansetu-project-memory")
    content: str
    ward_id: str = Field(default="ward-12")
    corridor_id: str = Field(default="delhi_corridor_014")
    latitude: float = Field(default=28.6358)
    longitude: float = Field(default=77.2245)
    evidence_reference: str = Field(default="survey-014")
    confidence: float = Field(default=0.88, ge=0.0, le=1.0)
    verification_status: str = Field(default="candidate")
    tags: Optional[List[str]] = None


class VerifyPromoteRequest(BaseModel):
    agent_id: str = Field(default="climate_planner_agent")
    verified_by: str = Field(default="planner_niharika")
    target_datapack_id: Optional[str] = None


class UpdateMemoryRequest(BaseModel):
    agent_id: str = Field(default="climate_planner_agent")
    content: str
    evidence_reference: Optional[str] = None
    confidence: Optional[float] = None


class MultiAgentWorkflowRequest(BaseModel):
    corridor_id: str = Field(default="C-14")
    ward_id: str = Field(default="ward-12")
    budget_lakh: float = Field(default=8.0, ge=0.5, le=5000.0)
    climate_priority: str = Field(default="heat_resilience")
    meko_enabled: bool = Field(default=True)
    planner_id: str = Field(default="planner_niharika")
    include_demo_scenarios: bool = Field(
        default=False,
        description="Explicit toggle to simulate synthetic demo scenarios (e.g. Survey-014). Defaults to False for normal planning.",
    )


@router.get("/datapacks")
async def list_datapacks() -> Dict[str, Any]:
    """List all 4 Meko datapacks with strict build-time vs runtime isolation metadata."""
    meko = get_meko_service()
    return {
        "datapacks": meko.get_datapacks_overview(),
        "isolation_policy": (
            "vansetu-build is strictly isolated to coding agents (niharika-coding-agent, kunal-coding-agent). "
            "Product runtime agents (climate_planner_agent, corridor_analysis_agent, intervention_planning_agent) "
            "can only access vansetu-project-memory, vansetu-climate-knowledge, and vansetu-planning-decisions."
        ),
    }


@router.get("/memories")
async def recall_memories(
    agent_id: str = Query(default="climate_planner_agent"),
    datapack_id: Optional[str] = Query(default=None),
    corridor_id: Optional[str] = Query(default=None),
    ward_id: Optional[str] = Query(default=None),
    query: Optional[str] = Query(default=None),
    only_verified: bool = Query(default=False),
) -> Dict[str, Any]:
    """Recall memories from one or more datapacks with RBAC enforcement."""
    meko = get_meko_service()
    dp_ids = [datapack_id] if datapack_id else [
        "vansetu-project-memory",
        "vansetu-climate-knowledge",
        "vansetu-planning-decisions",
    ]
    try:
        memories = meko.recall_memories(
            agent_id=agent_id,
            datapack_ids=dp_ids,
            corridor_id=corridor_id,
            ward_id=ward_id,
            query_text=query,
            only_verified=only_verified,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return {
        "agent_id": agent_id,
        "datapack_ids": dp_ids,
        "count": len(memories),
        "memories": memories,
    }


@router.post("/memories/add")
async def add_candidate_memory(req: AddMemoryRequest) -> Dict[str, Any]:
    """Store a new candidate or extracted memory via Meko `memory_add`."""
    meko = get_meko_service()
    try:
        return meko.add_memory(
            datapack_logical=req.datapack_id,
            agent_id=req.agent_id,
            memory_type="corridor_observation",
            content_text=req.content,
            ward_id=req.ward_id,
            corridor_id=req.corridor_id,
            evidence_reference=req.evidence_reference,
            verification_status=req.verification_status,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@router.post("/memories/{memory_id}/promote")
async def promote_memory(memory_id: str, req: VerifyPromoteRequest) -> Dict[str, Any]:
    """Human-approved promotion of a candidate memory (`memory_promote`) to `human_verified`."""
    meko = get_meko_service()
    try:
        meko.update_or_verify_memory(
            memory_id=memory_id,
            agent_id=req.agent_id,
            verification_status="human_verified",
        )
        return meko.promote_memory(
            memory_id=memory_id,
            agent_id=req.agent_id,
            reviewer_note=f"Verified by {req.verified_by}",
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/memories/{memory_id}")
async def update_memory(memory_id: str, req: UpdateMemoryRequest) -> Dict[str, Any]:
    """Update an existing memory when newer verified site evidence arrives (`memory_update`)."""
    meko = get_meko_service()
    try:
        return meko.update_memory(
            agent_id=req.agent_id,
            memory_id=memory_id,
            content=req.content,
            evidence_reference=req.evidence_reference,
            confidence=req.confidence,
        )
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: str,
    agent_id: str = Query(default="climate_planner_agent"),
) -> Dict[str, Any]:
    """Delete an obsolete or unverified candidate memory (`memory_delete`)."""
    meko = get_meko_service()
    try:
        return meko.delete_memory(agent_id=agent_id, memory_id=memory_id)
    except PermissionDeniedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/workflow")
async def run_multi_agent_workflow(req: MultiAgentWorkflowRequest) -> Dict[str, Any]:
    """Run the 3-agent Meko workflow (`corridor_analysis_agent` -> `intervention_planning_agent` -> `climate_planner_agent`)."""
    meko = get_meko_service()
    return meko.run_multi_agent_workflow(
        corridor_id=req.corridor_id,
        ward_id=req.ward_id,
        budget_lakh=req.budget_lakh,
        climate_priority=req.climate_priority,
        meko_enabled=req.meko_enabled,
        planner_id=req.planner_id,
        include_demo_scenarios=req.include_demo_scenarios,
    )


@router.get("/compare-on-off")
async def compare_meko_on_vs_off(
    corridor_id: str = Query(default="C-14"),
    ward_id: str = Query(default="ward-12"),
    budget_lakh: float = Query(default=8.0, ge=0.5, le=5000.0),
    include_demo_scenarios: bool = Query(default=True),
) -> Dict[str, Any]:
    """
    Demonstrate that the identical prompt ('Recommend interventions for Ward 12, Corridor C-14,
    with a budget of ₹8 lakh.') produces a materially different recommendation when Meko is ON vs OFF.
    """
    meko = get_meko_service()
    return meko.compare_meko_on_vs_off(
        corridor_id=corridor_id,
        ward_id=ward_id,
        budget_lakh=budget_lakh,
        include_demo_scenarios=include_demo_scenarios,
    )


@router.get("/activity")
async def get_meko_activity(limit: int = Query(default=40, ge=1, le=200)) -> Dict[str, Any]:
    """Return live Meko activity log (recalled memories, extracted memories, promotions, cross-agent handoffs)."""
    meko = get_meko_service()
    events = meko.get_activity_log(limit=limit)
    return {
        "count": len(events),
        "events": events,
    }


@router.get("/check-t")
async def verify_meko_check_t() -> Dict[str, Any]:
    """
    Execute Meko Check T verification:
    - Confirms >= 10 promoted architectural decisions in `vansetu-build`
    - Confirms cross-agent recall between Niharika's coding agent and Kunal's coding agent
    - Confirms strict RBAC isolation between build and runtime datapacks.
    """
    meko = get_meko_service()
    return meko.verify_check_t()
