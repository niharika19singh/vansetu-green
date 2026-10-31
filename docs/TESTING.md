# VanSetu GreenTech — Quality Assurance & Automated Testing (`docs/TESTING.md`)

## 1. Automated Test Suite Overview

VanSetu GreenTech includes **20 backend pytest tests** and **3 frontend Node verification tests**, covering geospatial raster integrity, missing-data behavior, 5-scenario ranking stability, CPWD intervention cost scaling, and end-to-end API contracts.

### Backend Test Matrix (`backend/tests/`)

| Test File | Test Cases | What Is Verified |
| :--- | :---: | :--- |
| `test_data_integrity_and_rasters.py` | 5 | • Sentinel-2 10m (`5572 × 7794`) and MODIS 1,000m (`57 × 79`) native arrays are both preserved.<br/>• `EPSG:4326` CRS validation passes.<br/>• `39,791` `NaN` border pixels in NDVI propagate as `NaN` in GDI and are never coerced to `0.0`.<br/>• `/api/stats/point` returns both `lst_native_1km` and `lst_display_10m`, and `None` out of bounds.<br/>• Offline AQI explicitly reports `is_live: False` and `data_mode: "historical_reference_baseline"`. |
| `test_scoring_and_missing_data.py` | 5 | • Missing (`None` or `float('nan')`) indicators are excluded from the denominator and active weights re-normalize to `1.0`.<br/>• Proves missing AQI produces a higher score on a hot/barren corridor than coercing AQI to `0.0`.<br/>• When all 6 indicators are missing, `priority_score` is `None` (never `0.0`).<br/>• Evidence Confidence ledger records `-0.12` (1km MODIS LST), `-0.10` (AQI station $>10\text{ km}$), and `-0.06` (historical AQI baseline).<br/>• Invalid factor names or negative weights raise `ValueError`. |
| `test_scenarios_and_sensitivity.py` | 3 | • All 5 required policy scenarios (`baseline`, `heat_resilience`, `air_quality`, `pedestrian_equity`, `extreme_vulnerability`) exist and sum to `1.00`.<br/>• Sensitivity analysis across all 44 corridors produces contiguous ranks `1..44` and valid Stability Index $S \in [0, 1]$.<br/>• Two-factor What-If slider (`heat_weight=0.60` vs `1.00`) produces consistent rank and score deltas. |
| `test_interventions_and_costs.py` | 2 | • All 5 required GreenTech intervention categories are present.<br/>• $\text{5-Year Lifecycle} = \text{CapEx} + 5 \times \text{Annual OpEx}$ holds for every archetype, and total corridor cost scales linearly with `length_m / 1000.0`. |
| `test_api_endpoints.py` | 5 | • End-to-end HTTP verification of `/`, `/api/health`, `/api/provenance`, `/api/layers`, `/api/tiles/{layer}/{z}/{x}/{y}.png`, `/api/tiles/{layer}/legend`, `/api/corridors`, `/api/corridors/scenarios`, `/api/corridors/sensitivity`, `/api/corridors/districts`, `/api/corridors/raster-zones`, `/api/corridors/{id}`, `/api/corridors/{id}/explain`, `/api/interventions/catalog`, `/api/aqi/stations`, `/api/stats/summary`, and `/api/stats/point`. |

### Frontend Test Matrix (`frontend/tests/frontend.test.mjs`)

| Test Case | What Is Verified |
| :--- | :--- |
| Stack Compliance | Verifies `react`, `vite`, `tailwindcss`, `leaflet`, `react-leaflet`, and `recharts` are configured in `package.json`. |
| Geospatial Boundary Data | Verifies `src/data/delhi_districts.json` is a valid GeoJSON `FeatureCollection`. |
| Scope & Provenance Audit | Verifies all 5 scenarios and native 1,000m vs. 10m resolution disclosures are present, and confirms zero references to out-of-scope modules (Gemini, Prune, MongoDB, Yugabyte, IOMETE). |

---

## 2. Running the Tests

### Backend (`pytest`)
```bash
cd backend
PYTHONPATH=. pytest tests -v
```

### Frontend (`node --test` & `vite build`)
```bash
cd frontend
npm test
npm run build
```
