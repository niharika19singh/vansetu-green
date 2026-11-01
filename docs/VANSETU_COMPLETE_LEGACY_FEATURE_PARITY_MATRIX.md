# VanSetu — Complete Legacy Feature Parity Matrix

**Document Version:** 2.0.0  
**Generated:** November 1, 2026  
**Status:** In Progress / Authoritative Master Parity Audit  
**Repositories Compared:**
- **Legacy VanSetu:** `https://github.com/beingaeditor/VanSetu` (and `niharika19singh/van-setu`)
- **New VanSetu Green:** `https://github.com/niharika19singh/vansetu-green`  
**Deployments Compared:**
- **Legacy URL:** `https://van-setu-final.vercel.app/`
- **Green Staging URL:** `https://vansetu-green-staging.vercel.app/`

---

## 1. Executive Directive & Parity Scope

This document provides a line-item audit and restoration blueprint for 100% of the original VanSetu capabilities. Every capability from the original platform is mapped to its VanSetu Green equivalent, preserving the enhanced visual identity, WebGL living forest background, dark emerald editorial aesthetics, and server-enforced RBAC without feature reduction.

No feature is permitted to be dropped, simplified into a static stub, or permanently hidden in an inaccessible collapsed menu.

---

## 2. Definitive Feature Inventory & Parity Matrix

### A. Core Application & Discovery

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Home / Introduction** | `App.jsx` (`/`) | `/api/stats/summary` | `LandingPageView.jsx` (`?view=landing`) | `/api/stats/summary` | MODIS LST, Sentinel-2 NDVI, CPCB AQI | All Roles | **PASS** | Retained cinematic WebGL landing with direct CTA to map | Visual render + navigation click test |
| 2 | **Public Overview** | `PublicDashboard.jsx` (top bar) | `/api/roads`, `/api/stats/summary` | `PublicDashboardView.jsx` (`?view=public_overview`) | `/api/corridors`, `/api/stats/summary` | 44 Corridors GeoJSON | Public, Pro, Govt | **PASS** | Dedicated card layout with public indicators | Unit test + component mount |
| 3 | **Public Climate Discovery** | `PublicDashboard.jsx` (map + overview) | `/api/tiles/{layer}/{z}/{x}/{y}.png` | `CanopyHydrologyView.jsx` (`?view=canopy`) | `/api/tiles/{layer}/{z}/{x}/{y}.png` | 10m NDVI, 1km LST raster tiles | All Roles | **PASS** | Accessible environmental metrics & canopy overview | Tile fetch + view inspection |
| 4 | **Greening Works** | `PublicDashboard.jsx` (corridor cards) | `/api/roads` | `PublicProjectsView.jsx` (`?view=public_projects`) | `/api/corridors` | `delhi_roads.geojson` | Public, Pro, Govt | **PASS** | Public citizen project tracking & status | Corridor list filter test |
| 5 | **Evidence Provenance** | `PublicDashboard.jsx` (footer bar) | `/api/layers/metadata` | `EquityAndProvenanceView.jsx` (`?view=provenance`) & `DataProvenanceModal.jsx` | `/api/stats/summary` | Sensor metadata, NASA/ESA provenance | All Roles | **PASS** | Complete institutional provenance modal & view | Test asserting provenance records |
| 6 | **Evidence Passport** | `roads.py` (`/evidence/passport/{id}`) | `/api/evidence/passport/{id}` | `CorridorEvidencePassportModal.jsx` | `/api/evidence/passport/{id}` | Segment features, ground truth | All Roles | **PASS** | Multi-tier authentic fallback to GeoJSON + modal | Modal open test on click |
| 7 | **Map Explorer** | `Map.jsx` | `/api/roads`, `/api/tiles/...` | `MapExplorerView.jsx` (`?view=map`) & `InteractiveMap.jsx` | `/api/corridors`, `/api/tiles/...` | 9 canonical overlays | All Roles | **PASS** | 9-overlay right-side dismissible card + cyan highlight | Automated Leaflet layer verification |
| 8 | **Corridors Catalogue** | `PublicDashboard.jsx` (left cards) | `/api/roads` | `CorridorsView.jsx` (`?view=corridors`) | `/api/corridors` | 44 corridors FeatureCollection | All Roles | **PASS** | Full catalogue with search, district filter, cards | Corridor selection & search test |
| 9 | **Canopy & Hydrology** | `Map.jsx` (NDVI overlay) | `/api/tiles/ndvi/...` | `CanopyHydrologyView.jsx` (`?view=canopy`) | `/api/corridors/districts` | Sentinel-2 10m raster | All Roles | **PASS** | City-wide canopy & drainage analysis | District summary calculation test |
| 10 | **Intelligence & Records** | `AdminDashboard.jsx` (`/admin`) | `/api/admin/summary` | `RecordsView.jsx` (`?view=records`) & `MekoMemoryStudioView.jsx` | `/api/tiger-data/...` | Tiger Data hypertables, Meko memory | Pro, Govt | **PASS** | Unified institutional audit & memory view | Table render & data load test |

---

### B. Advanced Analytics

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | **ML Intelligence** | `main.py` / `road_service.py` | `/api/corridors/priority-ranking` | `InterventionIntelligenceView.jsx` (`?view=intervention_intelligence`) | `/api/interventions/recommend` | 75m road segments, ML weights | Pro, Govt | **PASS** | Segment-level ML suitability prediction pipeline | API inference response verification |
| 12 | **Right Tree, Right Place** | `intervention_service.py` | `/api/corridors/{id}/interventions` | `SegmentSuitabilityView.jsx` (`?view=suitability`) | `/api/segment/species-catalog` | Native Delhi species database | Pro, Govt | **PASS** | Species recommendation by soil/width constraints | Species catalog API test |
| 13 | **Pareto Portfolio Lab** | `intervention_service.py` | `/api/corridors/cost-optimisation` | `ParetoPortfolioLabView.jsx` (`?view=pareto`) | `/api/corridor-cost/...` | CPWD DSR 2023 rate analysis | Pro, Govt | **PASS** | Multi-objective cost vs cooling Pareto frontier | Chart rendering & curve test |
| 14 | **Pedestrian Shade** | `Map.jsx` (Walkable Roads) | `/api/roads/simple` | `ShadeContinuityView.jsx` (`?view=shade`) | `/api/shade-continuity/{id}` | OSM pedestrian network | All Roles | **PASS** | Continuous shade gap ranking & gap detection | Shade gap calculation test |
| 15 | **Seasonal Heat Intelligence** | `Map.jsx` (LST overlay) | `/api/tiles/lst/...` | `SeasonalHeatIntelligenceView.jsx` (`?view=seasonal`) | `/api/seasonal/corridor/{id}` | NASA MODIS 8-year thermal records | All Roles | **PASS** | Multi-month heat anomaly & hotspot identification | Thermal profile data test |
| 16 | **Impact Monitoring** | `intervention_service.py` | `/api/admin/corridors` | `ImpactMonitoringView.jsx` (`?view=impact`) | `/api/tiger-data/intervention-monitoring` | Baseline vs observed sensor streams | Pro, Govt | **PASS** | Post-implementation NDVI/LST tracking | Longitudinal monitoring test |
| 17 | **Project Readiness** | `AdminDashboard.jsx` (corridor status) | `/api/admin/corridors/{name}/status` | `ProjectReadinessView.jsx` (`?view=readiness`) | `/api/readiness/projects` | Work package 1-8 criteria | Pro, Govt | **PASS** | Work-package feasibility gate evaluation | Stage transition test |
| 18 | **Spatial Memory** | `Map.jsx` | `/api/corridors/aggregated` | `SpatialMemoryMapView.jsx` (`?view=spatial_memory`) | `/api/spatial-memory/pins` | Georeferenced memory pins | Pro, Govt | **PASS** | Georeferenced intervention memory pins on map | Pin render & click handler test |

---

### C. Planning & Decision-Making

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 19 | **Scenario Lab** | `PublicDashboard.jsx` (left scenarios) | `/api/corridors/scenarios` | `ScenarioLabView.jsx` (`?view=scenarios`) | `/api/corridors/scenarios` | 5 policy scenarios | All Roles | **PASS** | Scenario weight adjustment & rank delta analysis | Scenario switch state test |
| 20 | **Decision Studio** | `CorridorDecisionPlanner.jsx` | `/api/corridors/{id}/action-plan` | `DecisionStudioView.jsx` (`?view=studio`) | `/api/corridors/{id}` | CapEx/OpEx DSR benchmarks | Pro, Govt | **PASS** | Integrated multi-criteria decision workbench | Decision studio render test |
| 21 | **Corridor Prioritization Engine** | `scoring_service.py` | `/api/corridors/priority-ranking` | `PriorityRankingPanel.jsx` | `/api/corridors` | Multi-criteria normalization | All Roles | **PASS** | Multi-factor prioritization algorithm | Formula output verification |
| 22 | **GDI Priority Indexing** | `raster_service.py` | `/api/tiles/gdi/...` | `InteractiveMap.jsx` (GDI toggle) | `/api/tiles/gdi/...` | 10m GDI composite GeoTIFF | All Roles | **PASS** | 10m aligned GDI raster tile generation | GDI tile request test |
| 23 | **Corridor Ranking (What-If)** | `WhatIfRanking.jsx` | `/api/corridors/rank` | `CorridorRankingView.jsx` (`?view=ranking`) & `PriorityRankingPanel.jsx` | `/api/corridors/rank` | Heat vs Green Deficit slider | All Roles | **RESTORE DEDICATED VIEW** | Add dedicated `CorridorRankingView.jsx` and sidebar entry | Slider change & rank shift test |
| 24 | **Corridor Prediction** | `main.py` / `predictor.py` | `/api/interventions/recommend` | `CorridorPredictionView.jsx` (`?view=prediction`) | `/api/prediction/corridor` | Longitudinal thermal, weather trend | Pro, Govt | **RESTORE DEDICATED VIEW** | Build dedicated predictive workspace with horizon selector | Model execution & output test |
| 25 | **Heat-wave Mapping** | `Map.jsx` (LST + Hotspots) | `/api/tiles/lst/...` | `HeatwaveMappingView.jsx` (`?view=heatwave_mapping`) | `/api/corridors/raster-zones` | Connected component hotspots | All Roles | **RESTORE DEDICATED VIEW** | Dedicated heatwave analysis view with thermal contours | Hotspot polygon render test |
| 26 | **Intervention Planning** | `InterventionPanel.jsx` | `/api/corridors/{id}/interventions` | `InterventionPlannerPanel.jsx` | `/api/corridors/{id}` | 5 intervention archetypes | All Roles | **PASS** | Embedded in inspection drawer + dedicated views | Component mount test |
| 27 | **Budget Optimization** | `AdminDashboard.jsx` (subsidies) | `/api/admin/subsidy-stats` | `CorridorCostOptimizerView.jsx` (`?view=corridor_cost_approval`) | `/api/corridor-cost/...` | CPWD DSR unit rates | Pro, Govt | **PASS** | CapEx/OpEx calculation & sanctioning | Budget submission test |
| 28 | **Policy Scenario Configuration** | `PublicDashboard.jsx` (preset pills) | `/api/corridors/scenarios` | `ScenarioLabView.jsx` | `/api/corridors/scenarios` | 5 canonical policy profiles | All Roles | **PASS** | Baseline, Heat, Air, Equity, Vulnerability | Scenario selection test |
| 29 | **Multi-Factor Sensitivity Analysis** | `WhatIfRanking.jsx` | `/api/corridors/sensitivity` | `ScenarioLabView.jsx` & `CorridorsView.jsx` | `/api/corridors/sensitivity` | Scenario comparative matrix | Pro, Govt | **PASS** | Rank shift matrix & Stability Index S | Sensitivity table test |

---

### D. AI & Intelligence

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 | **VanSetu AI Copilot** | `VanSetuAIAgent.jsx` | `/api/corridors/ai-agent` | `AiPlanningAssistantView.jsx` (`?view=agent`) | `/api/gemini/plan` & `/api/corridors/ai-agent` | Live studio context, tools | All Roles | **PASS** | Dedicated natural language planning assistant | Tool execution test |
| 31 | **AI-Assisted Corridor Analysis** | `CorridorInsightPanel.jsx` | `/api/corridors/explain-ranking` | `CorridorAnalyticalDetail.jsx` | `/api/corridors/{id}/explain` | Corridor metrics | All Roles | **PASS** | Deterministic + Gemini ranking explanations | Explanation text load test |
| 32 | **AI-Based Ranking Explanations** | `WhatIfRanking.jsx` | `/api/corridors/explain-ranking` | `CorridorAnalyticalDetail.jsx` & `App.jsx` | `/api/corridors/{id}/explain` | Contributing weights | All Roles | **PASS** | Math trace & weight contribution breakdown | API response test |
| 33 | **Climate-Risk Interpretation** | `Map.jsx` (tooltips) | `/api/stats/point` | `InteractiveMap.jsx` (point inspector) | `/api/stats/point` | Native MODIS vs Sentinel-2 | All Roles | **PASS** | Dual-resolution pixel inspector | Map click inspector test |
| 34 | **Intervention Recommendations** | `InterventionPanel.jsx` | `/api/corridors/{id}/interventions` | `InterventionPlannerPanel.jsx` | `/api/corridors/{id}` | Road classification rules | All Roles | **PASS** | Rule-based suitability recommendations | Recommendation render test |
| 35 | **Prediction Explanations & Uncertainty** | `predictor.py` | `/api/interventions/recommend` | `CorridorPredictionView.jsx` (`?view=prediction`) | `/api/prediction/corridor` | SHAP/feature attributions | Pro, Govt | **RESTORE DEDICATED VIEW** | 90% confidence bands & factor breakdown | Attribution chart test |

---

### E. Community & Public Health

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 36 | **Community Input (Observations)** | `SecondaryUserInput.jsx` | `/api/community-data` | `CommunityInputView.jsx` (`?view=community_input`) | `/api/social-equity/observations` & `/api/community-data` | Citizen observation schema | All Roles | **RESTORE DEDICATED VIEW** | Dedicated observation submission view & modal | Form submission test |
| 37 | **Community Suggestions** | `CommunitySuggestions.jsx` | `/api/suggestions` | `CorridorAnalyticalDetail.jsx` (suggestions) | `/api/corridors/{id}/suggestions` | Public suggestions store | All Roles | **PASS** | Suggestion list & upvoting per corridor | Upvote action test |
| 38 | **Anonymized Community Observations** | `SecondaryUserInput.jsx` | `/api/community-data` | `EquityAndProvenanceView.jsx` | `/api/social-equity/observations` | Anonymized field records | All Roles | **PASS** | Zero PII citizen environmental inputs | Data sanitization test |
| 39 | **Human Verification Workflow** | `AdminDashboard.jsx` (suggestions) | `/api/suggestions/{id}/status` | `EquityAndProvenanceView.jsx` & `GovernmentOverviewView.jsx` | `/api/social-equity/observations/{id}/verify` | Pending/Verified status | Govt Admin | **PASS** | Review queue: Pending -> Verified/Rejected | Status transition test |
| 40 | **Health Data** | `HealthDataInput.jsx` | `/api/health-data` | `HealthDataView.jsx` (`?view=health_data`) & `RegionalHealthIntelligenceView.jsx` | `/api/health/regional-indicators` & `/api/health-data` | Ward-level health aggregations | Public, Pro, Govt | **RESTORE DEDICATED VIEW** | Dedicated health data submission & aggregated view | Form submission & list test |
| 41 | **Heat Exposure & Vulnerability** | `AdminDashboard.jsx` (medical) | `/api/admin/medical-data` | `RegionalHealthIntelligenceView.jsx` (`?view=hospital_health`) | `/api/health/regional-indicators` | Heat admissions, vulnerability index | Pro, Govt | **PASS** | Aggregated respiratory & thermal morbidity | Data rendering test |

---

### F. Governance & Administration

| # | Feature Name | Legacy Component & Route | Legacy Endpoint | Green Component & Route | Green Endpoint | Data Dependency | User Roles | Parity Status | Restoration Action | Test Method |
|---|---|---|---|---|---|---|---|---|---|---|
| 42 | **Public Citizen Workspace** | `PublicDashboard.jsx` (`/`) | `/api/roads` | `PublicDashboardView.jsx` & tailored navigation | `/api/corridors` | Curated public data | Public Citizen | **PASS** | Simplified, accessible, jargon-free public UI | Persona switch & route test |
| 43 | **Professional Workspace** | `PublicDashboard.jsx` (Pro Mode) | `/api/corridors/professional-rank` | `ProDashboardView.jsx` & tailored navigation | `/api/me/corridor-assignments` | Multi-criteria weights | Pro Professional | **PASS** | Full technical analytical console | Persona switch & route test |
| 44 | **Government Admin Workspace** | `AdminDashboard.jsx` (`/admin`) | `/api/admin/summary` | `GovernmentOverviewView.jsx` & tailored navigation | `/api/admin/corridor-assignments` | Institutional datasets | Govt Admin, Engineer | **PASS** | Comprehensive oversight & tender lifecycle | Persona switch & route test |
| 45 | **Role-Based Access Control** | Token / header check | `/api/admin/...` | `auth.py`, `RoleHeader.jsx`, `AccessDeniedView.jsx` | `/api/auth/me`, `/api/auth/permissions` | JWT/Bearer session token | Enforced on all | **PASS** | Strict server-side route guarding | Unauthorized request 403 test |
| 46 | **Administrative Review** | `AdminDashboard.jsx` (corridor table) | `/api/admin/corridors/{name}/status` | `CorridorInventoryView.jsx` (`?view=corridor_inventory`) | `/api/tenders/...` | Work package allocations | Govt Admin | **PASS** | Corridor status update & tender creation | Status update test |
| 47 | **Data Provenance & Audit History** | `AdminDashboard.jsx` (audit log) | `/api/admin/audit-logs` | `GovernmentAuditView.jsx` (`?view=govt_audit`) | `/api/admin/audit-logs` | Immutable audit log table | Govt Admin | **PASS** | Immutable blockchain-ready audit trail | Audit log fetch test |
| 48 | **Protected Workflows** | Sealed bidding / procurement | `/api/tenders` | `TenderManagementView.jsx` & `TenderMarketplaceView.jsx` | `/api/tenders`, `/api/tenders/{id}/award` | Sealed bid tenders | Pro, Govt | **PASS** | Single-party exclusivity & sealed bid rules | Exclusivity violation 409 test |

---

### G. Discovered Legacy Capabilities (Complete Completeness)

| # | Feature Name | Legacy Component | Legacy Endpoint | Green Component & Route | Green Endpoint | Status | Action |
|---|---|---|---|---|---|---|---|
| 49 | **All 11 Districts Filtering** | `Map.jsx` (filter dropdown) | `/api/corridors?district=...` | `App.jsx`, `InteractiveMap.jsx`, `corridor_service.py` | `/api/corridors?district=...` | **ENHANCE NORMALIZATION** | Normalize "Central Delhi" vs "Central" so all 11 districts filter cleanly |
| 50 | **Two-Factor What-If Slider** | `WhatIfRanking.jsx` | `/api/corridors/rank?heat_weight=...` | `PriorityRankingPanel.jsx` & `CorridorRankingView.jsx` | `/api/corridors/rank` | **PASS** | Connect mathematical slider updating live ranking |
| 51 | **Corridor 3D WebGL Viewer** | `Corridor3DViewer.jsx` | Local Three.js | `CorridorAnalyticalDetail.jsx` | Local Three.js | **PASS** | Ported Three.js canopy rendering |
| 52 | **Location Search & Geocoding** | `LocationSearch.jsx` | OSM Nominatim + curated landmarks | `LocationSearch.jsx` | In-map flyTo | **PASS** | Offline curated landmarks + search input |
| 53 | **Data Export (CSV & GeoJSON)** | `AdminDashboard.jsx` (export tab) | `/api/admin/corridors/export` | `RecordsView.jsx` & `GovernmentOverviewView.jsx` | Client-side & backend export | **PASS** | CSV / GeoJSON export actions |
| 54 | **Passive User Management** | `AdminDashboard.jsx` (users tab) | `/api/admin/passive-users` | `GovernmentOverviewView.jsx` | `/api/admin/professionals` | **PASS** | Professional directory management |
| 55 | **Subsidy Tier Analysis** | `AdminDashboard.jsx` (subsidies) | `/api/admin/subsidy-stats` | `CorridorCostOptimizerView.jsx` | `/api/corridor-cost/...` | **PASS** | Flagship, Priority, Standard tiers |
| 56 | **CPCB Live AQI Sensor Telemetry** | `Map.jsx` (AQI markers) | `/api/aqi/stations` | `InteractiveMap.jsx` | `/api/aqi/stations` | **PASS** | 8 CPCB AQI stations with live PM2.5/PM10 |

---

## 3. Immediate Action Plan

To establish 100% full parity, the following dedicated views and navigation entries must be added to the unified VanSetu Green UI:
1. **`CorridorPredictionView.jsx` (`?view=prediction`)**: Dedicated Corridor Prediction workspace with horizon selector (1-yr, 3-yr, 5-yr, Extreme heatwave), observed vs predicted comparative indicators, confidence interval, and thermal mitigation potential.
2. **`CorridorRankingView.jsx` (`?view=ranking`)**: Dedicated Corridor Ranking workspace featuring the authoritative What-If slider (`score = heat_weight * Heat + (1 - heat_weight) * (1 - NDVI)`), baseline vs what-if comparison, and explanation action.
3. **`HeatwaveMappingView.jsx` (`?view=heatwave_mapping`)**: Dedicated Heat-wave Mapping workspace with thermal anomaly hotspot zones, vulnerable wards, and heat risk contours.
4. **`CommunityInputView.jsx` (`?view=community_input`)**: Dedicated Community Input workspace allowing citizen and field observations submission (photo, notes, tree deficit, heat level) and status tracking.
5. **`HealthDataView.jsx` (`?view=health_data`)**: Dedicated Health Data workspace with ward-level aggregate respiratory/heatstroke morbidity and health department intake form.
6. **Backend Enhancements**:
   - `prediction_service.py` & `prediction.py` router: Provide `/api/prediction/corridor` and `/api/prediction/scenarios`.
   - District normalization in `corridor_service.py`: Standardize all 11 districts (`Central`, `East`, `New Delhi`, `North`, `North East`, `North West`, `Shahdara`, `South`, `South East`, `South West`, `West`) so filtering by either full or short name returns exact matching corridors.
7. **Sidebar Restoration in `AppSidebar.jsx`**:
   - Restore the complete navigation hierarchy for Public Discovery, Climate Intelligence, Advanced Analytics, and Dedicated Entry Points.
   - Keep all permitted sections visible, scrollable, and accessible without collapsed submenus hiding features.
   - Enable direct workspace switching between Public Citizen, Pro Professional, and Government Admin.
