# VanSetu — Feature 6: Climate Intervention Impact Monitoring

## 1. Overview & Persistent Lifecycle Registry

Most municipal environmental dashboards stop once an intervention is recommended. They offer no mechanism to track whether interventions were built, whether saplings survived, or whether microclimates shifted over time.

The **Climate Intervention Impact Monitoring** service provides a persistent lifecycle registry in SQLite (`backend/data/climate_intelligence.sqlite`) tracking investments through 4 standardized lifecycle states:

```
[PLANNED] ──► [UNDER_CONSTRUCTION] ──► [OPERATIONAL] ──► [MAINTENANCE_REQUIRED]
```

- `PLANNED`: Budget allocated, design parameters approved, awaiting civil contractor mobilization.
- `UNDER_CONSTRUCTION`: Civil works, GPR trial pits, and sapling planting active on site.
- `OPERATIONAL`: Intervention completed and verified; routine maintenance and sensor telemetry active.
- `MAINTENANCE_REQUIRED`: Survival rate drops below threshold, irrigation deficit detected, or tensile structure damaged.

---

## 2. Empirical Before-and-After Delta Comparison

When post-implementation observations are recorded, the engine calculates empirical observational deltas:

- **Canopy Density Delta:**
  $$\Delta \text{NDVI} = \text{NDVI}_{\text{post}} - \text{NDVI}_{\text{pre}}$$
- **Radiometric Thermal Delta:**
  $$\Delta T_{\text{LST}} = T_{\text{LST, post}} - T_{\text{LST, pre}} \quad [^\circ\text{C}]$$
- **Particulate Matter Delta:**
  $$\Delta \text{PM}_{2.5} = \text{PM}_{2.5, \text{post}} - \text{PM}_{2.5, \text{pre}} \quad [\mu\text{g/m}^3]$$

---

## 3. Difference-in-Differences (Paired Control Corridors)

To separate local intervention effects from regional weather phenomena (e.g. city-wide rainfall or cold fronts), every deployed corridor is paired with an untreated **Control Corridor** in the same district and climatic zone:

- **Intervention Corridor (e.g., C-14 Asaf Ali Road):** Treated with 120 Street Trees.
- **Paired Control Corridor (e.g., C-12 Jawaharlal Nehru Marg):** Untreated reference baseline.

Comparing deltas between treated and control corridors provides robust empirical insight into comparative greening progress.

---

## 4. Non-Causal Attribution Honesty

VanSetu enforces a strict scientific disclaimer regarding attribution:

> **Attribution Disclaimer:**
> Observed changes in satellite radiometric LST and CPCB ambient AQI represent empirical differences between observation periods. VanSetu **explicitly DOES NOT claim sole causality**, as regional weather patterns, synoptic wind shifts, boundary layer dynamics, and seasonal traffic fluctuations strongly influence observations.
