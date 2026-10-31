# Meko Shared Build Datapack (`vansetu-build`) & Check T Verification

## 1. Purpose & Strict RBAC Boundary

The `vansetu-build` datapack stores architectural decisions, API contracts, geospatial invariants, and schema conventions shared between our two teammates' coding agents during the build of **VanSetu — Urban Climate Action Intelligence**:

- **Niharika** (`niharika-coding-agent`): Backend, Geospatial Pipeline, MILP Optimizer, Meko MCP, Gemini 3.8 Flash, Tiger Data.
- **Kunal** (`kunal-coding-agent`): Frontend 10-View Architecture, Map/Chart Visualizations, IOMETE Studio UI, DigitalOcean Deployment.

**Strict Isolation Rule:**
- Only `niharika-coding-agent` and `kunal-coding-agent` may read or write `vansetu-build`.
- Runtime product agents (`climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`) are strictly blocked (`HTTP 403`) from accessing `vansetu-build`.

---

## 2. Meko Check T Verification Summary

Endpoint: `GET /api/meko/check-t`

- **Total Promoted Architectural Decisions:** `12` ($\ge 10$ required by Check T)
- **Contributing Coding Agents:** `niharika-coding-agent` (6 promoted decisions) and `kunal-coding-agent` (6 promoted decisions)
- **Cross-Agent Recall Verified:** `kunal-coding-agent` queries Meko for `"milp optimizer native resolution"` and recalls `niharika-coding-agent`'s promoted backend contracts directly from `vansetu-build`.

---

## 3. Promoted Build Decisions Inventory (`vansetu-build`)

| Memory ID | Author Agent | Teammate | Topic Summary |
| :--- | :--- | :--- | :--- |
| `build-dec-001` | `niharika-coding-agent` | Niharika | Native vs. Display Raster Resolution Contract (`57x79` 1km MODIS vs `5572x7794` 10m Sentinel-2). |
| `build-dec-002` | `niharika-coding-agent` | Niharika | Missing-Data Dynamic Weight Re-Normalization Contract (never coerce `NaN`/`None` to `0.0`). |
| `build-dec-003` | `niharika-coding-agent` | Niharika | Deterministic MILP Optimizer (`scipy.optimize.milp`) API Contract (`/api/optimizer/run`). |
| `build-dec-004` | `niharika-coding-agent` | Niharika | Meko Datapack Isolation & Removal of Retired Tool-Level `scope` Parameters. |
| `build-dec-005` | `niharika-coding-agent` | Niharika | Tiger Data Hypertable (`environmental_observations`) & Continuous Aggregate (`corridor_daily_summary`). |
| `build-dec-006` | `niharika-coding-agent` | Niharika | Gemini 3.8 Flash (`google-genai` SDK) 8-Tool Function-Calling Contract (`/api/agent/plan`). |
| `build-dec-007` | `kunal-coding-agent` | Kunal | Cohesive 10-View Frontend Navigation Bar & Persistent Header `MEKO: ON / OFF` Switch. |
| `build-dec-008` | `kunal-coding-agent` | Kunal | Interactive Leaflet Tile Overlay & Native 1km vs Display 10m Dual-Value Tooltip. |
| `build-dec-009` | `kunal-coding-agent` | Kunal | Meko Institutional Memory Studio UI & Live Side-by-Side `MEKO OFF` vs `MEKO ON` Diff Card. |
| `build-dec-010` | `kunal-coding-agent` | Kunal | IOMETE Climate Technology Procurement Studio UI (6 Categories + Draft Municipal RFP). |
| `build-dec-011` | `kunal-coding-agent` | Kunal | Tiger Data Recharts 30-Day Rollup Visualization & Explicit `is_simulated` Disclosure Badge. |
| `build-dec-012` | `kunal-coding-agent` | Kunal | DigitalOcean App Platform (`.do/app.yaml`) & Multi-Stage Nginx/FastAPI Container Pipeline. |
