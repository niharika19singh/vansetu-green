# ADVANCED FEATURE IMPLEMENTATION AUDIT
## VanSetu — Advanced Climate Investment Intelligence

**Author:** Software Architect & Principal Geospatial/Full-Stack Engineer  
**Date:** 2026-10-31  
**Repository:** `https://github.com/niharika19singh/vansetu-green`  
**Base Commit:** `ea6598cdeb08decd445f3355531274130986e767` (`origin/main`)  
**Target Branch:** `feature/climate-investment-intelligence`  
**Evaluation Scope:** 8 Research-Backed Interconnected Features

---

## 1. Executive Summary & Verification of Baseline Claims

Before implementing the 8 interconnected features, a comprehensive technical audit of the verified `origin/main` codebase was conducted. The baseline contains 30 passing backend pytest tests and 4 passing frontend node tests.

### Verification of Existing Assets:
1. **44 Real Walkable Corridors:** Verified in `backend/data/delhi_roads_cached.geojson` across all 11 NCT Delhi revenue districts with stable IDs (`delhi_corridor_001` to `delhi_corridor_044`, alias `C-01` to `C-44`).
2. **True Raster Provenance:** Verified `backend/data/delhi_ndvi_10m.tif` (250MB, 10m native Sentinel-2 surface reflectance) and `backend/data/delhi_lst_modis_daily_celsius.tif` (1km native MODIS Terra LST, resampled for display).
3. **Tri-Vector Scoring & Sensitivity:** Complete 6-indicator multi-hazard prioritization with dynamic weight re-normalization across 5 policy scenarios (`baseline`, `heat_resilience`, `air_quality`, `pedestrian_equity`, `extreme_vulnerability`).
4. **Deterministic MILP Optimizer:** Powered by `scipy.optimize.milp` with HiGHS backend allocating budgets across 5 GreenTech intervention classes.
5. **Meko Institutional Memory:** Strict 4-datapack RBAC model (`vansetu-build`, `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`) with Check T verification.
6. **Gemini Multi-Tool Agent:** 8 registered backend tool declarations with deterministic fallback orchestration when `GEMINI_API_KEY` is unset.
7. **Tiger Data (TimescaleDB):** Operational hypertable DDL with SQLite persistence fallback (`backend/data/tiger_timeseries.sqlite`).
8. **Procurement Studio:** IOMETE challenge equipment catalog with CPWD DSR 2023 reference pricing and draft RFP generation.

---

## 2. Capability Gap Analysis: 8 Research-Backed Features

The table below outlines the existing implementation, missing capability, and proposed change for each of the 8 required features:

| Area | Existing implementation | Missing capability | Proposed change |
|---|---|---|---|
| **1. Evidence Passport** | Generic provenance modal and 6-indicator formula trace. | Structured corridor-level evidence breakdown ("WHAT WE KNOW", "WHAT WE DON'T KNOW", "WHAT REQUIRES VERIFICATION") across vegetation, surface heat, air quality, social vulnerability, and site feasibility. | Create `backend/app/services/evidence_passport_service.py` and router `/api/evidence/passport/{corridor_id}`, exposing 5 data quality dimensions and actionable improvement recommendations. |
| **2. Right Tree, Right Place (Segment-Level Site Suitability)** | Corridor-wide suitability scoring and 5 intervention archetypes. | Sub-corridor spatial segmentation (100m–250m spans), segment-specific physical constraints (ROW width, underground utilities, soil type), alternative selection logic, and Delhi native tree species catalog. | Create `backend/app/services/segment_suitability_service.py` dividing 44 corridor LineStrings into deterministic, stable segments; evaluate 5 archetypes per segment with explicit feasibility states (`FEASIBLE_ESTIMATE`, `FIELD_VERIFICATION_REQUIRED`, `CONSTRAINT_IDENTIFIED`, `NOT_FEASIBLE`). |
| **3. Pareto Portfolio Lab** | Single-run MILP optimizer optimizing one weighted objective at a time. | Multi-objective Pareto frontier generation under budget constraints (₹20L, ₹50L, ₹1Cr, custom), comparing non-dominated trade-offs between climate priority, equity share, and 5-yr lifecycle cost. | Create `backend/app/services/pareto_optimizer_service.py` running epsilon-constraint and multi-weight HiGHS MILP runs, filtering strictly non-dominated solutions, and exposing trade-off metrics. |
| **4. Pedestrian Shade Continuity Analyser** | Corridor-average NDVI and green deficit index. | Topological walkability graph model (intersections, transit stops, corridor edges), identifying unshaded pedestrian gaps, canopy disconnection, and prioritized shade-gap closure scoring. | Create `backend/app/services/shade_continuity_service.py` computing pedestrian network walkability graphs, identifying shade gap intervals, and calculating Shade Gap Scores without fabricating pedestrian footfall. |
| **5. Seasonal Urban Heat Intelligence** | Single pre-monsoon composite rasters (MODIS LST, Sentinel-2 NDVI). | Comparable seasonal observations (Pre-Monsoon Mar–Jun, Monsoon Jul–Sep, Post-Monsoon/Winter Oct–Feb), persistent thermal hotspot detection (&ge;3 seasonal observations), and Landsat 8/9 100m native vs. 30m grid distinction. | Create `backend/app/services/seasonal_heat_service.py` analyzing seasonal thermal dynamics, persistence metrics, and maintaining strict distinction between surface skin LST and human heat stress (UTCI/WBGT). |
| **6. Climate Intervention Impact Monitoring** | Synthetic deployment records in `tiger_timeseries.sqlite`. | Formal intervention lifecycle registry (`PLANNED`, `UNDER_CONSTRUCTION`, `OPERATIONAL`, `MAINTENANCE_REQUIRED`), empirical baseline vs. follow-up comparisons, control corridor pairing, and honest causal non-attribution disclaimers. | Create `backend/app/services/impact_monitoring_service.py` managing lifecycle records, baseline vs. post-installation deltas, maintenance tracking, and control corridor comparison. |
| **7. Spatial Institutional Memory Map (Meko)** | Text-based Meko memories filtered by logical datapack and corridor code. | Interactive map-linked spatial memory pins (coordinates, ward, corridor, segment), visual pins categorized by observation type (utility restriction, field observation, approved decision), and full lifecycle actions (Review, Approve, Correct, Promote, Forget, Supersede). | Create `backend/app/services/spatial_memory_service.py` projecting Meko memories onto spatial coordinates, linking memories directly to segments and corridors, and powering interactive map overlays. |
| **8. Climate Project Implementation & Readiness Planner** | Procurement catalog and draft RFP generator without lifecycle tracking. | Translation of optimized portfolios into 8 standard municipal work packages (Site Verification, Engineering/Design, Approvals, Procurement, Construction, Inspection, Maintenance, Monitoring) with 8-state readiness tracking. | Create `backend/app/services/project_readiness_service.py` generating structured municipal work packages, tracking milestone readiness, and connecting directly to the IOMETE Procurement Studio. |

---

## 3. Coherent Architectural Blueprint & Data Model

All 8 features will be integrated into the existing VanSetu architecture without fragmenting into disconnected sub-applications:

```
[PLAN]
├── 1. Climate Overview (Citywide Baseline & Telemetry)
├── 2. Interactive Map (Geospatial Multi-Layer Canvas)
├── 3. Corridor Intelligence (Prioritization & Tri-Vector Assessment)
├── 4. Corridor Evidence Passport (Feature 1: What We Know / Don't Know / Verification)
├── 5. Right Tree, Right Place (Feature 2: Segment Suitability & Constraints)
├── 6. Pedestrian Shade Continuity (Feature 4: Walkability Network & Gap Closure)
└── 7. Seasonal Climate Explorer (Feature 5: Temporal Heat & Persistent Hotspots)

[INVEST]
├── 8. Pareto Portfolio Lab (Feature 3: Multi-Objective MILP Frontiers & Trade-offs)
├── 9. Climate Procurement Studio (IOMETE: Plain-Language Buyer Specs & RFP)
└── 10. Project Implementation & Readiness Planner (Feature 8: Work Packages & Milestones)

[LEARN]
├── 11. Spatial Institutional Memory Map (Feature 7: Meko Map Pins & Lifecycle)
├── 12. Climate Intervention Impact Monitoring (Feature 6: Before/After & Control)
├── 13. Social Equity & Community Observations (Vulnerable Groups & Verification)
└── 14. Temporal Environmental Insights (Tiger Data TimescaleDB Analytics)
```

### Unified Data Persistence Plan:
- `backend/data/delhi_roads_cached.geojson`: Source for deterministic corridor segmentation (Feature 2 & Feature 4).
- `backend/data/climate_intelligence.sqlite`: Relational SQLite database for persistent registries:
  - `corridor_segments`: Segment geometry, length, right-of-way, and baseline indicators.
  - `segment_suitability`: 5-archetype suitability and constraint flags per segment.
  - `tree_species_catalog`: Local NCT Delhi native species with root/canopy attributes.
  - `pareto_portfolios`: Stored non-dominated portfolio runs and solutions.
  - `intervention_registry`: Persistent lifecycle records for implemented projects.
  - `project_readiness_packages`: 8 work packages and milestone states per project.
  - `spatial_memory_links`: Georeferenced spatial anchors for Meko memory IDs.
- `backend/data/tiger_timeseries.sqlite`: TimescaleDB hypertable fallback for environmental monitoring telemetry.
- `backend/data/meko_persistence.sqlite`: Meko memory storage across 4 isolated datapacks.

---

## 4. Scientific Guardrails & Data Honesty Protocol

1. **Surface Temperature vs. Human Thermal Comfort:** MODIS LST (1,000m native) is strictly designated as radiometric surface skin temperature. Universal Thermal Climate Index (UTCI) and Wet-Bulb Globe Temperature (WBGT) are explicitly marked `Not available` in the absence of on-street 2m air temperature, humidity, wind, and radiation sensors.
2. **Native vs. Display Spatial Resolution:** Sentinel-2 NDVI is documented as 10m native surface reflectance; MODIS LST is documented as 1,000m native resampled to 10m display grid.
3. **Synthetic Demo Scenario Disclosures:** Corridor C-14 shallow BSES 66kV power duct and DJB water-main survey records are explicitly badged as `SYNTHETIC DEMONSTRATION SCENARIO`.
4. **Deterministic Math Guarantee:** All optimization is computed via `scipy.optimize.milp` (HiGHS). LLMs are never used for numerical optimization, scoring, or cost estimates.
5. **No Causal Over-claiming:** Impact monitoring explicitly separates observed environmental differences from confirmed causal attribution, noting seasonal and meteorological confounders.

---

## 5. Phased Execution Roadmap

- **Phase 1: Evidence & Feasibility Foundation**
  - Implement Feature 1: Corridor Evidence Passport (`evidence_passport_service.py`, router, tests).
  - Implement Feature 2: Right Tree, Right Place (`segment_suitability_service.py`, segmentation logic, native species catalog, router, tests).
- **Phase 2: Advanced Budget Decisions**
  - Implement Feature 3: Pareto Portfolio Lab (`pareto_optimizer_service.py`, multi-objective MILP, non-dominated sorting, router, tests).
- **Phase 3: Pedestrian & Temporal Climate Intelligence**
  - Implement Feature 4: Pedestrian Shade Continuity Analyser (`shade_continuity_service.py`, network graph, shade gap scoring, router, tests).
  - Implement Feature 5: Seasonal Urban Heat Intelligence (`seasonal_heat_service.py`, multi-temporal thermal window analysis, persistent hotspots, router, tests).
- **Phase 4: Institutional & Outcome Learning**
  - Implement Feature 6: Climate Intervention Impact Monitoring (`impact_monitoring_service.py`, intervention registry, before/after control analysis, router, tests).
  - Implement Feature 7: Spatial Institutional Memory Map (`spatial_memory_service.py`, Meko spatial pins, lifecycle actions, router, tests).
- **Phase 5: Execution Workflow**
  - Implement Feature 8: Climate Project Implementation & Readiness Planner (`project_readiness_service.py`, 8 work packages, readiness tracker, router, tests).
- **Phase 6: Full Integration, Frontend Experience & QA**
  - Connect all 8 features into a cohesive, navigable frontend with comprehensive automated backend and frontend test suites and complete documentation.
