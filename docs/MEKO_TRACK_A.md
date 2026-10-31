# YugabyteDB / Meko AI Agent Challenge — Track A: Open Project

## 1. Challenge Alignment: "Build AI That Remembers"

Urban climate planners repeatedly evaluate the same road corridors, encounter identical subsurface utility blocks, compare heat-mitigation alternatives, and make budget allocation trade-offs—yet institutional memory is scattered across PDFs, field notebooks, and Siloed departments.

**VanSetu — Urban Climate Action Intelligence** solves this by pairing deterministic geospatial/MILP intelligence with **YugabyteDB / Meko Shared Context (`https://mcp.mekodata.ai/mcp`)**.

---

## 2. Three-Agent Architecture Coordinated Through Meko

| Agent ID | Role | Primary Responsibilities | Allowed Runtime Datapacks |
| :--- | :--- | :--- | :--- |
| `climate_planner_agent` | **Climate Planner Agent** | Parses user planning objectives, budgets, and target wards; recalls session and project context before reasoning; stores candidate planning memories. | `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions` |
| `corridor_analysis_agent` | **Corridor Analysis Agent** | Computes Tri-Vector corridor priority scores, runs 5-scenario sensitivity comparisons, and recalls historical corridor decisions. | `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions` |
| `intervention_planning_agent` | **Intervention Planning Agent** | Recalls human-verified site constraints (`survey-014`), executes the deterministic `scipy.optimize.milp` budget optimizer, and compiles procurement plans. | `vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions` |

---

## 3. Five Meko Capabilities Demonstrated End-to-End

1. **Datapacks as Scopes (`datapack_id` Isolation):**
   - Strictly separates coding-agent build memory (`vansetu-build`) from runtime application memory (`vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`).
   - Enforced in [`MekoService._enforce_datapack_access`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L148-L168) and verified by automated RBAC tests (`HTTP 403` on cross-tier access).
   - Never passes retired tool-level `scope` parameters to Meko MCP tools.
2. **Extracted Memories (`memory_add`):**
   - Automatically extracts structured planning objectives, site constraints, and budget rules from user interactions into `vansetu-project-memory`.
3. **Recall Before Reasoning (`memory_search` / `knowledgebase_search`):**
   - Before running the MILP budget optimizer, `intervention_planning_agent` queries `vansetu-climate-knowledge` and `vansetu-project-memory` for verified corridor constraints.
4. **Human-Approved Knowledge Promotion (`memory_promote`):**
   - Unverified candidate memories (`verification_status="pending_human_review"`) **cannot** alter institutional constraints or be promoted until a municipal reviewer verifies them (`verification_status="human_verified"`).
5. **Cross-Agent Knowledge Sharing:**
   - A subsurface utility conflict recorded during a field audit (`survey-014`) is recalled by `intervention_planning_agent` and `climate_planner_agent` to prevent illegal deep-pit excavation.

---

## 4. Demonstrable Outcome Difference: MEKO OFF vs. MEKO ON

**Identical Prompt:**
> `"Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh."`

| Mode | Recalled Memory | Selected Portfolio (`scipy.optimize.milp`) | Total CapEx | Engineering Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **MEKO OFF** | None (Stateless) | `Linear Street Trees` (`0.60 km`) | **₹7.20 Lakh** | Relies only on Sentinel-2 NDVI and MODIS LST; assumes soil verge is unencumbered. |
| **MEKO ON** | `survey-014` (`ward-12`, `C-14`: 66kV BSES power duct & DJB water main at 0.7m depth) | `Architectural Shade Structures` (`₹5.25L`) + `Cool Pavements` (`₹2.52L`) | **₹7.77 Lakh** | Recalls `survey-014`, disqualifies deep excavation (`linear_street_trees`, `roadside_bioswales`), and reallocates the ₹8.0L budget to surface-mounted cooling. |

Verify via API:
```bash
curl -s "http://localhost:7860/api/meko/compare-on-off?corridor_id=C-14&ward_id=ward-12&budget_lakh=8.0" | jq .diff_summary
```
