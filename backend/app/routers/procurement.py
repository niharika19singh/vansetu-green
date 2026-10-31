"""
IOMETE Sponsored Challenge — "Make Complex Tech Easy to Buy" Router (Phase 7).
VanSetu Climate Technology Procurement Studio.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.procurement_service import get_procurement_service

router = APIRouter(prefix="/api/procurement", tags=["IOMETE Climate Technology Procurement Studio"])


class CompareEquipmentRequest(BaseModel):
    sku_ids: Optional[List[str]] = None
    corridor_id: str = Field(default="C-14")
    budget_lakh: float = Field(default=8.0, ge=0.5, le=5000.0)


class GenerateRfpRequest(BaseModel):
    corridor_id: str = Field(default="C-14")
    budget_lakh: float = Field(default=8.0, ge=0.5, le=5000.0)
    meko_enabled: bool = Field(default=True)
    include_monitoring_kit: bool = Field(default=True)


@router.get("/catalog")
async def get_procurement_catalog(
    category: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """List all 6 climate technology equipment categories and technical specifications."""
    svc = get_procurement_service()
    return svc.get_catalog(category=category)


@router.post("/compare")
async def compare_procurement_options(req: CompareEquipmentRequest) -> Dict[str, Any]:
    """Generate a side-by-side Procurement-Ready Comparison across selected equipment SKUs."""
    svc = get_procurement_service()
    return svc.compare_equipment(
        sku_ids=req.sku_ids,
        corridor_id=req.corridor_id,
        budget_lakh=req.budget_lakh,
    )


@router.post("/generate-rfp")
async def generate_draft_rfp(req: GenerateRfpRequest) -> Dict[str, Any]:
    """Generate a Draft Municipal RFP Specification combining MILP optimization, Meko constraints, and hardware specs."""
    svc = get_procurement_service()
    return svc.generate_rfp_specification(
        corridor_id=req.corridor_id,
        budget_lakh=req.budget_lakh,
        meko_enabled=req.meko_enabled,
        include_monitoring_kit=req.include_monitoring_kit,
    )
