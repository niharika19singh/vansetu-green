"""
VanSetu GreenTech — USGS Landsat Ingestion Adapter (Priority 2 Remediation).

Interfaces USGS EarthExplorer M2M API for Landsat 8/9 Collection 2 Level-2 Surface
Temperature. Documents native thermal resolution (100m TIRS resampled to 30m)
and applies rigorous status semantics.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional
import httpx

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class UsgsLandsatAdapter(BaseSourceAdapter):
    """Adapter for USGS Landsat 8/9 Collection 2 Level-2 Surface Temperature products."""

    M2M_LOGIN_URL = "https://m2m.cr.usgs.gov/api/api/json/stable/login-token"
    M2M_SEARCH_URL = "https://m2m.cr.usgs.gov/api/api/json/stable/scene-search"

    # WRS-2 coordinates for Delhi: Path 146, Row 040
    WRS_PATH = 146
    WRS_ROW = 40

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="USGS Landsat 8/9 Collection 2 Level-2 Surface Temperature (TIRS)",
            provider="United States Geological Survey (USGS) / EROS Center",
            portal_url="https://earthexplorer.usgs.gov/",
            license_type="Public Domain / USGS Open Data Policy",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.api_key = os.getenv("USGS_EROS_TOKEN", "").strip() or os.getenv("USGS_M2M_TOKEN", "").strip()

    def check_connection(self) -> Dict[str, Any]:
        has_token = bool(self.api_key)
        live_verified = False
        conn_error = None

        if has_token:
            try:
                # Test connection against M2M API
                resp = httpx.post(
                    self.M2M_LOGIN_URL,
                    json={"username": "token-user", "token": self.api_key},
                    timeout=4.0,
                )
                if resp.status_code == 200 and resp.json().get("errorCode") is None:
                    live_verified = True
                else:
                    conn_error = f"USGS M2M auth response: {resp.text[:100]}"
            except Exception as exc:
                conn_error = f"Connection error: {exc}"

        if live_verified:
            status = IngestionStatus.LIVE_CONNECTION_VERIFIED
        elif has_token and conn_error:
            status = IngestionStatus.INGESTION_FAILED
        elif has_token:
            status = IngestionStatus.CREDENTIALS_CONFIGURED
        else:
            status = IngestionStatus.NOT_CONFIGURED

        return {
            "source_name": self.source_name,
            "status": status.value,
            "live_api_configured": has_token,
            "live_connection_verified": live_verified,
            "connection_error": conn_error,
            "requires_credentials": ["USGS_EROS_TOKEN", "USGS_M2M_TOKEN"],
            "note": "Landsat Level-2 ST serves as high-resolution 100m thermal ground truth complementing 1,000m MODIS.",
            "native_thermal_resolution": "100m (TIRS) resampled to 30m grid in Collection 2",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()
        st = IngestionStatus(conn["status"])

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="100 metres native thermal TIRS (resampled to 30m grid in Collection 2)",
            native_temporal_resolution="16-day repeat (8 days combined Landsat 8 + 9)",
            crs="EPSG:32643 (UTM Zone 43N) / WGS 84",
            acquisition_period="Targeted cloud-free summer acquisitions (Path 146, Row 040)",
            ingestion_status=st,
            is_live_connected=conn["live_connection_verified"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "USGS_EROS_TOKEN not configured in environment. Landsat API queries pending manual or API setup."
            ),
            manual_acquisition_procedure=(
                "Search EarthExplorer for WRS-2 Path 146 Row 040, select Landsat 8-9 C2 L2 Surface Temperature, "
                "apply scale factor 0.00341802 and offset 149.0 to convert Band 10 DN to Kelvin."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        conn = self.check_connection()
        return {
            "available": conn["live_connection_verified"],
            "status": conn["status"],
            "message": "Live Landsat query requires verified M2M API token. Regional thermal context currently supplied via MODIS.",
            "provenance": self.get_provenance().to_dict(),
        }
