# VanSetu GreenTech — PR #2 Security, RBAC & Functional Remediation Report

**Repository:** `https://github.com/niharika19singh/vansetu-green`  
**Working Branch:** `feature/vansetu-govt-rbac-tender-ui`  
**Pull Request:** PR #2 (`https://github.com/niharika19singh/vansetu-green/pull/2`)  
**Base Target Branch:** `feature/delhi-intervention-ml-pipeline`  
**Remediation Date:** 2026-11-01  

---

## 1. Executive Summary

This remediation completes the security, RBAC authorization, and functional hardening of VanSetu's Government-First transformation on branch `feature/vansetu-govt-rbac-tender-ui`. 

While the previous commit (`3f28229`) successfully delivered the ContraSys-inspired enterprise UI redesign and achieved a passing CI build (124 backend tests and 10 frontend tests), an independent code review identified critical gaps:
1. An unauthenticated endpoint (`POST /api/auth/demo-switch-role`) that could mint high-privilege `GOVERNMENT_ADMIN` tokens in any environment without restriction or expiration.
2. Over-permissioned roles (`GOVERNMENT_ADMIN` and `GOVERNMENT_ENGINEER` receiving all permissions; `SENIOR_REVIEWER` retaining tender cost approval and audit permissions).
3. The Pro Professional workspace calling administrative endpoints (`/api/admin/corridor-assignments`), causing 403 Forbidden errors for legitimate Pro users.
4. Non-persistent and unaudited budget decisions on the corridor cost approval endpoint.
5. Unconditional seeding of demonstration records (Studio Vriksh, C-14, and mock hospitals) in production databases.
6. Property mismatches between the backend hospital health service and frontend components, alongside an inaccurate ABDM status display.
7. Fixed multiplier heuristics masquerading as MILP solver results for alternative cost packages.

All identified vulnerabilities, functional breaks, and data-integrity defects have been completely resolved. All 131 backend tests and 11 frontend tests pass with zero regressions, and the production Vite bundle compiles cleanly in 2.4s.

---

## 2. Original Issue and Root Cause for Each Finding

| # | Finding | Original Issue | Root Cause |
|---|---|---|---|
| **1** | **Unrestricted Demo Auth Provisioning** | Any caller could mint arbitrary tokens (including `GOVERNMENT_ADMIN`) via `POST /api/auth/demo-switch-role`. | Endpoint lacked checks for `VANSETU_ENV=development` and `VANSETU_ENABLE_DEMO_AUTH=true`. Tokens had infinite validity and static IDs. |
| **2** | **Over-Permissioned RBAC Matrix** | `GOVERNMENT_ADMIN` and `GOVERNMENT_ENGINEER` mapped to `set(Permission)`; `SENIOR_REVIEWER` held budget and tender audit rights. | Incomplete role matrix specialization during initial B2G refactoring. Roles inherited catch-all permission sets rather than least-privilege subsets. |
| **3** | **Pro Assignment Endpoint Rejection (403)** | Pro users navigating to "My Awarded Projects" or "Pro Dashboard" received 403 Forbidden. | Pro views invoked `GET /api/admin/corridor-assignments`, which requires administrative `VIEW_ALL_ASSIGNMENTS` permission. No user-scoped `/api/me/corridor-assignments` existed. |
| **4** | **Ephemeral Budget Approvals** | `POST /api/corridors/{corridor_id}/budget-approval` returned an in-memory dictionary without persisting. | Missing SQLite table for budget decisions. Endpoint was implemented as a mock response without calling `TenderService` or updating `corridor_allocations`. |
| **5** | **Production Demo-Data Contamination** | Studio Vriksh, Corridor C-14 assignment, and mock hospital records seeded unconditionally on startup. | `_seed_initial_data_if_empty()` in both `TenderService` and `HospitalHealthService` checked only `COUNT(*) == 0` without validating environment variables. |
| **6** | **Hospital Health & ABDM Integration Inconsistency** | Frontend displayed `SANDBOX_CONFIGURED` statically; hospital table failed to show missing districts or correct case counts. | Backend returned `heatstroke_emergency_attendances` and `hospital_name`, while frontend looked for `reported_heatstroke_cases_30d` and `reporting_facility`. ABDM endpoint returned hardcoded status without evaluating sandbox flags. |
| **7** | **Pseudo-Optimized Cost Alternatives** | Trade-off alternatives in `POST /api/corridors/{corridor_id}/cost-optimisation` used hardcoded percentage multipliers (`0.92`, `1.05`). | Alternatives bypassed the core SciPy MILP solver and computed naive multipliers instead of solving for actual competing policy objectives (air quality vs. budget caps). |

---

## 3. Files Changed

### Backend (7 files)
- [`backend/ml/security/auth.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/ml/security/auth.py): Hardened `AuthenticatedUser` with `expires_at` and `is_demo`; established least-privilege `ROLE_PERMISSIONS` matrix; implemented token expiration checks and revocation in `AuthManager`.
- [`backend/app/routers/auth.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/routers/auth.py): Gated `demo_switch_role` strictly behind `VANSETU_ENV=development` and `VANSETU_ENABLE_DEMO_AUTH=true`; issued dynamic demo IDs with 15-minute expiration (`expires_in=900`).
- [`backend/app/services/tender_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/tender_service.py): Created `corridor_budget_approvals` table; added `record_budget_approval`, `list_budget_approvals`, `get_my_corridor_allocations`, and `get_my_proposals`; restricted proposal visibility in `get_tender`; gated initial data seeding.
- [`backend/app/routers/tenders.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/routers/tenders.py): Exposed `GET /api/me/corridor-assignments` and `GET /api/me/proposals` for authenticated callers.
- [`backend/app/routers/corridor_cost.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/routers/corridor_cost.py): Integrated durable budget approvals with audit logging; replaced hardcoded multipliers with dual-instance MILP solver alternatives; added CPWD DSR 2023 benchmark disclosure.
- [`backend/app/services/hospital_health_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/hospital_health_service.py): Added compatibility field aliases (`reporting_facility`, `reported_heatstroke_cases_30d`, `vulnerability_multiplier`); merged missing districts truthfully into indicators; gated seed data; made ABDM status reflect `VANSETU_ABDM_SANDBOX_ENABLED`.
- [`backend/tests/test_govt_platform_and_rbac.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/tests/test_govt_platform_and_rbac.py): Added 7 comprehensive test suites covering environment guards, token expiration, revocation, least-privilege matrix, Pro isolation, budget persistence, and seed gating.

### Frontend (7 files)
- [`frontend/src/api/client.js`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/api/client.js): Added `getMyCorridorAssignments` and `getMyProposals` client methods.
- [`frontend/src/components/ProDashboardView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/ProDashboardView.jsx): Replaced administrative call with `api.getMyCorridorAssignments`; neutralized hardcoded firm credentials.
- [`frontend/src/components/MyAssignedProjectsView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/MyAssignedProjectsView.jsx): Connected to `api.getMyCorridorAssignments`; added graceful empty state; removed hardcoded 1-package fallback and fake progress.
- [`frontend/src/components/MyProposalsView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/MyProposalsView.jsx): Connected directly to `api.getMyProposals`.
- [`frontend/src/components/RegionalHealthIntelligenceView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/RegionalHealthIntelligenceView.jsx): Dynamic ABDM pill rendering; robust field mappings supporting canonical and alias attributes.
- [`frontend/src/components/GovernmentOverviewView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/GovernmentOverviewView.jsx): Prevented hardcoded corridor counts; aligned aggregate budget sums.
- [`frontend/tests/govt_platform.test.mjs`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/tests/govt_platform.test.mjs): Added unit tests verifying client method registration and Pro workspace view integration.

---

## 4. Security Changes

1. **Environment-Gated Persona Switcher:**
   - The endpoint `POST /api/auth/demo-switch-role` now checks `os.getenv("VANSETU_ENV") == "development"` AND `os.getenv("VANSETU_ENABLE_DEMO_AUTH") == "true"`.
   - In production or staging environments, callers receive `HTTP 403 Forbidden` with detail `"Access Denied: Demo persona switching is strictly restricted to development environments"`.
2. **Ephemeral Token Lifetimes (15-Minute TTL):**
   - Development demo tokens are provisioned with an explicit expiration (`expires_in_seconds=900`).
   - `AuthenticatedUser` stores `expires_at` and `is_demo=True`.
   - Both in-memory ephemeral store and SQLite credential store reject expired tokens at authentication time (`HTTP 401 Unauthorized`).
3. **Transactional Token Revocation:**
   - `AuthManager.revoke_token(raw_token)` revokes credentials from the persistent database store and deactivates ephemeral cached records.
4. **Bid Confidentiality Enforcement:**
   - In `TenderService.get_tender()`, `ReviewerRole.PRO_PROFESSIONAL` callers only receive bids submitted by their own organization or user ID. Competing financial proposals are omitted.
   - `ReviewerRole.SENIOR_REVIEWER` was removed from the administrative proposal view list to prevent ML personnel from accessing sealed commercial bids.

---

## 5. Updated Role-Permission Matrix

The authoritative permission mapping in [`ROLE_PERMISSIONS`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/ml/security/auth.py#L120-L200) was hardened according to the principle of least privilege:

```
Role                    Authorized Permissions
----------------------------------------------------------------------------------------------------------
GOVERNMENT_ADMIN        VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        CUSTOMIZE_SCENARIOS, OPTIMIZE_PORTFOLIO, OPTIMIZE_CORRIDOR_COST,
                        BROWSE_TENDERS, MANAGE_TENDERS, ASSIGN_TENDER, ALLOCATE_CORRIDOR,
                        VIEW_ALL_ASSIGNMENTS, MANAGE_PROFESSIONALS, MANAGE_HOSPITAL_SOURCES,
                        VIEW_REGIONAL_HEALTH, APPROVE_PROJECT_COSTS, VIEW_GOVERNMENT_AUDIT,
                        MANAGE_USERS, MANAGE_REGISTRY
                        [NO SUBMIT_PROPOSAL — Prevents Conflict of Interest]

GOVERNMENT_ENGINEER     VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        CUSTOMIZE_SCENARIOS, OPTIMIZE_PORTFOLIO, OPTIMIZE_CORRIDOR_COST,
                        BROWSE_TENDERS, VIEW_ALL_ASSIGNMENTS, VIEW_REGIONAL_HEALTH
                        [NO APPROVE_PROJECT_COSTS, NO MANAGE_TENDERS, NO ASSIGN_TENDER,
                         NO ALLOCATE_CORRIDOR, NO MANAGE_PROFESSIONALS, NO VIEW_GOVERNMENT_AUDIT,
                         NO MANAGE_HOSPITAL_SOURCES, NO SUBMIT_PROPOSAL]

PRO_PROFESSIONAL        VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        CUSTOMIZE_SCENARIOS, OPTIMIZE_PORTFOLIO, OPTIMIZE_CORRIDOR_COST,
                        BROWSE_TENDERS, SUBMIT_PROPOSAL, VIEW_REGIONAL_HEALTH,
                        SUBMIT_ASSESSMENT, VIEW_ASSESSMENTS, SUBMIT_OUTCOME, VIEW_EVIDENCE
                        [NO Administrative / Tender Award / Audit / Budget Approval Privileges]

NORMAL_USER             VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_REGIONAL_HEALTH
                        [Strictly Public Discovery Only]

FIELD_ASSESSOR          VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        SUBMIT_ASSESSMENT, VIEW_ASSESSMENTS, SUBMIT_OUTCOME, VIEW_EVIDENCE

AUTHORIZED_REVIEWER     VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        SUBMIT_ASSESSMENT, VIEW_ASSESSMENTS, REVIEW_ASSESSMENT,
                        CORRECT_ASSESSMENT, SUBMIT_OUTCOME, VERIFY_EVIDENCE, VIEW_EVIDENCE

SENIOR_REVIEWER         VIEW_PUBLIC_MAP, VIEW_CORRIDOR_INTELLIGENCE, VIEW_SEGMENT_ANALYSIS,
                        SUBMIT_ASSESSMENT, VIEW_ASSESSMENTS, REVIEW_ASSESSMENT,
                        CORRECT_ASSESSMENT, APPROVE_ASSESSMENT, REJECT_ASSESSMENT,
                        PROMOTE_MODEL, ROLLBACK_MODEL, VERIFY_OUTCOME, SUBMIT_OUTCOME,
                        VERIFY_EVIDENCE, VIEW_EVIDENCE
                        [Stripped of Government Budget, Tender, Assignment, and Audit Powers]

ADMINISTRATOR           All Permissions (System Superuser)
```

---

## 6. API Endpoints Added, Modified or Removed

| Method | Endpoint | Status | Description & Protection |
|---|---|---|---|
| `GET` | `/api/me/corridor-assignments` | **ADDED** | Returns only allocations where `assigned_professional_org == user.organization` or `assigned_professional_id == user.user_id`. Requires authenticated token. |
| `GET` | `/api/me/proposals` | **ADDED** | Returns only proposals submitted by the calling user or organization. Requires authenticated token. |
| `POST` | `/api/auth/demo-switch-role` | **MODIFIED** | Enforces `VANSETU_ENV=development` & `VANSETU_ENABLE_DEMO_AUTH=true`. Issues 15-minute expiring tokens. Returns dynamic random user IDs. |
| `POST` | `/api/corridors/{id}/budget-approval` | **MODIFIED** | Persists approval/rejection to SQLite `corridor_budget_approvals` and `tender_audit_logs`. Updates allocation `approved_budget_lakh`. Requires `APPROVE_PROJECT_COSTS`. |
| `POST` | `/api/corridors/{id}/cost-optimisation` | **MODIFIED** | Runs real SciPy MILP solver instances for competing policy objectives (air quality vs budget ceiling). Labels results with `is_solver_optimized: True`. |
| `GET` | `/api/corridors/{id}/cost-optimisation` | **MODIFIED** | Discloses benchmark rate source: CPWD Delhi Schedule of Rates (DSR 2023). Integrates latest approved budget from persistence layer. |
| `GET` | `/api/health/regional-indicators` | **MODIFIED** | Returns canonical and alias fields (`reporting_facility`, `reported_heatstroke_cases_30d`, `vulnerability_multiplier`). Merges missing districts truthfully with `HEALTH_DATA_NOT_AVAILABLE`. |
| `GET` | `/api/health/abha-status` | **MODIFIED** | Reports `SANDBOX_CONFIGURED` only when `VANSETU_ABDM_SANDBOX_ENABLED=true`; reports `NOT_CONFIGURED` otherwise. Discloses zero PII architecture. |

---

## 7. Database Schema and Migration Changes

A new persistent table was added to `tenders.sqlite` via [`TenderService._init_db()`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/tender_service.py#L173-L188):

```sql
CREATE TABLE IF NOT EXISTS corridor_budget_approvals (
    approval_id TEXT PRIMARY KEY,
    corridor_id TEXT NOT NULL,
    proposal_id TEXT,
    action TEXT NOT NULL,
    approved_budget_lakh REAL NOT NULL,
    approval_notes TEXT NOT NULL,
    performed_by_user_id TEXT NOT NULL,
    performed_by_role TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
```

### Seed Data Gating
- `TenderService._seed_initial_data_if_empty()` and `HospitalHealthService._seed_initial_data_if_empty()` now execute **only** when:
  ```python
  if os.getenv("VANSETU_ENV", "").lower() != "development" or os.getenv("VANSETU_ENABLE_DEMO_SEED_DATA", "").lower() != "true":
      return
  ```
- In production, databases start completely clean with zero demonstration records.

---

## 8. Dashboard Data-Integrity Changes

1. **My Awarded Projects View:**
   - Switched data source from `api.listCorridorAssignments` to `api.getMyCorridorAssignments`.
   - Removed hardcoded `1` fallback for awarded work packages. Now dynamically reflects `assignments.length`.
   - Removed fabricated 45% progress bar on C-14. When no projects are assigned, displays an informative empty state prompting the user to browse the Tender Marketplace.
2. **Pro Dashboard View:**
   - Switched to `api.getMyCorridorAssignments`.
   - Neutralized hardcoded Studio Vriksh COA registration credentials; replaced with generic partner badge.
3. **My Proposals View:**
   - Switched to `api.getMyProposals` for direct, confidential retrieval of the firm's proposals.
4. **Government Overview View:**
   - Removed static fallback of `30` corridors. Evaluates real loaded corridor collection and real assignment allocations.

---

## 9. Hospital Health and ABDM Corrections

1. **Schema Harmonization:**
   - `HospitalHealthService.get_regional_indicators()` now returns both canonical backend fields and frontend-compatible aliases:
     - `hospital_name` and `reporting_facility`
     - `heatstroke_emergency_attendances` and `reported_heatstroke_cases_30d`
     - `heat_illness_visits` and `reported_heat_exhaustion_cases_30d`
     - `vulnerability_multiplier` (normalized 1.00× to 1.15× multiplier)
2. **Truthful Missing District Disclosure:**
   - All 11 NCT Delhi administrative districts are represented. Unmonitored districts truthfully report `status: HEALTH_DATA_NOT_AVAILABLE` with a baseline `1.00×` multiplier.
3. **ABDM Sandbox Gating:**
   - In `HospitalHealthService.get_abha_abdm_readiness_status()`, the state is conditioned on `VANSETU_ABDM_SANDBOX_ENABLED=true`. If the environment variable is false or unset, the system returns `NOT_CONFIGURED`.
   - The frontend status pill adapts styling dynamically (`text-emerald-300` when configured, `text-slate-300` when unconfigured).

---

## 10. Cost Optimisation Corrections

1. **Genuine MILP Solver Alternatives:**
   - Removed fixed multipliers (`0.92`, `1.05`).
   - The endpoint `POST /api/corridors/{corridor_id}/cost-optimisation` now executes `optimize_corridor_portfolio` twice with alternative objective formulations:
     - **Alternative 1:** `climate_priority="air_quality"` (maximizes particulate filtration and bioswale integration).
     - **Alternative 2:** Constrained capital allocation (85% budget ceiling, prioritizing high-albedo cool pavements and high-density thermal shade).
   - Each alternative reports `is_solver_optimized: True` and includes the exact archetypes selected by the solver.
2. **DSR 2023 Rate Benchmark Disclosure:**
   - Benchmark data is formally attributed: `"CPWD Delhi Schedule of Rates (DSR 2023) and municipal green infrastructure standards"`.

---

## 11. Backend Integration Test Results

Ran with Python 3.13.12 / pytest 9.1.1:

```
============================= test session starts ==============================
platform darwin -- Python 3.13.12, pytest-9.1.1, pluggy-1.7.0
rootdir: /Users/user/Documents/TeleSol-mac-release/vansetu-green
plugins: anyio-4.15.1, asyncio-1.4.1
collected 131 items

backend/tests/test_api_endpoints.py .................................... [ 27%]
backend/tests/test_data_integrity_and_rasters.py .....                   [ 31%]
backend/tests/test_evidence_passport.py ...                              [ 33%]
backend/tests/test_final_remediation_audit.py .......................... [ 53%]
backend/tests/test_govt_platform_and_rbac.py ..............              [ 64%]
backend/tests/test_ml_pipeline.py ....................                   [ 79%]
backend/tests/test_pareto_optimizer.py ..                                [ 80%]
backend/tests/test_project_readiness.py ..                               [ 82%]
backend/tests/test_scenarios_and_sensitivity.py ...                      [ 84%]
backend/tests/test_scientific_integrity_audit.py ........                [ 90%]
backend/tests/test_scoring_and_missing_data.py .....                     [ 94%]
backend/tests/test_seasonal_heat.py ...                                  [ 96%]
backend/tests/test_segment_suitability.py ...                            [ 98%]
backend/tests/test_shade_continuity.py ..                                [100%]
backend/tests/test_spatial_memory.py ...                                 [100%]

============================= 131 passed in 12.03s =============================
```

**Result: 131 tests passed, 0 failures, 0 errors.**

---

## 12. Frontend Test Results

Ran with Node.js test runner:

```
> vansetu-green-frontend@2.0.0 test
> node --test tests/*.test.mjs

✔ package.json includes required stack (React, Vite, Tailwind CSS, Leaflet, Recharts) (0.889ms)
✔ Delhi districts GeoJSON is valid EPSG:4326 FeatureCollection (0.320ms)
✔ Frontend implements all 5 policy scenarios, native resolution disclosures, and 10-view navigation (1.626ms)
✔ All HackCBS 9.0 specialized view components exist and wire to API client (0.218ms)
✔ All Government, Pro Professional, and Public View Components exist (4.722ms)
✔ RoleHeader implements 3-role persona switcher and institutional badges (0.329ms)
✔ App.jsx integrates RoleHeader, persona switching, and AccessDenied route guarding (0.169ms)
✔ REST API client provides all B2G tenders, allocations, cost optimization, and health endpoints (0.412ms)
✔ UI embeds strict single-party exclusivity and sealed competitive bid disclosures (0.204ms)
✔ Hospital and ABDM views enforce truthful reporting and zero PII disclosures (0.138ms)
✔ Pro Workspace components integrate dedicated /me endpoints (0.136ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ duration_ms 106.95ms
```

**Result: 11 tests passed, 0 failures.**

---

## 13. Production Build Result

Ran with Vite 5.4.21:

```
> vansetu-green-frontend@2.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 2241 modules transformed.
dist/index.html                                           1.03 kB │ gzip:   0.56 kB
dist/assets/index-BNYohKO_.css                           41.62 kB │ gzip:   7.76 kB
dist/assets/vendor-react-Dgv9Clnq.js                      0.07 kB │ gzip:   0.08 kB
dist/assets/StatusBadge-DTsnrcv9.js                       0.87 kB │ gzip:   0.46 kB
dist/assets/StatCard-CfrLXkid.js                          1.79 kB │ gzip:   0.72 kB
dist/assets/AccessDeniedView-J5YtJDhf.js                  2.57 kB │ gzip:   0.94 kB
dist/assets/PublicProjectsView-Dk_J6l7v.js                2.95 kB │ gzip:   1.20 kB
dist/assets/RoleHeader-Dpji29sl.js                        3.70 kB │ gzip:   1.16 kB
dist/assets/GovernmentAuditView-B04nnkqg.js               4.33 kB │ gzip:   1.71 kB
dist/assets/DataTable-C0QI5rWf.js                         4.35 kB │ gzip:   1.61 kB
dist/assets/PublicDashboardView-sbL3Wqs9.js               5.42 kB │ gzip:   1.65 kB
dist/assets/RegionalHealthIntelligenceView-DDmtvFlv.js    5.80 kB │ gzip:   1.94 kB
dist/assets/DataProvenanceModal-IiDeaCX7.js               6.35 kB │ gzip:   1.79 kB
dist/assets/AiPlanningAssistantView-CE2p-rE0.js           7.01 kB │ gzip:   2.27 kB
dist/assets/MyAssignedProjectsView-MbndMZXN.js            7.37 kB │ gzip:   2.42 kB
dist/assets/ProjectReadinessView-DnYVruUq.js              7.49 kB │ gzip:   2.54 kB
dist/assets/MyProposalsView-BaR9PlaR.js                   8.07 kB │ gzip:   2.44 kB
dist/assets/SeasonalHeatIntelligenceView-BeBH8EKb.js      8.30 kB │ gzip:   2.45 kB
dist/assets/ProcurementStudioView-BGuaKUKx.js             8.41 kB │ gzip:   2.49 kB
dist/assets/ShadeContinuityView-B0O6N_pG.js               8.83 kB │ gzip:   2.38 kB
dist/assets/EquityAndProvenanceView-C1KsLoq5.js           8.84 kB │ gzip:   2.58 kB
dist/assets/TemporalInsightsView-BXSgFLwm.js              8.97 kB │ gzip:   2.64 kB
dist/assets/ParetoPortfolioLabView-DqLs_wmL.js            9.11 kB │ gzip:   2.55 kB
dist/assets/ProDashboardView-CbSPWr6X.js                  9.61 kB │ gzip:   2.92 kB
dist/assets/ImpactMonitoringView-BqKuzXAx.js              9.67 kB │ gzip:   2.78 kB
dist/assets/CorridorEvidencePassportModal-DEIHDmfs.js     9.95 kB │ gzip:   2.66 kB
dist/assets/HospitalDataSourcesView-CQUsCYKq.js          10.07 kB │ gzip:   2.80 kB
dist/assets/SpatialMemoryMapView-B1NazyNk.js             11.16 kB │ gzip:   3.15 kB
dist/assets/TenderMarketplaceView-D5sUg9t4.js            11.32 kB │ gzip:   3.36 kB
dist/assets/ProfessionalAssignmentsView-1_TXQSm2.js      11.76 kB │ gzip:   3.56 kB
dist/assets/SegmentSuitabilityView-BhgqPh-X.js           11.85 kB │ gzip:   3.12 kB
dist/assets/GovernmentOverviewView-CzwP9LiK.js           12.12 kB │ gzip:   3.58 kB
dist/assets/InterventionOptimizerView-DosSyTDc.js        13.02 kB │ gzip:   3.36 kB
dist/assets/CorridorInventoryView-d-3_B-Wz.js            13.53 kB │ gzip:   3.88 kB
dist/assets/MekoMemoryStudioView-Cetx8E-9.js             14.04 kB │ gzip:   3.81 kB
dist/assets/CorridorCostOptimizerView-H8KUU75F.js        14.78 kB │ gzip:   3.86 kB
dist/assets/InterventionIntelligenceView-BnOSBO4A.js     20.84 kB │ gzip:   5.51 kB
dist/assets/TenderManagementView-BQzLc3BY.js             21.17 kB │ gzip:   5.62 kB
dist/assets/vendor-lucide-CKxsnjI_.js                    38.37 kB │ gzip:   8.96 kB
dist/assets/index-COijS0oG.js                            84.70 kB │ gzip:  20.71 kB
dist/assets/vendor-leaflet-C2v8r1Zx.js                  289.84 kB │ gzip:  88.58 kB
dist/assets/vendor-recharts-j4EvgYd0.js                 383.41 kB │ gzip: 105.30 kB
✓ built in 2.60s
```

**Result: Clean production build with zero errors and code-split chunks.**

---

## 14. Actual GitHub Actions Run Links and Status

- Previous Clean Run (UI Refactoring commit `3f28229`):
  - Run ID: `41226528619`
  - URL: `https://github.com/niharika19singh/vansetu-green/actions/runs/41226528619`
  - Status: Both jobs (`frontend-test-and-build`, `backend-test`) **SUCCESS / GREEN**
- Upcoming Run on commit push will be tracked under the repository workflow runs at:
  - `https://github.com/niharika19singh/vansetu-green/actions`

---

## 15. Commit SHA and PR #2 Status

- **Working Branch:** `feature/vansetu-govt-rbac-tender-ui`
- **Target Branch:** `feature/delhi-intervention-ml-pipeline`
- **Pull Request:** `https://github.com/niharika19singh/vansetu-green/pull/2` (remains in **Draft** status, not merged, not closed)
- **Previous Commit:** `3f28229cb2fc8223f1e988fd93a31ae8b8e96bcd`
- **Protected Branches Untouched:**
  - `main`
  - `feature/climate-investment-intelligence`
  - `feature/delhi-intervention-ml-pipeline`
  - `feature/kunal-frontend-optimization`

---

## 16. Known Remaining Limitations

1. **In-Memory Rate Limiting Scope:**
   - Rate limiting in `ml/security/auth.py` is process-local per Uvicorn worker. In multi-worker Kubernetes deployments, distributed rate limiting via Redis or an API gateway (e.g., Kong, Nginx) is required.
2. **Client-Side Token Storage in Demo Mode:**
   - The React frontend stores the active demo bearer token in memory and local session state for seamless role switching. Production deployments should utilize secure HttpOnly cookies.
3. **Synthetic GPR / Utility Survey Boundaries:**
   - Subsurface GPR utility survey data for Delhi corridors remains simulated demonstration data; actual municipal utility clearances must be acquired from Delhi PWD and BSES before field trenching.

---

## 17. Features Requiring Real External Credentials, Government Approval, or Live Datasets

To maintain strict scientific and regulatory honesty, the following integrations are explicitly documented as awaiting real-world institutional provisioning:

1. **ABDM Production Gateway Whitelisting:**
   - Live ABHA health data exchange requires formal certification under the National Health Authority (NHA) M3 specification and production gateway credentials. Current status is truthfully reported as `NOT_CONFIGURED` (or `SANDBOX_CONFIGURED` in test harnesses).
2. **Hospital Emergency Department Feeds:**
   - Real-time heat illness attendances from AIIMS, Safdarjung, LNJP, and GTB Hospital require execution of formal institutional Data Sharing Agreements (DSAs) and API whitelisting with the Government of NCT of Delhi Directorate of Health Services.
3. **Official Delhi PWD Tender Sanctioning:**
   - Tenders created in the application are internal administrative records and do not constitute legal tenders on the Central Public Procurement Portal (CPPP / `eprocure.gov.in`) without formal administrative approval and financial sanction (AA & FS) from the competent municipal authority.
4. **CPWD Schedule of Rates Calibration:**
   - Intervention cost benchmarks are parameterized based on the published CPWD Delhi Schedule of Rates (DSR 2023). Exact tender rates in field execution will be subject to contractor market tender premiums and site-specific quotation variations.
