# Meko Track A — Official Judging Checklist, Scoring Matrix & Acceptance Evidence

**Project:** VanSetu — Urban Climate Action Intelligence  
**Challenge:** YugabyteDB / Meko AI Agent Challenge — Track A: Open Project (*"Build AI That Remembers"*)  
**Team:** Niharika Singh (`niharika-coding-agent`) & Kunal (`kunal-coding-agent`)

---

## 1. Official Track A Five-Criteria Acceptance Checklist (A1 – A5)

### A1 — Context Matters (`IMPLEMENTED` · `TESTED` · `DEMO VERIFIED`)
- **Identical User Request Tested With Meko ON and Meko OFF:**
  > `"Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh."`
- **Actual Recommendation With `MEKO OFF` (Stateless Baseline):**
  - Selected Portfolio (`scipy.optimize.milp`): **`Linear Street Trees` (`0.60 km`, `₹7.20 Lakh CapEx`, `₹0.72L/yr OpEx`)**.
  - Why: Evaluates only Sentinel-2 `10m` NDVI (`0.152`), MODIS `1,000m` LST (`39.8°C`), and OSM corridor width, assuming unencumbered soil along the footpath verge.
- **Actual Recommendation With `MEKO ON` (Persistent Context Active):**
  - Selected Portfolio (`scipy.optimize.milp`): **`Architectural Shade Structures` (`0.35 km`, `₹5.25 Lakh CapEx`) + `Cool Pavements` (`0.40 km`, `₹2.52 Lakh CapEx`) = `₹7.77 Lakh Total CapEx` (`₹0.59L/yr OpEx`)**.
- **Exact Meko Retrievals Responsible for the Difference:**
  1. `mem-know-c14-gpr` (Datapack: `vansetu-climate-knowledge`, `evidence_reference: "survey-014"`, `verification_status: "human_verified"`):
     - *"Ward 12 / Corridor C-14 (Lal Bahadur Shastri Marg): Ground-Penetrating Radar (GPR) survey-014 confirmed a shallow 66kV BSES underground power duct and DJB trunk water main at 0.7m depth along the pedestrian footpath verge. Deep tree-pit excavation (>1.0m) and bioswale trenching are strictly prohibited (`restricted_interventions: ['linear_street_trees', 'roadside_bioswales']`)."*
  2. `mem-dec-c14-2025` (Datapack: `vansetu-planning-decisions`, `evidence_reference: "pwd-order-2025-118"`, `verification_status: "human_verified"`):
     - *"Prior 2025 monsoon sapling plantation on C-14 was halted by PWD Utility Cell due to 66kV cable clearance violation; future allocations must use shallow pedestal shade structures (<0.35m footing) and high-albedo surface coatings."*
- **Reproducible Verification Command:**
  ```bash
  curl -s "http://localhost:7860/api/meko/compare-on-off?corridor_id=C-14&ward_id=ward-12&budget_lakh=8.0" | jq .diff_summary
  ```

---

### A2 — Real Meko Use (`5 / 5` Capabilities Implemented & Verified)

| # | Meko Capability | MCP Tool / Operation | Purpose in VanSetu | Code & Test Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Datapacks as Scopes** | `datapack_list`, `datapack_create`, `datapack_id` scoping (no retired tool-level `scope` args) | Isolates build-time coding memory (`vansetu-build`) from 3 runtime municipal datapacks (`vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`). | [`MekoService._enforce_datapack_access`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L148-L168), `test_meko_datapack_isolation_rbac` |
| **2** | **Extracted Memories** | `memory_add` | Extracts structured planning objectives, budget ceilings, and field observations into `vansetu-project-memory` as `pending_human_review`. | [`MekoService.add_memory`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L806-L913), `POST /api/meko/memories/add` |
| **3** | **Recall Before Reasoning** | `memory_search`, `knowledgebase_search` | Queries corridor, ward, and Haversine-nearby (`3.0 km`) verified memories before running the MILP budget optimizer or Gemini synthesis. | [`MekoService.search_memories`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L662-L804), `GET /api/meko/memories` |
| **4** | **Human-Approved Promotion** | `memory_promote` (gated by `verification_status == 'human_verified'`) | Elevates planner-verified site constraints from `vansetu-project-memory` into shared institutional `vansetu-climate-knowledge`. Blocks unverified AI outputs from promotion. | [`MekoService.promote_memory`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L984-L1064), `POST /api/meko/memories/{id}/promote` |
| **5** | **Cross-Agent Sharing + Correction & Forgetting** | Shared `datapack_id` across 3 agents + `memory_update` & `memory_delete` | Shares verified constraints across `climate_planner_agent` $\to$ `corridor_analysis_agent` $\to$ `intervention_planning_agent`, and allows planners to revise or delete outdated memories. | [`MekoService.update_or_verify_memory`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L915-L982), [`MekoService.delete_memory`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L1066-L1097), `test_meko_memory_lifecycle_add_verify_promote_delete` |

---

### A3 — User and Story (`IMPLEMENTED` · `DEMO VERIFIED`)
- **Single Persona:** **Aarav Mehta — Senior Municipal Urban Climate Planner (NCT of Delhi PWD / MCD Green Cell)**.
- **Coherent Planning Problem:** Allocating a constrained ₹8.0 Lakh ward micro-cooling budget across heat-exposed pedestrian corridors in Ward 12 (`C-14`, Lal Bahadur Shastri Marg) without repeating past civil excavation failures or utility strikes.
- **Continuous Session-to-Session Story:**
  - **Session 1 (Field Audit Intake & Human Verification):** Following a utility clearance audit, the municipal engineering team records GPR `survey-014` (`66kV BSES power duct & DJB water main at 0.7m depth on C-14`). The planner reviews and promotes `survey-014` to `vansetu-climate-knowledge` (`verification_status="human_verified"`).
  - **Session 2 (Budget Allocation & Procurement Generation):** Weeks later, when a planner asks VanSetu to allocate ₹8.0 Lakh on `C-14`, VanSetu recalls `survey-014` from Meko before invoking `scipy.optimize.milp`, automatically avoiding deep tree-pit excavation and generating Draft RFP `MCD-CLIMATE-RFP-C14-2026` for surface-mounted tensile shade structures and high-albedo cool pavements.

---

### A4 — Visible Context (`IMPLEMENTED` · `TESTED` · `DEMO VERIFIED`)
In **View 8 (`Institutional Memory (Meko)` — [`MekoMemoryStudioView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/MekoMemoryStudioView.jsx))** and the persistent top header:
1. **Visible `MEKO: ON / MEKO: OFF` Toggle:** Accessible from the global header and inside the Meko Studio, Optimizer, Procurement Studio, and AI Assistant views.
2. **Displayed Recalled & Stored Memories:** Lists every memory's `memory_id`, `datapack_logical`, `agent_id`, `ward_id`, `corridor_id`, `evidence_reference`, `verification_status`, and `valid_from`.
3. **Correction & Forgetting Controls:** Includes interactive **Verify & Promote** (`POST /api/meko/memories/{id}/promote`), update (`PATCH /api/meko/memories/{id}`), and **Delete / Forget** (`DELETE /api/meko/memories/{id}`) actions.
4. **Visible Datapack Scopes:** Displays all 4 datapacks (`vansetu-build`, `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`), their tier (`BUILD_TIME` vs `RUNTIME`), allowed agents, and live MCP operation logs (`GET /api/meko/activity`).

---

### A5 — Honest and Private (`IMPLEMENTED` · `TESTED`)
1. **Zero Personal Data & Zero Secrets:**
   - Regex security guard in [`MekoService.add_memory`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L830-L832) blocks any string matching API key patterns (`mko_tkn_`, `AIzaSy`, `sk-`, `postgres://`). Community observations store only anonymized roles.
2. **Honest Transport & Provenance Reporting:**
   - Every Meko API response explicitly reports `transport_mode`: `"live_meko_mcp"` when `MEKO_API_KEY` is configured in `.env`, or `"local_persistent_mcp_engine"` when running against the local SQLite persistence replica (`backend/data/meko_persistence.sqlite`). Nothing is displayed as Meko context unless returned by the active Meko store.
3. **Explicit Distinction Between Evidence, User Statements, and AI Suggestions:**
   - Verified civil surveys carry `source_type="municipal_gpr_survey"` and `verification_status="human_verified"`.
   - Planner/user notes carry `source_type="user_field_note"` and `verification_status="pending_human_review"`.
   - Agent-extracted objectives carry `source_type="agent_extracted_memory"` and `verification_status="pending_human_review"` and are blocked from promotion until human review.

---

## 2. Official Meko Scoring Breakdown (100 Points) & Evidence Index

| Scoring Category | Weight | How VanSetu Satisfies the Criterion | Evidence Location |
| :--- | :---: | :--- | :--- |
| **1. Idea** | **20 pts** | Solves institutional amnesia in municipal climate planning—connecting satellite/sensor heat analytics and MILP budget optimization with persistent corridor memory. | [`README.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/README.md), [`docs/MEKO_TRACK_A.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_TRACK_A.md) |
| **2. Meko's Role** | **30 pts** | Meko is the decision spine: recalling `survey-014` directly alters the deterministic MILP optimization constraints on Corridor `C-14`, shifting the ₹8.0L portfolio from deep-pit street trees (`₹7.20L`) to surface-bolted shade structures + cool pavements (`₹7.77L`). | [`meko_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py), `GET /api/meko/compare-on-off` |
| **3. Build and Execution** | **25 pts** | Full-stack FastAPI + React/Leaflet/Recharts platform with 10 cohesive views, 5 Meko capabilities, human verification gates, and `33/33` passing automated tests. | [`MekoMemoryStudioView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/MekoMemoryStudioView.jsx), [`docs/TESTING_REPORT.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/TESTING_REPORT.md) |
| **4. Built with Meko (Check T)** | **10 pts** | Separate `vansetu-build` datapack governed by [`AGENTS.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/AGENTS.md) with **12 promoted architectural decisions** authored across both teammates' coding agents (`niharika-coding-agent` & `kunal-coding-agent`) and verified cross-agent recall. | [`AGENTS.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/AGENTS.md), [`docs/MEKO_BUILD_DATAPACK.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_BUILD_DATAPACK.md), `GET /api/meko/check-t` |
| **5. Meko Feature Proposal** | **10 pts** | 2-page technical specification (**Geo-Temporal Memory for Meko: `spatial_scope` & `temporal_window`**) in both Markdown and PDF formats proposing PostGIS/Haversine hybrid geo-semantic recall on YugabyteDB. | [`docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.md`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.md), [`docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.pdf`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docs/MEKO_GEO_TEMPORAL_MEMORY_PROPOSAL.pdf) |
| **6. Build in Public** | **5 pts** | Ready-to-publish LinkedIn post draft with demo metrics, architecture summary, and hashtags. | [`README.md#5-build-in-public-linkedin-post-draft-meko-challenge-bonus`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/README.md) |
