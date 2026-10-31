# VanSetu — Feature 1: Corridor Evidence Passport

## 1. Overview & Purpose

The **Corridor Evidence Passport** is an evidence-grounded scientific document generated for every urban corridor in NCT Delhi. It transitions VanSetu from a traditional analytics dashboard that presents numbers as unquestioned facts into an auditable decision-support platform that explicitly articulates:
1. **What We Know:** Empirical observations grounded in verified satellite reflectance and calibrated sensors.
2. **What We Don't Know:** Known observational gaps, missing on-street sensors, and proxy assumptions.
3. **What Requires Verification:** Civil, geotechnical, and administrative checkpoints mandatory before capital expenditure (CapEx) release.
4. **5 Disaggregated Data Quality Dimensions:** Quantitative scores (0–100%) separating sensor fidelity, completeness, recency, spatial proximity, and mathematical deduction confidence.
5. **Actionable Evidence Improvement Recommendations:** Prioritized recommendations with realistic municipal cost estimates to upgrade data certainty.

---

## 2. The 3 Structured Evidence Sections

### 2.1 WHAT WE KNOW (Verified Empirical Observations)
- **Vegetation Canopy Density (NDVI):**
  - Sensor: Copernicus Sentinel-2 MSI L2A (Bottom-of-Atmosphere surface reflectance).
  - Native Resolution: 10m &times; 10m true spatial pixel.
  - Acquisition Window: March–June 2024 (Pre-monsoon dry composite).
  - Provenance: Cloud-masked median composite in EPSG:4326.
- **Surface Heat Indicator (Radiometric LST):**
  - Sensor: NASA MODIS Terra (MOD11A2 Land Surface Temperature).
  - Native Measurement Resolution: 1,000m &times; 1,000m regional grid (57 &times; 79 pixels across Delhi).
  - Display Grid: 10m &times; 10m bilinear interpolation onto Sentinel-2 grid.
  - Physical Meaning: Measures surface skin radiation (roof, tarmac, tree tops)—**NOT 2m ambient air temperature**.
- **Ambient Air Quality (AQI):**
  - Source: Central Pollution Control Board (CPCB) continuous ambient monitoring network.
  - Telemetry: Real-time sensor feed when station is live; historical pre-monsoon baseline as fallback.
  - Proximity: Distance in kilometers from corridor centroid to reporting monitor.
- **Socio-Spatial Vulnerability:**
  - Source: Delhi Master Plan 2041 ward-level socio-demographic indicators + OpenStreetMap footway/transit density.
- **Site Implementation Geometry:**
  - Highway classification (primary, secondary, pedestrian) and Right-of-Way (ROW) envelope.

### 2.2 WHAT WE DON'T KNOW (Explicit Observational Gaps)
1. **Human Physiological Thermal Comfort (UTCI / WBGT):** Universal Thermal Climate Index (UTCI) and Wet-Bulb Globe Temperature (WBGT) cannot be computed without 2m air temperature, relative humidity, wind velocity at 10m, and mean radiant temperature ($T_{mrt}$). Satellite LST skin temperature cannot substitute for physiological heat stress.
2. **Subsurface Utilities:** Unmapped buried BSES power lines, Delhi Jal Board water mains, IGL gas pipelines, and MTNL telecom conduits are absent from open geospatial layers.
3. **Soil Compaction & Percolation:** Subgrade soil bulk density and infiltration rates under existing concrete/bitumen sidewalks are unmeasured.
4. **Street-Canyon Microclimate:** 1,000m MODIS resolution cannot resolve shade differences caused by adjacent buildings or narrow alleyways.

### 2.3 WHAT REQUIRES VERIFICATION (Pre-CapEx Checkpoints)
1. **Ground-Penetrating Radar (GPR) Trial Pits:** Subsurface utility scanning down to 1.5m depth prior to tree pit excavation.
2. **Clear Walkway Pedestrian Width Audit (IRC:103):** Indian Road Congress compliance verifying $\ge 1.80\text{m}$ unobstructed pedestrian walkway remains after intervention installation.
3. **Treated Effluent (STP) Water Guarantee:** Formal commitment from Delhi Jal Board for non-potable tanker irrigation over the 3-year sapling establishment window.
4. **Structural Wind-Shear Engineering Assessment:** Foundation anchor stability against 130 km/h summer dust squalls (IS 875 Part 3) for tensile shade canopies and vertical living walls.

---

## 3. The 5 Disaggregated Data Quality Dimensions

Instead of a single misleading confidence score, VanSetu calculates 5 separate dimensions:

| Dimension | Description | Measurement Logic | Scale |
| :--- | :--- | :--- | :--- |
| **Evidence Quality** | Sensor radiometric calibration and physical resolution | Sentinel-2 10m reflectance vs MODIS 1km LST | 0–100 |
| **Evidence Completeness** | Share of active environmental signals available | $\frac{\text{Active Signals}}{\text{Total Signals (6)}} \times 100$ | 0–100% |
| **Temporal Freshness** | Sensor acquisition recency | Real-time CPCB telemetry vs seasonal baseline | 0–100 |
| **Spatial Representativeness** | Physical distance to actual reporting monitors | Penalty based on distance to nearest CPCB station: $\max(50, 100 - 5 \times d_{\text{km}})$ | 0–100 |
| **Recommendation Confidence** | Systematic penalty deduction ledger from 1.00 base | $1.00 - \sum \text{penalties}$ (e.g. $-0.12$ thermal, $-0.06$ AQI) | 0–100% |

---

## 4. API Specification

### Endpoint: `GET /api/evidence/passport/{corridor_id}`
- **Path Parameter:** `corridor_id` (e.g., `C-14`, `delhi_corridor_014`, or integer `14`).
- **Response Contract:** Returns the complete Evidence Passport JSON payload including all 3 structured sections, 5 quality dimensions, and improvement actions.

### Endpoint: `GET /api/evidence/passports`
- **Response Contract:** Returns concise quality summaries for all 44 NCT Delhi corridors.
