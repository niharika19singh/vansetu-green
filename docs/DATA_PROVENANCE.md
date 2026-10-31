# Scientific Data Provenance & Resolution Integrity

## 1. Native vs. Display Spatial Resolution Disclosure

VanSetu enforces strict scientific transparency across all geospatial, thermal, air-quality, and time-series datasets:

| Dataset | Source / Provider | Native Resolution | Display Resolution | Resampling & Integrity Disclosure |
| :--- | :--- | :--- | :--- | :--- |
| **Sentinel-2 NDVI (`delhi_ndvi_10m.tif`)** | ESA Copernicus Sentinel-2 MSI Level-2A (Bands B8 & B4) | **`10m`** (`5572 × 7794`, `EPSG:4326`) | **`10m`** (`5572 × 7794`) | Sampled and displayed at native 10m spatial resolution. `NaN` pixels are masked and never coerced to `0.0`. |
| **MODIS Terra LST (`delhi_lst_modis_daily_celsius.tif`)** | NASA LP DAAC MOD11A1.061 Thermal Infrared (Bands 31 & 32) | **`1,000m` (`1 km`)** (`57 × 79`, `EPSG:4326`) | **`10m`** (`5572 × 7794`) | Bilinearly resampled strictly for visual map alignment with the 10m NDVI grid. **Never misrepresented as street-level thermal sensing.** Both native 1km and display 10m values are exposed in API responses, and a `-0.12` Evidence Confidence penalty is applied to reflect coarse thermal granularity. |
| **Green Deficit Index (`GDI`)** | Derived Composite (`0.60 * LST_norm + 0.40 * (1 - NDVI_norm)`) | **`1,000m` effective** | **`10m`** | Propagates `NaN` wherever either NDVI or LST is `NaN`. |
| **Ambient AQI Network** | CPCB / DPCC CAAQMS via WAQI & OpenAQ | **Point Stations** (8 reference stations across NCT Delhi) | **Haversine Zonal Assignment** | Explicitly reports `is_live: true/false` and `data_mode: "live_api" / "historical_reference_baseline"`. Applies a `-0.08` confidence penalty when nearest station distance exceeds `10 km`. |
| **Tiger Data Temporal Series (`environmental_observations`)** | TimescaleDB Hypertable + Satellite/Station Anchors | **Daily / Sub-daily Buckets** | **`corridor_daily_summary`** | Day-0 observations are anchored to native satellite/station measurements (`is_simulated=false`). Backfilled diurnal/seasonal curves and post-intervention microclimate projections are explicitly labeled `is_simulated=true`. |
| **CPWD & IOMETE Equipment Costs** | CPWD DSR 2023 Hort/Civil + GeM Municipal Reference Bands | **Unit / Per-km Schedule** | **INR Lakhs (`₹L`)** | Explicitly labeled as **Illustrative Reference Pricing** for municipal planning and tender comparison. |
