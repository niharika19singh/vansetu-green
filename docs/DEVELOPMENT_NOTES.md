# VanSetu GreenTech — Technical Audit & Development Notes (`docs/DEVELOPMENT_NOTES.md`)

## 1. Reference Project Audit Summary

Prior to creating `vansetu-green`, a comprehensive technical audit was performed on the read-only functional reference repository (`https://github.com/niharika19singh/van-setu`). The original repository was left completely untouched.

### 1.1 Key Issues & Limitations Identified in the Reference Repository

1. **Native vs. Resampled Raster Overwrite (`raster_service.py`):**
   - In the reference project, `RasterService.load_data()` immediately overwrote `self._lst_data` with the bilinearly upsampled array matching the NDVI shape (`5572 × 7794`), discarding the native `57 × 79` (`1,000m`) MODIS array and computing LST summary statistics on the interpolated grid rather than the native sensor pixels.
   - Additionally, on the `render/main` branch of `niharika19singh/van-setu`, `delhi_ndvi_10m.tif` had been downsampled to `57 × 79` (`18 KB`) to bypass Git LFS limits while still being labeled `10m`.
2. **Broken Admin Endpoints (`admin.py`):**
   - `/api/admin/subsidy-stats` attempted `from app.services.intervention_service import get_subsidy_tier, SUBSIDY_TIERS`, raising `ImportError: cannot import name 'SUBSIDY_TIERS'` at runtime.
   - `/api/admin/signal-coverage` referenced non-existent keys (`WEIGHTS["aqi"]`, `WEIGHTS["park_connectivity"]`, `WEIGHTS["community_demand"]`, `WEIGHTS["cost_impact"]`), raising `KeyError`.
3. **Frontend Stack Mismatch (`frontend/package.json`):**
   - Although the reference documentation described Tailwind CSS and Recharts, the reference `package.json` did not install or use either library, relying instead on monolithic custom CSS files (`PublicDashboard.jsx` > 1,400 lines) and raw HTML divs.
4. **Out-of-Scope Sponsor & Chatbot Couplings:**
   - The reference codebase included `prune_service.py` (Prune API / Gemini 2.0 Flash integration), `VanSetuAIAgent.jsx` (a floating chatbot drawer), `pymongo`/`MONGODB_URI` in `suggestion_service.py`, and an unused `telegram_bot.py` script.

---

## 2. Clean-Room Architectural & Engineering Decisions in `vansetu-green`

1. **Strict GreenTech Scope Isolation:**
   - Removed all LLM/Gemini/Prune integrations, chatbot drawers, MongoDB Atlas dependencies, and Telegram scripts.
   - Replaced the external LLM ranking explanation endpoint with a **100% deterministic Mathematical Rationale Engine** (`CorridorService.explain_corridor`) that outputs the exact `formula_trace`, normalized inputs, active weights, and ranked factor contributions.
2. **Dual-Grid Native + Display Raster Architecture:**
   - Preserved the full `5572 × 7794` (`10m` native) Sentinel-2 NDVI GeoTIFF and `57 × 79` (`1,000m` native) MODIS Terra LST GeoTIFF.
   - `RasterService` retains both `self._lst_native_data` (`57 × 79`) and `self._lst_display_data` (`5572 × 7794`), using normalized NaN-safe bilinear convolution (`_resample_to_match_nan_safe`) so border `NaN` pixels never bleed zeros into valid pixels.
   - Point queries (`/api/stats/point`) and corridor profiles return both `lst_native_1km` and `lst_display_10m`.
3. **Explainable Scoring & Missing-Data Integrity:**
   - Implemented dynamic weight re-normalization in `ScoringService.compute_corridor_score()` so missing (`None` or `NaN`) indicators are excluded from the denominator and active weights sum to `1.0`. Missing data is never interpreted as `0.0`.
   - Added explicit support for all 5 required policy scenarios (`baseline`, `heat_resilience`, `air_quality`, `pedestrian_equity`, `extreme_vulnerability`) plus backward-compatible aliases (`balanced`, `air_quality_focus`).
4. **Standardized 5-Category Intervention & Lifecycle Cost Engine:**
   - Standardized the 5 GreenTech intervention categories (`linear_street_trees`, `architectural_shade_structures`, `roadside_bioswales`, `living_green_walls`, `cool_pavements`) with CPWD DSR 2023 CapEx line-items, Annual OpEx line-items, mortality replacement allowances, 5-year lifecycle costs, site constraints, required pre-installation verification checklists, and empirical literature disclaimers.
5. **Map-First React + Vite + Tailwind CSS + Leaflet + Recharts Frontend:**
   - Built a clean, modular 3-column environmental decision-support interface (`InteractiveMap.jsx`, `PriorityRankingPanel.jsx`, `CorridorAnalyticalDetail.jsx`, `InterventionPlannerPanel.jsx`, `DataProvenanceModal.jsx`) with Recharts visualizations for factor contributions, 5-scenario comparative rankings, and CPWD CapEx/OpEx cost stacks.
