"""
VanSetu — Urban Climate Action Intelligence FastAPI Application Entrypoint.

Integrates:
1. Geospatial Climate Intelligence & Tri-Vector Prioritization (Sentinel-2 10m NDVI, MODIS 1000m LST, WAQI/CPCB)
2. Deterministic MILP Budget-Constrained Climate Intervention Optimizer (`scipy.optimize.milp`)
3. YugabyteDB / Meko AI Agent Institutional Memory (`vansetu-build`, `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`)
4. Google Gemini 3.8 Flash Multi-Tool Function-Calling Agent (`google-genai`)
5. Tiger Data (TimescaleDB) Temporal Environmental Intelligence (`environmental_observations` hypertable & `corridor_daily_summary`)
6. DigitalOcean App Platform & Spaces Geospatial Asset Pipeline
7. IOMETE Climate Technology Procurement Studio ("Make Complex Tech Easy to Buy")
8. Social Equity & Anonymized Community Observations with Human Verification Gate
"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.raster_service import raster_service
from app.services.corridor_service import corridor_service
from app.services.meko_service import get_meko_service
from app.services.tiger_data_service import get_tiger_data_service
from app.services.social_equity_service import get_social_equity_service
from app.routers import (
    layers,
    tiles,
    corridors,
    interventions,
    aqi,
    stats,
    optimizer,
    meko,
    gemini_agent,
    tiger_data,
    social_equity,
    procurement,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and validate geospatial rasters, corridors, Meko memory, and Tiger Data on startup."""
    logger.info("Starting %s v%s...", settings.app_name, settings.app_version)
    raster_service.load_data()
    corridor_service._ensure_enriched_corridors()
    get_meko_service()
    get_tiger_data_service()
    get_social_equity_service()
    logger.info("Geospatial rasters, 44 NCT Delhi corridors, Meko memory, and Tiger Data initialized.")
    yield
    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "VanSetu — Urban Climate Action Intelligence Platform: Geospatial Climate Assessment, "
        "Explainable Tri-Vector Prioritization, MILP Budget Optimization, YugabyteDB/Meko "
        "Institutional Memory, Gemini 3.8 Flash Multi-Tool Agent, Tiger Data Temporal Engine, "
        "and IOMETE Climate Technology Procurement Studio."
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
app.include_router(optimizer.router)
app.include_router(meko.router)
app.include_router(gemini_agent.router)
app.include_router(tiger_data.router)
app.include_router(social_equity.router)
app.include_router(procurement.router)


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
            "optimizer_presets": "/api/optimizer/presets",
            "optimizer_run": "/api/optimizer/run",
            "meko_datapacks": "/api/meko/datapacks",
            "meko_memories": "/api/meko/memories",
            "meko_compare_on_off": "/api/meko/compare-on-off",
            "meko_check_t": "/api/meko/check-t",
            "meko_activity": "/api/meko/activity",
            "gemini_agent_tools": "/api/agent/tools",
            "gemini_agent_plan": "/api/agent/plan",
            "tiger_data_schema": "/api/temporal/schema",
            "tiger_data_trends": "/api/temporal/trends/C-14",
            "tiger_data_daily_summary": "/api/temporal/daily-summary?corridor_id=C-14&metric=lst_celsius",
            "tiger_data_monitoring": "/api/temporal/intervention-monitoring",
            "social_equity_summary": "/api/equity/summary",
            "procurement_catalog": "/api/procurement/catalog",
            "procurement_generate_rfp": "/api/procurement/generate-rfp",
        },
    }


@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    """Verify raster, corridor, Meko, Gemini, Tiger Data, and Procurement services are healthy."""
    raster_service.load_data()
    corridors_list = corridor_service._ensure_enriched_corridors()
    meko_svc = get_meko_service()
    tiger_svc = get_tiger_data_service()
    return {
        "status": "healthy",
        "version": settings.app_version,
        "raster_loaded": True,
        "ndvi_native_shape": list(raster_service.ndvi.shape),
        "lst_native_shape": list(raster_service.lst_native.shape),
        "lst_display_shape": list(raster_service.lst.shape),
        "crs_validated": str(raster_service.crs),
        "corridors_loaded": len(corridors_list),
        "integrations": {
            "meko_memory": {
                "status": "operational",
                "mcp_url": settings.meko_mcp_url,
                "live_key_configured": bool(settings.meko_api_key),
                "datapacks_count": len(meko_svc.get_datapacks_overview()),
            },
            "gemini_agent": {
                "status": "operational",
                "sdk": "google-genai",
                "model": settings.gemini_model,
                "live_key_configured": bool(settings.gemini_api_key),
                "tools_registered": 8,
            },
            "tiger_data": {
                "status": "operational",
                "hypertable": settings.tiger_data_hypertable,
                "cloud_db_connected": tiger_svc.pg_connected,
            },
            "digitalocean": {
                "app_platform_spec": ".do/app.yaml",
                "spaces_configured": bool(settings.do_spaces_endpoint and settings.do_spaces_bucket),
            },
            "iomete_procurement_studio": {
                "status": "operational",
                "equipment_categories": 6,
            },
            "social_equity": {
                "status": "operational",
                "human_verification_gate": True,
            },
        },
    }
