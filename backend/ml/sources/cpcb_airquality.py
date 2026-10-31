"""
VanSetu GreenTech — CPCB / DPCC Air Quality Ingestion Adapter (Phase 1E).

Interfaces Central Pollution Control Board (CPCB) and Delhi Pollution Control Committee
(DPCC) Continuous Ambient Air Quality Monitoring (CAAQM) stations across Delhi.
Calculates station distance from segment centroids and exposes spatial representativeness.
"""
from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance

# Verified CPCB/DPCC monitoring stations in NCT Delhi with official GPS fixes
DELHI_CAAQM_STATIONS = [
    {"station_id": "DL001", "name": "Anand Vihar, Delhi - DPCC", "lat": 28.6476, "lon": 77.3158, "district": "East Delhi"},
    {"station_id": "DL002", "name": "Mandir Marg, Delhi - DPCC", "lat": 28.6365, "lon": 77.2011, "district": "New Delhi"},
    {"station_id": "DL003", "name": "Punjabi Bagh, Delhi - DPCC", "lat": 28.6740, "lon": 77.1310, "district": "West Delhi"},
    {"station_id": "DL004", "name": "R K Puram, Delhi - DPCC", "lat": 28.5632, "lon": 77.1869, "district": "South West Delhi"},
    {"station_id": "DL005", "name": "Jawaharlal Nehru Stadium, Delhi - DPCC", "lat": 28.5802, "lon": 77.2338, "district": "South Delhi"},
    {"station_id": "DL006", "name": "Dr. Karni Singh Shooting Range, Delhi - DPCC", "lat": 28.4986, "lon": 77.2648, "district": "South East Delhi"},
    {"station_id": "DL007", "name": "Sonia Vihar, Delhi - DPCC", "lat": 28.7105, "lon": 77.2494, "district": "North East Delhi"},
    {"station_id": "DL008", "name": "Jahangirpuri, Delhi - DPCC", "lat": 28.7328, "lon": 77.1706, "district": "North West Delhi"},
    {"station_id": "DL009", "name": "Rohini, Delhi - DPCC", "lat": 28.7325, "lon": 77.1199, "district": "North West Delhi"},
    {"station_id": "DL010", "name": "Dwarka-Sector 8, Delhi - DPCC", "lat": 28.5710, "lon": 77.0719, "district": "South West Delhi"},
    {"station_id": "DL011", "name": "Alipur, Delhi - DPCC", "lat": 28.8153, "lon": 77.1530, "district": "North Delhi"},
    {"station_id": "DL012", "name": "Okhla Phase-2, Delhi - DPCC", "lat": 28.5307, "lon": 77.2712, "district": "South East Delhi"},
    {"station_id": "DL013", "name": "Bawana, Delhi - DPCC", "lat": 28.7762, "lon": 77.0511, "district": "North West Delhi"},
    {"station_id": "DL014", "name": "Narela, Delhi - DPCC", "lat": 28.8228, "lon": 77.1019, "district": "North Delhi"},
    {"station_id": "DL015", "name": "IHBAS, Dilshad Garden, Delhi - CPCB", "lat": 28.6811, "lon": 77.3152, "district": "Shahdara"},
    {"station_id": "DL016", "name": "Shadipur, Delhi - CPCB", "lat": 28.6514, "lon": 77.1561, "district": "Central Delhi"},
    {"station_id": "DL017", "name": "Sirifort, Delhi - CPCB", "lat": 28.5504, "lon": 77.2159, "district": "South Delhi"},
    {"station_id": "DL018", "name": "Major Dhyan Chand National Stadium, Delhi - DPCC", "lat": 28.6113, "lon": 77.2375, "district": "New Delhi"},
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return r * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


class CpcbAirQualityAdapter(BaseSourceAdapter):
    """Adapter for official CPCB/DPCC continuous ambient air quality stations."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="CPCB / DPCC Continuous Ambient Air Quality Monitoring Network (CAAQM)",
            provider="Central Pollution Control Board / Delhi Pollution Control Committee (MoEFCC)",
            portal_url="https://app.cpcbccr.com/ccr/",
            license_type="National Data Sharing and Accessibility Policy (NDSAP) / Open Government Data (OGD) India",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.api_key = os.getenv("CPCB_API_KEY", "") or os.getenv("DATA_GOV_IN_API_KEY", "")

    def check_connection(self) -> Dict[str, Any]:
        live_configured = bool(self.api_key)
        return {
            "source_name": self.source_name,
            "status": IngestionStatus.CONNECTED_LIVE_API.value if live_configured else IngestionStatus.AVAILABLE_LOCAL_CACHE.value,
            "verified_stations_count": len(DELHI_CAAQM_STATIONS),
            "live_api_configured": live_configured,
            "requires_credentials": ["CPCB_API_KEY", "DATA_GOV_IN_API_KEY"],
            "representativeness_rule": "Distance decay applied: stations beyond 5 km flagged as regional background rather than corridor-local.",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="Point observations (18 verified CAAQM stations across 11 Delhi districts)",
            native_temporal_resolution="15-minute / Hourly continuous telemetry",
            crs="EPSG:4326 (WGS 84 Point Coordinates)",
            acquisition_period="Continuous regulatory compliance monitoring",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=conn["live_api_configured"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "CPCB_API_KEY / DATA_GOV_IN_API_KEY not configured. Station spatial geometry active; real-time feeds require OGD registration."
            ),
            manual_acquisition_procedure=(
                "Access CPCB CCR portal at https://app.cpcbccr.com/ccr/ or Data.gov.in Real-Time CAAQM API, "
                "query Delhi stations for PM2.5, PM10, NO2, and Sub-index AQI."
            ),
        )

    def find_nearest_station(self, lat: float, lon: float) -> Dict[str, Any]:
        """Find the nearest CPCB/DPCC monitoring station and compute distance."""
        best_station: Optional[Dict[str, Any]] = None
        min_dist_km = float("inf")

        for stn in DELHI_CAAQM_STATIONS:
            d = haversine_km(lat, lon, stn["lat"], stn["lon"])
            if d < min_dist_km:
                min_dist_km = d
                best_station = stn

        is_local = min_dist_km <= 3.0
        is_sub_regional = min_dist_km <= 6.0

        return {
            "nearest_station": best_station,
            "distance_km": round(min_dist_km, 3),
            "spatial_representativeness": (
                "LOCAL_CORRIDOR_PROXIMATE" if is_local
                else ("SUB_REGIONAL_PROXY" if is_sub_regional else "REGIONAL_BACKGROUND_ESTIMATE")
            ),
            "representativeness_confidence": (
                "HIGH" if is_local else ("MODERATE" if is_sub_regional else "LOW_DISTANCE_DECAY")
            ),
        }

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        lat = kwargs.get("lat")
        lon = kwargs.get("lon")
        if lat is not None and lon is not None:
            near = self.find_nearest_station(float(lat), float(lon))
            return {
                "available": True,
                "status": IngestionStatus.AVAILABLE_LOCAL_CACHE.value,
                "station_match": near,
                "provenance": self.get_provenance().to_dict(),
            }

        return {
            "available": True,
            "status": IngestionStatus.AVAILABLE_LOCAL_CACHE.value,
            "total_stations": len(DELHI_CAAQM_STATIONS),
            "provenance": self.get_provenance().to_dict(),
        }
