"""
VanSetu GreenTech — Geospatial Raster Statistics & Point Inspection Router.
"""
from fastapi import APIRouter, Query
from app.services.raster_service import raster_service
from app.services.aqi_service import aqi_service
from app.services.corridor_service import corridor_service

router = APIRouter(prefix="/api/stats", tags=["Geospatial Statistics & Point Query"])


@router.get("")
@router.get("/summary")
def get_overall_stats():
    """
    Return raster summary statistics (including native 1km MODIS LST vs 10m Sentinel-2 NDVI
    shapes and nodata counts), AQI summary, and corridor overview.
    """
    raster_service.load_data()
    r_stats = raster_service.stats
    aqi_sum = aqi_service.get_summary()
    corridors_data = corridor_service.get_corridors()
    corridors_list = corridors_data["corridors"]

    critical_count = sum(1 for c in corridors_list if c["severity"] == "Critical Priority")
    high_count = sum(1 for c in corridors_list if c["severity"] == "High Priority")
    total_len_km = round(sum(c["length_km"] for c in corridors_list), 2)

    return {
        "raster": r_stats,
        "aqi": {
            "mean_aqi": aqi_sum["mean_aqi"],
            "mean_pm25": aqi_sum["mean_pm25"],
            "mean_pm10": aqi_sum["mean_pm10"],
            "city_category": aqi_sum["city_category"],
            "station_count": aqi_sum["station_count"],
            "is_live": aqi_sum["is_live"],
            "data_mode": aqi_sum["data_mode"],
            "provenance_disclosure": aqi_sum["provenance_disclosure"],
        },
        "corridors_overview": {
            "total_corridors": len(corridors_list),
            "total_length_km": total_len_km,
            "critical_priority_count": critical_count,
            "high_priority_count": high_count,
            "districts_covered": len(corridors_data["metadata"]["districts_available"]),
        },
    }


@router.get("/point")
def inspect_point(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in EPSG:4326"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in EPSG:4326"),
):
    """
    Sample all environmental layers at (lat, lng):
    - 10m native Sentinel-2 NDVI
    - 1,000m native MODIS LST (`lst_native_1km`)
    - 10m bilinearly interpolated display LST (`lst_display_10m`)
    - Composite GDI
    - Nearest CPCB AQI station telemetry/baseline
    """
    pt_raster = raster_service.get_values_at_point(lat, lng)
    pt_aqi = aqi_service.get_aqi_at_point(lat, lng)
    return {
        **pt_raster,
        "aqi_observation": pt_aqi,
    }
