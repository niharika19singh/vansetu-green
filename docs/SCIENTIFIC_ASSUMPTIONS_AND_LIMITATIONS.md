# VanSetu — Scientific Assumptions, Data Provenance & Limitations

## 1. Overview & Epistemic Principles

Urban climate analytics platforms frequently suffer from false precision: displaying satellite skin temperature down to two decimal places while claiming it represents human comfort, or asserting that planting trees will cool an entire street canyon by exactly 3.2°C.

VanSetu adheres to strict scientific honesty, transparent provenance, and data integrity. Every metric presented by the platform is bounded by explicit physical assumptions, sensor limitations, and empirical data availability.

---

## 2. Feature Classification & Epistemic Status Matrix

| Feature | Primary Method | Empirical Data Source | Assumptions & Limitations | Guardrail & Classification |
| :--- | :--- | :--- | :--- | :--- |
| **1. Corridor Evidence Passport** | Disaggregated Multidimensional Audit | Sentinel-2 BOA Surface Reflectance; MODIS MOD11A2; CPCB WAQI Telemetry | Discloses missing data with `null` and `UNAVAILABLE`. No synthetic numeric defaults (e.g. 0.25 NDVI or 32°C LST). | **Real Data-Driven + Explicit Missing Data Disclosure** |
| **2. Right Tree, Right Place** | Segment Suitability & Silvicultural Advisory | OpenStreetMap centerline geometry; Master Plan ROW guidelines; FRI/CPWD silvicultural norms | Sidewalk widths, overhead wires, and utilities are unmeasured in public GIS; explicitly flagged `FIELD_VERIFICATION_REQUIRED`. | **Deterministic Guideline Model + Advisory Reference** |
| **3. Pareto Portfolio Lab** | Multi-Objective MILP Decision System | Tri-vector corridor scores; CPWD Schedule of Rates 2023 unit costs | Solved via deterministic Branch-and-Cut (HiGHS). Disclaims physical °C cooling; outputs vulnerability reduction points. | **Deterministic Optimization Model (Sampled Non-Dominated Set)** |
| **4. Shade Continuity Analyser** | Walkability Graph & Empirical Raster Sampling | 10m Sentinel-2 NDVI raster sampled at segment midpoints; Transit station coords | NDVI serves as a 2D vegetative canopy proxy; does not measure 3D structural building shade, sky view factor, or MRT. | **Empirical Raster Canopy Proxy + Euclidean Network** |
| **5. Seasonal Heat Intelligence** | Multi-Temporal Radiometric Profiling | NASA MODIS Terra (MOD11A2) Pre-Monsoon 2024 GeoTIFF | Ingested GeoTIFFs cover Pre-Monsoon 2024 only. Monsoon and Winter are synthetic models; persistence is flagged `LOW_UNVERIFIED`. | **Empirical Single-Season + Synthetic Seasonal Model** |
| **6. Impact Monitoring** | Before-and-After Lifecycle Registry | Seeded demonstration record (C-14); user-registered capital deployments | Non-causal attribution: acknowledges regional weather, atmospheric boundary layer, and traffic fluctuations. | **Local Persisted Lifecycle Buffer + Non-Causal Attribution** |
| **7. Spatial Memory Map** | Georeferenced Context Retrieval | Meko MCP Datapacks; OpenStreetMap corridor centroids | Records without explicit coordinates remain unlocated (`has_spatial_coordinates: False`); no fake central Delhi coordinates. | **Live/Local Meko MCP Integration + Role Scoping** |
| **8. Project Readiness Planner** | Capital Implementation Work Packages | 8 Standard Municipal Work Packages; IOMETE Climate Tech Catalog | Enforces non-empty corridor portfolios. Dynamic readiness scores derived from actual package gates (12.5% to 100%). | **Standardized Municipal Engineering Workflow** |

---

## 3. Remote Sensing & Environmental Physics Assumptions

### 3.1 Vegetation Canopy Density (NDVI)
- **Sensor:** Copernicus Sentinel-2 MSI Level-2A (Surface Reflectance).
- **Physical Meaning:** Normalized Difference Vegetation Index ($\text{NDVI} = \frac{\text{B08} - \text{B04}}{\text{B08} + \text{B04}}$) reflects chlorophyll absorption and near-infrared canopy scatter.
- **Limitation:** NDVI cannot distinguish between high-canopy mature shade trees, low roadside shrubs, ornamental grass, or weed growth along railway buffers. Ground surveys are required to confirm tree crown volume and tree trunk diameter at breast height (DBH).
- **Resolution:** $10\text{m} \times 10\text{m}$ true native pixel. No artificial interpolation.

### 3.2 Radiometric Land Surface Temperature (LST)
- **Sensor:** NASA MODIS Terra (MOD11A2 Land Surface Temperature / Emissivity).
- **Physical Meaning:** Measures thermal infrared skin emission from the uppermost surface layer (asphalt tarmac, building roofs, vehicle tops, tree crowns).
- **Limitation 1 (Spatial Mismatch):** Native sensor pixel is $1,000\text{m} \times 1,000\text{m}$ ($57 \times 79$ regional grid). Display resampling to 10m is performed via bilinear interpolation strictly for visualization alignment and does not provide 10m micro-temperature accuracy.
- **Limitation 2 (Skin vs Air):** Surface skin temperature is **NOT 2m ambient air temperature ($T_a$)**. On a sunny Delhi summer afternoon, asphalt skin temperature may reach $52^\circ\text{C}$ while 2m air temperature is $42^\circ\text{C}$.

---

## 4. Human Thermal Comfort Limitations (UTCI & WBGT)

- **Status in VanSetu:** Explicitly marked as **`NOT_AVAILABLE`**.
- **Scientific Reason:** Calculating physiological human thermal comfort indices such as Universal Thermal Climate Index (UTCI) or Wet-Bulb Globe Temperature (WBGT) requires on-street micrometeorological observations:
  1. Ambient dry-bulb air temperature ($T_a$) at 2m height.
  2. Relative humidity ($\text{RH}\%$) or dew point.
  3. Wind velocity ($v_a$) at 10m height adjusted to 1.1m pedestrian level.
  4. Mean radiant temperature ($T_{\text{mrt}}$), incorporating solar shortwave radiation, diffuse sky radiation, and longwave emissions from surrounding street-canyon walls.
- None of these four variables can be reliably extracted from satellite thermal skin observations. VanSetu strictly prohibits calculating pseudo-UTCI without on-ground sensor telemetry.

---

## 5. Pedestrian Demand Assumptions

- **Status in VanSetu:** Spatial Connectivity Proxy.
- **Limitation:** VanSetu **does not measure or fabricate pedestrian footfall volume**. Automated pedestrian sensors (optical cameras or beam counters) are not publicly deployed across Delhi's 44 corridors.
- **Methodology:** Pedestrian demand is modeled strictly from spatial proximity to verified Delhi Metro stations, bus terminals, pedestrian footway density, and OpenStreetMap road network classification. Transit distance is calculated as straight-line Euclidean distance (Haversine).

---

## 6. Site Suitability & Native Species Silviculture

- **Geometry Constraints:** Sidewalk widths, curb depths, and underground utility depths (BSES power lines, DJB water mains, IGL gas pipes) are unmeasured in public GIS datasets. Subterranean archetypes are classified as `FIELD_VERIFICATION_REQUIRED` and demand GPR trial pits.
- **Advisory Species Reference:** The 12-species NCT Delhi Native Tree Catalog is derived from Central Pollution Control Board (CPCB) Green Belt Development Norms and Forest Research Institute (FRI) Dehradun silvicultural notes. Species choices represent advisory suitability and must be confirmed by local DDA/MCD horticulturists.

---

## 7. Multi-Objective Pareto Optimization

- **Mathematical Engine:** Deterministic Mixed-Integer Linear Programming (MILP) solved using `scipy.optimize.milp` with the HiGHS Branch-and-Cut solver.
- **Consistency Guarantee:** All portfolio scenarios are compared under the identical budget mode (`capex`) and budget envelope.
- **Frontier Nature:** The Pareto frontier is a **sampled non-dominated set** generated across diverse scalarization weights, rather than a continuous analytical surface.
- **Attribution Guardrail:** No physical cooling in °C is claimed. Output metrics reflect empirical tri-vector vulnerability reduction points, estimated tree counts, and canopy surface area ($m^2$).

---

## 8. Multi-Temporal Seasonal Observations

- **Empirical Baseline:** Pre-Monsoon (March–June 2024) NASA MODIS Terra LST GeoTIFF.
- **Synthetic Models:** Monsoon (July–September) and Winter (October–February) values are synthetic demonstration models based on regional climate averages. They are explicitly tagged with `is_measured: False` and `data_classification: "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION"`.
- **Hotspot Persistence:** Hotspot persistence across multi-seasonal observations is classified as `LOW_UNVERIFIED` because certified persistence requires $\ge 3$ independent empirical satellite acquisitions.

---

## 9. Non-Causal Attribution in Impact Monitoring

- **Attribution Guardrail:** Observed changes in satellite NDVI, LST, and ambient CPCB PM2.5 are empirical differences between acquisition epochs. VanSetu explicitly does not claim sole causality for observed cooling or greening, as synoptic monsoon fronts, stubble-burning smoke plumes, atmospheric boundary layer inversions, and vehicular traffic shifts strongly influence readings.
- **Control Corridor Disclosures:** Control corridors serve as untreated baseline proxies. Ground surveys have not verified whether private or civic greening occurred within control corridor buffers during the monitoring window.

---

## 10. Institutional Memory & Meko Architecture

- **Zero Fake Coordinates:** Memory pins without verified coordinates return `has_spatial_coordinates: False` with `lat: null, lng: null` rather than being assigned arbitrary central Delhi coordinates.
- **Datapack Scoping:** Build-time memories (`vansetu-build`) are strictly isolated from runtime municipal planning datapacks (`vansetu-project-memory`, `vansetu-climate-knowledge`, `vansetu-planning-decisions`).
- **Truthful Status:** Records are labeled with their genuine verification status (`human_verified`, `UNVERIFIED_DEMONSTRATION`, `PENDING_FIELD_VERIFICATION`).
