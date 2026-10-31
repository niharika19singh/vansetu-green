"""
MLH — Best Use of Google Gemini API Router (Phase 4).
Exposes multi-tool climate planning orchestration (`google-genai`, `gemini-3.8-flash`)
and direct invocation of all 8 backend tools.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini_agent_service import (
    TOOL_REGISTRY,
    get_gemini_agent_service,
)

router = APIRouter(prefix="/api/agent", tags=["Gemini 3.8 Flash Planning Agent"])


class AgentPlanRequest(BaseModel):
    prompt: str = Field(
        default="Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh."
    )
    corridor_id: str = Field(default="C-14")
    ward_id: str = Field(default="ward-12")
    budget_lakh: float = Field(default=8.0, ge=0.5, le=5000.0)
    climate_priority: str = Field(default="heat_resilience")
    meko_enabled: bool = Field(default=True)


class ToolInvokeRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


@router.get("/tools")
async def list_agent_tools() -> Dict[str, Any]:
    """List all 8 Gemini function-calling tools and SDK configuration."""
    svc = get_gemini_agent_service()
    return svc.get_tools_metadata()


@router.post("/plan")
async def run_agent_planning_workflow(req: AgentPlanRequest) -> Dict[str, Any]:
    """
    Execute the 5-step Gemini 3.8 Flash multi-tool climate planning workflow
    (Meko Recall -> Geospatial/Temporal Lookup -> MILP Optimization -> RFP Generation -> Synthesis).
    """
    svc = get_gemini_agent_service()
    return svc.execute_planning_workflow(
        prompt=req.prompt,
        corridor_id=req.corridor_id,
        ward_id=req.ward_id,
        budget_lakh=req.budget_lakh,
        climate_priority=req.climate_priority,
        meko_enabled=req.meko_enabled,
    )


@router.post("/invoke-tool")
async def invoke_single_tool(req: ToolInvokeRequest) -> Dict[str, Any]:
    """Directly invoke one of the 8 registered Gemini backend tools for testing and inspection."""
    fn = TOOL_REGISTRY.get(req.tool_name)
    if not fn:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown tool '{req.tool_name}'. Available tools: {list(TOOL_REGISTRY.keys())}",
        )
    try:
        output = fn(**req.arguments)
    except TypeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid tool arguments: {exc}")
    return {
        "tool_name": req.tool_name,
        "arguments": req.arguments,
        "output": output,
    }
