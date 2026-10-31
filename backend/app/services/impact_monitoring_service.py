"""
Feature 6: Climate Intervention Impact Monitoring Service.

Manages persistent lifecycle registry for climate interventions:
- PLANNED
- UNDER_CONSTRUCTION
- OPERATIONAL
- MAINTENANCE_REQUIRED

Computes empirical before-and-after deltas (NDVI, LST, AQI) with paired control corridors.
Enforces non-causal attribution honesty disclaimers and explicit verification status disclosures.
Stores deployments in local SQLite database with full audit provenance.
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

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(settings.data_dir, "climate_intelligence.sqlite")


def _init_db():
    """Initialize impact monitoring tables in SQLite if they don't exist."""
    os.makedirs(settings.data_dir, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS intervention_registry (
                id TEXT PRIMARY KEY,
                corridor_id TEXT NOT NULL,
                corridor_code TEXT NOT NULL,
                corridor_name TEXT NOT NULL,
                district TEXT NOT NULL,
                archetype TEXT NOT NULL,
                lifecycle_status TEXT NOT NULL,
                planned_date TEXT NOT NULL,
                completion_date TEXT,
                capex_inr_lakhs REAL NOT NULL,
                opex_annual_lakhs REAL NOT NULL,
                units_deployed INTEGER NOT NULL,
                control_corridor_id TEXT,
                control_corridor_code TEXT,
                baseline_metrics TEXT NOT NULL,
                post_metrics TEXT,
                notes TEXT,
                is_synthetic_demo INTEGER DEFAULT 0,
                verification_status TEXT DEFAULT 'UNVERIFIED_DEMONSTRATION',
                data_type TEXT DEFAULT 'SYNTHETIC_SIMULATION_ESTIMATE',
                updated_at TEXT NOT NULL
            )
        """)
        # Ensure schema migrations if table existed previously
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(intervention_registry)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        if "verification_status" not in existing_cols:
            conn.execute("ALTER TABLE intervention_registry ADD COLUMN verification_status TEXT DEFAULT 'UNVERIFIED_DEMONSTRATION'")
        if "data_type" not in existing_cols:
            conn.execute("ALTER TABLE intervention_registry ADD COLUMN data_type TEXT DEFAULT 'SYNTHETIC_SIMULATION_ESTIMATE'")
        conn.commit()


def _seed_demo_if_empty():
    _init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM intervention_registry")
        count = cursor.fetchone()[0]
        if count == 0:
            demo_record = {
                "id": "DEP-DEL-C14-2024-01",
                "corridor_id": "14",
                "corridor_code": "C-14",
                "corridor_name": "Asaf Ali Road & Delhi Gate Corridor",
                "district": "Central Delhi",
                "archetype": "Linear Street Trees",
                "lifecycle_status": "OPERATIONAL",
                "planned_date": "2024-01-15",
                "completion_date": "2024-05-20",
                "capex_inr_lakhs": 18.5,
                "opex_annual_lakhs": 1.4,
                "units_deployed": 120,
                "control_corridor_id": "12",
                "control_corridor_code": "C-12",
                "baseline_metrics": json.dumps({
                    "ndvi_mean": 0.18,
                    "lst_celsius": 36.4,
                    "aqi_pm25": 165.0,
                    "observation_period": "Pre-Monsoon 2023",
                    "source": "Sentinel-2 & MODIS Terra Baseline",
                }),
                "post_metrics": json.dumps({
                    "ndvi_mean": 0.28,
                    "lst_celsius": 34.6,
                    "aqi_pm25": 152.0,
                    "observation_period": "Pre-Monsoon 2024",
                    "source": "Synthetic Post-Intervention Simulation Model",
                }),
                "notes": (
                    "SYNTHETIC DEMONSTRATION SCENARIO: 120 mature Neem/Karanj saplings with drip irrigation along Delhi Gate segment. "
                    "Post-intervention NDVI delta (+0.10) and LST reduction (-1.8°C) are modeled illustrative simulations, not field-verified sensor telemetry."
                ),
                "is_synthetic_demo": 1,
                "verification_status": "UNVERIFIED_DEMONSTRATION",
                "data_type": "SYNTHETIC_SIMULATION_ESTIMATE",
                "updated_at": datetime.now().isoformat(),
            }
            conn.execute("""
                INSERT INTO intervention_registry (
                    id, corridor_id, corridor_code, corridor_name, district, archetype,
                    lifecycle_status, planned_date, completion_date, capex_inr_lakhs,
                    opex_annual_lakhs, units_deployed, control_corridor_id, control_corridor_code,
                    baseline_metrics, post_metrics, notes, is_synthetic_demo, verification_status,
                    data_type, updated_at
                ) VALUES (
                    :id, :corridor_id, :corridor_code, :corridor_name, :district, :archetype,
                    :lifecycle_status, :planned_date, :completion_date, :capex_inr_lakhs,
                    :opex_annual_lakhs, :units_deployed, :control_corridor_id, :control_corridor_code,
                    :baseline_metrics, :post_metrics, :notes, :is_synthetic_demo, :verification_status,
                    :data_type, :updated_at
                )
            """, demo_record)
            conn.commit()


_seed_demo_if_empty()


def get_all_deployments() -> List[Dict[str, Any]]:
    """Retrieve all tracked climate intervention deployments."""
    _init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM intervention_registry ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        deployments = []
        for r in rows:
            d = dict(r)
            d["baseline_metrics"] = json.loads(d["baseline_metrics"]) if d["baseline_metrics"] else {}
            d["post_metrics"] = json.loads(d["post_metrics"]) if d["post_metrics"] else {}
            d["is_synthetic_demo"] = bool(d["is_synthetic_demo"])
            deployments.append(d)
        return deployments


def get_deployment_detail(deployment_id: str) -> Dict[str, Any]:
    """
    Retrieve deployment detail with empirical before-after deltas, control corridor comparison,
    and strict attribution disclaimers.
    """
    _init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM intervention_registry WHERE id = ?", (deployment_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Deployment '{deployment_id}' not found.")

        d = dict(row)
        base = json.loads(d["baseline_metrics"]) if d["baseline_metrics"] else {}
        post = json.loads(d["post_metrics"]) if d["post_metrics"] else {}

        # Deltas
        ndvi_delta = None
        lst_delta = None
        aqi_delta = None
        if base and post:
            if "ndvi_mean" in base and "ndvi_mean" in post:
                ndvi_delta = round(post["ndvi_mean"] - base["ndvi_mean"], 3)
            if "lst_celsius" in base and "lst_celsius" in post:
                lst_delta = round(post["lst_celsius"] - base["lst_celsius"], 2)
            if "aqi_pm25" in base and "aqi_pm25" in post:
                aqi_delta = round(post["aqi_pm25"] - base["aqi_pm25"], 1)

        # Control corridor metrics
        control_id = d.get("control_corridor_id")
        control_info = None
        if control_id:
            try:
                c_corr = get_corridor_by_id(control_id)
                if c_corr:
                    control_info = {
                        "control_corridor_id": c_corr.get("id"),
                        "control_code": c_corr.get("code", f"C-{c_corr.get('id')}"),
                        "control_name": c_corr.get("name"),
                        "district": c_corr.get("district"),
                        "current_ndvi": c_corr.get("ndvi_mean"),
                        "current_lst": c_corr.get("lst_mean"),
                        "control_relationship": "HYPOTHETICAL_UNVERIFIED_CONTROL_PROXY",
                        "untreated_baseline_comparison": "Control corridor experienced no municipal intervention over the same period.",
                        "control_disclaimer": "No comprehensive on-ground survey has verified that zero private or civic greening occurred along the control corridor during the monitoring interval.",
                    }
            except Exception as e:
                logger.warning(f"Could not load control corridor {control_id}: {e}")

        return {
            "deployment": d,
            "empirical_deltas": {
                "ndvi_change": ndvi_delta,
                "lst_celsius_change": lst_delta,
                "pm25_change": aqi_delta,
                "interpretation": (
                    f"Observed NDVI changed by {ndvi_delta:+.3f} and LST changed by {lst_delta:+.1f}°C."
                    if ndvi_delta is not None and lst_delta is not None
                    else "Monitoring period ongoing; post-intervention observations pending."
                ),
                "is_synthetic_simulation": bool(d.get("is_synthetic_demo", 0)),
                "verification_status": d.get("verification_status", "UNVERIFIED_DEMONSTRATION"),
            },
            "control_corridor_comparison": control_info,
            "attribution_honesty_disclaimer": (
                "Observed changes in satellite radiometric LST and CPCB ambient AQI represent differences "
                "between satellite acquisition windows. VanSetu explicitly DOES NOT claim sole causality, as regional "
                "weather patterns, atmospheric boundary layer fluctuations, and traffic intensity also influence observations."
            ),
            "storage_provenance": {
                "engine": "SQLite 3 Local Embedded Database",
                "file_path": DB_PATH,
                "table": "intervention_registry",
                "production_role": "Local Edge Prototype / Municipal Offline Buffer",
                "enterprise_target": "Tiger Data TimescaleDB Hypertable for distributed multi-tenant telemetry",
            },
        }


def create_deployment(data: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new intervention deployment."""
    _init_db()
    cid = str(data.get("corridor_id", "14"))
    corr = get_corridor_by_id(cid)
    if not corr:
        raise ValueError(f"Corridor '{cid}' not found.")

    unique_suffix = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}-{uuid.uuid4().hex[:6]}"
    dep_id = f"DEP-DEL-C{corr.get('id')}-{unique_suffix}"
    code = corr.get("code", f"C-{corr.get('id')}")
    name = corr.get("name")
    district = corr.get("district")

    baseline = data.get("baseline_metrics", {
        "ndvi_mean": corr.get("ndvi_mean", 0.22),
        "lst_celsius": corr.get("lst_mean", 34.0),
        "observation_period": "Pre-Monsoon 2024",
        "source": "Pre-intervention raster baseline",
    })

    record = {
        "id": dep_id,
        "corridor_id": str(corr.get("id")),
        "corridor_code": code,
        "corridor_name": name,
        "district": district,
        "archetype": data.get("archetype", "Linear Street Trees"),
        "lifecycle_status": data.get("lifecycle_status", "PLANNED"),
        "planned_date": data.get("planned_date", datetime.now().strftime("%Y-%m-%d")),
        "completion_date": data.get("completion_date"),
        "capex_inr_lakhs": float(data.get("capex_inr_lakhs", 15.0)),
        "opex_annual_lakhs": float(data.get("opex_annual_lakhs", 1.2)),
        "units_deployed": int(data.get("units_deployed", 80)),
        "control_corridor_id": data.get("control_corridor_id", "12"),
        "control_corridor_code": data.get("control_corridor_code", "C-12"),
        "baseline_metrics": json.dumps(baseline),
        "post_metrics": json.dumps(data.get("post_metrics", {})),
        "notes": data.get("notes", "Registered via VanSetu Climate Action Implementation"),
        "is_synthetic_demo": 0,
        "verification_status": data.get("verification_status", "PENDING_FIELD_VERIFICATION"),
        "data_type": data.get("data_type", "FIELD_REPORTED_ESTIMATE"),
        "updated_at": datetime.now().isoformat(),
    }

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO intervention_registry (
                id, corridor_id, corridor_code, corridor_name, district, archetype,
                lifecycle_status, planned_date, completion_date, capex_inr_lakhs,
                opex_annual_lakhs, units_deployed, control_corridor_id, control_corridor_code,
                baseline_metrics, post_metrics, notes, is_synthetic_demo, verification_status,
                data_type, updated_at
            ) VALUES (
                :id, :corridor_id, :corridor_code, :corridor_name, :district, :archetype,
                :lifecycle_status, :planned_date, :completion_date, :capex_inr_lakhs,
                :opex_annual_lakhs, :units_deployed, :control_corridor_id, :control_corridor_code,
                :baseline_metrics, :post_metrics, :notes, :is_synthetic_demo, :verification_status,
                :data_type, :updated_at
            )
        """, record)
        conn.commit()

    return get_deployment_detail(dep_id)


def update_deployment_status(deployment_id: str, new_status: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """Update lifecycle status of an intervention."""
    allowed = {"PLANNED", "UNDER_CONSTRUCTION", "OPERATIONAL", "MAINTENANCE_REQUIRED"}
    if new_status not in allowed:
        raise ValueError(f"Invalid status '{new_status}'. Allowed: {allowed}")

    _init_db()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM intervention_registry WHERE id = ?", (deployment_id,))
        if not cursor.fetchone():
            raise ValueError(f"Deployment '{deployment_id}' not found.")

        now_iso = datetime.now().isoformat()
        if notes:
            conn.execute(
                "UPDATE intervention_registry SET lifecycle_status = ?, notes = notes || ' | ' || ?, updated_at = ? WHERE id = ?",
                (new_status, notes, now_iso, deployment_id),
            )
        else:
            conn.execute(
                "UPDATE intervention_registry SET lifecycle_status = ?, updated_at = ? WHERE id = ?",
                (new_status, now_iso, deployment_id),
            )
        conn.commit()

    return get_deployment_detail(deployment_id)
