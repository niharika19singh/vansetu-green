# VanSetu — Scientific Assumptions & Limitations

## 1. Overview & Epistemic Principles

Urban climate analytics platforms frequently suffer from false precision: displaying satellite skin temperature down to two decimal places while claiming it represents human comfort, or asserting that planting trees will cool an entire street canyon by exactly 3.2°C.

VanSetu adheres to strict scientific honesty and data integrity. Every metric presented by the platform is bounded by explicit physical assumptions and known observational limitations.

---

## 2. Satellite Remote Sensing Assumptions

### 2.1 Vegetation Canopy Density (NDVI)
- **Sensor:** Copernicus Sentinel-2 MSI Level-2A (Surface Reflectance).
- **Physical Assumption:** Normalized Difference Vegetation Index ($\text{NDVI} = \frac{\text{B08} - \text{B04}}{\text{B08} + \text{B04}}$) serves as an empirical proxy for photosynthetically active green canopy.
- **Limitation:** NDVI cannot distinguish between high-canopy mature shade trees, low roadside shrubs, ornamental grass, or weed growth along railway buffers. Ground surveys are required to confirm tree crown volume.
- **Resolution:** $10\text{m} \times 10\text{m}$ true native pixel. No artificial interpolation.

### 2.2 Radiometric Land Surface Temperature (LST)
- **Sensor:** NASA MODIS Terra (MOD11A2 Land Surface Temperature / Emissivity).
- **Physical Assumption:** Measures thermal infrared skin emission from the uppermost surface layer (asphalt tarmac, building roofs, vehicle tops, tree canopies).
- **Limitation 1 (Spatial Mismatch):** Native sensor pixel is $1,000\text{m} \times 1,000\text{m}$. Regional grid resampling to 10m is performed exclusively for visualization alignment and does not provide 10m micro-temperature accuracy.
- **Limitation 2 (Skin vs Air):** Surface skin temperature is **NOT 2m ambient air temperature ($T_a$)**. On a sunny Delhi summer afternoon, asphalt skin temperature may reach $52^\circ\text{C}$ while 2m air temperature is $42^\circ\text{C}$.

---

## 3. Human Thermal Comfort Limitations (UTCI & WBGT)

- **Status in VanSetu:** Explicitly marked as **`NOT_AVAILABLE`**.
- **Scientific Reason:** Calculating physiological human thermal comfort indices such as Universal Thermal Climate Index (UTCI) or Wet-Bulb Globe Temperature (WBGT) requires on-street micrometeorological observations:
  1. Ambient dry-bulb air temperature ($T_a$) at 2m height.
  2. Relative humidity ($\text{RH}\%$) or dew point.
  3. Wind velocity ($v_a$) at 10m height adjusted to 1.1m pedestrian level.
  4. Mean radiant temperature ($T_{\text{mrt}}$), incorporating solar shortwave radiation, diffuse sky radiation, and longwave emissions from surrounding street-canyon walls.
- None of these four variables can be reliably extracted from satellite thermal skin observations. VanSetu strictly prohibits calculating pseudo-UTCI without on-ground sensor telemetry.

---

## 4. Pedestrian Demand Assumptions

- **Status in VanSetu:** Spatial Connectivity Proxy.
- **Limitation:** VanSetu **does not measure or fabricate pedestrian footfall volume**. Automated pedestrian sensors (optical cameras or beam counters) are not publicly deployed across Delhi's 44 corridors.
- **Methodology:** Pedestrian demand is modeled strictly from spatial proximity to verified Delhi Metro stations, bus terminals, pedestrian footway density, and OpenStreetMap road network classification.

---

## 5. Non-Causal Attribution Honesty

- **Limitation:** In the Impact Monitoring module, observed changes in satellite NDVI, LST, and ambient CPCB PM2.5 are empirical differences between acquisition epochs.
- **Guardrail:** VanSetu does not claim sole causality for observed cooling or greening, as synoptic monsoon fronts, stubble-burning smoke plumes, atmospheric boundary layer inversions, and vehicular traffic shifts strongly influence radiometric and air-quality readings.
