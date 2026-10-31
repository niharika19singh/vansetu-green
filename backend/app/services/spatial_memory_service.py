"""
Feature 7: Spatial Institutional Memory Map Service (YugabyteDB / Meko).

Transforms Meko shared context memories into georeferenced interactive map pins linked to:
- Precise Coordinates [lat, lng] (or explicit unlocated status if coordinates are absent)
- Corridor Codes (e.g. 'C-14') and Segments (e.g. 'C-14-S2')
- Municipal Wards
- 5 Institutional Knowledge Categories:
  1. SITE_CONSTRAINT
  2. COMMUNITY_FEEDBACK
  3. PAST_FAILURE
  4. SUCCESSFUL_PRECEDENT
  5. REGULATORY_RESTRICTION
- Full Memory Lifecycle: REVIEW, APPROVE, CORRECT, PROMOTE, FORGET, SUPERSEDE via real MekoService MCP tools
- MEKO ON vs. OFF Spatial Impact Comparison
- Synthetic scenario attribution badge: 'SYNTHETIC DEMONSTRATION SCENARIO' vs. real verified records
"""
from __future__ import annotations

import logging
import json
import sqlite3
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.services.meko_service import get_meko_service
from app.services.corridor_service import get_all_corridors, get_corridor_by_id

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(settings.data_dir, "meko_persistence.sqlite")

CATEGORY_CONFIG = {
    "SITE_CONSTRAINT": {"color": "#ef4444", "icon": "AlertTriangle", "label": "Site Constraint"},
    "COMMUNITY_FEEDBACK": {"color": "#3b82f6", "icon": "Users", "label": "Community Feedback"},
    "PAST_FAILURE": {"color": "#f97316", "icon": "XCircle", "label": "Past Intervention Failure"},
    "SUCCESSFUL_PRECEDENT": {"color": "#10b981", "icon": "CheckCircle2", "label": "Successful Precedent"},
    "REGULATORY_RESTRICTION": {"color": "#8b5cf6", "icon": "ShieldAlert", "label": "Regulatory Restriction"},
}


def _get_corridor_coords_map() -> Dict[str, Tuple[float, float]]:
    """Build quick lookup from corridor code/id to representative coordinate."""
    corridors = get_all_corridors()
    lookup = {}
    for c in corridors:
        c_coord = None
        cent = c.get("centroid")
        if cent and len(cent) >= 2:
            c_coord = (float(cent[0]), float(cent[1]))
        else:
            coords = c.get("coordinates", [])
            if not coords and "geometry" in c:
                coords = c["geometry"].get("coordinates", [])
            if coords:
                m = coords[len(coords) // 2]
                c_coord = (float(m[1]), float(m[0]))

        if c_coord:
            cid = str(c.get("id", ""))
            code = str(c.get("code", ""))
            if cid:
                lookup[cid] = c_coord
            if code:
                lookup[code] = c_coord
                lookup[code.upper()] = c_coord
                lookup[code.lower()] = c_coord
                if code.startswith("C-"):
                    num_s = code[2:]
                    lookup[num_s] = c_coord
                    try:
                        lookup[str(int(num_s))] = c_coord
                    except ValueError:
                        pass
    return lookup


def get_spatial_memory_pins(
    category: Optional[str] = None,
    corridor_id: Optional[str] = None,
    datapack: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve all georeferenced institutional memory pins across Meko datapacks.
    Zero-fabrication rule: records without known spatial coordinates return has_spatial_coordinates=False
    and lat=None, lng=None instead of arbitrary central fallback coordinates.
    """
    corridor_coords = _get_corridor_coords_map()
    meko_svc = get_meko_service()

    if not os.path.exists(DB_PATH):
        meko_svc.initialize()

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        query = "SELECT * FROM meko_memories WHERE validity_status != 'REVOKED' AND datapack_logical != 'vansetu-build'"
        params = []
        if datapack:
            query += " AND datapack_logical = ?"
            params.append(datapack)
        if corridor_id:
            query += " AND (corridor_id = ? OR corridor_id = ?)"
            params.extend([corridor_id, f"C-{corridor_id}"])

        cursor.execute(query, params)
        rows = cursor.fetchall()

    pins = []
    for r in rows:
        row_dict = dict(r)
        payload = {}
        if row_dict.get("structured_payload"):
            try:
                payload = json.loads(row_dict["structured_payload"])
            except Exception:
                payload = {}

        # Resolve coordinates strictly without fake default fallbacks
        lat = payload.get("lat")
        lng = payload.get("lng")
        c_id = row_dict.get("corridor_id") or payload.get("corridor_id")
        has_coords = True
        coord_source = "FIELD_RECORD_EXACT"
        coord_precision = "POINT_COORDINATES"

        if lat is None or lng is None:
            if c_id and str(c_id) in corridor_coords:
                lat, lng = corridor_coords[str(c_id)]
                coord_source = "CORRIDOR_CENTROID_PROXY"
                coord_precision = "CORRIDOR_CENTROID_PROXY (Corridor midpoint used; not a precise GPS ground-survey fix)"
            else:
                lat = None
                lng = None
                has_coords = False
                coord_source = "COORDINATES_UNAVAILABLE"
                coord_precision = "UNAVAILABLE"

        # Infer category
        m_type = (row_dict.get("memory_type") or "").upper()
        if "CONSTRAINT" in m_type or "FEASIBILITY" in m_type or "UTILITY" in m_type:
            cat = "SITE_CONSTRAINT"
        elif "COMMUNITY" in m_type or "CITIZEN" in m_type or "VENDOR" in m_type:
            cat = "COMMUNITY_FEEDBACK"
        elif "FAILURE" in m_type or "DEFICIT" in m_type:
            cat = "PAST_FAILURE"
        elif "PRECEDENT" in m_type or "VERIFIED" in m_type or "SUCCESS" in m_type:
            cat = "SUCCESSFUL_PRECEDENT"
        else:
            cat = "REGULATORY_RESTRICTION"

        if category and cat != category.upper():
            continue

        cfg = CATEGORY_CONFIG.get(cat, CATEGORY_CONFIG["SITE_CONSTRAINT"])

        # Determine synthetic demonstration status strictly
        is_demo = bool(row_dict.get("is_synthetic_demo", 0)) or "SYNTHETIC" in (
            row_dict.get("content_text", "") + str(payload)
        ).upper()

        actual_ver = row_dict.get("verification_status") or "ACTIVE"
        badge_text = "SYNTHETIC DEMONSTRATION SCENARIO" if is_demo else f"MUNICIPAL RECORD ({actual_ver})"

        # P0 Requirement: Exclude APPROVE and PROMOTE from available_lifecycle_actions for synthetic demo fixtures
        lifecycle_actions = ["INSPECT", "FORGET"] if is_demo else ["APPROVE", "CORRECT", "PROMOTE", "FORGET", "SUPERSEDE"]

        pins.append({
            "memory_id": row_dict["memory_id"],
            "datapack_logical": row_dict["datapack_logical"],
            "category": cat,
            "category_label": cfg["label"],
            "color": cfg["color"],
            "icon": cfg["icon"],
            "corridor_id": c_id,
            "corridor_code": f"C-{c_id}" if c_id and not str(c_id).startswith("C-") else (str(c_id) if c_id else None),
            "segment_id": payload.get("segment_id"),
            "ward_id": row_dict.get("ward_id") or payload.get("ward_id"),
            "has_spatial_coordinates": has_coords,
            "coordinates": {
                "lat": round(float(lat), 5) if lat is not None else None,
                "lng": round(float(lng), 5) if lng is not None else None,
            },
            "coordinate_source": coord_source,
            "coordinate_precision": coord_precision,
            "summary": row_dict.get("content_text", ""),
            "author_agent": row_dict.get("agent_id"),
            "author_teammate": row_dict.get("author_teammate"),
            "verification_status": actual_ver,
            "is_promoted": bool(row_dict.get("promoted", 0)),
            "validity_status": row_dict.get("validity_status", "ACTIVE"),
            "observation_date": row_dict.get("observation_date"),
            "is_synthetic_demo": is_demo,
            "badge": badge_text,
            "available_lifecycle_actions": lifecycle_actions,
        })

    return {
        "count": len(pins),
        "datapacks_active": ["vansetu-build", "vansetu-project-memory", "vansetu-climate-knowledge", "vansetu-planning-decisions"],
        "transport_mode": meko_svc.transport_mode,
        "is_live_remote_configured": meko_svc.is_live_remote_configured,
        "pins": pins,
    }


def execute_spatial_memory_action(
    memory_id: str,
    action: str,
    actor_agent: str = "municipal_reviewer",
    correction_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute lifecycle operation on a georeferenced Meko memory using genuine MekoService methods.
    - APPROVE: mark verification_status = 'human_verified'
    - CORRECT: update content_text with corrected site reality
    - PROMOTE: promote memory across datapacks into shared institutional knowledge
    - FORGET: revoke / delete memory from active agent retrieval
    - SUPERSEDE: mark validity_status = 'SUPERSEDED'
    """
    valid_actions = {"APPROVE", "CORRECT", "PROMOTE", "FORGET", "SUPERSEDE"}
    act_upper = action.upper()
    if act_upper not in valid_actions:
        raise ValueError(f"Invalid lifecycle action '{action}'. Allowed: {valid_actions}")

    meko_svc = get_meko_service()
    now_iso = datetime.now().isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        mem_row = conn.execute("SELECT * FROM meko_memories WHERE memory_id = ?", (memory_id,)).fetchone()
        if not mem_row:
            raise KeyError(f"Memory '{memory_id}' not found.")
        dp_logical = mem_row["datapack_logical"]
        struct_p = {}
        if mem_row["structured_payload"]:
            try:
                struct_p = json.loads(mem_row["structured_payload"])
            except Exception:
                struct_p = {}
        is_synthetic = (
            mem_row["memory_id"] in ("mem-survey-014", "mem-decision-c14-01", "mem-survey-001", "mem-draft-022")
            or mem_row["verification_status"] == "SYNTHETIC_DEMONSTRATION_SCENARIO"
            or bool(struct_p.get("is_synthetic_demo"))
        )

    # P0 Requirement: Reject APPROVE and PROMOTE for synthetic demonstration fixtures
    if is_synthetic and act_upper == "APPROVE":
        raise ValueError(
            "Approval Blocked: Synthetic demonstration fixtures cannot be approved or converted to genuine "
            "municipal institutional knowledge. Create a genuine field observation instead."
        )
    if is_synthetic and act_upper == "PROMOTE":
        raise ValueError(
            f"Promotion Blocked: Memory '{memory_id}' is a synthetic demonstration fixture and "
            "cannot be promoted to shared institutional knowledge."
        )

    # Enforce role-based agent identity compatible with Meko datapack boundaries
    if dp_logical == "vansetu-build":
        effective_agent = "niharika-coding-agent"
    else:
        effective_agent = actor_agent if actor_agent not in {"niharika-coding-agent", "kunal-coding-agent"} else "municipal_reviewer"

    res: Dict[str, Any] = {}
    if act_upper == "APPROVE":
        res = meko_svc.update_or_verify_memory(
            memory_id=memory_id,
            agent_id=effective_agent,
            verification_status="human_verified",
        )
        msg = f"Memory {memory_id} successfully verified and approved."
    elif act_upper == "CORRECT":
        if not correction_text:
            raise ValueError("correction_text is required for CORRECT action.")
        res = meko_svc.update_or_verify_memory(
            memory_id=memory_id,
            agent_id=effective_agent,
            content_text=correction_text,
            verification_status="human_verified",
        )
        msg = f"Memory {memory_id} corrected with reviewer feedback."
    elif act_upper == "PROMOTE":
        # Strictly promote using MekoService promote_memory: fails if verification_status != 'human_verified'
        res = meko_svc.promote_memory(
            memory_id=memory_id,
            agent_id=effective_agent,
            reviewer_note=correction_text or "Promoted via Spatial Institutional Memory Reviewer",
        )
        msg = f"Memory {memory_id} promoted to shared cross-agent institutional knowledge."
    elif act_upper == "FORGET":
        res = meko_svc.delete_memory(
            memory_id=memory_id,
            agent_id=effective_agent,
        )
        msg = f"Memory {memory_id} revoked and forgotten from active agent retrieval."
    elif act_upper == "SUPERSEDE":
        res = meko_svc.update_or_verify_memory(
            memory_id=memory_id,
            agent_id=effective_agent,
            verification_status="SUPERSEDED",
        )
        msg = f"Memory {memory_id} marked as superseded by newer field observations."

    return {
        "status": "success",
        "action": act_upper,
        "memory_id": memory_id,
        "actor": actor_agent,
        "timestamp": now_iso,
        "message": msg,
        "transport_mode": meko_svc.transport_mode,
        "sync_status": res.get("sync_status"),
        "remote_status": res.get("remote_status"),
        "local_status": res.get("local_status"),
        "remote_error": res.get("remote_error"),
    }


def get_corridor_spatial_context_comparison(corridor_id: str) -> Dict[str, Any]:
    """
    Compare recommendation for a corridor with MEKO SPATIAL MEMORY ON vs OFF.
    Demonstrates exact memory pins responsible for divergence in municipal decision-making.
    """
    corr = get_corridor_by_id(corridor_id)
    if not corr:
        raise ValueError(f"Corridor '{corridor_id}' not found.")

    cid = str(corr.get("id"))
    code = corr.get("code", f"C-{cid}")

    pins_res = get_spatial_memory_pins(corridor_id=cid)
    active_pins = pins_res["pins"]

    # When MEKO is OFF
    meko_off_rec = {
        "mode": "MEKO_OFF",
        "description": "Standard satellite-only evaluation without institutional memory.",
        "primary_recommendation": corr.get("intervention_plan", {}).get("primary_recommendation", {}).get("name", "Linear Street Trees"),
        "assumed_feasibility": "FEASIBLE_ESTIMATE",
        "risk_exposure": "HIGH: Unaware of subsurface electrical feeds or past plantation failures.",
        "retrieved_memories_count": 0,
        "retrieved_memories": [],
    }

    # When MEKO is ON
    if active_pins:
        top_pin = active_pins[0]
        pin_cat = top_pin["category"]
        if pin_cat == "SITE_CONSTRAINT":
            altered_rec = "Architectural Shade Structures or Root-Barriered Karanj"
            altered_feasibility = "CONSTRAINT_IDENTIFIED"
            impact_detail = f"Switched away from deep excavation due to memory '{top_pin['summary']}'."
        elif pin_cat == "COMMUNITY_FEEDBACK":
            altered_rec = "Linear Street Trees + Bus Stop Cantilever Canopy"
            altered_feasibility = "COMMUNITY_PRIORITIZED"
            impact_detail = f"Enhanced pedestrian shading at transit nodes based on community input."
        else:
            altered_rec = "Native Neem/Amaltas High-Canopy Planting"
            altered_feasibility = "FEASIBLE_ESTIMATE"
            impact_detail = "Informed by historical species survival data."
    else:
        altered_rec = meko_off_rec["primary_recommendation"]
        altered_feasibility = "FEASIBLE_ESTIMATE"
        impact_detail = "No localized memory recorded; follows baseline satellite prioritization."

    meko_on_rec = {
        "mode": "MEKO_ON",
        "description": "Institutional memory active: integrates historical surveys, GPR clearances, and citizen feedback.",
        "primary_recommendation": altered_rec,
        "assumed_feasibility": altered_feasibility,
        "decision_divergence_rationale": impact_detail,
        "retrieved_memories_count": len(active_pins),
        "retrieved_memories": active_pins,
    }

    has_demo_pin = any(p.get("is_synthetic_demo") for p in active_pins)

    comparison_result = {
        "corridor_id": cid,
        "corridor_code": code,
        "corridor_name": corr.get("name"),
        "district": corr.get("district"),
        "comparison": {
            "meko_off": meko_off_rec,
            "meko_on": meko_on_rec,
        },
        "recommendation_diverged": meko_off_rec["primary_recommendation"] != meko_on_rec["primary_recommendation"],
    }
    if has_demo_pin:
        comparison_result["simulation_notice"] = (
            "DEMONSTRATION SCENARIO ACTIVE: Divergence driven by synthetic demo fixture (survey-014 / fictional utility line). "
            "In genuine operations without verified municipal surveys, standard feasibility applies."
        )
    return comparison_result
