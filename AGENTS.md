# VanSetu GreenTech — Multi-Agent Build & Meko Protocol (`AGENTS.md`)

## 1. Purpose & Team Context

This repository (`vansetu-green`) is developed by a two-person engineering team for **HackCBS 9.0**:
- **Niharika (`niharika-coding-agent`)** — Backend, Geospatial Raster/Vector Engine, MILP Budget Optimizer, Meko Architecture, Gemini Function Calling, and Tiger Data Time-Series Backend.
- **Kunal (`kunal-coding-agent`)** — Frontend Decision Studio, Interactive Leaflet Map, Institutional Memory UI, Temporal Insights Charts, IOMETE Procurement Studio UI, and DigitalOcean App Platform Deployment.

All coding agents operating on this repository share a dedicated **build-time Meko datapack** (`vansetu-build`, configured via `MEKO_BUILD_DATAPACK_ID`) hosted at `https://mcp.mekodata.ai/mcp`.

---

## 2. Mandatory 5-Step Protocol for Coding Agents

Every coding agent session MUST follow these five rules without exception:

1. **Recall the Shared Build Datapack Before Starting Any Task:**
   - Before modifying code, schemas, or APIs, invoke `memory_search` and `knowledgebase_search` against the `vansetu-build` datapack (`MEKO_BUILD_DATAPACK_ID`) to retrieve current architecture decisions, API contracts, and debugging notes.
2. **Check Decisions Already Made by the Other Teammate:**
   - Filter recalled memories by `author_agent` (`niharika-coding-agent` vs. `kunal-coding-agent`) to ensure frontend/backend contracts, coordinate reference systems (`EPSG:4326`), corridor IDs (`C-01`–`C-44` / `delhi_corridor_001`–`044`), and unit conventions (`INR Lakhs`) remain 100% aligned.
3. **Save a Short Summary at the End of Each Task:**
   - Upon completing a development or debugging task, invoke `memory_add` on `vansetu-build` with structured metadata (`author_agent`, `teammate`, `component`, `summary`, `files_touched`, `timestamp`).
4. **Promote Decisions That the Rest of the Team Must Follow:**
   - When an architectural decision, API schema, or mathematical constraint affects both teammates, promote the memory via `memory_promote` in `vansetu-build` so it becomes authoritative shared build knowledge (satisfying **Meko Check T**).
5. **Never Store API Keys or Personal Information in the Build Datapack:**
   - Never write `GEMINI_API_KEY`, `MEKO_API_KEY`, `TIGER_DATA_URL`, `DO_SPACES_SECRET`, tokens, passwords, or personally identifiable information (PII) into any Meko datapack. Reference environment variable names only.

---

## 3. Strict Build-Time vs. Runtime Datapack Isolation

| Datapack Role | Logical Name | Environment Variable | Permitted Access | Forbidden Access |
| :--- | :--- | :--- | :--- | :--- |
| **Build-Time (Coding Agents)** | `vansetu-build` | `MEKO_BUILD_DATAPACK_ID` | `niharika-coding-agent`, `kunal-coding-agent` | All runtime product agents (`climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`) |
| **Runtime — Project Context** | `vansetu-project-memory` | `MEKO_PROJECT_DATAPACK_ID` | Runtime product agents | Coding agents |
| **Runtime — Institutional Knowledge** | `vansetu-climate-knowledge` | `MEKO_KNOWLEDGE_DATAPACK_ID` | Runtime product agents (read all; write only after human verification & promotion) | Coding agents |
| **Runtime — Decision Ledger** | `vansetu-planning-decisions` | `MEKO_DECISIONS_DATAPACK_ID` | Runtime product agents & authorized municipal reviewers | Coding agents |

> **MCP Schema Rule:** Do not send retired tool-level `scope` parameters to Meko MCP tools. Isolation is enforced strictly through `datapack_id` scoping and `memory_promote`.
