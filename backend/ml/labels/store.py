"""
VanSetu GreenTech — Site Assessment & Suitability Label Store (Phase 4B & Remediation).

Persists field survey assessments, maintains immutable audit revision histories,
manages binary evidence document lifecycle (PDF, PNG, JPEG with magic-byte validation),
enforces strict server-side authorization, prevents self-approvals, and guarantees
that unverified or circular labels never enter supervised ML training.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from ml.labels.schema import (
    AssessmentReviewAction,
    EvidenceDocumentMetadata,
    EvidenceDocumentPublic,
    EvidenceDocumentType,
    EvidenceVerificationHistoryItem,
    EvidenceVerificationStatus,
    InterventionArchetype,
    ReviewActionType,
    ReviewStatus,
    SiteAssessmentRecord,
    SiteAssessmentSubmission,
    SuitabilityState,
)
from ml.labels.storage import EvidenceStorageManager
from ml.security.auth import AuthenticatedUser, Permission, ReviewerRole
from ml.validation import TrainingDataEligibilityValidator


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_evidence_file_bytes(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Validate magic bytes and file size for physical evidence documents.
    Accepts only authentic PDF, PNG, or JPEG files <= 10 MB.
    Returns (mime_type, sha256_checksum).
    """
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    if len(file_bytes) > MAX_SIZE:
        raise ValueError(f"Evidence file size ({len(file_bytes)} bytes) exceeds the maximum allowed limit of 10 MB.")
    if len(file_bytes) < 4:
        raise ValueError("Evidence document is empty or corrupted.")

    if file_bytes.startswith(b"%PDF-"):
        mime = "application/pdf"
    elif file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        mime = "image/png"
    elif file_bytes.startswith(b"\xff\xd8\xff"):
        mime = "image/jpeg"
    else:
        raise ValueError(
            f"Invalid file format for '{filename}': Evidence documents must be authentic PDF, PNG, or JPEG files. "
            "Magic header verification failed."
        )

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    return mime, sha256


class AssessmentLabelStore:
    """Manages verified human assessment records, evidence documents, and revision trails."""

    def __init__(self, db_path: Optional[Any] = None, data_dir: Optional[Any] = None) -> None:
        self.data_dir = Path(data_dir) if data_dir else (Path(__file__).parent.parent.parent / "data")
        self.db_path = Path(db_path) if db_path else (self.data_dir / "site_assessments.sqlite")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.evidence_dir = self.data_dir / "evidence_documents"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.storage_mgr = EvidenceStorageManager(base_dir=self.evidence_dir)
        self._valid_segment_ids: Optional[Set[str]] = None
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS evidence_documents (
                    evidence_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    mime_type TEXT NOT NULL,
                    sha256_checksum TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    uploaded_by_user_id TEXT NOT NULL,
                    uploaded_by_username TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL,
                    verification_status TEXT NOT NULL,
                    verified_by_user_id TEXT,
                    verified_at TEXT,
                    verification_notes TEXT,
                    storage_path TEXT NOT NULL,
                    storage_backend TEXT DEFAULT 'LOCAL',
                    object_key TEXT
                );

                CREATE TABLE IF NOT EXISTS evidence_verification_history (
                    history_id TEXT PRIMARY KEY,
                    evidence_id TEXT NOT NULL,
                    previous_status TEXT,
                    new_status TEXT NOT NULL,
                    reviewer_id TEXT NOT NULL,
                    reviewer_role TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    verification_notes TEXT,
                    sha256_checksum TEXT NOT NULL,
                    FOREIGN KEY(evidence_id) REFERENCES evidence_documents(evidence_id)
                );

                CREATE TABLE IF NOT EXISTS site_assessments (
                    assessment_id TEXT PRIMARY KEY,
                    segment_id TEXT NOT NULL,
                    corridor_id TEXT NOT NULL,
                    intervention_archetype TEXT NOT NULL,
                    suitability_state TEXT NOT NULL,
                    review_status TEXT NOT NULL,
                    reviewer_id TEXT NOT NULL,
                    reviewer_role TEXT NOT NULL,
                    reviewer_organization TEXT,
                    evidence_reference TEXT NOT NULL,
                    evidence_document_type TEXT NOT NULL,
                    evidence_id TEXT,
                    evidence_verification_status TEXT,
                    is_evidence_verified INTEGER NOT NULL,
                    survey_reference TEXT,
                    engineering_constraints TEXT,
                    reviewer_notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    schema_version TEXT NOT NULL,
                    FOREIGN KEY(evidence_id) REFERENCES evidence_documents(evidence_id)
                );

                CREATE TABLE IF NOT EXISTS assessment_audit_history (
                    history_id TEXT PRIMARY KEY,
                    assessment_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    performed_by TEXT NOT NULL,
                    performer_role TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    previous_state TEXT,
                    new_state TEXT,
                    previous_status TEXT,
                    new_status TEXT,
                    note TEXT,
                    evidence_reference TEXT,
                    FOREIGN KEY(assessment_id) REFERENCES site_assessments(assessment_id)
                );

                CREATE INDEX IF NOT EXISTS idx_assessment_segment ON site_assessments(segment_id);
                CREATE INDEX IF NOT EXISTS idx_assessment_corridor ON site_assessments(corridor_id);
                CREATE INDEX IF NOT EXISTS idx_assessment_archetype ON site_assessments(intervention_archetype);
                CREATE INDEX IF NOT EXISTS idx_assessment_status ON site_assessments(review_status);
                CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_documents(verification_status);
                CREATE INDEX IF NOT EXISTS idx_evidence_user ON evidence_documents(uploaded_by_user_id);
                CREATE INDEX IF NOT EXISTS idx_ev_hist_evidence_id ON evidence_verification_history(evidence_id);
                """
            )
            # Automatic schema migration for pre-existing databases
            cur = conn.execute("PRAGMA table_info(site_assessments)")
            existing_cols = {row[1] for row in cur.fetchall()}
            if "is_evidence_verified" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE site_assessments ADD COLUMN is_evidence_verified INTEGER NOT NULL DEFAULT 0")
            if "evidence_document_type" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE site_assessments ADD COLUMN evidence_document_type TEXT NOT NULL DEFAULT 'UNVERIFIED_TEXTUAL_NOTE'")
            if "reviewer_organization" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE site_assessments ADD COLUMN reviewer_organization TEXT")
            if "evidence_id" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE site_assessments ADD COLUMN evidence_id TEXT")
            if "evidence_verification_status" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE site_assessments ADD COLUMN evidence_verification_status TEXT")

            cur_ev = conn.execute("PRAGMA table_info(evidence_documents)")
            ev_cols = {row[1] for row in cur_ev.fetchall()}
            if "storage_backend" not in ev_cols and len(ev_cols) > 0:
                conn.execute("ALTER TABLE evidence_documents ADD COLUMN storage_backend TEXT DEFAULT 'LOCAL'")
            if "object_key" not in ev_cols and len(ev_cols) > 0:
                conn.execute("ALTER TABLE evidence_documents ADD COLUMN object_key TEXT")

            cur_aud = conn.execute("PRAGMA table_info(assessment_audit_history)")
            aud_cols = {row[1] for row in cur_aud.fetchall()}
            if "performer_role" not in aud_cols and len(aud_cols) > 0:
                conn.execute("ALTER TABLE assessment_audit_history ADD COLUMN performer_role TEXT NOT NULL DEFAULT 'FIELD_ASSESSOR'")
            if "previous_status" not in aud_cols and len(aud_cols) > 0:
                conn.execute("ALTER TABLE assessment_audit_history ADD COLUMN previous_status TEXT")
            if "new_status" not in aud_cols and len(aud_cols) > 0:
                conn.execute("ALTER TABLE assessment_audit_history ADD COLUMN new_status TEXT")
            if "evidence_reference" not in aud_cols and len(aud_cols) > 0:
                conn.execute("ALTER TABLE assessment_audit_history ADD COLUMN evidence_reference TEXT")
            conn.commit()

    def _load_valid_segments(self) -> Set[str]:
        if self._valid_segment_ids is not None:
            return self._valid_segment_ids

        parquet_file = self.data_dir / "features" / "delhi_segment_features.parquet"
        if parquet_file.exists():
            try:
                df = pd.read_parquet(parquet_file, columns=["segment_id"])
                self._valid_segment_ids = set(df["segment_id"].astype(str).tolist())
                return self._valid_segment_ids
            except Exception:
                pass

        self._valid_segment_ids = set()
        return self._valid_segment_ids

    def validate_segment_exists(self, segment_id: str) -> bool:
        """Validate that segment exists in the official Delhi road network."""
        valid_segs = self._load_valid_segments()
        if valid_segs:
            return segment_id in valid_segs
        return segment_id.startswith("C-") and "-S" in segment_id

    # =========================================================================
    # Evidence Document Lifecycle
    # =========================================================================

    def save_evidence_document(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: EvidenceDocumentType,
        user: AuthenticatedUser,
    ) -> Dict[str, Any]:
        """
        Save an uploaded evidence document with magic-byte validation, SHA-256 calculation,
        cryptographically randomized storage keys, and atomic metadata insertion.
        Starts in EVIDENCE_PENDING_REVIEW status.
        """
        mime_type, sha256_hash = validate_evidence_file_bytes(file_bytes, filename)
        evidence_id = f"evid-{uuid.uuid4().hex[:12]}"
        now = _utc_now_iso()

        # Sanitize display filename
        safe_name = os.path.basename(filename).replace(" ", "_")

        # Persist through EvidenceStorageManager with random key and SHA-256 integrity
        storage_receipt = self.storage_mgr.store_evidence_file(
            evidence_id=evidence_id,
            original_filename=filename,
            file_bytes=file_bytes,
            mime_type=mime_type,
        )
        target_path = storage_receipt["local_path"]
        storage_backend = storage_receipt["storage_backend"]
        object_key = storage_receipt["object_key"]

        initial_status = EvidenceVerificationStatus.EVIDENCE_PENDING_REVIEW.value
        doc_type_val = document_type.value if hasattr(document_type, "value") else str(document_type)

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO evidence_documents (
                    evidence_id, filename, file_size_bytes, mime_type, sha256_checksum,
                    document_type, uploaded_by_user_id, uploaded_by_username, uploaded_at,
                    verification_status, verified_by_user_id, verified_at, verification_notes,
                    storage_path, storage_backend, object_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)
                """,
                (
                    evidence_id,
                    safe_name,
                    len(file_bytes),
                    mime_type,
                    sha256_hash,
                    doc_type_val,
                    user.user_id,
                    user.username,
                    now,
                    initial_status,
                    str(target_path),
                    storage_backend,
                    object_key,
                ),
            )
            conn.commit()

        return self.get_evidence_document(evidence_id) or {}

    def get_evidence_document(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM evidence_documents WHERE evidence_id = ?",
                (evidence_id,),
            ).fetchone()
            if not row:
                return None
            return dict(row)

    @staticmethod
    def sanitize_evidence_metadata(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive internal filesystem storage paths before returning to clients."""
        sanitized = dict(doc)
        sanitized.pop("storage_path", None)
        sanitized.pop("local_path", None)
        sanitized["is_available"] = True
        return sanitized

    def list_evidence_documents(
        self,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM evidence_documents WHERE 1=1"
        params: List[Any] = []
        if user_id:
            query += " AND uploaded_by_user_id = ?"
            params.append(user_id)
        if status:
            query += " AND verification_status = ?"
            params.append(status)
        query += " ORDER BY uploaded_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]

    def get_evidence_document_content(self, evidence_id: str) -> Tuple[bytes, str, str]:
        """
        Retrieve raw binary evidence content with cryptographic integrity validation.
        Returns (bytes, mime_type, filename).
        """
        doc = self.get_evidence_document(evidence_id)
        if not doc:
            raise KeyError(f"Evidence document '{evidence_id}' not found.")

        file_bytes = self.storage_mgr.retrieve_evidence_bytes(
            evidence_id=evidence_id,
            local_path=doc.get("storage_path"),
            object_key=doc.get("object_key"),
            expected_sha256=doc.get("sha256_checksum"),
        )
        return file_bytes, doc["mime_type"], doc["filename"]

    def get_evidence_storage_status(self) -> Dict[str, Any]:
        """Probe storage backend status."""
        return self.storage_mgr.get_storage_status()

    def get_evidence_verification_history(self, evidence_id: str) -> List[Dict[str, Any]]:
        """Return chronological append-only audit trail for an evidence document's verification decisions."""
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT history_id, evidence_id, previous_status, new_status,
                       reviewer_id, reviewer_role, timestamp, decision,
                       verification_notes, sha256_checksum
                FROM evidence_verification_history
                WHERE evidence_id = ?
                ORDER BY timestamp ASC
                """,
                (evidence_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def verify_evidence_document(
        self,
        evidence_id: str,
        action: str,
        reviewer: AuthenticatedUser,
        notes: str,
    ) -> Dict[str, Any]:
        """
        Verify or reject an uploaded physical evidence document.
        Enforces:
        1. Reviewer must be an authenticated user session.
        2. Reviewer must have VERIFY_EVIDENCE or REVIEW_ASSESSMENT permission.
        3. Uploader cannot verify their own document (conflict of interest prevention).
        4. Append-only audit record in evidence_verification_history.
        """
        if not reviewer:
            raise PermissionError("Authentication required: Reviewer credentials required to verify evidence.")

        if not (reviewer.has_permission(Permission.VERIFY_EVIDENCE) or reviewer.has_permission(Permission.REVIEW_ASSESSMENT)):
            raise PermissionError(f"Role '{reviewer.role.value}' does not have permission to verify evidence.")

        with self._get_conn() as conn:
            doc = conn.execute(
                "SELECT * FROM evidence_documents WHERE evidence_id = ?",
                (evidence_id,),
            ).fetchone()
            if not doc:
                raise KeyError(f"Evidence document '{evidence_id}' not found.")

            if reviewer.user_id == doc["uploaded_by_user_id"]:
                raise ValueError(
                    f"Conflict of interest: User '{reviewer.user_id}' uploaded this document and cannot verify it."
                )

            act_upper = action.strip().upper()
            if act_upper in ("APPROVE", "VERIFY"):
                new_status = EvidenceVerificationStatus.EVIDENCE_VERIFIED.value
                is_verified_int = 1
            elif act_upper in ("REJECT", "DISQUALIFY"):
                new_status = EvidenceVerificationStatus.EVIDENCE_REJECTED.value
                is_verified_int = 0
            else:
                raise ValueError(f"Invalid verification action '{action}'. Must be APPROVE or REJECT.")

            now = _utc_now_iso()
            history_id = f"evhist-{uuid.uuid4().hex[:12]}"
            prev_status = doc["verification_status"]

            # 1. Append immutable audit history record
            conn.execute(
                """
                INSERT INTO evidence_verification_history (
                    history_id, evidence_id, previous_status, new_status, reviewer_id,
                    reviewer_role, timestamp, decision, verification_notes, sha256_checksum
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    history_id,
                    evidence_id,
                    prev_status,
                    new_status,
                    reviewer.user_id,
                    reviewer.role.value,
                    now,
                    act_upper,
                    notes,
                    doc["sha256_checksum"],
                ),
            )

            # 2. Update current evidence status
            conn.execute(
                """
                UPDATE evidence_documents
                SET verification_status = ?, verified_by_user_id = ?, verified_at = ?, verification_notes = ?
                WHERE evidence_id = ?
                """,
                (new_status, reviewer.user_id, now, notes, evidence_id),
            )

            # 3. Cascade verification status to all linked site assessments
            conn.execute(
                """
                UPDATE site_assessments
                SET is_evidence_verified = ?, evidence_verification_status = ?, updated_at = ?
                WHERE evidence_id = ?
                """,
                (is_verified_int, new_status, now, evidence_id),
            )
            conn.commit()

        return self.get_evidence_document(evidence_id) or {}

    # =========================================================================
    # Site Assessment Management
    # =========================================================================

    def submit_assessment(
        self,
        sub: SiteAssessmentSubmission,
        authenticated_user: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """
        Submit a new field assessment with strict server-side validation.
        Reviewer identity and role are derived strictly from authenticated user session.
        Every new submission starts as PENDING_REVIEW.
        """
        # 1. Geographic integrity: Validate segment exists in Delhi network
        if not self.validate_segment_exists(sub.segment_id):
            raise ValueError(f"Geospatial Validation Error: Segment '{sub.segment_id}' does not exist in NCT Delhi road dataset.")

        # 2. Server-side identity determination
        if authenticated_user is None:
            raise PermissionError(
                "Authentication required: Assessment submission strictly requires an authenticated municipal officer session."
            )
        if not authenticated_user.has_permission(Permission.SUBMIT_ASSESSMENT):
            raise PermissionError(
                f"User '{authenticated_user.user_id}' lacks SUBMIT_ASSESSMENT permission."
            )
        reviewer_id = authenticated_user.user_id
        reviewer_role = authenticated_user.role.value
        reviewer_org = authenticated_user.organization

        # 3. Evidence document linkage & verification status check
        evidence_id = sub.evidence_id
        is_verified_doc = False
        evidence_status = EvidenceVerificationStatus.EVIDENCE_NOT_PROVIDED.value

        if evidence_id:
            doc = self.get_evidence_document(evidence_id)
            if not doc:
                raise ValueError(f"Evidence document '{evidence_id}' does not exist.")
            evidence_status = doc["verification_status"]
            is_verified_doc = (evidence_status == EvidenceVerificationStatus.EVIDENCE_VERIFIED.value)
        else:
            # Check if an unverified text note was submitted
            if sub.evidence_document_type == EvidenceDocumentType.UNVERIFIED_TEXTUAL_NOTE:
                evidence_status = EvidenceVerificationStatus.EVIDENCE_NOT_PROVIDED.value
            else:
                evidence_status = EvidenceVerificationStatus.EVIDENCE_PENDING_REVIEW.value

        # 4. Data integrity check
        validation_payload = {
            "suitability_state": sub.suitability_state.value,
            "reviewer_id": reviewer_id,
            "reviewer_role": reviewer_role,
            "evidence_reference": sub.evidence_reference,
            "assessment_timestamp": sub.assessment_timestamp,
        }
        val_res = TrainingDataEligibilityValidator.validate_suitability_label(validation_payload)
        if not val_res.is_eligible and sub.suitability_state != SuitabilityState.UNASSESSED:
            raise ValueError(f"Assessment rejected by data integrity gate: {'; '.join(val_res.reasons)}")

        now = _utc_now_iso()
        aid = f"assmnt-{uuid.uuid4().hex[:10]}"
        initial_status = ReviewStatus.PENDING_REVIEW.value
        constraints_json = json.dumps(sub.engineering_constraints)

        with self._get_conn() as conn:
            existing = conn.execute(
                "SELECT assessment_id, suitability_state, review_status FROM site_assessments WHERE segment_id = ? AND intervention_archetype = ?",
                (sub.segment_id, sub.intervention_archetype.value),
            ).fetchone()

            if existing:
                aid = existing["assessment_id"]
                prev_state = existing["suitability_state"]
                prev_status = existing["review_status"]
                conn.execute(
                    """
                    UPDATE site_assessments
                    SET suitability_state = ?, review_status = ?, reviewer_id = ?, reviewer_role = ?,
                        reviewer_organization = ?, evidence_reference = ?, evidence_document_type = ?,
                        evidence_id = ?, evidence_verification_status = ?, is_evidence_verified = ?,
                        survey_reference = ?, engineering_constraints = ?, reviewer_notes = ?, updated_at = ?
                    WHERE assessment_id = ?
                    """,
                    (
                        sub.suitability_state.value,
                        initial_status,
                        reviewer_id,
                        reviewer_role,
                        reviewer_org,
                        sub.evidence_reference,
                        sub.evidence_document_type.value,
                        evidence_id,
                        evidence_status,
                        1 if is_verified_doc else 0,
                        sub.survey_reference,
                        constraints_json,
                        sub.reviewer_notes,
                        now,
                        aid,
                    ),
                )
                action_name = "UPDATED_SUBMISSION"
            else:
                prev_state = None
                prev_status = None
                conn.execute(
                    """
                    INSERT INTO site_assessments (
                        assessment_id, segment_id, corridor_id, intervention_archetype,
                        suitability_state, review_status, reviewer_id, reviewer_role,
                        reviewer_organization, evidence_reference, evidence_document_type,
                        evidence_id, evidence_verification_status, is_evidence_verified,
                        survey_reference, engineering_constraints, reviewer_notes,
                        created_at, updated_at, schema_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        aid,
                        sub.segment_id,
                        sub.corridor_id,
                        sub.intervention_archetype.value,
                        sub.suitability_state.value,
                        initial_status,
                        reviewer_id,
                        reviewer_role,
                        reviewer_org,
                        sub.evidence_reference,
                        sub.evidence_document_type.value,
                        evidence_id,
                        evidence_status,
                        1 if is_verified_doc else 0,
                        sub.survey_reference,
                        constraints_json,
                        sub.reviewer_notes,
                        now,
                        now,
                        "2.2.0",
                    ),
                )
                action_name = "INITIAL_SUBMISSION"

            # Add immutable audit entry
            hid = f"hist-{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO assessment_audit_history (
                    history_id, assessment_id, action, performed_by, performer_role,
                    timestamp, previous_state, new_state, previous_status, new_status,
                    note, evidence_reference
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hid,
                    aid,
                    action_name,
                    reviewer_id,
                    reviewer_role,
                    now,
                    prev_state,
                    sub.suitability_state.value,
                    prev_status,
                    initial_status,
                    f"Field inspection submitted. Supporting evidence: {sub.evidence_reference}",
                    sub.evidence_reference,
                ),
            )
            conn.commit()

        return self.get_assessment(aid)

    def review_assessment(
        self,
        action: AssessmentReviewAction,
        authenticated_reviewer: Optional[AuthenticatedUser] = None,
    ) -> Dict[str, Any]:
        """
        Execute an explicit approval, rejection, or correction operation.
        Guarantees:
        1. Reviewer identity derived from authenticated session.
        2. Assessors cannot approve their own field assessments.
        3. Immutable audit history records justification and state changes.
        """
        now = _utc_now_iso()
        if authenticated_reviewer is None:
            raise PermissionError(
                "Authentication required: Assessment review strictly requires an authenticated municipal reviewer session."
            )
        act_str = str(action.action.value if hasattr(action.action, "value") else action.action).upper()
        if act_str == "CORRECT":
            if not authenticated_reviewer.has_permission(Permission.CORRECT_ASSESSMENT):
                raise PermissionError(
                    f"Role '{authenticated_reviewer.role.value}' does not have permission to correct assessments."
                )
        else:
            if not (
                authenticated_reviewer.has_permission(Permission.REVIEW_ASSESSMENT)
                or authenticated_reviewer.has_permission(Permission.CORRECT_ASSESSMENT)
            ):
                raise PermissionError(
                    f"Role '{authenticated_reviewer.role.value}' does not have permission to review assessments."
                )
        reviewer_id = authenticated_reviewer.user_id
        reviewer_role = authenticated_reviewer.role.value

        with self._get_conn() as conn:
            current = conn.execute(
                "SELECT * FROM site_assessments WHERE assessment_id = ?",
                (action.assessment_id,),
            ).fetchone()
            if not current:
                raise KeyError(f"Site assessment '{action.assessment_id}' not found.")

            prev_state = current["suitability_state"]
            prev_status = current["review_status"]
            original_assessor = current["reviewer_id"]
            evidence_id = current["evidence_id"]

            # MANDATORY CONFLICT OF INTEREST CHECK: An assessor cannot approve or correct their own assessment
            if act_str in ("APPROVE", "CORRECT") and reviewer_id == original_assessor:
                raise ValueError(
                    f"Conflict of Interest Violation: Reviewer '{reviewer_id}' submitted this assessment "
                    "and is strictly prohibited from self-approving or self-correcting it."
                )

            # Determine new state and status
            if act_str == "APPROVE":
                new_status = ReviewStatus.APPROVED.value
                new_state = prev_state
            elif act_str == "REJECT":
                new_status = ReviewStatus.REJECTED.value
                new_state = prev_state
            elif act_str == "CORRECT":
                if not action.corrected_suitability_state:
                    raise ValueError("Correction action requires 'corrected_suitability_state'.")
                new_status = ReviewStatus.APPROVED.value
                new_state = (
                    action.corrected_suitability_state.value
                    if hasattr(action.corrected_suitability_state, "value")
                    else str(action.corrected_suitability_state)
                )
            else:
                raise ValueError(f"Invalid review action '{act_str}'. Must be APPROVE, REJECT, or CORRECT.")

            # Evidence document verification sync
            is_evidence_verified = bool(current["is_evidence_verified"])
            ev_status = current["evidence_verification_status"] or EvidenceVerificationStatus.EVIDENCE_NOT_PROVIDED.value

            if act_str in ("APPROVE", "CORRECT"):
                if evidence_id:
                    doc = self.get_evidence_document(evidence_id)
                    if doc:
                        if doc["verification_status"] == EvidenceVerificationStatus.EVIDENCE_VERIFIED.value:
                            is_evidence_verified = True
                            ev_status = EvidenceVerificationStatus.EVIDENCE_VERIFIED.value
                        elif authenticated_reviewer and authenticated_reviewer.user_id != doc["uploaded_by_user_id"]:
                            # Concurrently approve the supporting evidence document
                            self.verify_evidence_document(
                                evidence_id=evidence_id,
                                action="APPROVE",
                                reviewer=authenticated_reviewer,
                                notes=f"Approved concurrently with assessment {action.assessment_id}: {action.reviewer_note}",
                            )
                            is_evidence_verified = True
                            ev_status = EvidenceVerificationStatus.EVIDENCE_VERIFIED.value
                        else:
                            is_evidence_verified = False
                    else:
                        is_evidence_verified = False
                else:
                    is_evidence_verified = False

            # Update master record
            conn.execute(
                """
                UPDATE site_assessments
                SET review_status = ?, suitability_state = ?, is_evidence_verified = ?,
                    evidence_verification_status = ?, updated_at = ?
                WHERE assessment_id = ?
                """,
                (new_status, new_state, 1 if is_evidence_verified else 0, ev_status, now, action.assessment_id),
            )

            # Add immutable audit log
            hid = f"hist-{uuid.uuid4().hex[:10]}"
            conn.execute(
                """
                INSERT INTO assessment_audit_history (
                    history_id, assessment_id, action, performed_by, performer_role,
                    timestamp, previous_state, new_state, previous_status, new_status,
                    note, evidence_reference
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    hid,
                    action.assessment_id,
                    act_str,
                    reviewer_id,
                    reviewer_role,
                    now,
                    prev_state,
                    new_state,
                    prev_status,
                    new_status,
                    action.reviewer_note,
                    current["evidence_reference"],
                ),
            )
            conn.commit()

        return self.get_assessment(action.assessment_id)

    def get_assessment(self, assessment_id: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM site_assessments WHERE assessment_id = ?",
                (assessment_id,),
            ).fetchone()
            if not row:
                raise KeyError(f"Assessment '{assessment_id}' not found.")

            history = conn.execute(
                "SELECT * FROM assessment_audit_history WHERE assessment_id = ? ORDER BY timestamp ASC",
                (assessment_id,),
            ).fetchall()

            res = dict(row)
            res["engineering_constraints"] = json.loads(res["engineering_constraints"] or "[]")
            res["is_evidence_verified"] = bool(res["is_evidence_verified"])
            res["audit_history"] = [dict(h) for h in history]
            res["audit_history_count"] = len(history)
            res["last_reviewed_by"] = history[-1]["performed_by"] if history else None
            return res

    def list_assessments(
        self,
        segment_id: Optional[str] = None,
        corridor_id: Optional[str] = None,
        only_approved: bool = False,
    ) -> List[Dict[str, Any]]:
        query = "SELECT assessment_id FROM site_assessments WHERE 1=1"
        params: List[Any] = []

        if segment_id:
            query += " AND segment_id = ?"
            params.append(segment_id)
        if corridor_id:
            query += " AND corridor_id = ?"
            params.append(corridor_id)
        if only_approved:
            query += " AND review_status = 'APPROVED'"

        query += " ORDER BY updated_at DESC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()

        return [self.get_assessment(r["assessment_id"]) for r in rows]

    def get_training_eligible_labels(self) -> List[Dict[str, Any]]:
        """
        Retrieve strictly verified ground-truth labels for supervised ML training.
        Guarantees:
        1. review_status == 'APPROVED'
        2. suitability_state in ('ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE')
        3. UNASSESSED is strictly excluded.
        4. is_evidence_verified == 1 (backed by verifiable official document).
        5. evidence_id exists and references an active record in evidence_documents.
        6. Document status is EVIDENCE_VERIFIED.
        7. The file exists on disk and its SHA-256 matches the stored checksum.
        """
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT a.assessment_id, a.segment_id, a.corridor_id, a.intervention_archetype,
                       a.suitability_state, a.reviewer_id, a.reviewer_role, a.evidence_reference,
                       a.evidence_id, a.is_evidence_verified, a.updated_at,
                       e.storage_path, e.sha256_checksum, e.verification_status
                FROM site_assessments a
                LEFT JOIN evidence_documents e ON a.evidence_id = e.evidence_id
                WHERE a.review_status = 'APPROVED'
                  AND a.suitability_state IN ('ELIGIBLE', 'CONDITIONAL', 'INELIGIBLE')
                  AND a.is_evidence_verified = 1
                  AND a.evidence_id IS NOT NULL
                  AND e.verification_status = 'EVIDENCE_VERIFIED'
                ORDER BY a.updated_at ASC
                """
            ).fetchall()

        eligible: List[Dict[str, Any]] = []
        for r in rows:
            rec = dict(r)
            path_str = rec.get("storage_path")
            expected_sha = rec.get("sha256_checksum")
            if not path_str or not expected_sha:
                continue

            file_path = Path(path_str)
            if not file_path.exists():
                # Document file missing on disk — disqualify
                continue

            try:
                actual_sha = hashlib.sha256(file_path.read_bytes()).hexdigest()
                if actual_sha.lower() != expected_sha.lower():
                    # Checksum mismatch / corrupted file — disqualify
                    continue
            except Exception:
                continue

            eligible.append(rec)

        return eligible
