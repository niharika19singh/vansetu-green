"""
VanSetu GreenTech — Site Assessment & Suitability Label Store (Phase 4B).

Persists field survey assessments, maintains immutable audit revision histories,
and enforces data eligibility rules so unassessed or circular labels never enter ML training.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ml.labels.schema import (
    AssessmentReviewAction,
    InterventionArchetype,
    ReviewStatus,
    SiteAssessmentRecord,
    SiteAssessmentSubmission,
    SuitabilityState,
)
from ml.validation import TrainingDataEligibilityValidator


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AssessmentLabelStore:
    """Manages verified human assessment records and revision trails."""

    def __init__(self, db_path: Optional[Any] = None) -> None:
        self.db_path = Path(db_path) if db_path else (Path(__file__).parent.parent.parent / "data" / "site_assessments.sqlite")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS site_assessments (
                    assessment_id TEXT PRIMARY KEY,
                    segment_id TEXT NOT NULL,
                    corridor_id TEXT NOT NULL,
                    intervention_archetype TEXT NOT NULL,
                    suitability_state TEXT NOT NULL,
                    review_status TEXT NOT NULL,
                    reviewer_id TEXT NOT NULL,
                    reviewer_role TEXT NOT NULL,
                    evidence_reference TEXT NOT NULL,
                    survey_reference TEXT,
                    engineering_constraints TEXT,
                    reviewer_notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    schema_version TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS assessment_audit_history (
                    history_id TEXT PRIMARY KEY,
                    assessment_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    performed_by TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    previous_state TEXT,
                    new_state TEXT,
                    note TEXT,
                    FOREIGN KEY(assessment_id) REFERENCES site_assessments(assessment_id)
                );

                CREATE INDEX IF NOT EXISTS idx_assessment_segment ON site_assessments(segment_id);
                CREATE INDEX IF NOT EXISTS idx_assessment_corridor ON site_assessments(corridor_id);
                CREATE INDEX IF NOT EXISTS idx_assessment_archetype ON site_assessments(intervention_archetype);
                """
            )
            conn.commit()

    def submit_assessment(self, sub: SiteAssessmentSubmission) -> Dict[str, Any]:
        """Submit a new field assessment with strict validation."""
        val_res = TrainingDataEligibilityValidator.validate_suitability_label(sub.model_dump())
        if not val_res.is_eligible and sub.suitability_state != SuitabilityState.UNASSESSED:
            raise ValueError(f"Assessment rejected by data integrity gate: {'; '.join(val_res.reasons)}")

        now = _utc_now_iso()
        aid = f"assmnt-{uuid.uuid4().hex[:10]}"
        status = ReviewStatus.APPROVED.value if sub.reviewer_role.lower() in ("chief engineer", "municipal reviewer", "senior urban planner") else ReviewStatus.PENDING_REVIEW.value

        constraints_json = json.dumps(sub.engineering_constraints)

        with self._get_conn() as conn:
            # Check for existing assessment on same segment + archetype
            existing = conn.execute(
                "SELECT assessment_id FROM site_assessments WHERE segment_id = ? AND intervention_archetype = ?",
                (sub.segment_id, sub.intervention_archetype.value),
            ).fetchone()

            if existing:
                aid = existing["assessment_id"]
                conn.execute(
                    """
                    UPDATE site_assessments
                    SET suitability_state = ?, review_status = ?, reviewer_id = ?, reviewer_role = ?,
                        evidence_reference = ?, survey_reference = ?, engineering_constraints = ?,
                        reviewer_notes = ?, updated_at = ?
                    WHERE assessment_id = ?
                    """,
                    (
                        sub.suitability_state.value,
                        status,
                        sub.reviewer_id,
                        sub.reviewer_role,
                        sub.evidence_reference,
                        sub.survey_reference,
                        constraints_json,
                        sub.reviewer_notes,
                        now,
                        aid,
                    ),
                )
                action_name = "UPDATED"
            else:
                conn.execute(
                    """
                    INSERT INTO site_assessments (
                        assessment_id, segment_id, corridor_id, intervention_archetype,
                        suitability_state, review_status, reviewer_id, reviewer_role,
                        evidence_reference, survey_reference, engineering_constraints,
                        reviewer_notes, created_at, updated_at, schema_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        aid,
                        sub.segment_id,
                        sub.corridor_id,
                        sub.intervention_archetype.value,
                        sub.suitability_state.value,
                        status,
                        sub.reviewer_id,
                        sub.reviewer_role,
                        sub.evidence_reference,
                        sub.survey_reference,
                        constraints_json,
                        sub.reviewer_notes,
                        now,
                        now,
                        "2.0.0",
                    ),
                )
                action_name = "INITIAL_SUBMISSION"

            # Add audit entry
            hid = f"hist-{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO assessment_audit_history (
                    history_id, assessment_id, action, performed_by, timestamp,
                    previous_state, new_state, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hid,
                    aid,
                    action_name,
                    sub.reviewer_id,
                    now,
                    None,
                    sub.suitability_state.value,
                    sub.reviewer_notes or "Field assessment recorded.",
                ),
            )
            conn.commit()

        return self.get_assessment(aid)

    def review_assessment(self, act: AssessmentReviewAction) -> Dict[str, Any]:
        """Perform review action (APPROVE, REJECT, CORRECT) with audit trail."""
        now = _utc_now_iso()
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM site_assessments WHERE assessment_id = ?", (act.assessment_id,)).fetchone()
            if not row:
                raise KeyError(f"Assessment '{act.assessment_id}' not found.")

            prev_state = row["suitability_state"]
            action_upper = act.action.upper()

            if action_upper == "APPROVE":
                new_status = ReviewStatus.APPROVED.value
                new_state = prev_state
            elif action_upper == "REJECT":
                new_status = ReviewStatus.REJECTED.value
                new_state = prev_state
            elif action_upper == "CORRECT":
                if not act.corrected_suitability_state:
                    raise ValueError("corrected_suitability_state is required for CORRECT action.")
                new_status = ReviewStatus.APPROVED.value
                new_state = act.corrected_suitability_state.value
            else:
                raise ValueError(f"Unknown review action '{act.action}'. Allowed: APPROVE, REJECT, CORRECT.")

            conn.execute(
                """
                UPDATE site_assessments
                SET suitability_state = ?, review_status = ?, updated_at = ?
                WHERE assessment_id = ?
                """,
                (new_state, new_status, now, act.assessment_id),
            )

            hid = f"hist-{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO assessment_audit_history (
                    history_id, assessment_id, action, performed_by, timestamp,
                    previous_state, new_state, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (hid, act.assessment_id, action_upper, act.reviewer_id, now, prev_state, new_state, act.reviewer_note),
            )
            conn.commit()

        return self.get_assessment(act.assessment_id)

    def get_assessment(self, assessment_id: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM site_assessments WHERE assessment_id = ?", (assessment_id,)).fetchone()
            if not row:
                raise KeyError(f"Assessment '{assessment_id}' not found.")

            history = conn.execute(
                "SELECT * FROM assessment_audit_history WHERE assessment_id = ? ORDER BY timestamp ASC",
                (assessment_id,),
            ).fetchall()

            rec = dict(row)
            rec["engineering_constraints"] = json.loads(rec.get("engineering_constraints") or "[]")
            rec["audit_history"] = [dict(h) for h in history]
            return rec

    def list_assessments(
        self,
        segment_id: Optional[str] = None,
        corridor_id: Optional[str] = None,
        intervention_archetype: Optional[str] = None,
        only_approved: bool = False,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM site_assessments WHERE 1=1"
        params: List[Any] = []

        if segment_id:
            query += " AND segment_id = ?"
            params.append(segment_id)
        if corridor_id:
            query += " AND corridor_id = ?"
            params.append(corridor_id)
        if intervention_archetype:
            query += " AND intervention_archetype = ?"
            params.append(intervention_archetype)
        if only_approved:
            query += " AND review_status = 'APPROVED'"

        query += " ORDER BY updated_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["engineering_constraints"] = json.loads(d.get("engineering_constraints") or "[]")
                results.append(d)
            return results

    def get_training_eligible_labels(self) -> List[Dict[str, Any]]:
        """
        Return only verified labels eligible for supervised ML training.
        Strictly excludes UNASSESSED, REJECTED, and unverified records.
        """
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM site_assessments
                WHERE review_status = 'APPROVED'
                  AND suitability_state IN ('ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE')
                """
            ).fetchall()
            eligible = []
            for r in rows:
                d = dict(r)
                d["engineering_constraints"] = json.loads(d.get("engineering_constraints") or "[]")
                eligible.append(d)
            return eligible
