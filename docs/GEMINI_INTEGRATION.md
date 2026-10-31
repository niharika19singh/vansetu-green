# MLH — Best Use of Google Gemini API (`google-genai` SDK & `gemini-3.8-flash`)

## 1. Architectural Role: Multi-Tool Climate Action Reasoning Agent

Rather than a generic text-only chatbot, VanSetu uses the official **`google-genai` SDK** (`from google import genai`, `from google.genai import types`) and model **`gemini-3.8-flash`** as a **function-calling orchestration engine** ([`gemini_agent_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/gemini_agent_service.py)).

**Core Scientific & Engineering Guardrail:**
- Gemini **never** invents or calculates numerical corridor priority scores, temperatures, or budget portfolios.
- All numerical computations are executed by deterministic Python tools (`scipy.optimize.milp`, `rasterio`, `geopandas`, and Tiger Data rollups), and Gemini synthesizes an explainable, procurement-ready recommendation grounded strictly in those tool outputs.

---

## 2. Eight Bound Function-Calling Tools

Defined in [`GEMINI_TOOL_DECLARATIONS`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/gemini_agent_service.py#L276-L396):

1. `get_corridor_rankings(scenario, limit)` — Retrieves top-ranked corridors under any of the 5 policy scenarios.
2. `get_corridor_details(corridor_id)` — Fetches native 10m Sentinel-2 NDVI, 1,000m MODIS LST, CPCB AQI, and Tri-Vector scores.
3. `run_climate_scenario(scenario, top_n)` — Runs multi-scenario sensitivity analysis and rank-stability evaluation.
4. `get_environmental_history(corridor_id, metric, days)` — Queries Tiger Data (TimescaleDB) 30-day rollups and heatwave exceedance days ($\ge 39^\circ\text{C}$).
5. `check_intervention_feasibility(corridor_id, ward_id, meko_enabled)` — Queries Meko `vansetu-climate-knowledge` and `vansetu-project-memory` for subsurface utility conflicts (`survey-014`).
6. `optimize_intervention_portfolio(corridor_id, budget_lakh, climate_priority, meko_enabled)` — Invokes `scipy.optimize.milp` to select the optimal intervention bundle under the municipal budget ceiling.
7. `get_previous_planning_decisions(corridor_id, ward_id, meko_enabled)` — Recalls historical corridor decisions from `vansetu-planning-decisions`.
8. `generate_procurement_plan(corridor_id, budget_lakh, meko_enabled)` — Generates an IOMETE Draft Municipal RFP (`MCD-CLIMATE-RFP-*`).

---

## 3. Five-Step Reasoning Lifecycle

When a planner submits `"Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh."` (`POST /api/agent/plan`):

1. **Step 1 (Meko Recall Before Reasoning):** Calls `get_previous_planning_decisions` and `check_intervention_feasibility` to discover `survey-014` (`linear_street_trees` and `roadside_bioswales` blocked by shallow 66kV power & DJB water mains).
2. **Step 2 (Geospatial & Temporal Evidence):** Calls `get_corridor_details` and `get_environmental_history` to inspect native thermal, vegetation, and 30-day heatwave persistence metrics.
3. **Step 3 (Deterministic MILP Optimization):** Calls `optimize_intervention_portfolio` (`₹8.0L` ceiling) $\to$ selects `Architectural Shade Structures (₹5.25L)` + `Cool Pavements (₹2.52L)` = `₹7.77L CapEx`.
4. **Step 4 (Procurement Specification):** Calls `generate_procurement_plan` to build the Bill of Quantities and vendor compliance checklist.
5. **Step 5 (Explainable Synthesis & Human Governance Gate):** Synthesizes the trade-off explanation and marks the output `awaiting_planner_confirmation` so human approval is required before procurement or Meko promotion.
