"""
VanSetu GreenTech — Durable Physical Evidence Storage Manager.

Manages the storage lifecycle for physical municipal evidence documents (GPR surveys,
work orders, engineering drawings) across ephemeral local volumes and durable
DigitalOcean Spaces (S3-compatible object storage).

Security & Integrity Guarantees:
1. Object keys use cryptographically random identifiers; client filenames are never used as storage keys.
2. Direct object access is private (no public ACLs).
3. Cryptographic SHA-256 pre-upload and post-retrieval verification.
4. Truthful status reporting: distinguishes between LOCAL_STORAGE_ONLY and DURABLE_STORAGE_CONFIGURED.
"""
from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path
import secrets
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from ml.training.spaces_storage import SpacesArtifactStore

logger = logging.getLogger("vansetu.evidence.storage")

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".csv",
    ".json",
}


class EvidenceStorageManager:
    """
    Storage manager for physical evidence files.
    Supports local filesystem persistence with optional transparent offloading
    to DigitalOcean Spaces for durable containerized deployments.
    """

    def __init__(
        self,
        base_dir: Optional[Path] = None,
        spaces_store: Optional[Any] = None,
    ) -> None:
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            default_data = Path(__file__).parent.parent.parent / "data" / "evidence_documents"
            self.base_dir = default_data
        self.base_dir.mkdir(parents=True, exist_ok=True)

        if spaces_store is not None:
            self.spaces_store = spaces_store
        else:
            from ml.training.spaces_storage import SpacesArtifactStore
            self.spaces_store = SpacesArtifactStore()

    def get_storage_status(self) -> Dict[str, Any]:
        """
        Truthfully reports whether durable cloud storage is configured or if
        the deployment is operating strictly on local volume storage.
        """
        if self.spaces_store.is_configured():
            probe = self.spaces_store.test_storage_connection()
            return {
                "status": probe.get("status", "DURABLE_STORAGE_CONFIGURED"),
                "storage_provider": f"DigitalOcean Spaces ({self.spaces_store.region})",
                "bucket": self.spaces_store.bucket,
                "region": self.spaces_store.region,
                "durable_cloud_storage": probe.get("connected", False),
                "spaces_configured": True,
                "local_fallback_active": probe.get("local_fallback_active", False),
                "message": (
                    "Durable object storage active on DigitalOcean Spaces."
                    if probe.get("connected")
                    else "DigitalOcean Spaces configured but connection probe failed; local volume fallback active."
                ),
            }

        return {
            "status": "LOCAL_STORAGE_ONLY",
            "storage_provider": "Local Filesystem",
            "durable_cloud_storage": False,
            "spaces_configured": False,
            "local_fallback_active": True,
            "message": (
                "Physical evidence documents are currently persisted to local container volume. "
                "Set DO_SPACES_KEY and DO_SPACES_BUCKET for durable multi-replica persistence."
            ),
        }

    def store_evidence_file(
        self,
        evidence_id: str,
        original_filename: str,
        file_bytes: bytes,
        mime_type: str,
    ) -> Dict[str, Any]:
        """
        Persist evidence file with randomized key and strict SHA-256 integrity.
        """
        sha256_checksum = hashlib.sha256(file_bytes).hexdigest()

        # Sanitize extension and construct non-colliding random key
        clean_base = os.path.basename(original_filename)
        candidate_ext = Path(clean_base).suffix.lower()
        ext = candidate_ext if candidate_ext in ALLOWED_EXTENSIONS else ".bin"
        random_suffix = secrets.token_hex(8)

        # 1. Local path
        local_filename = f"{evidence_id}_{random_suffix}{ext}"
        local_file_path = self.base_dir / local_filename
        local_file_path.write_bytes(file_bytes)

        # 2. Remote object key
        remote_object_key = f"evidence/{evidence_id}/{random_suffix}{ext}"

        storage_backend = "LOCAL"
        is_durable = False

        # 3. Offload to DigitalOcean Spaces if configured
        if self.spaces_store.is_configured():
            try:
                client = self.spaces_store._get_s3_client()
                client.upload_file(
                    Filename=str(local_file_path),
                    Bucket=self.spaces_store.bucket,
                    Key=remote_object_key,
                    ExtraArgs={
                        "ACL": "private",  # Strictly private access
                        "ContentType": mime_type,
                        "Metadata": {
                            "sha256": sha256_checksum,
                            "evidence_id": evidence_id,
                        },
                    },
                )
                storage_backend = "SPACES"
                is_durable = True
                logger.info(
                    "Evidence '%s' successfully mirrored to DigitalOcean Spaces: %s",
                    evidence_id,
                    remote_object_key,
                )
            except Exception as exc:
                logger.warning(
                    "Failed to upload evidence '%s' to Spaces; retaining local copy. Error: %s",
                    evidence_id,
                    exc,
                )
                storage_backend = "LOCAL"
                is_durable = False

        return {
            "storage_backend": storage_backend,
            "object_key": remote_object_key,
            "local_path": str(local_file_path),
            "file_size_bytes": len(file_bytes),
            "sha256_checksum": sha256_checksum,
            "is_durable": is_durable,
        }

    def retrieve_evidence_bytes(
        self,
        evidence_id: str,
        local_path: Optional[str] = None,
        object_key: Optional[str] = None,
        expected_sha256: Optional[str] = None,
    ) -> bytes:
        """
        Retrieve bytes from local path or pull from Spaces if local is absent (e.g. fresh container).
        Verifies SHA-256 before returning.
        """
        file_bytes: Optional[bytes] = None

        # 1. Try local path if present
        if local_path and Path(local_path).exists():
            file_bytes = Path(local_path).read_bytes()

        # 2. If absent and Spaces is configured, retrieve from Spaces
        if file_bytes is None and object_key and self.spaces_store.is_configured():
            tmp_local = self.base_dir / f"restored_{evidence_id}_{secrets.token_hex(4)}"
            try:
                self.spaces_store.download_artifact(
                    remote_key=object_key,
                    local_path=tmp_local,
                    expected_sha256=expected_sha256,
                )
                file_bytes = tmp_local.read_bytes()
            except Exception as exc:
                logger.error("Failed to retrieve evidence '%s' from Spaces: %s", evidence_id, exc)
                raise FileNotFoundError(
                    f"Evidence document '{evidence_id}' could not be retrieved from local storage or cloud object store."
                ) from exc

        if file_bytes is None:
            raise FileNotFoundError(f"Evidence document '{evidence_id}' file not found on disk.")

        # 3. Checksum verification
        actual_sha256 = hashlib.sha256(file_bytes).hexdigest()
        if expected_sha256 and actual_sha256.lower() != expected_sha256.lower():
            raise ValueError(
                f"Evidence file integrity compromise: SHA-256 {actual_sha256} does not match recorded checksum {expected_sha256}."
            )

        return file_bytes
