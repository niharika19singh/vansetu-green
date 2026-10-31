"""
VanSetu GreenTech — USGS Landsat Ingestion Adapter (Phase 1C).

Interfaces USGS EarthExplorer for Landsat 8/9 Collection 2 Level-2 Surface
Temperature. Documents native thermal resolution (100m TIRS resampled to 30m).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class UsgsLandsatAdapter(BaseSourceAdapter):
    """Adapter for USGS Landsat 8/9 Collection 2 Level-2 Surface Temperature products."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="USGS Landsat 8/9 Collection 2 Level-2 Surface Temperature (TIRS)",
            provider="United States Geological Survey (USGS) / EROS Center",
            portal_url="https://earthexplorer.usgs.gov/",
            license_type="Public Domain / USGS Open Data Policy",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.api_key = os.getenv("USGS_EROS_TOKEN", "")

    def check_connection(self) -> Dict[str, Any]:
        live_configured = bool(self.api_key)
        status = IngestionStatus.CONNECTED_LIVE_API if live_configured else IngestionStatus.MISSING_CREDENTIALS

        return {
            "source_name": self.source_name,
            "status": status.value,
            "live_api_configured": live_configured,
            "requires_credentials": ["USGS_EROS_TOKEN"],
            "note": "Landsat Level-2 ST serves as high-resolution 100m thermal ground truth complementing 1,000m MODIS.",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="100 metres native thermal TIRS (resampled to 30m grid in Collection 2)",
            native_temporal_resolution="16-day repeat (8 days combined Landsat 8 + 9)",
            crs="EPSG:32643 (UTM Zone 43N) / WGS 84",
            acquisition_period="Targeted cloud-free summer acquisitions (Path 146, Row 040)",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=conn["live_api_configured"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "USGS_EROS_TOKEN not configured in environment. Landsat API queries pending manual or API setup."
            ),
            manual_acquisition_procedure=(
                "Search EarthExplorer for WRS-2 Path 146 Row 040, select Landsat 8-9 C2 L2 Surface Temperature, "
                "download Band ST_B10 GeoTIFF, apply scale factor T = DN * 0.00341802 + 149.0 - 273.15."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        prov = self.get_provenance()
        if not prov.is_live_connected:
            return {
                "available": False,
                "status": IngestionStatus.MISSING_CREDENTIALS.value,
                "message": "USGS M2M API token required for dynamic Landsat Level-2 ordering.",
                "provenance": prov.to_dict(),
            }

        return {
            "available": True,
            "status": IngestionStatus.CONNECTED_LIVE_API.value,
            "provenance": prov.to_dict(),
        }
