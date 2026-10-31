"""
VanSetu GreenTech — Air Quality Index (AQI) Router.
"""
from fastapi import APIRouter, Query
from app.services.aqi_service import aqi_service

router = APIRouter(prefix="/api/aqi", tags=["Air Quality Indicators"])


@router.get("/stations")
def get_aqi_stations():
    """Return CPCB monitoring stations as GeoJSON with explicit live vs historical baseline labeling."""
    return aqi_service.get_stations_geojson()


@router.get("/summary")
def get_aqi_summary():
    """Return city-wide AQI summary and station list with provenance disclosure."""
    return aqi_service.get_summary()


@router.get("/point")
def get_aqi_at_point(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in EPSG:4326"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in EPSG:4326"),
):
    """Find nearest CPCB monitoring station and return interpolated AQI + distance confidence."""
    return aqi_service.get_aqi_at_point(lat, lng)
