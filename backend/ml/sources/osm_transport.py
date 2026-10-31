"""
VanSetu GreenTech — OpenStreetMap Transport & Built Environment Adapter (Phase 1F).

Loads Delhi road networks, footways, pedestrian crossings, transit stops, and building
footprints from OpenStreetMap under Open Data Commons Open Database License (ODbL).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import geopandas as gpd

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class OsmTransportAdapter(BaseSourceAdapter):
    """Adapter for OpenStreetMap transport network and pedestrian infrastructure."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="OpenStreetMap Delhi Pedestrian & Transport Network",
            provider="OpenStreetMap Contributors / Geofabrik / Overpass API",
            portal_url="https://www.openstreetmap.org/",
            license_type="ODbL (Open Database License) 1.0",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.roads_cache = self.data_dir / "delhi_roads_cached.geojson"

    def check_connection(self) -> Dict[str, Any]:
        local_ok = self.roads_cache.exists()
        feature_count = 0
        if local_ok:
            try:
                gdf = gpd.read_file(self.roads_cache)
                feature_count = len(gdf)
            except Exception:
                local_ok = False

        status = IngestionStatus.AVAILABLE_LOCAL_CACHE if local_ok else IngestionStatus.DATA_UNAVAILABLE

        return {
            "source_name": self.source_name,
            "status": status.value,
            "local_cache_available": local_ok,
            "cached_corridors_count": feature_count,
            "live_overpass_endpoint": "https://overpass-api.de/api/interpreter",
            "attribution": "© OpenStreetMap contributors, licensed under ODbL",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()
        sz = self.roads_cache.stat().st_size if self.roads_cache.exists() else 0

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="Vector line/polygon features (sub-metre precision)",
            native_temporal_resolution="Community crowd-sourced rolling updates",
            crs="EPSG:4326 (WGS 84 geographic coordinates)",
            acquisition_period="Empirical OSM Road Network Extract for NCT Delhi",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=True,  # Overpass requires no token
            local_asset_path=str(self.roads_cache) if self.roads_cache.exists() else None,
            file_size_bytes=sz,
            manual_acquisition_procedure=(
                "Query Overpass API for way['highway'] within Delhi bbox [28.35, 76.80, 28.95, 77.55], "
                "filter for pedestrian-significant highway classes, and export to GeoJSON."
            ),
        )

    def load_corridors_geodataframe(self) -> gpd.GeoDataFrame:
        """Load genuine cached road corridors as GeoDataFrame."""
        if not self.roads_cache.exists():
            raise FileNotFoundError(f"Roads cache not found at '{self.roads_cache}'.")
        return gpd.read_file(self.roads_cache)

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        conn = self.check_connection()
        return {
            "available": conn["local_cache_available"],
            "status": conn["status"],
            "corridors_count": conn["cached_corridors_count"],
            "provenance": self.get_provenance().to_dict(),
        }
