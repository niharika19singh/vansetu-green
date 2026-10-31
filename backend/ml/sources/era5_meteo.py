"""
VanSetu GreenTech — ECMWF ERA5-Land Reanalysis Ingestion Adapter (Priority 2 Remediation).

Interfaces Copernicus Climate Data Store (CDS) API for hourly surface meteorology
(2m air temperature, dewpoint, 10m wind speed, surface solar radiation).

DISCLOSURE: ERA5-Land operates at ~9 km gridded resolution. It is explicitly
flagged as regional synoptic meteorological background and is NEVER represented
as micro-scale street canyon observations.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional
import httpx

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class Era5MeteoAdapter(BaseSourceAdapter):
    """Adapter for ECMWF ERA5-Land hourly gridded surface meteorology."""

    CDS_API_URL = "https://cds.climate.copernicus.eu/api/v2"

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="ECMWF ERA5-Land Hourly Meteorological Reanalysis",
            provider="European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus CDS",
            portal_url="https://cds.climate.copernicus.eu/",
            license_type="Copernicus License / Open Access",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.cds_key = os.getenv("CDS_API_KEY", "").strip()

    def check_connection(self) -> Dict[str, Any]:
        has_key = bool(self.cds_key)
        live_verified = False
        conn_error = None

        if has_key:
            try:
                # Test connection against CDS API endpoint
                resp = httpx.get(f"{self.CDS_API_URL}/status", timeout=4.0)
                if resp.status_code in (200, 401):  # Service alive
                    live_verified = resp.status_code == 200
                else:
                    conn_error = f"CDS API HTTP {resp.status_code}"
            except Exception as exc:
                conn_error = f"Connection error: {exc}"

        if live_verified:
            status = IngestionStatus.LIVE_CONNECTION_VERIFIED
        elif has_key and conn_error:
            status = IngestionStatus.INGESTION_FAILED
        elif has_key:
            status = IngestionStatus.CREDENTIALS_CONFIGURED
        else:
            status = IngestionStatus.NOT_CONFIGURED

        return {
            "source_name": self.source_name,
            "status": status.value,
            "live_api_configured": has_key,
            "live_connection_verified": live_verified,
            "connection_error": conn_error,
            "requires_credentials": ["CDS_API_KEY"],
            "disclaimer": "ERA5-Land provides 9km gridded atmospheric context; it must not be misrepresented as micro-scale street canyon observations.",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()
        st = IngestionStatus(conn["status"])

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="0.1° x 0.1° (~9 km horizontal grid for ERA5-Land)",
            native_temporal_resolution="Hourly meteorological observations",
            crs="EPSG:4326 (WGS 84 regular lat/lon grid)",
            acquisition_period="Continuous climate record (1950–present)",
            ingestion_status=st,
            is_live_connected=conn["live_connection_verified"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "CDS_API_KEY not configured. Micro-meteorological contextual queries require CDS registration."
            ),
            manual_acquisition_procedure=(
                "Obtain UID and API key from https://cds.climate.copernicus.eu/, query era5-land hourly dataset "
                "for 2m_temperature, 10m_u_component_of_wind, 10m_v_component_of_wind over bounding box [28.9, 76.8, 28.3, 77.4]."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        conn = self.check_connection()
        return {
            "available": conn["live_connection_verified"],
            "status": conn["status"],
            "message": "ERA5-Land regional background reanalysis. Microclimate observations provided via CPCB and satellite rasters.",
            "provenance": self.get_provenance().to_dict(),
        }
