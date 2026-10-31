"""
VanSetu GreenTech — ECMWF ERA5-Land Meteorological Ingestion Adapter (Phase 1D).

Interfaces Copernicus Climate Data Store (CDS) for hourly meteorological reanalysis:
2m air temperature, relative humidity, 10m wind speed, surface solar radiation, precipitation.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class Era5MeteoAdapter(BaseSourceAdapter):
    """Adapter for ECMWF ERA5 and ERA5-Land reanalysis products."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="ECMWF ERA5-Land Hourly Meteorological Reanalysis",
            provider="European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus CDS",
            portal_url="https://cds.climate.copernicus.eu/",
            license_type="Copernicus License / Open Access",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.cds_key = os.getenv("CDS_API_KEY", "")

    def check_connection(self) -> Dict[str, Any]:
        live_configured = bool(self.cds_key)
        status = IngestionStatus.CONNECTED_LIVE_API if live_configured else IngestionStatus.MISSING_CREDENTIALS

        return {
            "source_name": self.source_name,
            "status": status.value,
            "live_api_configured": live_configured,
            "requires_credentials": ["CDS_API_KEY"],
            "disclaimer": "ERA5-Land provides 9km gridded atmospheric context; it must not be misrepresented as micro-scale street canyon observations.",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="0.1° x 0.1° (~9 km horizontal grid for ERA5-Land)",
            native_temporal_resolution="Hourly meteorological observations",
            crs="EPSG:4326 (WGS 84 regular lat/lon grid)",
            acquisition_period="Continuous climate record (1950–present)",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=conn["live_api_configured"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "CDS_API_KEY not configured. Micro-meteorological contextual queries require CDS registration."
            ),
            manual_acquisition_procedure=(
                "Obtain UID and API key from https://cds.climate.copernicus.eu/, query era5-land hourly dataset "
                "for Delhi bounding box [28.35, 76.80, 28.95, 77.55], download 2m_temperature, 10m_u_component_of_wind, "
                "10m_v_component_of_wind, surface_solar_radiation_downwards."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        prov = self.get_provenance()
        if not prov.is_live_connected:
            return {
                "available": False,
                "status": IngestionStatus.MISSING_CREDENTIALS.value,
                "message": "CDS API Key required for dynamic ERA5 extraction.",
                "provenance": prov.to_dict(),
            }

        return {
            "available": True,
            "status": IngestionStatus.CONNECTED_LIVE_API.value,
            "provenance": prov.to_dict(),
        }
