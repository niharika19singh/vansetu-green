"""
VanSetu GreenTech — FastAPI Application Entrypoint.

A modular geospatial climate assessment, urban corridor prioritization,
multi-scenario sensitivity analysis, and green infrastructure intervention
planning engine for NCT Delhi.
"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.raster_service import raster_service
from app.services.corridor_service import corridor_service
from app.routers import layers, tiles, corridors, interventions, aqi, stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and validate geospatial rasters and corridors on startup."""
    logger.info("Starting %s v%s...", settings.app_name, settings.app_version)
    raster_service.load_data()
    corridor_service._ensure_enriched_corridors()
    logger.info("Geospatial rasters and 44 NCT Delhi corridors loaded and verified.")
    yield
    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "VanSetu GreenTech: Geospatial Climate Assessment, Explainable Multi-Criteria "
        "Corridor Prioritization, 5-Scenario Sensitivity Analysis, and CPWD DSR 2023 "
        "Green Infrastructure Intervention Planning API."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(layers.router)
app.include_router(tiles.router)
app.include_router(corridors.router)
app.include_router(interventions.router)
app.include_router(aqi.router)
app.include_router(stats.router)


@app.get("/", tags=["System"])
def root():
    """Root API status and endpoint directory."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "theme": "GreenTech",
        "status": "operational",
        "endpoints": {
            "health": "/api/health",
            "provenance": "/api/provenance",
            "layers": "/api/layers",
            "tiles": "/api/tiles/{layer}/{z}/{x}/{y}.png",
            "corridors": "/api/corridors",
            "scenarios": "/api/corridors/scenarios",
            "sensitivity": "/api/corridors/sensitivity",
            "districts": "/api/corridors/districts",
            "raster_zones": "/api/corridors/raster-zones",
            "interventions_catalog": "/api/interventions/catalog",
            "aqi_stations": "/api/aqi/stations",
            "stats_summary": "/api/stats/summary",
            "point_inspection": "/api/stats/point?lat=28.6289&lng=77.2405",
        },
    }


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    """Verify raster and corridor services are loaded and healthy."""
    raster_service.load_data()
    corridors_list = corridor_service._ensure_enriched_corridors()
    return {
        "status": "healthy",
        "version": settings.app_version,
        "raster_loaded": True,
        "ndvi_native_shape": list(raster_service.ndvi.shape),
        "lst_native_shape": list(raster_service.lst_native.shape),
        "lst_display_shape": list(raster_service.lst.shape),
        "crs_validated": str(raster_service.crs),
        "corridors_loaded": len(corridors_list),
    }
