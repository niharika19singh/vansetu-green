# HackCBS 9.0 — 5-Minute Two-Person Live Demo Script

**Team:**
- **Niharika:** Backend, Geospatial/Raster Engine, MILP Optimizer, Meko MCP, Gemini 3.8 Flash, Tiger Data.
- **Kunal:** Frontend 10-View Decision Workspace, IOMETE Procurement Studio, Social Equity, DigitalOcean Deployment.

---

## Minute 0:00 – 0:45 | Problem & Geospatial Climate Intelligence (Kunal)
1. **Open View 1 (`Climate Overview`) & View 2 (`Interactive Map`):**
   - **Kunal:** *"Municipal planners in Delhi repeatedly analyze the same heat-vulnerable pedestrian corridors, hit the same underground utility blocks, and lose institutional memory between project cycles. VanSetu connects native geospatial intelligence with persistent Meko decision memory."*
   - Toggle between **Sentinel-2 NDVI (`10m Native`, `5572×7794`)** and **MODIS LST (`1,000m Native`, `57×79` $\to$ `10m Display`)**, pointing out the explicit native-vs-display resolution disclosure in the map legend.
   - Select **Corridor `C-14` (Lal Bahadur Shastri Marg, `ward-12`)** and inspect its Tri-Vector scores (**Priority Need**, **Feasibility**, **Evidence Confidence**).

## Minute 0:45 – 2:15 | YugabyteDB / Meko "Build AI That Remembers" & MILP Optimizer (Niharika)
2. **Open View 8 (`Institutional Memory (Meko)`) & View 5 (`Intervention Optimizer`):**
   - **Niharika:** *"Watch what happens when we ask for an intervention plan on Ward 12, Corridor C-14 under a fixed ₹8.0 Lakh municipal budget with **MEKO OFF** vs **MEKO ON**."*
   - Show the **MEKO OFF** card: Without memory, the deterministic `scipy.optimize.milp` solver selects **Linear Street Trees (`₹7.20L CapEx`)** based solely on satellite NDVI/LST.
   - Toggle **MEKO ON**: The `intervention_planning_agent` queries `vansetu-climate-knowledge` and recalls human-verified GPR **`survey-014`** (66kV BSES power duct & DJB water main at `0.7m` depth).
   - Deep-excavation tree pits and bioswales are automatically excluded, and the MILP solver reallocates the ₹8.0L budget to **Architectural Shade Structures (`₹5.25L`) + Cool Pavements (`₹2.52L`) = `₹7.77L Total CapEx`**.
   - Highlight the **Meko Check T** badge showing **12 promoted architectural decisions** in `vansetu-build` shared between `niharika-coding-agent` and `kunal-coding-agent`, with strict `HTTP 403` isolation between build and runtime datapacks.

## Minute 2:15 – 3:15 | Gemini 3.8 Flash Multi-Tool Agent & Tiger Data Time-Series (Niharika)
3. **Open View 7 (`AI Planning Assistant`) & View 9 (`Temporal Insights (Tiger Data)`):**
   - **Niharika:** *"Our Gemini 3.8 Flash agent (`google-genai` SDK) never invents math. It invokes 8 deterministic backend tools in sequence—starting with Meko recall, querying Tiger Data 30-day thermal history, running the MILP solver, and enforcing a human approval gate before promoting any new memory."*
   - Switch to **View 9 (`Temporal Insights`)**: Show the `environmental_observations` TimescaleDB hypertable and `corridor_daily_summary` continuous aggregate chart, pointing out heatwave exceedance days ($\ge 39^\circ\text{C}$), before/after pilot cooling (`-2.6°C` surface radiant drop on `C-14`), and explicit `is_simulated` badges.

## Minute 3:15 – 4:15 | IOMETE Procurement Studio & Social Equity (Kunal)
4. **Open View 6 (`Climate Procurement Studio`) & View 10 (`Evidence & Data Provenance`):**
   - **Kunal:** *"Once an intervention portfolio is selected, municipal buyers face complex hardware specs. For the IOMETE challenge, our Climate Procurement Studio compares 6 equipment categories—AQI nodes, WBGT weather stations, FDR soil probes, smart drip valves, GPR scanners, and tensile shade systems—in plain English, complete with vendor questions and a one-click Draft Municipal RFP (`MCD-CLIMATE-RFP-C14-2026`)."*
   - Switch to **View 10 (`Evidence & Data Provenance`)**: Show anonymized community observations from outdoor workers and school commuters on `C-14`, demonstrating the **Planner Verify** human-in-the-loop governance button.

## Minute 4:15 – 5:00 | DigitalOcean Architecture & Q&A Wrap-Up (Kunal & Niharika)
5. **Summary:**
   - Show `.do/app.yaml` and DigitalOcean Spaces raster streaming support, plus the 33 automated backend & frontend tests passing (`29 pytest` + `4 node:test`).
