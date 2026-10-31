"""
VanSetu GreenTech — Intervention Outcome Store & Readiness Evaluator (Phase 8B).

Collects empirical field outcome telemetry, tracks matched control segments,
and enforces zero-synthetic-training policy for causal outcome learning.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from ml.outcome.outcome_schema import DeploymentOutcomeObservation, OutcomeLearningReadinessReport
from ml.security.auth import AuthenticatedUser, Permission


class OutcomeObservationStore:
    """Manages empirical pre/post intervention deployment observations."""

    def __init__(self, db_path: Optional[Any] = None) -> None:
        self.db_path = Path(db_path) if db_path else (Path(__file__).parent.parent.parent / "data" / "outcome_monitoring.sqlite")
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
                CREATE TABLE IF NOT EXISTS intervention_outcome_observations (
                    observation_id TEXT PRIMARY KEY,
                    deployment_id TEXT NOT NULL,
                    segment_id TEXT NOT NULL,
                    intervention_archetype TEXT NOT NULL,
                    installation_date TEXT NOT NULL,
                    observation_date TEXT NOT NULL,
                    is_post_intervention INTEGER NOT NULL,
                    metric_type TEXT NOT NULL,
                    measured_value REAL NOT NULL,
                    measurement_unit TEXT NOT NULL,
                    measurement_method TEXT NOT NULL,
                    instrument_details TEXT,
                    matched_control_segment_id TEXT,
                    control_measured_value REAL,
                    weather_confounder_notes TEXT,
                    evidence_document_ref TEXT,
                    evidence_document_type TEXT,
                    recorder_id TEXT NOT NULL,
                    verification_status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_outcome_segment ON intervention_outcome_observations(segment_id);
                CREATE INDEX IF NOT EXISTS idx_outcome_deployment ON intervention_outcome_observations(deployment_id);
                """
            )
            # Automatic schema migration for pre-existing databases
            cur_out = conn.execute("PRAGMA table_info(intervention_outcome_observations)")
            out_cols = {row[1] for row in cur_out.fetchall()}
            if "evidence_document_ref" not in out_cols and len(out_cols) > 0:
                conn.execute("ALTER TABLE intervention_outcome_observations ADD COLUMN evidence_document_ref TEXT")
            if "evidence_document_type" not in out_cols and len(out_cols) > 0:
                conn.execute("ALTER TABLE intervention_outcome_observations ADD COLUMN evidence_document_type TEXT")
            if "recorder_id" not in out_cols and len(out_cols) > 0:
                conn.execute("ALTER TABLE intervention_outcome_observations ADD COLUMN recorder_id TEXT NOT NULL DEFAULT 'system'")
            conn.commit()

    def record_outcome_observation(
        self,
        obs: DeploymentOutcomeObservation,
        authenticated_user: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """
        Record an empirical outcome measurement with server-side identity injection and anti-contamination validation.
        """
        if obs.verification_status.upper() in ("SYNTHETIC", "SIMULATED", "FIXTURE"):
            raise ValueError(
                "Data Contamination Rejection: Synthetic outcome records cannot be stored in empirical outcome registry."
            )

        recorder_id = obs.recorder_id or "unauthenticated_field_user"
        if authenticated_user is not None:
            if not authenticated_user.has_permission(Permission.SUBMIT_OUTCOME):
                raise PermissionError(
                    f"User '{authenticated_user.user_id}' lacks SUBMIT_OUTCOME permission."
                )
            recorder_id = authenticated_user.user_id

        # Verification requires a document reference
        v_status = obs.verification_status
        if not obs.evidence_document_ref and v_status == "EMPIRICAL_VERIFIED":
            v_status = "PENDING_AUDIT"

        oid = f"out-{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()

        with self._get_conn() as conn:
            cur_out = conn.execute("PRAGMA table_info(intervention_outcome_observations)")
            cols = {row[1] for row in cur_out.fetchall()}

            if "reviewer_id" in cols:
                conn.execute(
                    """
                    INSERT INTO intervention_outcome_observations (
                        observation_id, deployment_id, segment_id, intervention_archetype,
                        installation_date, observation_date, is_post_intervention,
                        metric_type, measured_value, measurement_unit, measurement_method,
                        instrument_details, matched_control_segment_id, control_measured_value,
                        weather_confounder_notes, evidence_document_ref, evidence_document_type,
                        recorder_id, reviewer_id, verification_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        oid,
                        obs.deployment_id,
                        obs.segment_id,
                        obs.intervention_archetype,
                        obs.installation_date,
                        obs.observation_date,
                        1 if obs.is_post_intervention else 0,
                        obs.metric_type.value,
                        float(obs.measured_value),
                        obs.measurement_unit,
                        obs.measurement_method,
                        obs.instrument_details,
                        obs.matched_control_segment_id,
                        obs.control_measured_value,
                        obs.weather_confounder_notes,
                        obs.evidence_document_ref,
                        obs.evidence_document_type,
                        recorder_id,
                        recorder_id,
                        v_status,
                        now,
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO intervention_outcome_observations (
                        observation_id, deployment_id, segment_id, intervention_archetype,
                        installation_date, observation_date, is_post_intervention,
                        metric_type, measured_value, measurement_unit, measurement_method,
                        instrument_details, matched_control_segment_id, control_measured_value,
                        weather_confounder_notes, evidence_document_ref, evidence_document_type,
                        recorder_id, verification_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        oid,
                        obs.deployment_id,
                        obs.segment_id,
                        obs.intervention_archetype,
                        obs.installation_date,
                        obs.observation_date,
                        1 if obs.is_post_intervention else 0,
                        obs.metric_type.value,
                        float(obs.measured_value),
                        obs.measurement_unit,
                        obs.measurement_method,
                        obs.instrument_details,
                        obs.matched_control_segment_id,
                        obs.control_measured_value,
                        obs.weather_confounder_notes,
                        obs.evidence_document_ref,
                        obs.evidence_document_type,
                        recorder_id,
                        v_status,
                        now,
                    ),
                )
            conn.commit()

        return self.get_observation(oid)

    def get_observation(self, observation_id: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM intervention_outcome_observations WHERE observation_id = ?",
                (observation_id,),
            ).fetchone()
            if not row:
                raise KeyError(f"Outcome observation '{observation_id}' not found.")
            return dict(row)

    def get_readiness_report(self) -> OutcomeLearningReadinessReport:
        """
        Evaluate whether sufficient verified empirical post-intervention deployments exist
        to train a difference-in-differences outcome model without inventing results.
        """
        with self._get_conn() as conn:
            total_deps = conn.execute(
                "SELECT count(DISTINCT deployment_id) FROM intervention_outcome_observations WHERE verification_status = 'EMPIRICAL_VERIFIED'"
            ).fetchone()[0]

            post_deps = conn.execute(
                "SELECT count(DISTINCT deployment_id) FROM intervention_outcome_observations WHERE verification_status = 'EMPIRICAL_VERIFIED' AND is_post_intervention = 1"
            ).fetchone()[0]

            matched_controls = conn.execute(
                "SELECT count(DISTINCT deployment_id) FROM intervention_outcome_observations WHERE matched_control_segment_id IS NOT NULL AND is_post_intervention = 1"
            ).fetchone()[0]

        is_trainable = (total_deps >= 30) and (post_deps >= 20) and (matched_controls >= 15)

        return OutcomeLearningReadinessReport(
            is_outcome_model_trainable=is_trainable,
            status_code="OUTCOME_MODEL_APPROVED_FOR_TRAINING" if is_trainable else "OUTCOME_MONITORING_DATA_COLLECTION_ONLY",
            total_verified_deployments=total_deps,
            deployments_with_post_data=post_deps,
            matched_control_pairs_count=matched_controls,
        )
