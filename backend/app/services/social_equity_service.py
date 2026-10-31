"""
Best Social Innovation — Equity-Aware Climate Planning & Community Observation Service (Phase 8).

Responsibilities:
1. Prioritizes climate interventions for heat-exposed, shade-deficient, high-vulnerability
   urban corridors serving outdoor workers, transit commuters, schoolchildren, elderly
   residents, and dense low-income neighborhoods.
2. Provides an anonymized community observation intake (`heat_exposure`, `shade_accessibility`,
   `pedestrian_infrastructure`) persisted in SQLite (`backend/data/social_equity.sqlite`).
3. Enforces a strict human verification workflow (`pending_review` -> `human_verified`)
   before community observations can influence formal planning or be promoted to Meko
   institutional memory.
"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import DATA_DIR
from app.services.corridor_service import get_all_corridors, get_corridor_by_id

VULNERABLE_GROUPS = [
    "outdoor_workers",
    "transit_commuters",
    "schoolchildren",
    "elderly_residents",
    "dense_low_income_neighborhoods",
]

OBSERVATION_CATEGORIES = [
    "heat_exposure",
    "shade_accessibility",
    "pedestrian_infrastructure",
    "drinking_water_cooling_access",
]


class SocialEquityService:
    """Manages equity-weighted corridor diagnostics and anonymized community observations."""

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path = db_path or (DATA_DIR / "social_equity.sqlite")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._seed_community_observations_if_empty()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS community_observations (
                    observation_id TEXT PRIMARY KEY,
                    corridor_id TEXT NOT NULL,
                    ward_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    vulnerable_group TEXT NOT NULL,
                    severity INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 5),
                    observation_text TEXT NOT NULL,
                    location_landmark TEXT NOT NULL,
                    anonymized_reporter_role TEXT NOT NULL,
                    verification_status TEXT NOT NULL DEFAULT 'pending_review',
                    verified_by TEXT,
                    verified_at TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def _seed_community_observations_if_empty(self) -> None:
        with self._get_conn() as conn:
            cnt = conn.execute("SELECT COUNT(*) AS cnt FROM community_observations").fetchone()["cnt"]
            if cnt > 0:
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            seeds = [
                (
                    "comm-obs-001",
                    "delhi_corridor_014",
                    "ward-12",
                    "heat_exposure",
                    "outdoor_workers",
                    5,
                    "Zero continuous canopy shade along the 450m bus queue and cycle-rickshaw stand; asphalt radiates extreme heat between 12:30 and 16:00 IST.",
                    "Lal Bahadur Shastri Marg Bus Terminal & Rickshaw Bay",
                    "Street Vendor & Rickshaw Union Representative (Anonymized)",
                    "human_verified",
                    "planner_niharika",
                    now_iso,
                    now_iso,
                ),
                (
                    "comm-obs-002",
                    "delhi_corridor_014",
                    "ward-12",
                    "shade_accessibility",
                    "schoolchildren",
                    4,
                    "Primary school dispersal walk path has narrow 1.4m footpath with underground utility covers blocking tree planting; overhead pergola shade is urgently needed.",
                    "Ward 12 Municipal School Gate #2",
                    "Parent-Teacher Association Volunteer (Anonymized)",
                    "human_verified",
                    "planner_kunal",
                    now_iso,
                    now_iso,
                ),
                (
                    "comm-obs-003",
                    "delhi_corridor_001",
                    "ward-01",
                    "pedestrian_infrastructure",
                    "transit_commuters",
                    5,
                    "Last-mile metro feeder walkway lacks shade and kerb ramps for elderly pedestrians; surface temperature exceeds 40°C in afternoon peak.",
                    "Metro Feeder Crossing North Approach",
                    "Daily Transit Commuter (Anonymized)",
                    "human_verified",
                    "planner_niharika",
                    now_iso,
                    now_iso,
                ),
                (
                    "comm-obs-004",
                    "delhi_corridor_003",
                    "ward-03",
                    "heat_exposure",
                    "elderly_residents",
                    4,
                    "No shaded resting benches between the dispensary and residential block; elderly patients experience heat exhaustion waiting for buses.",
                    "Municipal Dispensary Footpath Stretch",
                    "Senior Citizens Welfare Group (Anonymized)",
                    "pending_review",
                    None,
                    None,
                    now_iso,
                ),
                (
                    "comm-obs-005",
                    "delhi_corridor_005",
                    "ward-05",
                    "drinking_water_cooling_access",
                    "dense_low_income_neighborhoods",
                    5,
                    "Informal settlement edge corridor has high PM2.5 dust and no vegetative buffer or shaded water kiosk.",
                    "Eastern Industrial Feeder Verge",
                    "Community Health Worker / ASHA (Anonymized)",
                    "human_verified",
                    "planner_kunal",
                    now_iso,
                    now_iso,
                ),
            ]
            conn.executemany(
                """
                INSERT INTO community_observations (
                    observation_id, corridor_id, ward_id, category, vulnerable_group,
                    severity, observation_text, location_landmark, anonymized_reporter_role,
                    verification_status, verified_by, verified_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                seeds,
            )
            conn.commit()

    def list_observations(
        self,
        corridor_id: Optional[str] = None,
        verification_status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        resolved_cid = None
        if corridor_id:
            corr = get_corridor_by_id(corridor_id)
            resolved_cid = corr["id"] if corr else corridor_id

        clauses: List[str] = []
        params: List[Any] = []
        if resolved_cid:
            clauses.append("corridor_id = ?")
            params.append(resolved_cid)
        if verification_status:
            clauses.append("verification_status = ?")
            params.append(verification_status)

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._get_conn() as conn:
            rows = conn.execute(
                f"SELECT * FROM community_observations {where_sql} ORDER BY created_at DESC",
                params,
            ).fetchall()

        results = []
        for r in rows:
            corr = get_corridor_by_id(r["corridor_id"])
            results.append(
                {
                    "observation_id": r["observation_id"],
                    "corridor_id": r["corridor_id"],
                    "corridor_code": corr.get("code") if corr else r["corridor_id"],
                    "corridor_name": corr.get("name") if corr else r["corridor_id"],
                    "ward_id": r["ward_id"],
                    "category": r["category"],
                    "vulnerable_group": r["vulnerable_group"],
                    "severity": int(r["severity"]),
                    "observation_text": r["observation_text"],
                    "location_landmark": r["location_landmark"],
                    "anonymized_reporter_role": r["anonymized_reporter_role"],
                    "verification_status": r["verification_status"],
                    "verified_by": r["verified_by"],
                    "verified_at": r["verified_at"],
                    "created_at": r["created_at"],
                }
            )
        return results

    def submit_observation(
        self,
        corridor_id: str,
        category: str,
        vulnerable_group: str,
        severity: int,
        observation_text: str,
        location_landmark: str,
        anonymized_reporter_role: str = "Community Resident (Anonymized)",
    ) -> Dict[str, Any]:
        """Submit an anonymized community observation (enters pending_review state)."""
        corr = get_corridor_by_id(corridor_id)
        resolved_cid = corr["id"] if corr else corridor_id
        ward_id = corr.get("ward_id", "ward-12") if corr else "ward-12"
        cat = category if category in OBSERVATION_CATEGORIES else "heat_exposure"
        vgroup = vulnerable_group if vulnerable_group in VULNERABLE_GROUPS else "outdoor_workers"
        sev = max(1, min(5, int(severity)))
        obs_id = f"comm-obs-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO community_observations (
                    observation_id, corridor_id, ward_id, category, vulnerable_group,
                    severity, observation_text, location_landmark, anonymized_reporter_role,
                    verification_status, verified_by, verified_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', NULL, NULL, ?)
                """,
                (
                    obs_id,
                    resolved_cid,
                    ward_id,
                    cat,
                    vgroup,
                    sev,
                    observation_text.strip(),
                    location_landmark.strip(),
                    anonymized_reporter_role.strip(),
                    now_iso,
                ),
            )
            conn.commit()

        return {
            "observation_id": obs_id,
            "corridor_id": resolved_cid,
            "corridor_code": corr.get("code") if corr else resolved_cid,
            "ward_id": ward_id,
            "category": cat,
            "vulnerable_group": vgroup,
            "severity": sev,
            "observation_text": observation_text.strip(),
            "location_landmark": location_landmark.strip(),
            "anonymized_reporter_role": anonymized_reporter_role.strip(),
            "verification_status": "pending_review",
            "governance_note": "Observation queued for municipal planner verification before influencing formal Meko memory or budget allocation.",
            "created_at": now_iso,
        }

    def verify_observation(
        self,
        observation_id: str,
        verified_by: str = "municipal_planner",
        approve: bool = True,
    ) -> Dict[str, Any]:
        """Verify or reject a community observation through the human-in-the-loop governance gate."""
        new_status = "human_verified" if approve else "rejected"
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            cur = conn.execute(
                """
                UPDATE community_observations
                SET verification_status = ?, verified_by = ?, verified_at = ?
                WHERE observation_id = ?
                """,
                (new_status, verified_by, now_iso, observation_id),
            )
            conn.commit()
            if cur.rowcount == 0:
                raise ValueError(f"Community observation '{observation_id}' not found.")

            row = conn.execute(
                "SELECT * FROM community_observations WHERE observation_id = ?",
                (observation_id,),
            ).fetchone()

        return dict(row)

    def get_equity_summary(self) -> Dict[str, Any]:
        """Compute city-wide social equity metrics and vulnerable corridor rankings."""
        corridors = get_all_corridors()
        observations = self.list_observations()
        verified_obs = [o for o in observations if o["verification_status"] == "human_verified"]

        obs_by_corridor: Dict[str, List[Dict[str, Any]]] = {}
        for o in verified_obs:
            obs_by_corridor.setdefault(o["corridor_id"], []).append(o)

        equity_ranked = []
        for c in corridors:
            cid = c["id"]
            vuln = float(c.get("vulnerability_index") or 0.55)
            ped = float(c.get("pedestrian_score") or 0.60)
            heat = float(c.get("heat_score") or 0.60)
            shade_def = float(c.get("vegetation_deficit_score") or 0.65)
            c_obs = obs_by_corridor.get(cid, [])
            community_boost = min(0.15, len(c_obs) * 0.05)

            equity_need_score = round(
                min(1.0, 0.35 * vuln + 0.25 * ped + 0.20 * heat + 0.20 * shade_def + community_boost),
                3,
            )
            equity_ranked.append(
                {
                    "corridor_id": cid,
                    "corridor_code": c.get("code"),
                    "corridor_name": c.get("name"),
                    "ward_id": c.get("ward_id"),
                    "district": c.get("district"),
                    "vulnerability_index": round(vuln, 3),
                    "pedestrian_exposure_score": round(ped, 3),
                    "shade_deficit_score": round(shade_def, 3),
                    "verified_community_observations": len(c_obs),
                    "equity_priority_score": equity_need_score,
                    "primary_beneficiaries": [
                        "Outdoor workers & street vendors",
                        "Bus & metro last-mile commuters",
                        "Municipal schoolchildren & elderly pedestrians",
                    ],
                }
            )

        equity_ranked.sort(key=lambda item: item["equity_priority_score"], reverse=True)

        return {
            "vulnerable_groups_supported": VULNERABLE_GROUPS,
            "observation_categories": OBSERVATION_CATEGORIES,
            "total_community_observations": len(observations),
            "human_verified_observations": len(verified_obs),
            "pending_review_observations": sum(
                1 for o in observations if o["verification_status"] == "pending_review"
            ),
            "top_equity_priority_corridors": equity_ranked[:10],
            "observations": observations,
        }


_EQUITY_SERVICE: Optional[SocialEquityService] = None


def get_social_equity_service() -> SocialEquityService:
    global _EQUITY_SERVICE
    if _EQUITY_SERVICE is None:
        _EQUITY_SERVICE = SocialEquityService()
    return _EQUITY_SERVICE
