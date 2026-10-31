# VanSetu — Feature 5: Seasonal Urban Heat Intelligence

## 1. Overview & Multi-Temporal Architecture

Urban heat in NCT Delhi is highly dynamic across seasons. Evaluating a corridor using only a single satellite scene risks misclassifying a transient anomaly (such as traffic congestion or temporary construction reflectance) as a structural microclimate hotspot.

The **Seasonal Urban Heat Intelligence** engine synthesizes multi-temporal radiometric Land Surface Temperature (LST) observations across Delhi's 3 distinct climate windows:

1. **Pre-Monsoon (March–June):** Peak dry summer with extreme solar insolation and heatwave conditions. Regional baseline mean LST is $34.8^\circ\text{C}$ (peak radiometric skin temperatures exceed $46^\circ\text{C}$).
2. **Monsoon (July–September):** Characterized by extensive cloud cover, moisture buffering, and rainfall cooling. Regional baseline mean LST is $30.5^\circ\text{C}$.
3. **Post-Monsoon / Winter (October–February):** Atmospheric boundary layer inversion, dense smog, and lower solar angles. Regional baseline mean LST is $21.2^\circ\text{C}$.

---

## 2. Persistent Thermal Hotspot Detection

To prevent municipal misinvestment, corridors are evaluated for **multi-seasonal thermal persistence**:

- **Persistent Thermal Hotspot (`PERSISTENT_THERMAL_HOTSPOT`):** Corridors exhibiting a consistent positive thermal anomaly ($\Delta T_{\text{LST}} \ge +1.5^\circ\text{C}$) across $\ge 2$ seasonal observations, or an extreme pre-monsoon summer anomaly $\ge +3.0^\circ\text{C}$. These represent structural urban heat island hotspots warranting major capital intervention.
- **Transient Thermal Anomaly (`TRANSIENT_THERMAL_ANOMALY`):** Corridors exhibiting elevated temperature in only one observation window.
- **Cool Corridor Refuge (`COOL_CORRIDOR_REFUGE`):** Corridors with sustained negative thermal anomalies relative to the city mean.

---

## 3. Spatial Resolution Transparency

The platform explicitly documents the sensor resolution provenance:

- **Current Production Sensor (NASA MODIS Terra MOD11A2):**
  - Native spatial resolution: $1,000\text{m} \times 1,000\text{m}$ regional pixels.
  - Display representation: $10\text{m} \times 10\text{m}$ bilinear interpolation onto the Sentinel-2 grid.
  - Physical Meaning: Captures regional radiometric thermal skin emissions.
- **High-Resolution Upgrade Path (USGS Landsat 8/9 Collection 2 TIRS):**
  - Native thermal resolution: $100\text{m}$ sensor pixel, resampled by USGS to a $30\text{m}$ grid.
  - Recommended for segment-level micro-hotspot verification before executing expensive excavation works.

---

## 4. Mandatory Human Thermal Comfort Disclaimer

VanSetu maintains strict scientific honesty regarding human heat stress:

> **Scientific Guardrail:**
> Radiometric Land Surface Temperature (LST) measures surface skin emissions (roofs, roads, tree tops) and **does NOT represent pedestrian 2m air temperature ($T_a$) or human physiological thermal comfort (UTCI / WBGT)**.
> Accurate calculation of Universal Thermal Climate Index (UTCI) and Wet-Bulb Globe Temperature (WBGT) requires on-street micro-weather stations capturing air temperature, relative humidity, wind speed, and mean radiant temperature ($T_{mrt}$). UTCI and WBGT metrics remain explicitly marked as **`NOT_AVAILABLE`** until microclimate sensors are deployed.
