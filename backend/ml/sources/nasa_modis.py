"""
VanSetu GreenTech — NASA MODIS LST Ingestion Adapter (Phase 1B).

Interfaces NASA LAADS DAAC for MOD11A2 / MOD11A1 Land Surface Temperature
products. Strictly maintains 1,000m native coarse resolution transparency.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional
import rasterio

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class NasaModisAdapter(BaseSourceAdapter):
    """Adapter for NASA MODIS Land Surface Temperature products (Terra/Aqua MOD11A2)."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="NASA Terra/Aqua MODIS Land Surface Temperature (MOD11A2 / MOD11A1)",
            provider="NASA Earth Observing System / LAADS DAAC",
            portal_url="https://ladsweb.modaps.eosdis.nasa.gov/",
            license_type="Public Domain / NASA Open Data Policy",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.local_file = self.data_dir / "delhi_lst_modis_daily_celsius.tif"
        self.token = os.getenv("NASA_EARTHDATA_TOKEN", "")

    def check_connection(self) -> Dict[str, Any]:
        local_ok = False
        local_details: Dict[str, Any] = {}

        if self.local_file.exists():
            try:
                sz = self.local_file.stat().st_size
                with rasterio.open(self.local_file) as src:
                    local_ok = True
                    local_details = {
                        "path": str(self.local_file),
                        "size_bytes": sz,
                        "crs": str(src.crs),
                        "width": src.width,
                        "height": src.height,
                        "res": list(src.res),
                        "bounds": list(src.bounds),
                    }
            except Exception as exc:
                local_details = {"error": f"Failed to open raster: {exc}"}

        live_configured = bool(self.token)

        if local_ok and live_configured:
            status = IngestionStatus.CONNECTED_LIVE_API
        elif local_ok:
            status = IngestionStatus.AVAILABLE_LOCAL_CACHE
        elif live_configured:
            status = IngestionStatus.CONNECTED_LIVE_API
        else:
            status = IngestionStatus.MISSING_CREDENTIALS

        return {
            "source_name": self.source_name,
            "status": status.value,
            "local_cache_available": local_ok,
            "local_cache_details": local_details,
            "live_api_configured": live_configured,
            "requires_credentials": ["NASA_EARTHDATA_TOKEN"],
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()
        size_bytes = conn.get("local_cache_details", {}).get("size_bytes")

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="1,000 metres (1 km native sinusoidal / resampled grid)",
            native_temporal_resolution="Daily (MOD11A1) / 8-day composite (MOD11A2)",
            crs="EPSG:4326 (WGS 84)",
            acquisition_period="Empirical Pre-Monsoon Peak Daily LST (Terra/Aqua Daytime)",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=conn["live_api_configured"],
            local_asset_path=str(self.local_file) if self.local_file.exists() else None,
            file_size_bytes=size_bytes,
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "NASA_EARTHDATA_TOKEN not configured. Serving verified local 1km MODIS LST raster."
            ),
            manual_acquisition_procedure=(
                "Obtain bearer token from https://urs.earthdata.nasa.gov/, search LAADS DAAC for tile h24v06, "
                "download MOD11A2 LST_Day_1km, multiply by 0.02 and subtract 273.15 to convert to Celsius."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        if not self.local_file.exists():
            return {
                "available": False,
                "status": IngestionStatus.DATA_UNAVAILABLE.value,
                "message": "MODIS LST local raster missing and NASA token unconfigured.",
            }

        prov = self.get_provenance()
        return {
            "available": True,
            "status": prov.ingestion_status.value,
            "raster_path": str(self.local_file),
            "provenance": prov.to_dict(),
        }
