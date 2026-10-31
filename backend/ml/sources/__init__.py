"""
VanSetu GreenTech — Delhi Environmental & Spatial Data Adapters Registry (Phase 1).
"""
from typing import Any, Dict, List
from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance
from ml.sources.copernicus_sentinel2 import CopernicusSentinel2Adapter
from ml.sources.nasa_modis import NasaModisAdapter
from ml.sources.usgs_landsat import UsgsLandsatAdapter
from ml.sources.era5_meteo import Era5MeteoAdapter
from ml.sources.cpcb_airquality import CpcbAirQualityAdapter
from ml.sources.osm_transport import OsmTransportAdapter
from ml.sources.bhuvan_landuse import BhuvanLanduseAdapter
from ml.sources.delhi_administrative import DelhiAdministrativeBoundaryAdapter


def get_all_source_adapters() -> Dict[str, BaseSourceAdapter]:
    """Instantiate and return registry of all 8 standardized data adapters."""
    return {
        "sentinel2": CopernicusSentinel2Adapter(),
        "modis": NasaModisAdapter(),
        "landsat": UsgsLandsatAdapter(),
        "era5": Era5MeteoAdapter(),
        "cpcb": CpcbAirQualityAdapter(),
        "osm": OsmTransportAdapter(),
        "bhuvan": BhuvanLanduseAdapter(),
        "administrative": DelhiAdministrativeBoundaryAdapter(),
    }


def get_data_ecosystem_status() -> Dict[str, Any]:
    """Query connectivity, local cache availability, and provenance across all 8 sources."""
    adapters = get_all_source_adapters()
    statuses = {}
    for key, adapter in adapters.items():
        statuses[key] = {
            "source_name": adapter.source_name,
            "provider": adapter.provider,
            "connection": adapter.check_connection(),
            "provenance": adapter.get_provenance().to_dict(),
        }
    return {
        "sources_count": len(statuses),
        "ecosystem_status": statuses,
    }
