"""
VanSetu GreenTech — Model Registry & Governance Manager (Phase 5C & Phase 10).

Tracks model versions, approval lifecycle (APPROVED_FOR_INFERENCE, EXPERIMENTAL, RETIRED, REJECTED),
SHA-256 artifacts integrity, durable object storage status, and zero-downtime rollback capabilities.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from ml.security.auth import AuthenticatedUser, Permission, UserRole
from ml.training.spaces_storage import SpacesArtifactStore


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ModelRegistry:
    """Manages versioned model artifacts, governance approval states, and audit trails."""

    def __init__(self, models_dir: Optional[Any] = None) -> None:
        self.models_dir = Path(models_dir) if models_dir else (Path(__file__).parent.parent.parent / "models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.history_dir = self.models_dir / "history"
        self.history_dir.mkdir(parents=True, exist_ok=True)
        self.meta_file = self.models_dir / "latest_model_metadata.json"
        self.spaces_store = SpacesArtifactStore()

    def get_latest_approved_model_metadata(self) -> Optional[Dict[str, Any]]:
        """Return metadata for currently approved model or None if no model has been approved."""
        if not self.meta_file.exists():
            return None
        try:
            data = json.loads(self.meta_file.read_text())
            if data.get("approval_status") == "APPROVED_FOR_INFERENCE":
                # Verify artifact exists and checksum matches before returning
                if self.verify_model_artifact_integrity(data):
                    return data
            return None
        except Exception:
            return None

    def get_current_metadata(self) -> Optional[Dict[str, Any]]:
        """Return current latest metadata regardless of status."""
        if not self.meta_file.exists():
            return None
        try:
            return json.loads(self.meta_file.read_text())
        except Exception:
            return None

    def verify_model_artifact_integrity(self, metadata: Dict[str, Any]) -> bool:
        """Verify the SHA-256 checksum of the model artifact matches the recorded hash."""
        filename = metadata.get("artifact_filename")
        expected_hash = metadata.get("artifact_sha256")
        if not filename or not expected_hash:
            return False

        path = self.models_dir / filename
        if not path.exists():
            return False

        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        return actual_hash.lower() == expected_hash.lower()

    def check_durable_storage_status(self) -> Dict[str, Any]:
        """
        Check DigitalOcean Spaces configuration for durable model storage.
        Reports DURABLE_MODEL_STORAGE_NOT_CONFIGURED when keys are absent.
        """
        res = self.spaces_store.test_storage_connection()
        res["local_storage_path"] = str(self.models_dir)
        return res

    def promote_model(
        self,
        model_version: str,
        reviewer: AuthenticatedUser,
        approval_note: str,
    ) -> Dict[str, Any]:
        """
        Promote an EXPERIMENTAL candidate model to APPROVED_FOR_INFERENCE.
        Requires authenticated SENIOR_REVIEWER or ADMINISTRATOR with PROMOTE_MODEL permission.
        Enforces false_eligible_rate <= 0.05 and checksum verification before activation.
        """
        if not reviewer.has_permission(Permission.PROMOTE_MODEL):
            raise PermissionError(
                f"Unauthorized: User '{reviewer.user_id}' with role '{reviewer.role.value}' "
                f"lacks PROMOTE_MODEL permission."
            )

        current = self.get_current_metadata()
        if not current or current.get("model_version") != model_version:
            # Check history
            hist_file = self.history_dir / f"metadata_{model_version}.json"
            if hist_file.exists():
                current = json.loads(hist_file.read_text())
            else:
                raise KeyError(f"Model version '{model_version}' not found in registry.")

        # Check safety metric gate: false_eligible_rate <= 0.05
        metrics = current.get("validation_metrics", {})
        fer = metrics.get("false_eligible_rate", 1.0)
        if fer > 0.05:
            raise ValueError(
                f"Promotion Rejected: Candidate model false-eligible rate ({fer:.1%}) "
                f"exceeds the 5.0% maximum safety threshold."
            )

        # Verify artifact integrity
        if not self.verify_model_artifact_integrity(current):
            raise ValueError(f"Integrity Check Failed: Artifact SHA-256 mismatch or file missing for '{model_version}'.")

        # Archive current active model if exists
        prev_meta = self.get_current_metadata()
        if prev_meta and prev_meta.get("approval_status") == "APPROVED_FOR_INFERENCE":
            prev_meta["approval_status"] = "RETIRED"
            prev_meta["retired_at"] = _utc_now_iso()
            prev_meta["retired_by"] = reviewer.user_id
            old_ver = prev_meta.get("model_version", "unknown")
            (self.history_dir / f"metadata_{old_ver}.json").write_text(json.dumps(prev_meta, indent=2))

        # Promote candidate
        current["approval_status"] = "APPROVED_FOR_INFERENCE"
        current["promoted_at"] = _utc_now_iso()
        current["promoted_by"] = reviewer.user_id
        current["reviewer_name"] = reviewer.full_name
        current["reviewer_organization"] = reviewer.organization
        current["approval_note"] = approval_note

        # If Spaces durable storage is configured, sync the artifact to object storage
        if self.spaces_store.is_configured():
            try:
                fname = current.get("artifact_filename")
                if fname:
                    art_path = self.models_dir / fname
                    if art_path.exists():
                        up = self.spaces_store.upload_artifact(
                            local_path=art_path,
                            remote_key=f"models/{model_version}/{fname}",
                            expected_sha256=current.get("artifact_sha256"),
                        )
                        current["durable_storage_uri"] = up.get("remote_uri")
            except Exception as exc:
                current["durable_storage_warning"] = f"Durable upload deferred: {exc}"

        self.meta_file.write_text(json.dumps(current, indent=2))
        (self.history_dir / f"metadata_{model_version}.json").write_text(json.dumps(current, indent=2))

        return current

    def reject_model(
        self,
        model_version: str,
        reviewer: AuthenticatedUser,
        rejection_reason: str,
    ) -> Dict[str, Any]:
        """Reject an EXPERIMENTAL candidate model."""
        if not reviewer.has_permission(Permission.PROMOTE_MODEL):
            raise PermissionError(f"Unauthorized: Lacks PROMOTE_MODEL permission.")

        current = self.get_current_metadata()
        if not current or current.get("model_version") != model_version:
            hist_file = self.history_dir / f"metadata_{model_version}.json"
            if hist_file.exists():
                current = json.loads(hist_file.read_text())
            else:
                raise KeyError(f"Model version '{model_version}' not found.")

        current["approval_status"] = "REJECTED"
        current["rejected_at"] = _utc_now_iso()
        current["rejected_by"] = reviewer.user_id
        current["rejection_reason"] = rejection_reason

        (self.history_dir / f"metadata_{model_version}.json").write_text(json.dumps(current, indent=2))
        if self.meta_file.exists():
            active = json.loads(self.meta_file.read_text())
            if active.get("model_version") == model_version:
                self.meta_file.write_text(json.dumps(current, indent=2))

        return current

    def rollback_model(
        self,
        target_version: str,
        reviewer: AuthenticatedUser,
        rollback_reason: str,
    ) -> Dict[str, Any]:
        """Roll back active inference to a previously approved model version."""
        if not reviewer.has_permission(Permission.PROMOTE_MODEL):
            raise PermissionError("Unauthorized: Lacks PROMOTE_MODEL permission.")

        target_file = self.history_dir / f"metadata_{target_version}.json"
        if not target_file.exists():
            raise KeyError(f"Target historical model version '{target_version}' not found.")

        target_meta = json.loads(target_file.read_text())
        if not self.verify_model_artifact_integrity(target_meta):
            raise ValueError(f"Integrity Check Failed: Historical artifact for '{target_version}' corrupted or missing.")

        current = self.get_current_metadata()
        if current:
            current["approval_status"] = "RETIRED"
            current["retired_at"] = _utc_now_iso()
            cur_ver = current.get("model_version", "unknown")
            (self.history_dir / f"metadata_{cur_ver}.json").write_text(json.dumps(current, indent=2))

        target_meta["approval_status"] = "APPROVED_FOR_INFERENCE"
        target_meta["rolled_back_at"] = _utc_now_iso()
        target_meta["rolled_back_by"] = reviewer.user_id
        target_meta["rollback_reason"] = rollback_reason

        self.meta_file.write_text(json.dumps(target_meta, indent=2))
        return target_meta

    def get_model_status_summary(self) -> Dict[str, Any]:
        """Expose operational ML model status for system health checks and UI disclosures."""
        durable = self.check_durable_storage_status()
        meta = self.get_latest_approved_model_metadata()

        if meta:
            return {
                "has_approved_model": True,
                "model_status": "APPROVED_FOR_INFERENCE",
                "active_model_version": meta.get("model_version"),
                "architecture": meta.get("model_architecture"),
                "trained_at": meta.get("trained_at"),
                "promoted_at": meta.get("promoted_at"),
                "promoted_by": meta.get("promoted_by"),
                "artifact_sha256": meta.get("artifact_sha256"),
                "metrics": meta.get("validation_metrics"),
                "fallback_mode": "ML_MODEL_ACTIVE_WITH_RULE_OVERRIDE",
                "durable_storage": durable,
            }

        curr = self.get_current_metadata()
        current_experimental = curr.get("model_version") if (curr and curr.get("approval_status") == "EXPERIMENTAL") else None

        return {
            "has_approved_model": False,
            "model_status": "NO_MODEL_TRAINED_YET",
            "candidate_experimental_version": current_experimental,
            "active_model_version": None,
            "reason": "Minimum human-verified label gate not yet satisfied. Zero synthetic labels rule enforced.",
            "fallback_mode": "DETERMINISTIC_RULE_BASED_ENGINE_ACTIVE",
            "durable_storage": durable,
        }
