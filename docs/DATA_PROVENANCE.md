# VanSetu GreenTech — Geospatial Data Provenance & Integrity (`docs/DATA_PROVENANCE.md`)

## 1. Dataset Provenance Summary

| Layer ID | File / Source | Provider | Native Resolution | Display Grid | Observation Period | Classification | CRS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ndvi`** | `backend/data/delhi_ndvi_10m.tif` | ESA Copernicus Sentinel-2 MSI (L2A) | **10 m** (`5572 × 7794`, `8.983e-5°`) | **10 m** (`5572 × 7794`) | `2024-11-01` to `2025-02-28` | Historical Satellite Composite | `EPSG:4326` |
| **`lst`** | `backend/data/delhi_lst_modis_daily_celsius.tif` | NASA EOSDIS Terra MODIS (`MOD11A1.061`) | **1,000 m / 1 km** (`57 × 79`, `0.008983°`) | **10 m** (`5572 × 7794`, bilinear display alignment) | `2024-10-01` to `2025-03-31` | Historical Satellite Composite | `EPSG:4326` |
| **`gdi`** | Derived in `RasterService._compute_gdi` | VanSetu Analytical Pipeline | **1,000 m thermal / 10 m NDVI** | **10 m** (`5572 × 7794`) | Derived from 2024–2025 composites | Model-Derived Composite Index | `EPSG:4326` |
| **`corridors`** | `backend/data/delhi_roads_cached.geojson` | OpenStreetMap (ODbL) | Vector LineStrings (~5 m vertex accuracy) | Vector LineStrings | 2025 OSM Snapshot + 2024–2025 Rasters | Hybrid Vector + Zonal Sampling | `EPSG:4326` |
| **`aqi`** | `AQIService` (`DELHI_CPCB_STATIONS`) | CPCB / DPCC (via WAQI API or Reference Archive) | 8 Point CAAQMS Stations (~5–12 km spacing) | Point Markers + Haversine Lookup | Live API if token set; else Oct 2024 – Feb 2025 CPCB Mean | Point Telemetry with Explicit Fallback | `EPSG:4326` |

---

## 2. Native vs. Display Resolution Integrity

A critical scientific requirement of **VanSetu GreenTech** is preserving the distinction between **native sensor spatial resolution** and **display-aligned raster grids**:

1. **Sentinel-2 NDVI (`delhi_ndvi_10m.tif`):**
   - Native dimensions: `5572 rows × 7794 cols` (`43,428,168` total pixels, `43,388,377` valid pixels, `39,791` `NaN` border pixels).
   - Native pixel size: `0.0000898315°` (~`10.0 m` meridional × `8.8 m` zonal at $28.6^\circ\text{N}$).
   - Value range in NCT Delhi: `[-0.4305, 0.8677]`, mean `0.3101`.
2. **MODIS Terra Land Surface Temperature (`delhi_lst_modis_daily_celsius.tif`):**
   - Native dimensions: `57 rows × 79 cols` (`4,503` pixels).
   - Native pixel size: `0.00898315°` (~`1,000 m` / `1 km`, exactly $100\times$ coarser in each dimension than Sentinel-2 NDVI).
   - Value range in NCT Delhi: `[22.74°C, 29.00°C]`, mean `25.76°C`.
   - **How `RasterService` preserves native resolution:**
     - `raster_service.lst_native` stores the exact `57 × 79` un-interpolated 1,000m array and its native affine transform `lst_native_transform`.
     - `raster_service.lst` stores the `5572 × 7794` bilinearly upsampled array strictly for visual tile overlay and 10m pixel-by-pixel composite index (`GDI`) alignment.
     - Every point query (`/api/stats/point`) returns both `lst_native_1km` (sampled from the `57 × 79` grid) and `lst_display_10m` (sampled from the `5572 × 7794` grid).
     - Every corridor assessment deducts `-0.12` from its **Evidence Confidence** score with the explicit disclosure: *"MODIS LST native spatial resolution is 1000m (cannot resolve sub-street canopy shade)."*

---

## 3. Coordinate Reference System (CRS) & NoData Validation

1. **CRS Validation:**
   - Upon startup, `RasterService._load_geotiff()` verifies that every GeoTIFF has a non-null CRS matching `EPSG:4326` (`WGS84`). Any raster lacking a CRS or in an unexpected projection raises a `ValueError`.
2. **NoData & NaN Handling:**
   - Explicit `src.nodata` values, sentinel values ($\le -9999$), and physically invalid artifacts are converted to `np.nan`.
   - During bilinear upsampling (`_resample_to_match_nan_safe`), normalized weight convolution ensures `NaN` border pixels never bleed zero values into adjacent valid pixels.
   - During GDI computation (`_compute_gdi`), `valid_mask = (~np.isnan(ndvi)) & (~np.isnan(lst))` ensures that any pixel missing either NDVI or LST remains `np.nan`.
   - During map tile rendering (`TileService._apply_colormap`), `rgba[nan_mask, 3] = 0` ensures all `NaN` pixels render with 100% alpha transparency.

---

## 4. Live vs. Historical Air Quality Classification

- **Live Telemetry Mode (`is_live: true`, `data_mode: "live_sensor_api"`):**
  Activated automatically when `WAQI_TOKEN` is provided in `.env` and the WAQI CPCB station feed is reachable.
- **Historical Reference Baseline Mode (`is_live: false`, `data_mode: "historical_reference_baseline"`):**
  When running offline or without external API credentials, `AQIService` serves documented **CPCB Oct 2024 – Feb 2025 seasonal mean reference observations** across the 8 NCT Delhi CAAQMS stations (*Anand Vihar*, *ITO*, *Punjabi Bagh*, *R.K. Puram*, *Dwarka Sector-8*, *Rohini*, *Okhla Phase-2*, *Lodhi Road*).
- **Zero Misrepresentation Policy:**
  Every API response (`/api/aqi/stations`, `/api/aqi/summary`, `/api/stats/summary`, `/api/corridors`) and UI badge explicitly labels whether values come from `Live API` or `Historical Reference Baseline`. Simulated or historical numbers are **never** presented as live sensor streams.
