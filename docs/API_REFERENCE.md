# VanSetu GreenTech — REST API Reference (`docs/API_REFERENCE.md`)

Base URL (Local Development): `http://localhost:7860`

---

## 1. System & Provenance Endpoints

### `GET /api/health` (alias: `GET /health`)
Returns system health, validated CRS status, native vs. display raster array shapes, and loaded corridor count.

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "raster_loaded": true,
  "ndvi_native_shape": [5572, 7794],
  "lst_native_shape": [57, 79],
  "lst_display_shape": [5572, 7794],
  "crs_validated": "EPSG:4326",
  "corridors_loaded": 44
}
```

### `GET /api/provenance`
Returns the scientific integrity policy and full provenance metadata for all 5 datasets (`ndvi`, `lst`, `gdi`, `corridors`, `aqi`).

### `GET /api/layers` & `GET /api/layers/{layer_id}/metadata`
Lists all geospatial layers alongside their computed raster statistics (`min`, `max`, `mean`, `std`, `p10`–`p90`, `native_shape`, `display_shape`, `native_resolution_m`, `display_resolution_m`, `valid_pixel_count`, `nodata_pixel_count`).

---

## 2. Raster Map Tile Endpoints

### `GET /api/tiles/{layer}/{z}/{x}/{y}.png`
Renders a `256 × 256` RGBA PNG slippy-map tile for `layer` $\in \{\text{ndvi}, \text{lst}, \text{gdi}, \text{corridors}\}$. Out-of-bounds and `NaN` pixels are rendered with `alpha = 0`.

### `GET /api/tiles/{layer}/legend`
Returns color stops, units, and native vs. display resolution disclosures for the specified raster layer.

---

## 3. Corridor Prioritization & Scenario Sensitivity Endpoints

### `GET /api/corridors` (alias: `GET /api/roads/corridors`)
Returns the 44 walkable urban corridors across NCT Delhi as an `EPSG:4326` GeoJSON `FeatureCollection` plus a ranked `corridors` array.

**Query Parameters:**
- `district` *(optional, string)*: Filter by NCT Delhi administrative district (e.g., `Central Delhi`, `East Delhi`).
- `scenario` *(optional, string, default `baseline`)*: One of `baseline`, `heat_resilience`, `air_quality`, `pedestrian_equity`, `extreme_vulnerability` (aliases `balanced` and `air_quality_focus` also supported).
- `heat_weight` *(optional, float in $[0, 1]$)*: Activates 2-factor What-If sensitivity ranking ($\text{score} = w_{\text{heat}} \cdot \text{Heat} + (1 - w_{\text{heat}}) \cdot \text{GreenDeficit}$) compared against the `0.60` baseline.
- `limit` *(optional, int)*: Limit returned corridors.
- `w_heat`, `w_green_deficit`, `w_pollution`, `w_pedestrian`, `w_health_risk`, `w_vulnerable_pop` *(optional, floats)*: Custom multi-criteria weights.

### `GET /api/corridors/scenarios`
Returns all 5 policy scenarios, their weight profiles, and indicator descriptions.

### `GET /api/corridors/sensitivity`
Executes comparative sensitivity analysis across all 5 policy scenarios.

**Query Parameters:**
- `scenario` *(default `baseline`)*: Active focus scenario.
- `district` *(optional)*: Filter by district.

**Response Highlights:**
- `summary.mean_stability_index`: Mean Stability Index $S \in [0, 1]$ across evaluated corridors.
- `corridors[].stability_metrics`: `stability_index`, `stability_class`, `min_rank`, `max_rank`, `rank_range`, `rank_std`.
- `corridors[].scenario_comparison`: Score, rank, `score_delta_vs_baseline`, and `rank_shift_vs_baseline` for each of the 5 scenarios.

### `GET /api/corridors/{corridor_id}` & `GET /api/corridors/{corridor_id}/explain`
Returns full corridor details, `calculation_breakdown` (including `formula_trace`, `normalized_inputs`, `active_weights`, `weighted_contributions`, `feasibility_breakdown`, `confidence_breakdown`), 5-scenario sensitivity profile, 5-category `intervention_plan`, and deterministic mathematical explanation.

### `POST /api/corridors/score`
Evaluates the explainable scoring engine directly on a custom JSON payload (`lst_norm`, `ndvi_norm`, `aqi_norm`, `highway_type`, `district`, `scenario`, `custom_weights`), returning the Tri-Vector assessment and dynamic missing-data weight re-normalization trace.

### `GET /api/corridors/districts` & `GET /api/corridors/districts/geojson`
Returns aggregated priority, LST, NDVI, AQI, and socio-spatial vulnerability metrics across the 11 NCT Delhi administrative districts, or the district boundary polygons GeoJSON.

### `GET /api/corridors/raster-zones`
Performs connected-component hotspot detection (`scipy.ndimage.label`) on the GDI raster grid and returns contiguous high-stress zones as GeoJSON polygons.

---

## 4. Green Infrastructure Intervention Planning Endpoints

### `GET /api/interventions/catalog`
Returns the 5 GreenTech intervention categories (`linear_street_trees`, `architectural_shade_structures`, `roadside_bioswales`, `living_green_walls`, `cool_pavements`), CPWD DSR 2023 unit rates, line-item breakdowns, site constraints, required pre-installation verification checks, and evidence limitations.

### `POST /api/interventions/evaluate`
Evaluates suitability $[0, 1]$ and length-scaled CapEx, Annual OpEx, and 5-year lifecycle costs for a custom corridor profile.

---

## 5. Air Quality & Point Inspection Endpoints

### `GET /api/aqi/stations` & `GET /api/aqi/summary` & `GET /api/aqi/point?lat=...&lng=...`
Returns CPCB monitoring station GeoJSON, city-wide AQI summary, or Haversine nearest-station interpolation with explicit `is_live` and `data_mode` (`"live_sensor_api"` vs `"historical_reference_baseline"`) provenance fields.

### `GET /api/stats/summary` & `GET /api/stats/point?lat=...&lng=...`
Returns overall raster/AQI/corridor summary statistics or samples a specific coordinate `(lat, lng)` across native 1km MODIS LST (`lst_native_1km`), 10m display LST (`lst_display_10m`), 10m Sentinel-2 NDVI (`ndvi`), composite `gdi`, and nearest CPCB station AQI.
