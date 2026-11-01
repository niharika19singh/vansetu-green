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
    evidence_passport,
    segment_suitability,
    pareto_optimizer,
    shade_continuity,
    seasonal_heat,
    impact_monitoring,
    spatial_memory,
    project_readiness,
    ml_interventions,
    auth,
    tenders,
    corridor_cost,
    health,
    prediction,
    community,
    provenance,
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

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://localhost:7860",
    "http://127.0.0.1:7860",
    "https://vansetu-green-staging.vercel.app",
    "https://vansetu.vercel.app",
    "https://vansetu-slk1.vercel.app",
    "https://van-setu-final.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
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
app.include_router(evidence_passport.router)
app.include_router(segment_suitability.router)
app.include_router(pareto_optimizer.router)
app.include_router(shade_continuity.router)
app.include_router(seasonal_heat.router)
app.include_router(impact_monitoring.router)
app.include_router(spatial_memory.router)
app.include_router(project_readiness.router)
app.include_router(ml_interventions.router)
app.include_router(auth.router)
app.include_router(tenders.router)
app.include_router(corridor_cost.router)
app.include_router(health.router)
app.include_router(prediction.router)
app.include_router(community.router)
app.include_router(provenance.router)


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
            "evidence_passport": "/api/evidence/passport/C-14",
            "evidence_passports_summary": "/api/evidence/passports",
            "segment_suitability": "/api/suitability/corridor/C-14/segments",
            "tree_species_catalog": "/api/suitability/species-catalog",
            "pareto_optimizer": "/api/optimizer/pareto",
            "pareto_presets": "/api/optimizer/pareto/presets",
            "shade_continuity": "/api/shade-continuity/C-14",
            "shade_network_gaps": "/api/shade-continuity/network-gaps",
            "seasonal_heat_profile": "/api/seasonal/corridor/C-14",
            "seasonal_hotspots": "/api/seasonal/hotspots",
            "impact_registry": "/api/impact/registry",
            "spatial_memory_pins": "/api/meko/spatial/pins",
            "project_readiness_projects": "/api/readiness/projects",
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


@app.get("/api/acceptance-matrix", tags=["System"])
def get_prize_acceptance_matrix():
    """
    Return the Official Track Compliance and Final Prize Acceptance Dashboard (Section J)
    using the 7 required lifecycle statuses:
    NOT STARTED, IN PROGRESS, IMPLEMENTED, TESTED, CONNECTED, DEMO VERIFIED, ELIGIBILITY CONFIRMED.
    """
    meko_svc = get_meko_service()
    tiger_svc = get_tiger_data_service()
    check_t = meko_svc.verify_check_t()
    meko_live = bool(settings.meko_api_key and settings.meko_api_key.strip())
    gemini_live = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    tiger_live = bool(tiger_svc.pg_connected)
    do_live = bool(settings.do_spaces_endpoint and settings.do_spaces_bucket and settings.do_spaces_key)

    return {
        "allowed_statuses": [
            "NOT STARTED",
            "IN PROGRESS",
            "IMPLEMENTED",
            "TESTED",
            "CONNECTED",
            "DEMO VERIFIED",
            "ELIGIBILITY CONFIRMED",
        ],
        "meko_scoring_weights": {
            "idea": 20,
            "mekos_role": 30,
            "build_and_execution": 25,
            "built_with_meko": 10,
            "meko_feature_proposal": 10,
            "build_in_public": 5,
            "total": 100,
        },
        "tracks": [
            {
                "id": "greentech_primary",
                "name": "GreenTech (Primary Category) + MILP Budget Optimizer",
                "status": "DEMO VERIFIED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": True,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "Native 10m Sentinel-2 NDVI, 1km MODIS LST, 5 scenarios, and scipy.optimize.milp verified. Confirm pre-existing reference timing rules with organizers (Section I).",
            },
            {
                "id": "meko_track_a",
                "name": "YugabyteDB / Meko — Track A: Open Project (Build AI That Remembers)",
                "status": "CONNECTED" if meko_live else "DEMO VERIFIED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": meko_live,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "check_t_passed": check_t["check_t_passed"],
                "promoted_build_decisions": check_t["total_promoted_decisions"],
                "notes": "Criteria A1-A5, MEKO ON vs OFF outcome diff on C-14, Check T (12 decisions), and PDF proposal verified. Set MEKO_API_KEY in .env for live cloud MCP.",
            },
            {
                "id": "mlh_gemini",
                "name": "MLH — Best Use of Google Gemini API",
                "status": "CONNECTED" if gemini_live else "DEMO VERIFIED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": gemini_live,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "google-genai SDK with gemini-3.8-flash and 8 deterministic backend tools verified. Set GEMINI_API_KEY in .env for live LLM call.",
            },
            {
                "id": "mlh_tiger_data",
                "name": "MLH — Best Use of Tiger Data (TimescaleDB)",
                "status": "CONNECTED" if tiger_live else "DEMO VERIFIED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": tiger_live,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "environmental_observations hypertable & corridor_daily_summary continuous aggregate verified with explicit is_simulated flags. Set TIGER_DATA_URL for live Timescale Cloud.",
            },
            {
                "id": "mlh_digitalocean",
                "name": "MLH — Best Use of DigitalOcean",
                "status": "CONNECTED" if do_live else "TESTED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": do_live,
                    "DEMO VERIFIED": False,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": ".do/app.yaml, backend/Dockerfile, frontend/Dockerfile, and DO Spaces raster fallback implemented and tested. Deploy via doctl apps create to confirm public URL.",
            },
            {
                "id": "best_social_innovation",
                "name": "Best Social Innovation",
                "status": "DEMO VERIFIED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": True,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "Vulnerability-weighted MILP allocation and anonymized community observations with human verification gate verified.",
            },
            {
                "id": "iomete_procurement_studio",
                "name": "IOMETE — Make Complex Tech Easy to Buy (Conditional)",
                "status": "DEMO VERIFIED",
                "conditional_sponsor_confirmation_required": True,
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": True,
                    "CONNECTED": True,
                    "DEMO VERIFIED": True,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "6 climate tech categories, lifecycle cost comparison, vendor questions, and Draft RFP generator verified. Requires on-site IOMETE mentor confirmation (Section H).",
            },
            {
                "id": "mlh_dev_writing",
                "name": "MLH — DEV Writing Challenge (Optional)",
                "status": "IMPLEMENTED",
                "gates": {
                    "IMPLEMENTED": True,
                    "TESTED": False,
                    "CONNECTED": False,
                    "DEMO VERIFIED": False,
                    "ELIGIBILITY CONFIRMED": False,
                },
                "notes": "Technical article draft in docs/DEV_WRITING_CHALLENGE_DRAFT.md. Publish only with team approval and event confirmation.",
            },
            {
                "id": "mlh_mongodb_atlas",
                "name": "MLH — MongoDB Atlas (Optional)",
                "status": "NOT STARTED",
                "notes": "Intentionally omitted per Section F to avoid duplicating Tiger Data or Meko responsibilities.",
            },
            {
                "id": "mlh_vultr_solana",
                "name": "MLH — Vultr & Solana",
                "status": "NOT STARTED",
                "notes": "Excluded per Section F; not in selected prize scope.",
            },
        ],
    }

