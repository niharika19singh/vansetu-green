# VanSetu — Data Modelling & API Specification Changes

## 1. Overview

This document details the complete data models, database schemas, and REST API contract extensions introduced in VanSetu to support the 8 research-backed features.

---

## 2. Database Schema Extensions

### 2.1 SQLite Database: `backend/data/climate_intelligence.sqlite`

#### Table: `intervention_registry` (Feature 6: Impact Monitoring)
```sql
CREATE TABLE IF NOT EXISTS intervention_registry (
    id TEXT PRIMARY KEY,
    corridor_id TEXT NOT NULL,
    corridor_code TEXT NOT NULL,
    corridor_name TEXT NOT NULL,
    district TEXT NOT NULL,
    archetype TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL,  -- PLANNED, UNDER_CONSTRUCTION, OPERATIONAL, MAINTENANCE_REQUIRED
    planned_date TEXT NOT NULL,
    completion_date TEXT,
    capex_inr_lakhs REAL NOT NULL,
    opex_annual_lakhs REAL NOT NULL,
    units_deployed INTEGER NOT NULL,
    control_corridor_id TEXT,
    control_corridor_code TEXT,
    baseline_metrics TEXT NOT NULL,  -- JSON string {ndvi_mean, lst_celsius, aqi_pm25, ...}
    post_metrics TEXT,              -- JSON string {ndvi_mean, lst_celsius, aqi_pm25, ...}
    notes TEXT,
    is_synthetic_demo INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);
```

#### Table: `readiness_projects` (Feature 8: Project Readiness Planner)
```sql
CREATE TABLE IF NOT EXISTS readiness_projects (
    project_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    budget_lakhs REAL NOT NULL,
    corridor_count INTEGER NOT NULL,
    corridor_codes TEXT NOT NULL,    -- JSON string ["C-14", "C-01", ...]
    current_overall_gate TEXT NOT NULL,
    readiness_score REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### Table: `readiness_packages` (Feature 8: Work Packages)
```sql
CREATE TABLE IF NOT EXISTS readiness_packages (
    package_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    code TEXT NOT NULL,              -- WP-1 to WP-8
    name TEXT NOT NULL,
    lead_agency TEXT NOT NULL,
    allocated_budget_lakhs REAL NOT NULL,
    duration_weeks INTEGER NOT NULL,
    current_gate TEXT NOT NULL,      -- 1_CONCEPT_IDENTIFIED to 8_OPERATIONAL_MONITORING
    iomete_category TEXT NOT NULL,
    deliverables TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES readiness_projects(project_id)
);
```

---

## 3. New API Endpoints Summary

| Feature | Method | Route | Description |
| :--- | :--- | :--- | :--- |
| **Feature 1** | `GET` | `/api/evidence/passport/{corridor_id}` | Full Corridor Evidence Passport payload |
| **Feature 1** | `GET` | `/api/evidence/passports` | City-wide evidence summary across all 44 corridors |
| **Feature 2** | `GET` | `/api/suitability/corridor/{corridor_id}/segments` | Segment-level suitability across 5 archetypes |
| **Feature 2** | `GET` | `/api/suitability/segment/{segment_id}` | Detailed geometry & constraint alternatives for segment |
| **Feature 2** | `GET` | `/api/suitability/species-catalog` | NCT Delhi 12 native urban tree species catalog |
| **Feature 3** | `POST` | `/api/optimizer/pareto` | Multi-objective Pareto MILP optimization run |
| **Feature 3** | `GET` | `/api/optimizer/pareto/presets` | Presets across ₹20L, ₹50L, and ₹1Cr budgets |
| **Feature 4** | `GET` | `/api/shade-continuity/{corridor_id}` | Walkability shade gap analysis & Shade Bridge plans |
| **Feature 4** | `GET` | `/api/shade-continuity/network-gaps` | Ranked city-wide list by Shade Gap Score |
| **Feature 5** | `GET` | `/api/seasonal/corridor/{corridor_id}` | Multi-seasonal thermal observations & hotspot classification |
| **Feature 5** | `GET` | `/api/seasonal/hotspots` | All persistent thermal hotspots across NCT Delhi |
| **Feature 5** | `GET` | `/api/seasonal/baselines` | Pre-monsoon, Monsoon, and Winter city baseline metrics |
| **Feature 6** | `GET` | `/api/impact/registry` | All tracked intervention lifecycle records |
| **Feature 6** | `GET` | `/api/impact/deployment/{id}` | Empirical before-after delta & control comparison |
| **Feature 6** | `POST` | `/api/impact/deployments` | Register a new intervention deployment |
| **Feature 6** | `PATCH` | `/api/impact/deployment/{id}/status` | Update lifecycle stage (`PLANNED` to `OPERATIONAL`) |
| **Feature 7** | `GET` | `/api/meko/spatial/pins` | Georeferenced memory pins for interactive mapping |
| **Feature 7** | `POST` | `/api/meko/spatial/action` | Execute lifecycle action (Approve, Correct, Promote, Forget) |
| **Feature 7** | `GET` | `/api/meko/spatial/corridor/{id}/comparison` | MEKO ON vs. OFF decision impact comparison |
| **Feature 8** | `GET` | `/api/readiness/projects` | List all municipal implementation projects |
| **Feature 8** | `POST` | `/api/readiness/projects/from-portfolio` | Convert optimized portfolio into 8 work packages |
| **Feature 8** | `GET` | `/api/readiness/projects/{id}` | Full implementation readiness plan & IOMETE links |
| **Feature 8** | `PATCH` | `/api/readiness/package/{id}/gate` | Advance work package to next readiness gate |
