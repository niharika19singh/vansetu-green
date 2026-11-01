# VanSetu Green — Comprehensive Role-Permission Matrix

**Document Version:** 2.0.0  
**Specification:** Authoritative Role-Based Access Control (RBAC)  
**System Module:** `backend/ml/security/auth.py` & `frontend/src/App.jsx`  

---

## 1. Overview of System Roles

VanSetu Green defines four authoritative system personas:

| Role Identifier | Display Name | Organization Context | Primary Responsibility |
|---|---|---|---|
| `public_citizen` / `normal_user` | **Public Citizen** | NCT Delhi Resident / Community | Civic climate awareness, heat safety advisories, community reporting. |
| `pro_professional` | **Pro Professional** | Landscape Architecture / Planning Firm | Climate modeling, corridor intervention design, tender proposal submission. |
| `government_admin` | **Government Admin** | Municipal Corporation of Delhi / PWD HQ | Executive governance, budget sanctions, tender management, compliance audit. |
| `government_engineer` | **Government Engineer** | PWD Civil Maintenance & Field Division | Right-of-Way assessment, utility clash detection, field survey verification. |

---

## 2. Page & Navigation Access Matrix

The table below details page access across all 28 views in VanSetu Green.

| View Identifier | View Name | Public Citizen | Pro Professional | Govt Admin | Govt Engineer | Default Landing For |
|---|---|:---:|:---:|:---:|:---:|---|
| `public_dashboard` | Home / Citizen Dashboard | ✅ | ✅ | ✅ | ✅ | **Public Citizen** |
| `public_map` | Explore Climate Map | ✅ | ✅ | ✅ | ✅ | |
| `public_heat` | Local Heat Information | ✅ | ✅ | ✅ | ✅ | |
| `public_projects` | Green Projects | ✅ | ✅ | ✅ | ✅ | |
| `community_input` | Community Observations | ✅ | ✅ | ✅ | ✅ | |
| `public_health` | Health & Heat Safety | ✅ | ✅ | ✅ | ✅ | |
| `public_report` | Report an Issue | ✅ | ✅ | ✅ | ✅ | |
| `evidence_passport` | Evidence Passport / Review | ✅ | ✅ | ✅ | ✅ | |
| `provenance` | Data Provenance | ✅ | ✅ | ✅ | ✅ | |
| `pro_dashboard` | Professional Overview | ❌ | ✅ | ✅ | ✅ | **Pro Professional** |
| `map` | Map Explorer (10 Layers + 3D) | ❌ | ✅ | ✅ | ✅ | |
| `corridors` | Corridor Intelligence (44) | ❌ | ✅ | ✅ | ✅ | |
| `prediction` | Corridor Prediction (ML) | ❌ | ✅ | ✅ | ✅ | |
| `ranking` | Corridor Ranking (MCDA) | ❌ | ✅ | ✅ | ✅ | |
| `heatwave_mapping` | Heatwave Risk Mapping | ❌ | ✅ | ✅ | ✅ | |
| `scenarios` | Scenario Lab (5 Scenarios) | ❌ | ✅ | ✅ | ✅ | |
| `studio` | Decision Studio | ❌ | ✅ | ✅ | ✅ | |
| `intervention_intelligence` | ML Intelligence & SHAP | ❌ | ✅ | ✅ | ✅ | |
| `shade` | Pedestrian Shade Analysis | ❌ | ✅ | ✅ | ✅ | |
| `seasonal` | Seasonal Heat Differences | ❌ | ✅ | ✅ | ✅ | |
| `suitability` | Right Tree, Right Place | ❌ | ✅ | ✅ | ✅ | |
| `pareto` | Pareto Portfolio (MILP) | ❌ | ✅ | ✅ | ✅ | |
| `spatial_memory` | Spatial Memory (YugabyteDB) | ❌ | ✅ | ✅ | ✅ | |
| `agent` | VanSetu AI Planning Assistant | ❌ | ✅ | ✅ | ✅ | |
| `tender_marketplace` | B2G Tender Marketplace | ❌ | ✅ | ✅ | ❌ | |
| `my_proposals` | My Submitted Proposals | ❌ | ✅ | ❌ | ❌ | |
| `my_assigned_projects` | My Assigned Corridors | ❌ | ✅ | ❌ | ❌ | |
| `govt_overview` | Government Overview | ❌ | ❌ | ✅ | ✅ | **Govt Admin** |
| `govt_districts` | 11 Districts Administration | ❌ | ❌ | ✅ | ❌ | |
| `govt_departments` | Department Management | ❌ | ❌ | ✅ | ❌ | |
| `corridor_inventory` | Corridor Prioritization | ❌ | ❌ | ✅ | ✅ | |
| `tender_management` | Tender Drafting & Sanction | ❌ | ❌ | ✅ | ❌ | |
| `govt_approvals` | Project Approvals Queue | ❌ | ❌ | ✅ | ❌ | |
| `govt_community_moderation` | Community Governance | ❌ | ❌ | ✅ | ❌ | |
| `corridor_cost_approval` | Field Verification & CapEx | ❌ | ✅ | ✅ | ✅ | |
| `hospital_health` | Hospital Heat Surveillance | ❌ | ❌ | ✅ | ❌ | |
| `hospital_sources` | Hospital Data Connector | ❌ | ❌ | ✅ | ❌ | |
| `govt_audit` | Institutional Audit Trail | ❌ | ❌ | ✅ | ❌ | |
| `govt_users` | User & Role Management | ❌ | ❌ | ✅ | ❌ | |
| `records` | Administrative Records & Reports | ❌ | ✅ | ✅ | ✅ | |
| `engineer_overview` | Engineering Overview | ❌ | ❌ | ✅ | ✅ | **Govt Engineer** |
| `engineer_map` | Civil Infrastructure Map | ❌ | ❌ | ✅ | ✅ | |
| `corridor_engineering` | Corridor Engineering Specs | ❌ | ❌ | ✅ | ✅ | |
| `road_network` | Road Network Analysis | ❌ | ❌ | ✅ | ✅ | |
| `row_assessment` | Right-of-Way (IRC:SP:73) | ❌ | ❌ | ✅ | ✅ | |
| `engineering_feasibility` | Utility Clash Check | ❌ | ❌ | ✅ | ✅ | |
| `engineer_field_surveys` | Field Survey Submission Log | ❌ | ❌ | ✅ | ✅ | |
| `engineer_verification` | Technical Verification Signoff | ❌ | ❌ | ✅ | ✅ | |

---

## 3. Backend RBAC Permission Matrix

The backend enforces permissions via FastAPI dependency injection: `Depends(require_permission(Permission.<NAME>))`.

| Permission Constant | Public Citizen | Pro Professional | Govt Admin | Govt Engineer | Description |
|---|:---:|:---:|:---:|:---:|---|
| `VIEW_PUBLIC_MAP` | ✅ | ✅ | ✅ | ✅ | View public baseline maps and open data layers. |
| `SUBMIT_COMMUNITY_INPUT` | ✅ | ✅ | ✅ | ✅ | Submit citizen observations and ground truth reports. |
| `VIEW_COMMUNITY_INPUT` | ✅ | ✅ | ✅ | ✅ | View crowdsourced community observations. |
| `VIEW_PUBLIC_HEALTH` | ✅ | ✅ | ✅ | ✅ | View public health advisories and emergency cooling shelters. |
| `VIEW_CORRIDOR_INTELLIGENCE` | ❌ | ✅ | ✅ | ✅ | Access all 44 corridors' detailed scientific telemetry. |
| `VIEW_SEGMENT_ANALYSIS` | ❌ | ✅ | ✅ | ✅ | Access 100m segment breakdown along road corridors. |
| `CUSTOMIZE_SCENARIOS` | ❌ | ✅ | ✅ | ✅ | Adjust policy levers and run what-if simulation models. |
| `OPTIMIZE_PORTFOLIO` | ❌ | ✅ | ✅ | ✅ | Run MILP Pareto multi-objective optimization solvers. |
| `OPTIMIZE_CORRIDOR_COST` | ❌ | ✅ | ✅ | ✅ | Calculate DSR-based CapEx and OpEx schedules. |
| `BROWSE_TENDERS` | ❌ | ✅ | ✅ | ❌ | Browse active B2G competitive bidding tenders. |
| `SUBMIT_PROPOSAL` | ❌ | ✅ | ❌ | ❌ | Submit competitive proposals for open tenders. |
| `MANAGE_TENDERS` | ❌ | ❌ | ✅ | ❌ | Create, edit, publish, and close government tenders. |
| `ASSIGN_TENDER` | ❌ | ❌ | ✅ | ❌ | Award tenders to winning professional proposals. |
| `ALLOCATE_CORRIDOR` | ❌ | ❌ | ✅ | ❌ | Assign exclusive development rights to corridors. |
| `VIEW_ALL_ASSIGNMENTS` | ❌ | ❌ | ✅ | ❌ | View complete municipal corridor assignment registry. |
| `MANAGE_PROFESSIONALS` | ❌ | ❌ | ✅ | ❌ | Accredit and manage professional architecture firms. |
| `APPROVE_PROJECT_COSTS` | ❌ | ❌ | ✅ | ❌ | Formally approve CapEx budgets for public works. |
| `VIEW_GOVERNMENT_AUDIT` | ❌ | ❌ | ✅ | ❌ | Inspect immutable institutional action audit logs. |
| `MANAGE_USERS` | ❌ | ❌ | ✅ | ❌ | Provision municipal access tokens and manage user roles. |
| `MANAGE_REGISTRY` | ❌ | ❌ | ✅ | ❌ | Manage municipal metadata, corridors, and schema keys. |
| `GOVERN_COMMUNITY` | ❌ | ❌ | ✅ | ❌ | Moderate citizen complaints and dispatch inspection tickets. |
| `MANAGE_HOSPITAL_SOURCES` | ❌ | ❌ | ✅ | ❌ | Configure ABDM health clinic endpoints and API tokens. |
| `VIEW_REGIONAL_HEALTH` | ❌ | ❌ | ✅ | ❌ | View raw aggregate hospital heatstroke surveillance. |
| `SUBMIT_FIELD_SURVEY` | ❌ | ❌ | ✅ | ✅ | Submit physical trial pit and road width measurements. |
| `VALIDATE_FEASIBILITY` | ❌ | ❌ | ✅ | ✅ | Certify physical feasibility and utility clearances. |
| `INSPECT_INFRASTRUCTURE` | ❌ | ❌ | ✅ | ✅ | Access detailed engineering utility clash matrices. |
| `VERIFY_ROW` | ❌ | ❌ | ✅ | ✅ | Certify compliance with IRC:SP:73 right-of-way standards. |
| `ESTIMATE_COSTS` | ❌ | ❌ | ✅ | ✅ | Perform civil cost estimations using CPWD DSR rates. |

---

## 4. REST API Endpoint Authorization Enforcement

| HTTP Method | API Path | Minimum Required Permission | Unauthorized Response |
|---|---|---|---|
| `GET` | `/api/corridors` | Public (Open) | 200 OK |
| `GET` | `/api/corridors/{id}/engineering` | Public / Optional Auth | 200 OK |
| `POST` | `/api/corridors/{id}/engineering/survey` | `SUBMIT_FIELD_SURVEY` | 403 Forbidden |
| `GET` | `/api/community-data` | Public (Open) | 200 OK |
| `POST` | `/api/community-data` | `SUBMIT_COMMUNITY_INPUT` | 403 Forbidden |
| `POST` | `/api/public/report-issue` | Public (Open) | 200 OK |
| `PATCH` | `/api/community-data/{id}/status` | `GOVERN_COMMUNITY` | 403 Forbidden |
| `GET` | `/api/tenders` | `BROWSE_TENDERS` or `MANAGE_TENDERS` | 403 Forbidden |
| `POST` | `/api/tenders` | `MANAGE_TENDERS` | 403 Forbidden |
| `POST` | `/api/tenders/{id}/proposals` | `SUBMIT_PROPOSAL` | 403 Forbidden |
| `POST` | `/api/tenders/{id}/award` | `ASSIGN_TENDER` | 403 Forbidden |
| `GET` | `/api/hospital-health/summary` | `VIEW_REGIONAL_HEALTH` | 403 Forbidden |
| `GET` | `/api/hospital-health/districts` | `VIEW_REGIONAL_HEALTH` | 403 Forbidden |
| `POST` | `/api/hospital-health/records` | `MANAGE_HOSPITAL_SOURCES` | 403 Forbidden |
| `GET` | `/api/audit-logs` | `VIEW_GOVERNMENT_AUDIT` | 403 Forbidden |
| `POST` | `/api/auth/demo-switch-role` | Development Mode Only | 403 Forbidden |
| `GET` | `/api/auth/me` | Authenticated Token | 401 Unauthorized |
| `GET` | `/api/auth/permissions` | Authenticated Token | 401 Unauthorized |

---

## 5. Security & Boundary Safeguards

1. **Client-Side View Guarding:** The `AccessDeniedView` component intercepts unauthorized navigation attempts before rendering sensitive UI elements.
2. **Server-Side Token Verification:** Every secured backend endpoint independently verifies the bearer token and checks role permissions using `require_permission()`.
3. **No Credential Escalation:** Public citizens cannot submit tender bids, approve project costs, or moderate community data.
4. **Audit Immutability:** Any administrative tender creation, award, or cost approval is recorded with timestamp, user ID, and action hash.
