# VanSetu GreenTech (`vansetu-green`)

**Geospatial Urban Climate Assessment, Explainable Corridor Prioritization, Multi-Scenario Sensitivity Analysis, and Green Infrastructure Intervention Planning System for NCT Delhi**

[![Competition Theme](https://img.shields.io/badge/Theme-GreenTech-10b981)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React_18_%7C_Vite_%7C_Tailwind_%7C_Leaflet_%7C_Recharts-0ea5e9)](#)
[![Backend](https://img.shields.io/badge/Backend-Python_3.13_%7C_FastAPI_%7C_Rasterio_%7C_GeoPandas_%7C_SciPy-f59e0b)](#)
[![CRS](https://img.shields.io/badge/CRS-EPSG:4326_(WGS84)-6366f1)](#)

---

## 1. Overview

**VanSetu GreenTech** (`vansetu-green`) is an environmental decision-support platform engineered for urban planners, municipal forestry departments, and climate-resilience engineers in the **National Capital Territory (NCT) of Delhi**.

Using multi-spectral and thermal satellite observations (**Sentinel-2 10m NDVI** and **MODIS Terra 1,000m Land Surface Temperature**), **CPCB Continuous Ambient Air Quality Monitoring Station (CAAQMS)** telemetry/baselines, and **44 verified walkable urban corridors** across all **11 administrative districts of Delhi**, VanSetu GreenTech answers four core engineering questions:

1. **Where do extreme surface heat, canopy scarcity, and particulate air pollution converge along pedestrian corridors?**
2. **How does corridor prioritization shift under distinct policy scenarios** (*Baseline*, *Heat-Resilience*, *Air-Quality*, *Pedestrian-Equity*, and *Extreme-Vulnerability*)?
3. **What is the exact mathematical rationale, implementation feasibility, and evidence confidence** behind each corridor's rank (with missing data dynamically re-weighted and **never** silently treated as zero)?
4. **Which green infrastructure intervention category** (*Linear Street Trees*, *Architectural Shade Structures*, *Roadside Bioswales*, *Living Green Walls*, or *Cool Pavements*) fits each corridor's physical constraints, and what are the **CPWD DSR 2023 CapEx, Annual OpEx, and 5-Year Lifecycle Costs**?

---

## 2. Repository Directory Structure

```text
vansetu-green/
├── .env.example                        # Root environment template (no secrets)
├── .gitattributes                      # Git LFS tracking for GeoTIFF rasters (*.tif)
├── .gitignore                          # Excludes venv, node_modules, dist, .env
├── README.md                           # Project overview, installation & execution guide
├── docs/
│   ├── ARCHITECTURE.md                 # System & modular service architecture
│   ├── FEATURES.md                     # Feature matrix & mathematical specifications
│   ├── DATA_PROVENANCE.md              # Native vs display resolution & dataset provenance
│   ├── API_REFERENCE.md                # Request & response contracts for all endpoints
│   ├── TESTING.md                      # QA verification & automated test suite guide
│   └── DEVELOPMENT_NOTES.md            # Source audit findings & clean-room decisions
├── backend/
│   ├── .env.example                    # Backend environment template
│   ├── requirements.txt                # Python dependencies (FastAPI, Rasterio, SciPy, etc.)
│   ├── app/
│   │   ├── main.py                     # FastAPI application entrypoint & lifespan loader
│   │   ├── config.py                   # Settings & DATASET_PROVENANCE registry
│   │   ├── routers/
│   │   │   ├── layers.py               # /api/layers & /api/provenance endpoints
│   │   │   ├── tiles.py                # /api/tiles/{layer}/{z}/{x}/{y}.png & legends
│   │   │   ├── corridors.py            # /api/corridors, /scenarios, /sensitivity, /districts
│   │   │   ├── interventions.py        # /api/interventions/catalog & /evaluate
│   │   │   ├── aqi.py                  # /api/aqi/stations, /summary, /point
│   │   │   └── stats.py                # /api/stats/summary & /api/stats/point
│   │   └── services/
│   │       ├── raster_service.py       # Native vs display GeoTIFF loader & GDI calculator
│   │       ├── aqi_service.py          # CPCB station telemetry & explicit baseline service
│   │       ├── scoring_service.py      # Tri-Vector scoring & 5-scenario sensitivity engine
│   │       ├── intervention_service.py # 5-archetype suitability & CPWD DSR 2023 cost engine
│   │       ├── corridor_service.py     # 44-corridor zonal enrichment & hotspot detector
│   │       └── tile_service.py         # NaN-transparent RGBA PNG slippy-map tile renderer
│   ├── data/
│   │   ├── delhi_ndvi_10m.tif                  # Sentinel-2 10m native NDVI (5572×7794, EPSG:4326)
│   │   ├── delhi_lst_modis_daily_celsius.tif   # MODIS 1,000m native LST (57×79, EPSG:4326)
│   │   ├── delhi_roads_cached.geojson          # 44 verified walkable corridors across 11 districts
│   │   └── delhi_districts.json                # NCT Delhi administrative district boundaries
│   └── tests/
│       ├── test_data_integrity_and_rasters.py  # Native/display resolution, CRS & nodata tests
│       ├── test_scoring_and_missing_data.py    # Dynamic missing-data reweighting & confidence tests
│       ├── test_scenarios_and_sensitivity.py   # 5-scenario comparative ranking & stability tests
│       ├── test_interventions_and_costs.py     # 5-archetype suitability & CPWD lifecycle cost tests
│       └── test_api_endpoints.py               # End-to-end FastAPI endpoint contract tests
└── frontend/
    ├── .env.example                    # Frontend environment template
    ├── index.html                      # Dark-theme environmental decision-support shell
    ├── package.json                    # React 18, Vite 5, Tailwind CSS, Leaflet, Recharts
    ├── tailwind.config.js              # Tailwind CSS configuration
    ├── vite.config.js                  # Vite dev server & /api proxy configuration
    ├── src/
    │   ├── main.jsx                    # React root mount
    │   ├── App.jsx                     # 3-column decision-support workspace
    │   ├── index.css                   # Tailwind directives & Leaflet dark canvas overrides
    │   ├── api/
    │   │   └── client.js               # REST client for FastAPI backend
    │   ├── components/
    │   │   ├── InteractiveMap.jsx           # Leaflet map, raster tiles, corridors & pixel inspector
    │   │   ├── PriorityRankingPanel.jsx     # District filter, 5 scenarios, What-If slider & list
    │   │   ├── CorridorAnalyticalDetail.jsx # Formula trace, Recharts breakdowns & stability
    │   │   ├── InterventionPlannerPanel.jsx # 5 interventions, CPWD costs & verification checks
    │   │   └── DataProvenanceModal.jsx      # Native vs display resolution & provenance modal
    │   └── data/
    │       └── delhi_districts.json    # NCT Delhi district boundaries
    └── tests/
        └── frontend.test.mjs           # Automated Node test suite for frontend stack & scope
```

---

## 3. Scientific Data Integrity Guarantees

VanSetu GreenTech enforces strict scientific data hygiene across both backend and frontend:

1. **Native vs. Display Spatial Resolution Preserved:**
   - **Sentinel-2 MSI NDVI (`delhi_ndvi_10m.tif`):** Native `10m` spatial resolution (`5572 × 7794` pixels, `0.00008983°` pixel size).
   - **MODIS Terra MOD11A1 LST (`delhi_lst_modis_daily_celsius.tif`):** Native `1,000m` (`1 km`) spatial resolution (`57 × 79` pixels, `0.008983°` pixel size).
   - `RasterService` retains the un-interpolated `57 × 79` native 1km thermal array (`lst_native`) alongside the bilinearly aligned `5572 × 7794` display array (`lst`). Point queries (`/api/stats/point`) and corridor profiles expose **both** `lst_native_1km` and `lst_display_10m`.
2. **Missing Data Is Never Coerced to Zero:**
   - Missing (`None` or `NaN`) environmental indicators are excluded from the scoring denominator, and active weights are dynamically re-normalized so $\sum_{i \in \text{Valid}} \bar{w}_i = 1.0$.
   - Raster `nodata` pixels (`39,791` border pixels in `delhi_ndvi_10m.tif`) are masked to IEEE 754 `NaN`, propagated as `NaN` in the composite Green Deficit Index (`GDI`), and rendered with `alpha = 0` transparency in map tiles.
3. **Explicit Live vs. Historical Telemetry Labeling:**
   - When `WAQI_TOKEN` is not configured or the external API is unreachable, CPCB station observations use documented **2024–2025 CPCB seasonal reference baselines** and explicitly report `is_live: false` and `data_mode: "historical_reference_baseline"`. Offline baselines are **never** represented as live sensor streams.
4. **Evidence Confidence Ledger:**
   - Every corridor's Evidence Confidence score starts at `1.00` and deducts explicit penalties for coarse 1,000m MODIS thermal resolution (`-0.12`), historical AQI baseline usage (`-0.06`), AQI station interpolation distance $>10\text{ km}$ (`-0.10`), and road-class pedestrian proxy usage (`-0.05`).

---

## 4. Installation & Local Execution Instructions

### Prerequisites

- **Python:** `3.11+` (tested on Python `3.13.12`)
- **Node.js & npm:** `18+` (tested on Node `v25.5.0`, npm `11.8.0`)

### Step 1: Clone the Repository

```bash
git clone https://github.com/niharika19singh/vansetu-green.git
cd vansetu-green
cp .env.example .env
```

### Step 2: Start the FastAPI Geospatial Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the FastAPI server on http://localhost:7860
uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```

Verify the backend health and native raster dimensions:
```bash
curl http://localhost:7860/api/health
```

### Step 3: Start the React + Vite Frontend

In a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

### Step 4: Run the Automated Test Suites

```bash
# Backend pytest suite (20 tests covering rasters, nodata, scoring, scenarios, costs, and endpoints)
cd backend
PYTHONPATH=. pytest tests -v

# Frontend verification & production build check
cd ../frontend
npm test
npm run build
```

---

## 5. Third-Party Licenses & Data Attribution

- **Sentinel-2 Level-2A Surface Reflectance NDVI:** Contains modified Copernicus Sentinel data (2024–2025), European Space Agency (ESA).
- **MODIS Terra MOD11A1.061 Land Surface Temperature:** Courtesy of NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC), USGS/Earth Resources Observation and Science (EROS) Center.
- **Urban Road Corridors & District Geometries:** © OpenStreetMap contributors under the Open Database License (ODbL).
- **Ambient Air Quality Reference Baselines:** Central Pollution Control Board (CPCB) & Delhi Pollution Control Committee (DPCC) under the Government Open Data License – India.
- **Cost Estimation Basis:** Central Public Works Department (CPWD) Delhi Schedule of Rates (DSR 2023) & Ministry of Housing and Urban Affairs (MoHUA) Urban Greening Guidelines.
