"""
VanSetu GreenTech — Government Reports, Municipal Submissions & Review Workflow Service.

Manages:
- Government Report Lifecycle: Draft -> Submitted -> Under Review -> Approved / Rejected.
- Unique report tracking, author provenance, district assignment, and corridor linkages.
- Review history audit trail with notes and reviewer signoff.
- Local SQLite persistence in backend/data/government_reports.sqlite.
"""
from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("vansetu.services.reports")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GovernmentReportService:
    def __init__(self, db_path: Optional[Path] = None) -> None:
        if db_path:
            self.db_path = Path(db_path)
        else:
            data_dir = Path(__file__).parent.parent.parent / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = data_dir / "government_reports.sqlite"

        self._init_db()
        self._seed_initial_data_if_empty()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS government_reports (
                    report_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    district TEXT NOT NULL,
                    corridor_ids TEXT NOT NULL,
                    report_type TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    author_role TEXT NOT NULL,
                    author_id TEXT NOT NULL,
                    budget_impact_lakh REAL DEFAULT 0.0,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    review_history_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def _seed_initial_data_if_empty(self) -> None:
        with self._get_conn() as conn:
            count = conn.execute("SELECT COUNT(*) FROM government_reports").fetchone()[0]
            if count > 0:
                return

            now = _utc_now_iso()
            initial_reports = [
                (
                    "REP-2026-088",
                    "Ward 12 Heat Mitigation & Tree Planting Sanction",
                    "South Delhi",
                    json.dumps(["C-14"]),
                    "BUDGET_SANCTION_REQUEST",
                    "Er. Rajesh Sharma",
                    "PWD Executive Engineer (South Zone)",
                    "PWD_ENG_088",
                    18.5,
                    "Under Review",
                    "Critical pedestrian corridor with 42.4°C thermal hotspot. 1,400 native tree pits proposed.",
                    json.dumps([
                        {
                            "reviewer": "Er. Rajesh Sharma",
                            "action": "SUBMITTED",
                            "notes": "Initial municipal sanction request submitted with survey data.",
                            "timestamp": "2026-10-15T11:00:00Z"
                        },
                        {
                            "reviewer": "Dr. Kunal Sharma (Govt Admin)",
                            "action": "UNDER_REVIEW",
                            "notes": "Technical scrutiny under PWD Climate Cell review.",
                            "timestamp": "2026-10-20T14:30:00Z"
                        }
                    ]),
                    "2026-10-15T11:00:00Z",
                    now,
                ),
                (
                    "REP-2026-089",
                    "MG Road Corridor Bid Award Recommendation",
                    "South Delhi",
                    json.dumps(["C-08"]),
                    "TENDER_SANCTION",
                    "Planning Board Committee",
                    "Municipal Procurement Officer",
                    "PROC_OFFICER_02",
                    24.0,
                    "Approved",
                    "Lowest responsive and technical bid adhering to Right-Tree-Right-Place bio-climate criteria.",
                    json.dumps([
                        {
                            "reviewer": "Planning Board Committee",
                            "action": "SUBMITTED",
                            "notes": "RFP bid evaluation complete.",
                            "timestamp": "2026-10-18T09:00:00Z"
                        },
                        {
                            "reviewer": "Dr. Kunal Sharma (Govt Admin)",
                            "action": "APPROVED",
                            "notes": "Sanction approved for Phase 1 execution.",
                            "timestamp": "2026-10-25T16:00:00Z"
                        }
                    ]),
                    "2026-10-18T09:00:00Z",
                    now,
                ),
                (
                    "REP-2026-090",
                    "Outer Ring Road Subsurface Utility Feasibility Report",
                    "South Delhi",
                    json.dumps(["C-01"]),
                    "ENGINEERING_FEASIBILITY",
                    "Er. Neha Gupta",
                    "PWD Field Verification Engineer",
                    "PWD_ENG_FIELD_01",
                    35.0,
                    "Submitted",
                    "Trial pit inspection cleared. Subsurface utility conflict resolved by 1.2m offset from gas mains.",
                    json.dumps([
                        {
                            "reviewer": "Er. Neha Gupta",
                            "action": "SUBMITTED",
                            "notes": "GPR and trial pit verification log attached.",
                            "timestamp": "2026-10-28T12:00:00Z"
                        }
                    ]),
                    "2026-10-28T12:00:00Z",
                    now,
                ),
                (
                    "REP-2026-091",
                    "Barakhamba Road Canopy Handover & Verification",
                    "New Delhi",
                    json.dumps(["C-05"]),
                    "COMPLETION_AUDIT",
                    "NDMC Infrastructure Cell",
                    "Field Auditor",
                    "AUDITOR_NDMC_05",
                    12.0,
                    "Approved",
                    "Phase 1 canopy establishment completed. 850 trees surviving; drip irrigation operational.",
                    json.dumps([
                        {
                            "reviewer": "NDMC Infrastructure Cell",
                            "action": "SUBMITTED",
                            "notes": "Post-implementation survival audit.",
                            "timestamp": "2026-10-22T10:00:00Z"
                        },
                        {
                            "reviewer": "Chief Municipal Auditor",
                            "action": "APPROVED",
                            "notes": "Audit signoff granted with zero non-conformances.",
                            "timestamp": "2026-10-29T15:20:00Z"
                        }
                    ]),
                    "2026-10-22T10:00:00Z",
                    now,
                ),
            ]
            conn.executemany(
                """
                INSERT INTO government_reports (
                    report_id, title, district, corridor_ids, report_type,
                    author_name, author_role, author_id, budget_impact_lakh,
                    status, summary, review_history_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                initial_reports,
            )

    def list_reports(
        self,
        status: Optional[str] = None,
        district: Optional[str] = None,
        author_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM government_reports WHERE 1=1"
        params: List[Any] = []
        if status:
            query += " AND LOWER(status) = LOWER(?)"
            params.append(status)
        if district and district != "All Districts":
            query += " AND LOWER(district) = LOWER(?)"
            params.append(district)
        if author_id:
            query += " AND author_id = ?"
            params.append(author_id)
        query += " ORDER BY created_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._format_row(r) for r in rows]

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM government_reports WHERE report_id = ?", (report_id,)
            ).fetchone()
            return self._format_row(row) if row else None

    def create_report(
        self,
        *,
        title: str,
        district: str,
        corridor_ids: List[str],
        report_type: str,
        author_name: str,
        author_role: str,
        author_id: str,
        budget_impact_lakh: float = 0.0,
        summary: str,
        status: str = "Submitted",
    ) -> Dict[str, Any]:
        report_id = f"REP-2026-{uuid.uuid4().hex[:6].upper()}"
        now = _utc_now_iso()
        history = [
            {
                "reviewer": author_name,
                "role": author_role,
                "action": "CREATED_AND_SUBMITTED" if status == "Submitted" else "DRAFT_SAVED",
                "notes": f"Initial report {status.lower()}.",
                "timestamp": now,
            }
        ]

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO government_reports (
                    report_id, title, district, corridor_ids, report_type,
                    author_name, author_role, author_id, budget_impact_lakh,
                    status, summary, review_history_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    title,
                    district,
                    json.dumps(corridor_ids),
                    report_type,
                    author_name,
                    author_role,
                    author_id,
                    budget_impact_lakh,
                    status,
                    summary,
                    json.dumps(history),
                    now,
                    now,
                ),
            )
        return self.get_report(report_id)

    def review_report(
        self,
        report_id: str,
        *,
        action: str,  # 'Under Review', 'Approved', 'Rejected'
        reviewer_name: str,
        reviewer_role: str,
        notes: str,
    ) -> Dict[str, Any]:
        report = self.get_report(report_id)
        if not report:
            raise KeyError(f"Report '{report_id}' not found.")

        history = report.get("review_history", [])
        now = _utc_now_iso()
        history.append({
            "reviewer": reviewer_name,
            "role": reviewer_role,
            "action": action.upper(),
            "notes": notes,
            "timestamp": now,
        })

        with self._get_conn() as conn:
            conn.execute(
                """
                UPDATE government_reports
                SET status = ?, review_history_json = ?, updated_at = ?
                WHERE report_id = ?
                """,
                (action, json.dumps(history), now, report_id),
            )
        return self.get_report(report_id)

    def get_report_stats(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            rows = conn.execute("SELECT status, budget_impact_lakh FROM government_reports").fetchall()
            total = len(rows)
            draft = sum(1 for r in rows if r["status"].lower() == "draft")
            submitted = sum(1 for r in rows if r["status"].lower() == "submitted")
            under_review = sum(1 for r in rows if r["status"].lower() == "under review")
            approved = sum(1 for r in rows if r["status"].lower() == "approved")
            rejected = sum(1 for r in rows if r["status"].lower() == "rejected")
            total_budget = sum((r["budget_impact_lakh"] or 0.0) for r in rows if r["status"].lower() == "approved")
            return {
                "total": total,
                "draft": draft,
                "submitted": submitted,
                "under_review": under_review,
                "approved": approved,
                "rejected": rejected,
                "approved_budget_lakh": round(total_budget, 2),
            }

    def _format_row(self, row: sqlite3.Row) -> Dict[str, Any]:
        try:
            corridor_ids = json.loads(row["corridor_ids"])
        except Exception:
            corridor_ids = [row["corridor_ids"]]
        try:
            review_history = json.loads(row["review_history_json"])
        except Exception:
            review_history = []

        return {
            "id": row["report_id"],
            "report_id": row["report_id"],
            "title": row["title"],
            "district": row["district"],
            "corridor_ids": corridor_ids,
            "report_type": row["report_type"],
            "author_name": row["author_name"],
            "author_role": row["author_role"],
            "author_id": row["author_id"],
            "budget_impact_lakh": row["budget_impact_lakh"],
            "status": row["status"],
            "summary": row["summary"],
            "review_history": review_history,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


_service_instance: Optional[GovernmentReportService] = None


def get_government_report_service() -> GovernmentReportService:
    global _service_instance
    if _service_instance is None:
        _service_instance = GovernmentReportService()
    return _service_instance
