"""
VanSetu GreenTech — DigitalOcean Spaces Durable Model Artifact Storage Adapter.

Manages durable S3-compatible cloud storage on DigitalOcean Spaces (blr1 datacenter in Bangalore),
providing artifact uploads, downloads, remote checksum integrity verification, and safe local fallbacks.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any, Dict, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


class SpacesArtifactStore:
    """
    Adapter for durable model artifact storage on DigitalOcean Spaces.
    Falls back gracefully to local disk when object storage credentials are not provisioned.
    """

    def __init__(
        self,
        key: Optional[str] = None,
        secret: Optional[str] = None,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ) -> None:
        self.key = (key or os.getenv("DO_SPACES_KEY", "")).strip()
        self.secret = (secret or os.getenv("DO_SPACES_SECRET", "")).strip()
        self.bucket = (bucket or os.getenv("DO_SPACES_BUCKET", "")).strip()
        self.region = (region or os.getenv("DO_SPACES_REGION", "blr1")).strip()
        default_endpoint = f"https://{self.region}.digitaloceanspaces.com"
        self.endpoint_url = (endpoint_url or os.getenv("DO_SPACES_ENDPOINT_URL", default_endpoint)).strip()

    def is_configured(self) -> bool:
        """Returns True if Spaces credentials and bucket are present."""
        return bool(self.key and self.secret and self.bucket)

    def _get_s3_client(self):
        """Construct a configured S3 client for DigitalOcean Spaces."""
        return boto3.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.key,
            aws_secret_access_key=self.secret,
            config=Config(signature_version="s3v4", connect_timeout=5, read_timeout=15),
        )

    def test_storage_connection(self) -> Dict[str, Any]:
        """
        Probe Spaces endpoint connectivity.
        Reports DURABLE_MODEL_STORAGE_NOT_CONFIGURED when keys are absent.
        """
        if not self.is_configured():
            return {
                "status": "DURABLE_MODEL_STORAGE_NOT_CONFIGURED",
                "storage_provider": f"DigitalOcean Spaces ({self.region})",
                "bucket": self.bucket or None,
                "region": self.region,
                "local_fallback_active": True,
                "message": (
                    "Production durable artifact store pending: DO_SPACES_KEY or DO_SPACES_BUCKET not set. "
                    "Models currently persisted to local volume fallback."
                ),
            }

        try:
            client = self._get_s3_client()
            client.head_bucket(Bucket=self.bucket)
            return {
                "status": "DURABLE_STORAGE_CONFIGURED",
                "storage_provider": "DigitalOcean Spaces",
                "bucket": self.bucket,
                "region": self.region,
                "endpoint_url": self.endpoint_url,
                "connected": True,
                "local_fallback_active": False,
            }
        except Exception as exc:
            return {
                "status": "DURABLE_STORAGE_CONNECTION_FAILED",
                "storage_provider": "DigitalOcean Spaces",
                "bucket": self.bucket,
                "region": self.region,
                "connected": False,
                "error": f"Spaces connection probe failed: {exc}",
                "local_fallback_active": True,
            }

    def upload_artifact(
        self,
        local_path: Path,
        remote_key: str,
        expected_sha256: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload a model artifact to DigitalOcean Spaces with SHA-256 pre-verification.
        """
        if not self.is_configured():
            raise RuntimeError(
                "Cannot upload artifact to DigitalOcean Spaces: DO_SPACES_KEY or DO_SPACES_BUCKET is not configured."
            )

        local_path = Path(local_path)
        if not local_path.exists():
            raise FileNotFoundError(f"Local artifact file '{local_path}' does not exist.")

        file_bytes = local_path.read_bytes()
        actual_sha256 = hashlib.sha256(file_bytes).hexdigest()

        if expected_sha256 and actual_sha256.lower() != expected_sha256.lower():
            raise ValueError(
                f"Checksum mismatch prior to upload: calculated {actual_sha256} does not match expected {expected_sha256}."
            )

        client = self._get_s3_client()
        extra_args = {
            "Metadata": {
                "sha256": actual_sha256,
                "uploaded_at": str(os.path.getmtime(local_path)),
            }
        }

        client.upload_file(
            Filename=str(local_path),
            Bucket=self.bucket,
            Key=remote_key,
            ExtraArgs=extra_args,
        )

        remote_uri = f"s3://{self.bucket}/{remote_key}"
        return {
            "remote_uri": remote_uri,
            "bucket": self.bucket,
            "remote_key": remote_key,
            "sha256_checksum": actual_sha256,
            "file_size_bytes": len(file_bytes),
            "status": "UPLOADED_TO_SPACES",
        }

    def download_artifact(
        self,
        remote_key: str,
        local_path: Path,
        expected_sha256: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Download a model artifact from DigitalOcean Spaces and verify its SHA-256 integrity.
        """
        if not self.is_configured():
            raise RuntimeError(
                "Cannot download artifact from DigitalOcean Spaces: DO_SPACES_KEY or DO_SPACES_BUCKET is not configured."
            )

        local_path = Path(local_path)
        local_path.parent.mkdir(parents=True, exist_ok=True)

        client = self._get_s3_client()
        client.download_file(Bucket=self.bucket, Key=remote_key, Filename=str(local_path))

        file_bytes = local_path.read_bytes()
        actual_sha256 = hashlib.sha256(file_bytes).hexdigest()

        if expected_sha256 and actual_sha256.lower() != expected_sha256.lower():
            # Remove corrupted downloaded file
            if local_path.exists():
                local_path.unlink()
            raise ValueError(
                f"Integrity check failed: downloaded artifact SHA-256 ({actual_sha256}) does not match expected ({expected_sha256})."
            )

        return {
            "local_path": str(local_path),
            "remote_key": remote_key,
            "sha256_checksum": actual_sha256,
            "file_size_bytes": len(file_bytes),
            "status": "DOWNLOADED_AND_VERIFIED",
        }
