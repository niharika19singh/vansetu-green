"""
Feature 1: Corridor Evidence Passport Router.
Exposes endpoints for comprehensive evidence verification, data quality scoring, and gap analysis.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Path

from app.services.evidence_passport_service import generate_corridor_evidence_passport
from app.services.corridor_service import get_all_corridors

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evidence", tags=["Evidence Passport"])


@router.get("/passport/{corridor_id}", summary="Get Corridor Evidence Passport")
def get_corridor_passport(
    corridor_id: str = Path(..., description="Corridor code or ID (e.g. 'C-14' or 'delhi_corridor_014')")
) -> Dict[str, Any]:
    """
    Retrieve the comprehensive Evidence Passport for a corridor:
    - What We Know (verified satellite & sensor indicators with physical resolutions)
    - What We Don't Know (UTCI/WBGT gaps, subsurface utility gaps, soil compaction gaps)
    - What Requires Verification (GPR trial pits, IRC:103 clear width, STP water, wind-shear)
    - 5 Disaggregated Data Quality Dimensions (Quality, Completeness, Freshness, Representativeness, Confidence)
    - Actionable Evidence Improvement Recommendations with cost estimates
    """
    try:
        return generate_corridor_evidence_passport(corridor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating evidence passport for {corridor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate evidence passport: {e}")


@router.get("/passports", summary="Get All Corridor Evidence Passport Summaries")
def get_all_passports_summary() -> Dict[str, Any]:
    """
    Retrieve concise evidence summary and data quality dimension grades for all 44 corridors.
    """
    corridors = get_all_corridors()
    summaries: List[Dict[str, Any]] = []

    for corr in corridors:
        cid = corr.get("id")
        code = corr.get("code", f"C-{cid}")
        try:
            passport = generate_corridor_evidence_passport(str(cid))
            summaries.append({
                "corridor_id": cid,
                "corridor_code": code,
                "corridor_name": corr.get("name"),
                "district": corr.get("district"),
                "quality_dimensions": passport["data_quality_dimensions"],
                "missing_signals_count": len(passport["what_we_dont_know"]),
                "verification_items_count": len(passport["what_requires_verification"]),
                "overall_confidence": passport["data_quality_dimensions"]["recommendation_confidence"]["score"],
            })
        except Exception as e:
            logger.warning(f"Could not build summary for corridor {cid}: {e}")

    return {
        "count": len(summaries),
        "standards": "VanSetu Evidence-Aware Scientific Governance Specification v2.0",
        "summaries": summaries,
    }
