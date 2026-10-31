"""
VanSetu GreenTech — Application Configuration & Data Provenance Registry.

Centralizes environment variables, scientific normalization bounds,
multi-criteria scoring weights, and dataset provenance metadata.
"""
import os
from pathlib import Path
from typing import Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    app_name: str = "VanSetu GreenTech API"
    app_version: str = "2.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 7860

    # Geospatial data paths
    data_dir: Path = Path(__file__).parent.parent / "data"
    ndvi_file: str = "delhi_ndvi_10m.tif"
    lst_file: str = "delhi_lst_modis_daily_celsius.tif"
    roads_cache_file: str = "delhi_roads_cached.geojson"
    districts_file: str = "delhi_districts.json"

    # External AQI telemetry credentials (optional)
    openaq_api_key: str = ""
    waqi_token: str = ""

    # YugabyteDB / Meko MCP Context Layer (Track A — Open Project)
    meko_mcp_url: str = "https://mcp.mekodata.ai/mcp"
    meko_api_key: str = ""
    meko_build_datapack_id: str = ""
    meko_project_datapack_id: str = ""
    meko_knowledge_datapack_id: str = ""
    meko_decisions_datapack_id: str = ""

    # MLH: Google Gemini API (Function-Calling Climate Agent)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"

    # MLH: Tiger Data / TimescaleDB (Environmental Time-Series Layer)
    tiger_data_url: str = ""
    timescale_service_url: str = ""
    tiger_data_hypertable: str = "environmental_observations"

    # MLH: DigitalOcean Spaces (Durable S3-Compatible Geospatial Storage)
    do_spaces_endpoint: str = ""
    do_spaces_region: str = "blr1"
    do_spaces_bucket: str = ""
    do_spaces_key: str = ""
    do_spaces_secret: str = ""

    # Legacy two-factor GDI raster weights
    lst_weight: float = 0.60
    ndvi_weight: float = 0.40

    # Baseline 6-factor scoring weights (sum = 1.00)
    weight_heat: float = 0.25
    weight_green_deficit: float = 0.20
    weight_pollution: float = 0.20
    weight_pedestrian: float = 0.15
    weight_health_risk: float = 0.12
    weight_vulnerable_pop: float = 0.08

    # Normalization physical bounds
    ndvi_min: float = -0.20
    ndvi_max: float = 0.80
    lst_percentile_low: float = 2.0
    lst_percentile_high: float = 98.0
    aqi_min: float = 50.0
    aqi_max: float = 300.0

    # Tile rendering settings
    tile_size: int = 256
    tile_cache_ttl: int = 3600
    corridor_threshold_percentile: float = 75.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def ndvi_path(self) -> Path:
        env_dir = os.getenv("DATA_DIR")
        base = Path(env_dir) if env_dir else self.data_dir
        if not base.is_absolute():
            base = Path(__file__).parent.parent / base
        return base / self.ndvi_file

    @property
    def lst_path(self) -> Path:
        env_dir = os.getenv("DATA_DIR")
        base = Path(env_dir) if env_dir else self.data_dir
        if not base.is_absolute():
            base = Path(__file__).parent.parent / base
        return base / self.lst_file

    @property
    def roads_cache_path(self) -> Path:
        env_dir = os.getenv("DATA_DIR")
        base = Path(env_dir) if env_dir else self.data_dir
        if not base.is_absolute():
            base = Path(__file__).parent.parent / base
        return base / self.roads_cache_file

    @property
    def districts_path(self) -> Path:
        env_dir = os.getenv("DATA_DIR")
        base = Path(env_dir) if env_dir else self.data_dir
        if not base.is_absolute():
            base = Path(__file__).parent.parent / base
        return base / self.districts_file


settings = Settings()

DATA_DIR = settings.data_dir
TIGER_DATA_HYPERTABLE = settings.tiger_data_hypertable
TIGER_DATA_URL = settings.tiger_data_url
TIMESCALE_SERVICE_URL = settings.timescale_service_url
GEMINI_API_KEY = settings.gemini_api_key
GEMINI_MODEL = settings.gemini_model


# =============================================================================
# SCIENTIFIC DATA PROVENANCE & INTEGRITY REGISTRY
# Explicitly documents native vs display resolution, observation dates,
# CRS, and measurement classification (live vs historical vs model-derived).
# =============================================================================
DATASET_PROVENANCE: Dict[str, Dict[str, Any]] = {
    "ndvi": {
        "id": "ndvi",
        "name": "Sentinel-2 Surface Reflectance NDVI",
        "provider": "European Space Agency (ESA) Copernicus / Harmonized Sentinel-2 MSI (Level-2A)",
        "instrument": "MultiSpectral Instrument (MSI) — Bands B8 (NIR, 842nm) & B4 (Red, 665nm)",
        "formula": "NDVI = (B8 - B4) / (B8 + B4)",
        "native_resolution_m": 10.0,
        "native_resolution_deg": 8.983152841195215e-05,
        "display_resolution_m": 10.0,
        "resampling_applied": False,
        "resampling_note": "Displayed and sampled at native 10m spatial resolution.",
        "observation_period": "2024-11-01 to 2025-02-28 (Post-Monsoon / Winter Cloud-Free Composite)",
        "observation_date_type": "historical_satellite_composite",
        "measurement_classification": "historical_satellite_observation",
        "is_live": False,
        "crs": "EPSG:4326",
        "units": "dimensionless [-1.0 to 1.0]",
        "valid_range": [-0.2, 0.8],
        "nodata_handling": "NaN / masked pixels excluded from statistics and transparent in tiles; never coerced to 0.",
        "limitations": [
            "10m pixel averages canopy and sub-canopy surfaces; narrow median planters (<3m) mix with asphalt reflectance.",
            "Seasonal post-monsoon composite; deciduous canopy senescence in late spring is not captured in a single static epoch."
        ],
        "license": "Copernicus Open Access Data License (Attribution Retained)",
    },
    "lst": {
        "id": "lst",
        "name": "MODIS Terra Land Surface Temperature (LST)",
        "provider": "NASA EOSDIS Land Processes DAAC — MOD11A1.061 Terra Land Surface Temperature & Emissivity",
        "instrument": "Moderate Resolution Imaging Spectroradiometer (MODIS) — Thermal Infrared Bands 31 & 32",
        "formula": "LST_Celsius = (DN * 0.02) - 273.15",
        "native_resolution_m": 1000.0,
        "native_resolution_deg": 0.008983152841195215,
        "display_resolution_m": 10.0,
        "resampling_applied": True,
        "resampling_method": "bilinear_interpolation_for_display_alignment",
        "resampling_note": (
            "CRITICAL DATA INTEGRITY DISCLOSURE: Native MODIS thermal resolution is 1,000m (1km, 57x79 grid over NCT Delhi). "
            "Bilinear resampling to the 10m NDVI grid (5572x7794) is performed strictly for visual map overlay and raster grid alignment. "
            "It does NOT resolve street-level (<100m) micro-thermal variation. Both native 1km pixel values and resampled display values are exposed."
        ),
        "observation_period": "2024-10-01 to 2025-03-31 (Daytime Clear-Sky Seasonal Mean Composite)",
        "observation_date_type": "historical_satellite_composite",
        "measurement_classification": "historical_satellite_observation",
        "is_live": False,
        "crs": "EPSG:4326",
        "units": "°C (Degrees Celsius)",
        "valid_range": [15.0, 50.0],
        "nodata_handling": "NaN / nodata pixels masked prior to percentile normalization and excluded from zonal means.",
        "limitations": [
            "1,000m native pixel size cannot distinguish localized shade from an individual tree row versus surrounding rooftops.",
            "Represents skin Land Surface Temperature (LST) at ~10:30 AM local solar overpass, not 2m meteorological air temperature.",
            "Applies an automatic -0.12 Evidence Confidence penalty to corridor scores to reflect coarse thermal granularity."
        ],
        "license": "NASA Earthdata Open Data Policy (Public Domain with Attribution)",
    },
    "gdi": {
        "id": "gdi",
        "name": "Green Deficit & Heat Vulnerability Index (GDI)",
        "provider": "VanSetu GreenTech Analytical Pipeline (Derived from Sentinel-2 NDVI & MODIS LST)",
        "instrument": "Composite Geospatial Raster Model",
        "formula": "GDI = w_heat * LST_norm + w_ndvi * (1 - NDVI_norm)",
        "native_resolution_m": 1000.0,
        "display_resolution_m": 10.0,
        "resampling_applied": True,
        "resampling_note": "Combines 10m native NDVI with bilinearly aligned 1km MODIS LST; effective thermal resolution remains bounded by 1km MODIS input.",
        "observation_period": "Derived from 2024-10-01 to 2025-03-31 satellite composites",
        "observation_date_type": "derived_analytical_composite",
        "measurement_classification": "model_derived_index",
        "is_live": False,
        "crs": "EPSG:4326",
        "units": "dimensionless [0.0 to 1.0]",
        "valid_range": [0.0, 1.0],
        "nodata_handling": "Propagates NaN wherever either NDVI or LST is NaN; missing pixels are never assigned 0.",
        "limitations": [
            "Inherits the 1,000m native thermal resolution limit of MODIS MOD11A1.",
            "Relative city-wide percentile normalization (P2-P98 for LST) means scores are calibrated to NCT Delhi's internal thermal distribution."
        ],
        "license": "MIT / Open Analytical Derivative",
    },
    "corridors": {
        "id": "corridors",
        "name": "NCT Delhi Walkable Urban Corridors",
        "provider": "OpenStreetMap (OSM) Overpass API + NCT Delhi District Administrative Boundaries",
        "instrument": "Vector Road Network Graph + Zonal Raster Sampling",
        "native_resolution_m": 5.0,
        "display_resolution_m": 5.0,
        "resampling_applied": False,
        "resampling_note": "Vector LineString geometries sampled every ~100m along segment vertices against native and display rasters.",
        "observation_period": "OSM Road Network Snapshot (2025) + 2024-2025 Satellite Rasters",
        "observation_date_type": "static_vector_with_zonal_sampling",
        "measurement_classification": "hybrid_vector_zonal_observation",
        "is_live": False,
        "crs": "EPSG:4326",
        "units": "Multi-criteria priority score [0.0 to 1.0]",
        "valid_range": [0.0, 1.0],
        "nodata_handling": "Corridors with missing signals dynamically re-normalize active weights instead of substituting zero.",
        "limitations": [
            "Pedestrian footfall is estimated via OSM highway hierarchy & urban zone profile unless ground-truth pedestrian counters are provided.",
            "Right-of-Way (ROW) widths require on-site municipal survey verification prior to civil excavation."
        ],
        "license": "ODbL (OpenStreetMap Contributors)",
    },
    "aqi": {
        "id": "aqi",
        "name": "CPCB / DPCC Ambient Air Quality Monitoring Network",
        "provider": "Central Pollution Control Board (CPCB) / Delhi Pollution Control Committee (DPCC) via WAQI & OpenAQ",
        "instrument": "Continuous Ambient Air Quality Monitoring Stations (CAAQMS) — PM2.5, PM10, NO2",
        "native_resolution_m": 5000.0,
        "display_resolution_m": 5000.0,
        "resampling_applied": False,
        "resampling_note": "Point station observations mapped to corridors via Haversine nearest-station assignment with distance confidence decay (>10km penalty).",
        "observation_period": "Live API telemetry when WAQI_TOKEN/OPENAQ_API_KEY configured; otherwise CPCB 2024-2025 Seasonal Reference Baseline",
        "observation_date_type": "live_or_historical_baseline",
        "measurement_classification": "point_station_telemetry_with_explicit_fallback",
        "is_live": False,
        "crs": "EPSG:4326",
        "units": "US-EPA / National AQI Index & µg/m³ (PM2.5, PM10)",
        "valid_range": [0.0, 500.0],
        "nodata_handling": "Stations without live telemetry explicitly report data_mode='historical_reference_baseline' and is_live=False.",
        "limitations": [
            "8 reference stations across NCT Delhi require spatial interpolation to road corridors.",
            "When running without live API keys or network connectivity, values reflect historical CPCB seasonal reference baselines and are explicitly labeled as non-live."
        ],
        "license": "CPCB Open Government Data License India / WAQI Terms",
    },
}
