# VanSetu — Urban Climate Action Intelligence

**Geospatial Climate Intelligence • Persistent Institutional Memory (YugabyteDB / Meko) • Deterministic MILP Budget Optimizer • Gemini 3.8 Flash Multi-Tool Agent • Tiger Data Temporal Engine • IOMETE Climate Procurement Studio**

Repository: `https://github.com/niharika19singh/vansetu-green` (`main`)  
Hackathon: **HackCBS 9.0** — Primary Theme: **GreenTech**

---

## 1. Core Problem & Product Vision

Municipal urban planners repeatedly analyze the same heat-vulnerable pedestrian corridors, encounter identical subsurface utility blocks, compare cooling interventions, and allocate limited municipal budgets—yet institutional knowledge is scattered across PDFs and lost between planning teams.

**VanSetu — Urban Climate Action Intelligence** bridges high-resolution geospatial intelligence with persistent multi-agent decision memory:
1. **Geospatial Climate Assessment:** Preserves native **`10m` Sentinel-2 NDVI (`5572×7794`)** and **`1,000m` MODIS Terra LST (`57×79`)** resolutions without misrepresenting coarse satellite thermal data as street-level observations.
2. **Explainable Tri-Vector Prioritization & 5 Policy Scenarios:** Evaluates **Priority Need**, **Implementation Feasibility**, and **Evidence Confidence** across 44 NCT Delhi corridors, dynamically re-normalizing weights when signals are missing (`NaN`/`None` never silently becomes `0.0`).
3. **Deterministic MILP Budget Optimizer (`scipy.optimize.milp`):** Selects optimal portfolios across 5 intervention categories (*Linear Street Trees*, *Architectural Shade Structures*, *Roadside Bioswales*, *Living Green Walls*, *Cool Pavements*) under fixed municipal budgets.
4. **YugabyteDB / Meko Shared Context (Track A — Open Project):** Coordinates 3 runtime agents (`climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`) across 3 runtime datapacks (`vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`), strictly isolated from the coding-agent build datapack (`vansetu-build`, verified via Meko Check T with 12 promoted build decisions across Niharika & Kunal's coding agents).
5. **Google Gemini 3.8 Flash Function-Calling Agent (`google-genai`):** Orchestrates 8 deterministic backend tools without inventing mathematical results.
6. **Tiger Data (TimescaleDB) Temporal Engine:** Stores time-series observations in the `environmental_observations` hypertable and aggregates 30-day trends via the `corridor_daily_summary` continuous aggregate.
7. **IOMETE Climate Technology Procurement Studio ("Make Complex Tech Easy to Buy"):** Compares 6 climate hardware categories in plain language and generates procurement-ready municipal RFPs.
8. **Best Social Innovation:** Integrates socio-spatial equity weights and anonymized community observations with a mandatory human planner verification gate.

---

## 2. Quickstart (5 Commands)

```bash
# 1. Clone repository (with Git LFS GeoTIFF rasters)
git clone https://github.com/niharika19singh/vansetu-green.git && cd vansetu-green

# 2. Configure environment variables (works out-of-the-box with local persistent engines; add live keys optionally)
cp .env.example .env

# 3. Install backend & frontend dependencies
python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt && npm --prefix frontend install

# 4. Run automated verification suites (29 backend pytest + 4 frontend tests)
backend/venv/bin/python -m pytest backend/tests -v && npm --prefix frontend test

# 5. Start backend API (http://localhost:7860) and frontend UI (http://localhost:5173)
backend/venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 7860 & npm --prefix frontend run dev
```

---

## 3. Demonstrating Meko ON vs. Meko OFF

Prompt: **`"Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh."`**

- **MEKO OFF:** Selects `Linear Street Trees` (`₹7.20L CapEx`) based on satellite NDVI/LST alone.
- **MEKO ON:** Recalls human-verified GPR `survey-014` (`ward-12`, `C-14`: 66kV BSES power duct & DJB water main at `0.7m` depth), disqualifies deep tree-pit excavation and bioswales, and reallocates the ₹8.0L budget to **`Architectural Shade Structures` (`₹5.25L`) + `Cool Pavements` (`₹2.52L`) = `₹7.77L Total CapEx`**.

---

## 4. Architecture & Documentation Index

- [`AGENTS.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/AGENTS.md) — Coding-Agent Meko Protocol & Strict Datapack RBAC Table
- [`docs/MEKO_TRACK_A_ACCEPTANCE.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_TRACK_A_ACCEPTANCE.md) — Official Meko Track A Judging Checklist (A1–A5) & 100-Point Scoring Matrix
- [`docs/MEKO_TRACK_A.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_TRACK_A.md) — YugabyteDB / Meko Track A Architecture & 5 Capabilities
- [`docs/MEKO_BUILD_DATAPACK.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_BUILD_DATAPACK.md) — Shared Build Datapack (`vansetu-build`) & Check T Report (12 Promoted Decisions)
- [`docs/MEKO_PRODUCT_DATAPACKS.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_PRODUCT_DATAPACKS.md) — Runtime Product Datapacks & Geospatial Memory Schema
- [`docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.md) & [`docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.pdf`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.pdf) — Meko Feature Proposal: First-Class `spatial_scope` & `temporal_window` (Markdown + 2-Page PDF)
- [`docs/GEMINI_INTEGRATION.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/GEMINI_INTEGRATION.md) — Google Gemini 3.8 Flash (`google-genai`) 8-Tool Function-Calling Architecture
- [`docs/TIGER_DATA_ARCHITECTURE.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/TIGER_DATA_ARCHITECTURE.md) — Tiger Data (TimescaleDB) Hypertable & Continuous Aggregate Architecture
- [`docs/DIGITALOCEAN_DEPLOYMENT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/DIGITALOCEAN_DEPLOYMENT.md) — DigitalOcean App Platform (`.do/app.yaml`) & Spaces Pipeline
- [`docs/IOMETE_PROCUREMENT_STUDIO.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/IOMETE_PROCUREMENT_STUDIO.md) — IOMETE Climate Technology Procurement Studio ("Make Complex Tech Easy to Buy" — Conditional)
- [`docs/SOCIAL_IMPACT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/SOCIAL_IMPACT.md) — Equity-Aware Climate Planning & Anonymized Community Observations
- [`docs/PRIZE_COVERAGE_MATRIX.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/PRIZE_COVERAGE_MATRIX.md) — Official Track Compliance & Final Prize Acceptance Dashboard (`NOT STARTED` $\to$ `ELIGIBILITY CONFIRMED`)
- [`docs/DEV_WRITING_CHALLENGE_DRAFT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/DEV_WRITING_CHALLENGE_DRAFT.md) — MLH / DEV Writing Challenge Technical Article Draft (Conditional)
- [`docs/DEMO_SCRIPT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/DEMO_SCRIPT.md) — 5-Minute Two-Person Live Demo Script (Niharika & Kunal)
- [`docs/TESTING_REPORT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/TESTING_REPORT.md) — Automated Test Suite Report (`34/34` Passing)
- [`docs/DATA_PROVENANCE.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/DATA_PROVENANCE.md) — Scientific Provenance & Native vs. Display Resolution Disclosure

---

## 5. Build-in-Public LinkedIn Post Draft (Meko Challenge Bonus)

> **Building AI That Remembers for Urban Climate Action at HackCBS 9.0!**
>
> Urban climate planners in Delhi repeatedly analyze the same heat-exposed pedestrian corridors, rediscover the same underground utility hazards, and lose institutional memory between project cycles.
>
> At **HackCBS 9.0**, my teammate **Kunal** and I built **VanSetu — Urban Climate Action Intelligence**: a geospatial decision-support platform that combines native `10m` Sentinel-2 NDVI, `1,000m` MODIS thermal rasters, and a deterministic `scipy.optimize.milp` budget solver with **YugabyteDB / Meko (`https://mcp.mekodata.ai/mcp`)** persistent agent memory.
>
> **How Meko changed both how we built and how the product thinks:**
> 1. **Build-Time Memory (`vansetu-build`):** Our coding agents (`niharika-coding-agent` & `kunal-coding-agent`) promoted 12 architectural decisions into Meko so frontend and backend contracts stayed 100% synchronized across sessions (passing Meko Check T).
> 2. **Runtime Institutional Memory (`MEKO ON` vs `MEKO OFF`):** When planning for Ward 12, Corridor C-14 under an ₹8 Lakh budget with **Meko OFF**, the optimizer recommends deep-pit Linear Street Trees (`₹7.20L`). With **Meko ON**, our `intervention_planning_agent` recalls human-verified GPR `survey-014` (a shallow 66kV power duct & water main at 0.7m depth), automatically excludes deep excavation, and reallocates the budget to surface-bolted Architectural Shade Structures + High-SRI Cool Pavements (`₹7.77L`).
>
> We also authored a protocol proposal for **Geo-Temporal Memory in Meko (`spatial_scope`)** to bring first-class PostGIS/Haversine proximity recall to civic AI agents.
>
> Repo: https://github.com/niharika19singh/vansetu-green  
> #HackCBS #Meko #YugabyteDB #GreenTech #ClimateTech #GeminiAPI #TigerData #DigitalOcean #IOMETE #BuildInPublic
