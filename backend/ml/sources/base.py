"""
VanSetu GreenTech — Base Source Ingestion Adapter (Priority 2 Remediation).

Standardizes status reporting, provenance recording, credential checks,
and manual fallback workflows across all Delhi environmental datasets.

Status Architecture:
- NOT_CONFIGURED: No credentials or endpoints configured.
- CREDENTIALS_CONFIGURED: Credentials present but live connection not yet tested/verified.
- LIVE_CONNECTION_VERIFIED: Actual remote endpoint connection successfully established.
- LIVE_DATA_FETCHED: Actual empirical observations retrieved and validated.
- AVAILABLE_LOCAL_CACHE: Valid, uncorrupted local cached raster or vector asset present.
- INGESTION_FAILED: Attempted remote query or local read failed.
- DATA_UNAVAILABLE: Neither remote data nor local cache is available.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class IngestionStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    CREDENTIALS_CONFIGURED = "CREDENTIALS_CONFIGURED"
    LIVE_CONNECTION_VERIFIED = "LIVE_CONNECTION_VERIFIED"
    CATALOGUE_METADATA_RETRIEVED = "CATALOGUE_METADATA_RETRIEVED"
    LIVE_DATA_FETCHED = "LIVE_DATA_FETCHED"
    AVAILABLE_LOCAL_CACHE = "AVAILABLE_LOCAL_CACHE"
    INGESTION_FAILED = "INGESTION_FAILED"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


@dataclass
class SourceProvenance:
    source_name: str
    provider_agency: str
    official_portal_url: str
    license_type: str
    native_spatial_resolution: str
    native_temporal_resolution: str
    crs: str
    acquisition_period: str
    ingestion_status: IngestionStatus
    is_live_connected: bool
    is_local_cached: bool = False
    local_asset_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    last_observation_timestamp: Optional[str] = None
    missing_credentials_detail: Optional[str] = None
    manual_acquisition_procedure: Optional[str] = None
    last_verified_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BaseSourceAdapter(ABC):
    """Abstract interface for all Delhi environmental & spatial data adapters."""

    def __init__(self, source_name: str, provider: str, portal_url: str, license_type: str) -> None:
        self.source_name = source_name
        self.provider = provider
        self.portal_url = portal_url
        self.license_type = license_type

    @abstractmethod
    def check_connection(self) -> Dict[str, Any]:
        """Verify API credentials, remote endpoint connectivity, or local cache presence."""
        pass

    @abstractmethod
    def get_provenance(self) -> SourceProvenance:
        """Return standardized provenance metadata for audits and UI disclosures."""
        pass

    @abstractmethod
    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        """Retrieve actual empirical observations without inventing fake values."""
        pass
