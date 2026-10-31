# VanSetu GreenTech — Feature Specifications & Mathematical Methodology (`docs/FEATURES.md`)

## 1. Feature Implementation Matrix

| Capability Domain | Feature | Implementation Status | Key Module(s) |
| :--- | :--- | :--- | :--- |
| **A. Geospatial Climate Assessment** | Interactive Leaflet Map & Basemap Switcher | Verified | `InteractiveMap.jsx` |
| | Urban Corridor Vector Visualization (44 Corridors) | Verified | `corridor_service.py`, `InteractiveMap.jsx` |
| | Heat Exposure Analysis (MODIS 1km Native + 10m Display) | Verified | `raster_service.py`, `tile_service.py` |
| | Vegetation & Sentinel-2 10m NDVI Visualization | Verified | `raster_service.py`, `tile_service.py` |
| | Air-Quality Indicators (8 CPCB Stations + Haversine Interpolation) | Verified | `aqi_service.py`, `aqi.py` |
| | District (11 NCT Delhi Districts) & Corridor Selection | Verified | `PriorityRankingPanel.jsx`, `InteractiveMap.jsx` |
| | Raster-Based Geospatial Hotspot Analysis (`scipy.ndimage.label`) | Verified | `corridor_service.py` (`/api/corridors/raster-zones`) |
| **B. Corridor Prioritization** | Explainable 6-Factor Priority Score $[0, 1]$ | Verified | `scoring_service.py` |
| | Implementation Feasibility Score $[0, 1]$ | Verified | `scoring_service.py` |
| | Evidence Confidence Score & Deduction Ledger $[0, 1]$ | Verified | `scoring_service.py` |
| | Dynamic Missing-Data Weight Re-Normalization (Never Zero) | Verified | `scoring_service.py` |
| | Full Input, Weight & Formula Trace Exposure (`formula_trace`) | Verified | `scoring_service.py`, `CorridorAnalyticalDetail.jsx` |
| **C. Scenario & Sensitivity Analysis** | Baseline Scenario (`baseline`) | Verified | `scoring_service.py` |
| | Heat-Resilience Scenario (`heat_resilience`) | Verified | `scoring_service.py` |
| | Air-Quality Scenario (`air_quality`) | Verified | `scoring_service.py` |
| | Pedestrian-Equity Scenario (`pedestrian_equity`) | Verified | `scoring_service.py` |
| | Extreme-Vulnerability Scenario (`extreme_vulnerability`) | Verified | `scoring_service.py` |
| | Comparative Rankings, Score Deltas & Stability Index $S \in [0, 1]$ | Verified | `scoring_service.py`, `CorridorAnalyticalDetail.jsx` |
| | Two-Factor What-If Thermal/Green Slider (`heat_weight` $\in [0, 1]$) | Verified | `corridor_service.py`, `PriorityRankingPanel.jsx` |
| **D. Intervention Planning** | Linear Street Trees (`linear_street_trees`) | Verified | `intervention_service.py` |
| | Architectural Shade Structures (`architectural_shade_structures`) | Verified | `intervention_service.py` |
| | Roadside Bioswales (`roadside_bioswales`) | Verified | `intervention_service.py` |
| | Living Green Walls (`living_green_walls`) | Verified | `intervention_service.py` |
| | Cool Pavements (`cool_pavements`) | Verified | `intervention_service.py` |
| | CPWD DSR 2023 CapEx, Annual OpEx & 5-Year Lifecycle Costing | Verified | `intervention_service.py`, `InterventionPlannerPanel.jsx` |
| | Site Constraints, Pre-Installation Verification & Evidence Limits | Verified | `intervention_service.py`, `InterventionPlannerPanel.jsx` |

---

## 2. Mathematical Scoring Framework

### 2.1 Indicator Normalization ($[0, 1]$)

1. **Heat Exposure ($x_{\text{heat}}$):**
   $$\text{LST}_{\text{norm}} = \text{clip}\left(\frac{\text{LST} - P_{2}(\text{LST})}{P_{98}(\text{LST}) - P_{2}(\text{LST})},\; 0.0,\; 1.0\right)$$
   where $P_2$ and $P_{98}$ are the 2nd and 98th percentiles of valid native MODIS Land Surface Temperature pixels across NCT Delhi.
2. **Vegetation Deficit ($x_{\text{green\_deficit}}$):**
   $$\text{NDVI}_{\text{norm}} = \text{clip}\left(\frac{\text{NDVI} - (-0.20)}{0.80 - (-0.20)},\; 0.0,\; 1.0\right), \quad x_{\text{green\_deficit}} = 1.0 - \text{NDVI}_{\text{norm}}$$
3. **Air Quality Stress ($x_{\text{pollution}}$):**
   $$x_{\text{pollution}} = \text{clip}\left(\frac{\text{AQI} - 50.0}{300.0 - 50.0},\; 0.0,\; 1.0\right)$$
4. **Pedestrian Exposure Demand ($x_{\text{pedestrian}}$):**
   Derived from field survey override or OpenStreetMap highway hierarchy (`pedestrian: 0.92`, `footway: 0.88`, `living_street: 0.85`, `secondary: 0.82`, `tertiary: 0.80`, `primary: 0.78`, `residential: 0.76`, `trunk: 0.45`, `motorway: 0.15`).
5. **Compound Thermal-Pollution Health Risk ($x_{\text{health\_risk}}$):**
   $$x_{\text{health\_risk}} = \text{clip}\left(0.50 \cdot x_{\text{heat}} + 0.35 \cdot x_{\text{pollution}} + 0.15 \cdot (x_{\text{heat}} \cdot x_{\text{pollution}}),\; 0.0,\; 1.0\right)$$
6. **Socio-Spatial Vulnerability ($x_{\text{vulnerable\_pop}}$):**
   Administrative district demographic and housing density vulnerability index across the 11 NCT Delhi districts (`North East Delhi: 0.88`, `Shahdara: 0.84`, `Central Delhi: 0.82`, `East Delhi: 0.79`, `North West Delhi: 0.74`, `West Delhi: 0.72`, `North Delhi: 0.71`, `South East Delhi: 0.68`, `South Delhi: 0.56`, `South West Delhi: 0.52`, `New Delhi: 0.38`).

### 2.2 Dynamic Missing-Data Weight Re-Normalization

Let $\mathcal{V} = \{i \in \mathcal{I} \mid x_i \text{ is finite and not None}\}$ be the set of valid available indicators for a corridor. If $\mathcal{V} = \emptyset$, the priority score is `None` (never `0.0`). Otherwise, each active weight is re-normalized over $\mathcal{V}$:

$$\bar{w}_i = \frac{w_i}{\sum_{j \in \mathcal{V}} w_j} \quad \forall i \in \mathcal{V}, \qquad \text{Priority Score} = \sum_{i \in \mathcal{V}} \bar{w}_i \cdot x_i$$

---

## 3. Policy Scenarios & Ranking Stability

### 3.1 Scenario Weight Matrix

| Indicator | `baseline` | `heat_resilience` | `air_quality` | `pedestrian_equity` | `extreme_vulnerability` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Heat Exposure (`heat`)** | `0.25` | `0.40` | `0.15` | `0.15` | `0.20` |
| **Vegetation Deficit (`green_deficit`)** | `0.20` | `0.25` | `0.20` | `0.15` | `0.05` |
| **Air Quality (`pollution`)** | `0.20` | `0.15` | `0.40` | `0.10` | `0.15` |
| **Pedestrian Needs (`pedestrian`)** | `0.15` | `0.10` | `0.10` | `0.30` | `0.10` |
| **Compound Health Risk (`health_risk`)** | `0.12` | `0.05` | `0.10` | `0.10` | `0.25` |
| **Socio-Spatial Vulnerability (`vulnerable_pop`)** | `0.08` | `0.05` | `0.05` | `0.20` | `0.25` |
| **Sum** | **1.00** | **1.00** | **1.00** | **1.00** | **1.00** |

### 3.2 Ranking Stability Index ($S$)

Across all $M = 5$ scenarios and $N = 44$ corridors, let $R_{c,s} \in \{1, \dots, N\}$ be corridor $c$'s rank in scenario $s$. The corridor's **Stability Index** is:

$$S_c = \max\left(0.0,\; 1.0 - \frac{\max_s R_{c,s} - \min_s R_{c,s}}{N - 1}\right)$$

- $S_c \ge 0.85$: **Robust Priority** (invariant to policy weight shifts)
- $0.65 \le S_c < 0.85$: **Moderate Sensitivity**
- $S_c < 0.65$: **High Policy Sensitivity**

---

## 4. GreenTech Intervention Categories & Cost Methodology

All costs are standardized in **INR Lakhs (`₹100,000`) per kilometer** based on the **CPWD Delhi Schedule of Rates (DSR 2023)** and **MoHUA Urban Greening Guidelines**, scaled linearly by corridor length ($L_{\text{km}} = \text{length\_m} / 1000$):

$$\text{5-Year Lifecycle Cost} = \text{CapEx} + 5 \times \text{Annual OpEx}$$

| Intervention Category | Canonical ID | Unit Basis per km | CapEx (₹L/km) | Annual OpEx (₹L/km/yr) | Mortality Reserve | 5-Yr Lifecycle (₹L/km) | Service Life |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Linear Street Trees** | `linear_street_trees` | 120 mature saplings + 1m³ structural soil pits + drip | `7.20` | `2.40` | `15%` | `19.20` | `30 yrs` |
| **Architectural Shade Structures** | `architectural_shade_structures` | 6 steel-tensile shade canopies (300 m²/km) | `15.00` | `0.90` | `0%` | `19.50` | `12 yrs` |
| **Roadside Bioswales** | `roadside_bioswales` | 400m × 1.5m engineered infiltration swale | `11.00` | `1.80` | `10%` | `20.00` | `15 yrs` |
| **Living Green Walls** | `living_green_walls` | 300 m² vertical vegetated pier/facade cladding | `13.50` | `2.80` | `20%` | `27.50` | `8 yrs` |
| **Cool Pavements** | `cool_pavements` | 1,800 m² high-albedo (SRI $\ge 78$) footpath retrofit | `7.20` | `1.60` | `0%` | `15.20` | `5 yrs` |
