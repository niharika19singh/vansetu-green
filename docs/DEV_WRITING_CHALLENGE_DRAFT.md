# DEV Writing Challenge Draft — Why Urban Climate AI Needs Persistent Geospatial Memory & Deterministic MILP Optimization

> **PUBLICATION GOVERNANCE NOTICE (Section F):**  
> This technically substantive article is prepared for the **MLH / DEV Writing Challenge** if its participation is confirmed for HackCBS 9.0. **Do not publish without explicit team approval (Niharika & Kunal) and event confirmation.**

---

## Title
**How We Built an Urban Climate Action Intelligence Platform That Remembers Underground Utilities Using YugabyteDB/Meko, `scipy.optimize.milp`, Tiger Data, and Gemini 3.8 Flash**

## 1. The Engineering Problem: Stateless AI Fails in Physical Infrastructure

When municipal planners evaluate urban heat islands across 44 walkable road corridors in NCT Delhi, two failure modes consistently break typical AI decision-support prototypes:

1. **Resolution Distortion & Hallucinated Math:**
   - Satellite thermal imagery (NASA MODIS MOD11A1) has a native spatial resolution of **`1,000m` (`57×79` grid over Delhi)**, whereas ESA Sentinel-2 NDVI has a native spatial resolution of **`10m` (`5572×7794`)**. Asking an LLM to "recommend a ₹8 Lakh budget allocation" without a deterministic solver produces fabricated CapEx numbers and treats 1km thermal pixels as street-level sensors.
2. **Institutional Amnesia Across Planning Sessions:**
   - Suppose a Ground-Penetrating Radar (GPR) audit (`survey-014`) in Ward 12 (`Corridor C-14`, Lal Bahadur Shastri Marg) discovers a shallow `66kV` underground power duct and trunk water main at `0.7m` depth. In a stateless tool, the next planning session forgets `survey-014` and recommends planting deep-pit street trees (`>1.0m` excavation)—leading to halted civil works and wasted municipal funds.

---

## 2. Architecture: Separating Memory, Time-Series, Optimization, and Reasoning

In **VanSetu — Urban Climate Action Intelligence**, we separated responsibilities across four purpose-built layers:

### A. Geospatial & Deterministic MILP Layer (`rasterio` + `scipy.optimize.milp`)
We formulate municipal budget allocation as a Mixed-Integer Linear Program:
\[
\max_{x_{c,i} \in \{0,1\}} \sum_{c,i} U_{c,i} \, x_{c,i}
\quad \text{subject to} \quad
\sum_{c,i} \text{CapEx}_{c,i} \, x_{c,i} \le B, \quad
x_{c,i} = 0 \;\;\forall (c,i) \in \mathcal{R}_{\text{Meko}}
\]
where $\mathcal{R}_{\text{Meko}}$ is the set of corridor-intervention pairs excluded by human-verified Meko site constraints, and $U_{c,i}$ weights Priority Need, Feasibility, Evidence Confidence, and a Socio-Spatial Equity multiplier.

### B. Persistent Multi-Agent Context Layer (YugabyteDB / Meko MCP)
We enforce strict role-based access control (RBAC) across four Meko datapacks:
- **Build-Time Datapack (`vansetu-build`):** Exclusively accessible by coding agents (`niharika-coding-agent` and `kunal-coding-agent`), storing 12 promoted architectural contracts (verified via Meko Check T).
- **Runtime Datapacks (`vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`):** Exclusively accessible by runtime agents (`climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`).

When `MEKO OFF` is selected on Corridor `C-14` (`₹8.0L` budget), the MILP solver selects **Linear Street Trees (`₹7.20L`)**. When `MEKO ON` is toggled, `intervention_planning_agent` recalls `survey-014` from `vansetu-climate-knowledge`, constrains $x_{\text{C-14},\text{trees}} = 0$ and $x_{\text{C-14},\text{bioswales}} = 0$, and reallocates the budget to **Architectural Shade Structures (`₹5.25L`) + Cool Pavements (`₹2.52L`) = `₹7.77L`**.

### C. Temporal Environmental Layer (Tiger Data / TimescaleDB)
We partition corridor telemetry in a TimescaleDB hypertable (`environmental_observations`) on `observed_at` with 7-day chunks and maintain a continuous aggregate (`corridor_daily_summary`) using `time_bucket('1 day', observed_at)`. Every row carries an explicit `is_simulated` boolean so synthetic backfills are never confused with verified satellite/station anchors.

### D. Multi-Tool Function Calling (`google-genai` SDK + `gemini-3.8-flash`)
Our Gemini 3.8 Flash agent binds 8 deterministic Python tools (`get_previous_planning_decisions`, `check_intervention_feasibility`, `get_corridor_details`, `get_environmental_history`, `optimize_intervention_portfolio`, `generate_procurement_plan`, `get_corridor_rankings`, `run_climate_scenario`)—recalling Meko context first and gating any permanent knowledge promotion behind human planner verification.
