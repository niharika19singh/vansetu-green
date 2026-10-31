"""
Feature 8: Climate Project Implementation & Readiness Planner Service.

Converts optimized municipal portfolios into 8 standard municipal work packages:
WP-1: Subsurface Utility Scanning & GPR Trial Pits
WP-2: Sidewalk Geometry, Curb Realignment & Paving Prep
WP-3: Tree Pit Excavation & Root Barrier Installation
WP-4: Native Sapling Procurement & Planting
WP-5: Drip Irrigation Infrastructure & DJB Non-Potable Water Linkage
WP-6: Cantilevered Architectural Shade Structure Fabrication & Anchoring
WP-7: Solar-Reflective Cool Pavement Surface Application
WP-8: Post-Installation Microclimate & Survival Monitoring Telemetry

Tracks progress across 8 standardized readiness gates:
1_CONCEPT_IDENTIFIED -> 2_FEASIBILITY_ESTIMATED -> 3_SITE_SURVEY_COMPLETED ->
4_STAKEHOLDER_APPROVED -> 5_PROCUREMENT_READY -> 6_CONTRACT_AWARDED ->
7_UNDER_EXECUTION -> 8_OPERATIONAL_MONITORING

Integrates directly with IOMETE Climate Technology Procurement Studio.
"""
from __future__ import annotations

import logging
import sqlite3
import os
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.corridor_service import get_all_corridors, get_corridor_by_id
from app.services.procurement_service import get_procurement_service

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(settings.data_dir, "climate_intelligence.sqlite")

READINESS_GATES = [
    "1_CONCEPT_IDENTIFIED",
    "2_FEASIBILITY_ESTIMATED",
    "3_SITE_SURVEY_COMPLETED",
    "4_STAKEHOLDER_APPROVED",
    "5_PROCUREMENT_READY",
    "6_CONTRACT_AWARDED",
    "7_UNDER_EXECUTION",
    "8_OPERATIONAL_MONITORING",
]

GATE_WEIGHTS = {
    "1_CONCEPT_IDENTIFIED": 12.5,
    "2_FEASIBILITY_ESTIMATED": 25.0,
    "3_SITE_SURVEY_COMPLETED": 37.5,
    "4_STAKEHOLDER_APPROVED": 50.0,
    "5_PROCUREMENT_READY": 65.0,
    "6_CONTRACT_AWARDED": 80.0,
    "7_UNDER_EXECUTION": 90.0,
    "8_OPERATIONAL_MONITORING": 100.0,
}

WORK_PACKAGE_TEMPLATES = [
    {
        "code": "WP-1",
        "name": "Subsurface Utility Scanning & GPR Trial Pits",
        "lead_agency": "PWD / MCD Engineering Division",
        "duration_weeks": 3,
        "cost_percentage": 4.5,
        "iomete_category": "environmental_monitoring_equipment",
        "deliverables": "Comprehensive 1.5m depth underground clearance report and utility markout.",
    },
    {
        "code": "WP-2",
        "name": "Sidewalk Geometry, Curb Realignment & Paving Prep",
        "lead_agency": "MCD Road Maintenance Cell",
        "duration_weeks": 4,
        "cost_percentage": 14.0,
        "iomete_category": "permeable_pavers",
        "deliverables": "IRC:103 compliant clear 1.8m pedestrian walkway and permeable subbase prep.",
    },
    {
        "code": "WP-3",
        "name": "Tree Pit Excavation & Root Barrier Installation",
        "lead_agency": "Horticulture Division",
        "duration_weeks": 3,
        "cost_percentage": 10.5,
        "iomete_category": "root_barrier_membranes",
        "deliverables": "1.2m x 1.2m engineered tree pits with HDPE vertical root barrier liners.",
    },
    {
        "code": "WP-4",
        "name": "Native Sapling Procurement & Planting",
        "lead_agency": "Forest Department / Certified Nursery",
        "duration_weeks": 4,
        "cost_percentage": 25.0,
        "iomete_category": "native_nursery_stock",
        "deliverables": "3.5m+ tall mature saplings of Neem, Karanj, and Amaltas planted with tree guards.",
    },
    {
        "code": "WP-5",
        "name": "Drip Irrigation Infrastructure & DJB Non-Potable Linkage",
        "lead_agency": "Delhi Jal Board (DJB)",
        "duration_weeks": 3,
        "cost_percentage": 12.0,
        "iomete_category": "smart_irrigation_systems",
        "deliverables": "Solar-powered pressure-compensating drip line tied to treated effluent (STP) supply.",
    },
    {
        "code": "WP-6",
        "name": "Cantilevered Architectural Shade Structure Fabrication",
        "lead_agency": "Fabrication Contractor",
        "duration_weeks": 5,
        "cost_percentage": 16.0,
        "iomete_category": "shade_and_cooling_technologies",
        "deliverables": "IS 875 wind-load certified tensile fabric canopy over unsheltered transit nodes.",
    },
    {
        "code": "WP-7",
        "name": "Solar-Reflective Cool Pavement Surface Application",
        "lead_agency": "Specialized Pavement Contractor",
        "duration_weeks": 2,
        "cost_percentage": 10.0,
        "iomete_category": "shade_and_cooling_technologies",
        "deliverables": "SRI >= 78 elastomeric high-albedo topcoat applied across unshaded pavement stretches.",
    },
    {
        "code": "WP-8",
        "name": "Post-Installation Telemetry & 3-Year Maintenance Handover",
        "lead_agency": "Urban Local Body / VanSetu Operations",
        "duration_weeks": 2,
        "cost_percentage": 8.0,
        "iomete_category": "weather_stations",
        "deliverables": "IoT temperature/humidity sensor node installation and 36-month survival service SLA.",
    },
]


def _init_readiness_db():
    os.makedirs(settings.data_dir, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readiness_projects (
                project_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                budget_lakhs REAL NOT NULL,
                corridor_count INTEGER NOT NULL,
                corridor_codes TEXT NOT NULL,
                current_overall_gate TEXT NOT NULL,
                readiness_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readiness_packages (
                package_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                lead_agency TEXT NOT NULL,
                allocated_budget_lakhs REAL NOT NULL,
                duration_weeks INTEGER NOT NULL,
                current_gate TEXT NOT NULL,
                iomete_category TEXT NOT NULL,
                deliverables TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES readiness_projects(project_id)
            )
        """)
        conn.commit()


def create_project_from_portfolio(
    portfolio_name: str,
    budget_lakhs: float,
    corridors: List[Dict[str, Any]],
    interventions: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate a tailored municipal implementation plan from an optimized portfolio.
    Zero-fabrication rule: rejects empty corridor portfolios.
    Work packages are conditionally generated based on active intervention archetypes,
    with re-normalized budget allocations.
    """
    if not corridors:
        raise ValueError("Cannot create readiness project with an empty corridor portfolio.")

    c_codes = [c.get("code", f"C-{c.get('id')}") for c in corridors if c.get("code") or c.get("id") is not None]
    if not c_codes:
        raise ValueError("Cannot create readiness project with an empty corridor portfolio.")

    _init_readiness_db()
    proj_id = f"PROJ-DEL-{datetime.now().strftime('%Y%m%d%H%M%S%f')}-{uuid.uuid4().hex[:4]}"
    now_iso = datetime.now().isoformat()

    # Determine relevant work packages based on requested or extracted interventions
    active_int_names = []
    if interventions:
        active_int_names = [str(i).lower() for i in interventions]
    else:
        for c in corridors:
            ints = c.get("selected_interventions") or c.get("interventions") or []
            for item in ints:
                if isinstance(item, dict):
                    active_int_names.append(str(item.get("id") or item.get("name", "")).lower())
                elif isinstance(item, str):
                    active_int_names.append(item.lower())

    # If no specific interventions are defined, include standard comprehensive package mix
    has_specific_filter = bool(active_int_names)
    has_trees = not has_specific_filter or any("tree" in i or "swale" in i or "bioswale" in i for i in active_int_names)
    has_shade = not has_specific_filter or any("shade" in i or "canopy" in i for i in active_int_names)
    has_pavement = not has_specific_filter or any("pavement" in i or "albedo" in i or "cool" in i for i in active_int_names)

    selected_templates = []
    for tmpl in WORK_PACKAGE_TEMPLATES:
        code = tmpl["code"]
        if code in ("WP-1", "WP-2", "WP-8"):
            selected_templates.append(tmpl)
        elif code in ("WP-3", "WP-4", "WP-5") and has_trees:
            selected_templates.append(tmpl)
        elif code == "WP-6" and has_shade:
            selected_templates.append(tmpl)
        elif code == "WP-7" and has_pavement:
            selected_templates.append(tmpl)

    # Re-normalize cost percentages among generated packages
    total_template_pct = sum(t["cost_percentage"] for t in selected_templates) or 100.0

    packages = []
    for tmpl in selected_templates:
        pkg_id = f"{proj_id}-{tmpl['code']}"
        normalized_pct = (tmpl["cost_percentage"] / total_template_pct) * 100.0
        alloc = round(budget_lakhs * (normalized_pct / 100.0), 2)
        gate = "2_FEASIBILITY_ESTIMATED" if tmpl["code"] in ["WP-1", "WP-2"] else "1_CONCEPT_IDENTIFIED"
        packages.append({
            "package_id": pkg_id,
            "project_id": proj_id,
            "code": tmpl["code"],
            "name": tmpl["name"],
            "lead_agency": tmpl["lead_agency"],
            "allocated_budget_lakhs": alloc,
            "duration_weeks": tmpl["duration_weeks"],
            "current_gate": gate,
            "iomete_category": tmpl["iomete_category"],
            "deliverables": tmpl["deliverables"],
            "updated_at": now_iso,
        })

    # Calculate initial readiness score dynamically from package gate weights
    initial_score = round(
        sum(GATE_WEIGHTS.get(pkg["current_gate"], 12.5) for pkg in packages) / max(len(packages), 1),
        1,
    )

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO readiness_projects (
                project_id, name, budget_lakhs, corridor_count, corridor_codes,
                current_overall_gate, readiness_score, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            proj_id, portfolio_name, budget_lakhs, len(c_codes), json.dumps(c_codes),
            "1_CONCEPT_IDENTIFIED", initial_score, now_iso, now_iso
        ))

        for pkg in packages:
            conn.execute("""
                INSERT INTO readiness_packages (
                    package_id, project_id, code, name, lead_agency, allocated_budget_lakhs,
                    duration_weeks, current_gate, iomete_category, deliverables, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                pkg["package_id"], pkg["project_id"], pkg["code"], pkg["name"], pkg["lead_agency"],
                pkg["allocated_budget_lakhs"], pkg["duration_weeks"], pkg["current_gate"], pkg["iomete_category"],
                pkg["deliverables"], pkg["updated_at"]
            ))
        conn.commit()

    return get_project_readiness_plan(proj_id)


def get_all_readiness_projects() -> List[Dict[str, Any]]:
    """Retrieve all municipal readiness projects."""
    _init_readiness_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM readiness_projects ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        projects = []
        for r in rows:
            d = dict(r)
            d["corridor_codes"] = json.loads(d["corridor_codes"])
            projects.append(d)
        return projects


def get_project_readiness_plan(project_id: str) -> Dict[str, Any]:
    """
    Retrieve project implementation plan, 8 work packages, readiness gates, and IOMETE integration links.
    """
    _init_readiness_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM readiness_projects WHERE project_id = ?", (project_id,))
        proj_row = cursor.fetchone()
        if not proj_row:
            # If default sample requested, seed on the fly with verified real corridor IDs
            if project_id == "PROJ-SAMPLE" or project_id.startswith("default"):
                return create_project_from_portfolio(
                    portfolio_name="NCT Delhi Priority Climate Corridor Package",
                    budget_lakhs=50.0,
                    corridors=[{"code": "C-14", "id": 14}, {"code": "C-01", "id": 1}, {"code": "C-08", "id": 8}],
                )
            raise ValueError(f"Project '{project_id}' not found.")

        proj = dict(proj_row)
        proj["corridor_codes"] = json.loads(proj["corridor_codes"])

        cursor.execute("SELECT * FROM readiness_packages WHERE project_id = ? ORDER BY code ASC", (project_id,))
        pkg_rows = cursor.fetchall()
        packages = [dict(p) for p in pkg_rows]

    # Calculate overall readiness score based on package gates dynamically
    total_score = sum(GATE_WEIGHTS.get(pkg["current_gate"], 12.5) for pkg in packages)
    overall_readiness_pct = round(total_score / max(len(packages), 1), 1)

    return {
        "project": proj,
        "overall_readiness_percentage": overall_readiness_pct,
        "readiness_score_type": "INITIAL_PLANNING_STAGE_INDICATOR",
        "readiness_gates": READINESS_GATES,
        "work_packages_count": len(packages),
        "work_packages": packages,
        "iomete_procurement_integration": {
            "catalog_endpoint": "/api/procurement/catalog",
            "rfp_generator_endpoint": "/api/procurement/generate-rfp",
            "linked_equipment_categories": list({pkg["iomete_category"] for pkg in packages}),
            "ready_for_procurement": overall_readiness_pct >= 50.0,
        },
        "storage_provenance": {
            "engine": "SQLite 3 Local Embedded Database",
            "file_path": DB_PATH,
            "tables": ["readiness_projects", "readiness_packages"],
            "durability": "Persistent across server restarts with ACID transactions",
        },
    }


def advance_package_gate(package_id: str, new_gate: str) -> Dict[str, Any]:
    """Advance a work package to a new readiness gate."""
    if new_gate not in READINESS_GATES:
        raise ValueError(f"Invalid gate '{new_gate}'. Must be one of {READINESS_GATES}")

    _init_readiness_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT project_id FROM readiness_packages WHERE package_id = ?", (package_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Package '{package_id}' not found.")

        proj_id = row[0]
        now_iso = datetime.now().isoformat()
        conn.execute(
            "UPDATE readiness_packages SET current_gate = ?, updated_at = ? WHERE package_id = ?",
            (new_gate, now_iso, package_id),
        )

        # Recalculate and update overall readiness score on parent project
        cursor.execute("SELECT current_gate FROM readiness_packages WHERE project_id = ?", (proj_id,))
        current_gates = [r[0] for r in cursor.fetchall()]
        new_overall_score = round(
            sum(GATE_WEIGHTS.get(g, 12.5) for g in current_gates) / max(len(current_gates), 1),
            1,
        )

        conn.execute(
            "UPDATE readiness_projects SET readiness_score = ?, updated_at = ? WHERE project_id = ?",
            (new_overall_score, now_iso, proj_id),
        )
        conn.commit()

    return get_project_readiness_plan(proj_id)
