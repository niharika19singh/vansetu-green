# VanSetu — Automated Testing & Verification Report

## 1. Test Execution Summary

| Test Suite | Runner | Total Tests | Passed | Failed | Duration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Geospatial, MILP, Meko, Gemini, Tiger Data, Procurement & Equity Suite** | `pytest 9.1.1` (Python 3.13) | `29` | `29` | `0` | `9.02s` |
| **Frontend 10-View Component, Scenario, Provenance & Build Suite** | `node --test` + `vite build` | `4` + Production Build | `4` | `0` | `2.12s` |
| **Combined Total** | | **33** | **33** | **0** | **11.14s** |

---

## 2. Backend Test Modules (`backend/tests/`)

1. **[`test_data_integrity_and_rasters.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_data_integrity_and_rasters.py)**
   - `test_raster_native_vs_display_resolution_preserved`: Confirms native MODIS LST `(57, 79)` (~1km) is preserved alongside display-resampled `(5572, 7794)` (~10m) Sentinel-2 NDVI.
   - `test_crs_validation_epsg_4326`: Verifies CRS validation on GeoTIFF ingestion.
   - `test_nodata_handling_never_coerced_to_zero`: Verifies `NaN` propagation and zero-coercion prevention.
   - `test_point_query_returns_both_native_1km_and_display_10m_lst`: Verifies `/api/stats/point` returns both native 1km and display 10m LST values.
   - `test_aqi_provenance_never_claims_fallback_is_live`: Verifies explicit `is_live` and `data_mode` reporting.

2. **[`test_scoring_and_missing_data.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_scoring_and_missing_data.py)**
   - `test_missing_data_never_interpreted_as_zero`: Confirms dynamic weight re-normalization when indicators are `None` or `NaN`.
   - `test_nan_inputs_handled_identically_to_none`
   - `test_all_signals_missing_returns_none_not_zero`
   - `test_evidence_confidence_penalties_explicitly_tracked`
   - `test_custom_weights_validation`

3. **[`test_scenarios_and_sensitivity.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_scenarios_and_sensitivity.py)**
   - `test_all_five_required_scenarios_configured_and_normalized`
   - `test_scenario_comparison_and_stability_index`
   - `test_what_if_two_factor_ranking_consistency`

4. **[`test_interventions_and_costs.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_interventions_and_costs.py)**
   - `test_five_required_intervention_categories_present`
   - `test_intervention_cost_calculations_and_length_scaling`

5. **[`test_api_endpoints.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_api_endpoints.py)**
   - `test_root_and_health_endpoints`
   - `test_layers_and_provenance_endpoints`
   - `test_tiles_and_legends_endpoints`
   - `test_corridors_scenarios_sensitivity_and_explain`
   - `test_interventions_aqi_and_stats_endpoints`

6. **[`test_hackcbs9_integrations.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_hackcbs9_integrations.py)**
   - `test_budget_optimizer_adherence_and_meko_constraints`: Confirms `scipy.optimize.milp` respects the ₹8.0L ceiling and shifts portfolio from `linear_street_trees` (`MEKO OFF`) to `architectural_shade_structures` + `cool_pavements` (`MEKO ON`).
   - `test_meko_datapack_isolation_rbac`: Confirms `HTTP 403` when runtime agents attempt to access `vansetu-build` or coding agents attempt to access runtime datapacks.
   - `test_meko_on_vs_off_comparison_and_check_t`: Verifies `/api/meko/compare-on-off` and `/api/meko/check-t` (12 promoted decisions across Niharika & Kunal's coding agents).
   - `test_meko_memory_lifecycle_add_verify_promote_delete`: Tests candidate memory creation, update, and deletion.
   - `test_gemini_agent_tools_and_multi_step_workflow`: Verifies `google-genai` (`gemini-3.8-flash`), all 8 function declarations, and the 5-step planning workflow.
   - `test_tiger_data_temporal_intelligence_endpoints`: Verifies `environmental_observations` hypertable DDL, `corridor_daily_summary` rollup, 30-day trends, and intervention monitoring.
   - `test_iomete_procurement_studio_and_rfp_generation`: Verifies all 6 equipment categories, vendor questions, and Draft RFP generation.
   - `test_social_equity_and_community_observations`: Verifies anonymized community observation submission and human planner verification gate.
   - `test_digitalocean_deployment_artifacts_exist`: Verifies `.do/app.yaml`, `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, and `AGENTS.md`.

---

## 3. Reproducing the Test Suite

```bash
# Backend pytest suite
backend/venv/bin/python -m pytest backend/tests -v

# Frontend test suite + production Vite build
npm --prefix frontend test && npm --prefix frontend run build
```
