# VanSetu GreenTech — Segment-Level Machine Learning Feature Schema

## 1. Schema Overview

The VanSetu GreenTech feature store comprises **39 engineered geospatial, physical, environmental, and administrative features** computed across all **1,302 road segments** in NCT Delhi.

- **Primary Storage**: `backend/data/features/delhi_segment_features.parquet` (compressed Apache Parquet)
- **Geospatial GeoJSON**: `backend/data/features/delhi_segment_features.geojson`
- **Metric Computation CRS**: `EPSG:32643` (WGS 84 / UTM Zone 43N)
- **Output Geographic CRS**: `EPSG:4326` (WGS 84 Lat/Lon)
- **Version**: `2.0.0-DELHI-ML`

---

## 2. Feature Definitions Table

| # | Feature Name | Data Type | Physical Bounds / Enum | Source Dataset | Missingness / Default Policy | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `segment_id` | String (Primary Key) | `^C-\d{2}-S\d{3}$` | Geometric Segmentation | Required (No missing allowed) | Unique deterministic segment ID (e.g., `C-14-S001`). |
| 2 | `corridor_id` | String | `^C-\d{2}$` or integer string | Geometric Segmentation | Required | Parent corridor identifier. |
| 3 | `corridor_code` | String | `^C-\d{2}$` | Administrative | Required | Standard corridor code (e.g., `C-14`). |
| 4 | `corridor_name` | String | Text | OSM Delhi | Required | Official road or corridor name. |
| 5 | `segment_index` | Integer | $[1, 200]$ | Geometric Segmentation | Required | Sequential index along the corridor. |
| 6 | `length_metres` | Float | $[25.0, 150.0]\text{ m}$ | Shapely in `EPSG:32643` | Required | Actual geodesic length of the segment. |
| 7 | `start_chainage_m` | Float | $\ge 0.0\text{ m}$ | Geometric Segmentation | Required | Cumulative distance from corridor origin. |
| 8 | `end_chainage_m` | Float | $\ge 25.0\text{ m}$ | Geometric Segmentation | Required | Cumulative distance at segment termination. |
| 9 | `centroid_lat` | Float | $[28.35, 28.95]^\circ\text{N}$ | Geometric Centroid | Required | Latitude in WGS 84. |
| 10 | `centroid_lon` | Float | $[76.80, 77.55]^\circ\text{E}$ | Geometric Centroid | Required | Longitude in WGS 84. |
| 11 | `midpoint_lat` | Float | $[28.35, 28.95]^\circ\text{N}$ | Interpolated metric midpoint | Required | Latitude of metric midpoint. |
| 12 | `midpoint_lon` | Float | $[76.80, 77.55]^\circ\text{E}$ | Interpolated metric midpoint | Required | Longitude of metric midpoint. |
| 13 | `district` | Categorical String | 11 NCT Delhi Districts | SEC Delhi Boundary Polygon | Spatial join; fallback to nearest district | Official revenue district name. |
| 14 | `district_id` | String | Text | SEC Delhi | Nullable | Administrative district code. |
| 15 | `is_boundary_edge` | Boolean | `True`, `False` | SEC Boundary Buffer (50m) | Default: `False` | Flag indicating segment lies within 50m of district border. |
| 16 | `distance_to_boundary_metres` | Float | $\ge 0.0\text{ m}$ | Metric distance to polygon boundary | Impute median ($1,200\text{ m}$) | Distance to nearest district administrative boundary. |
| 17 | `highway_class` | Categorical String | `primary`, `secondary`, `tertiary`, `trunk` | OpenStreetMap | Default: `primary` | Functional road hierarchy classification. |
| 18 | `is_walkable` | Boolean | `True`, `False` | OSM Pedestrian Tags | Default: `True` | Whether pedestrian footway or sidewalk is present. |
| 19 | `estimated_row_width_m` | Float | $[4.0, 60.0]\text{ m}$ | OSM roadway width & highway class | Default: $18.0\text{ m}$ | Estimated total Right-of-Way width. |
| 20 | `ndvi_mean` | Float | $[-0.50, 1.00]$ | Sentinel-2 L2A (10m) | Nullable / Impute corridor median | Mean NDVI over 15m road corridor buffer. |
| 21 | `ndvi_median` | Float | $[-0.50, 1.00]$ | Sentinel-2 L2A (10m) | Nullable | 50th percentile NDVI within buffer polygon. |
| 22 | `ndvi_p10` | Float | $[-0.50, 1.00]$ | Sentinel-2 L2A (10m) | Nullable | 10th percentile NDVI (highlights bare soil / imperviousness). |
| 23 | `ndvi_p90` | Float | $[-0.50, 1.00]$ | Sentinel-2 L2A (10m) | Nullable | 90th percentile NDVI (highlights existing mature tree canopy). |
| 24 | `ndvi_pixel_count` | Integer | $\ge 0$ | Sentinel-2 L2A (10m) | Default: $0$ | Number of 10m Sentinel-2 pixels intersecting buffer. |
| 25 | `ndvi_valid_pixel_fraction` | Float | $[0.0, 1.0]$ | Sentinel-2 L2A (10m) | Default: $0.0$ | Fraction of pixels with valid non-NoData reflectance. |
| 26 | `ndmi_proxy` | Float | $[-0.50, 1.00]$ | Normalized Difference Moisture Index | Nullable | Vegetation canopy moisture proxy ($0.85 \times \text{NDVI}$). |
| 27 | `modis_lst_celsius` | Float | $[15.0, 55.0]^\circ\text{C}$ | NASA MODIS MOD11A2 (1,000m) | Nullable / Impute district mean | Mean daytime Land Surface Temperature in Celsius. |
| 28 | `lst_pixel_count` | Integer | $\ge 0$ | NASA MODIS (1,000m) | Default: $0$ | Number of intersecting 1,000m MODIS grid cells. |
| 29 | `thermal_anomaly_celsius` | Float | $[-10.0, 15.0]^\circ\text{C}$ | MODIS LST vs Regional Baseline | Default: $0.0^\circ\text{C}$ | Temperature difference above Delhi mean ($25.5^\circ\text{C}$). |
| 30 | `ndbi_proxy` | Float | $[-1.00, 1.00]$ | Built-up Index Proxy | Default: $0.20$ | Normalized difference built-up index proxy ($1.0 - \text{NDVI}$). |
| 31 | `built_up_fraction` | Float | $[0.0, 1.0]$ | Built-up Area Fraction | Default: $0.65$ | Fraction of buffer covered by impervious surfaces. |
| 32 | `open_space_fraction` | Float | $[0.0, 1.0]$ | Open Space Fraction | Default: $0.35$ | Fraction of buffer available as open ground or verge ($1.0 - \text{built\_up}$). |
| 33 | `cpcb_station_id` | String | `DL001` to `DL018` | CPCB / DPCC CAAQM | Default: nearest station | Nearest air quality monitoring station ID. |
| 34 | `nearest_cpcb_station_name` | String | Text | CPCB / DPCC CAAQM | Default: nearest station name | Name and location of nearest CAAQM station. |
| 35 | `cpcb_distance_km` | Float | $[0.1, 35.0]\text{ km}$ | Haversine Formula | Required | Great-circle distance to nearest CAAQM station in km. |
| 36 | `cpcb_is_proximate` | Boolean | `True`, `False` | Distance $\le 5.0\text{ km}$ | Default: `False` | Flag indicating microclimate representativeness ($\le 5\text{ km}$). |
| 37 | `gpr_utility_survey_status` | Categorical String | `FIELD_GPR_REQUIRED`, `VERIFIED_CLEAR` | Municipal Records | Default: `FIELD_GPR_REQUIRED` | Subsurface utility clearance status. |
| 38 | `subsurface_utility_conflict_gpr`| Boolean | `True`, `False` | GPR Survey Clearance | Default: `False` | Hard constraint flag indicating underground utility clash. |
| 39 | `feature_schema_version` | String | `2.0.0-DELHI-ML` | Pipeline Metadata | Required | Schema version for dataset tracking. |

---

## 3. Missingness & Imputation Protocols

1. **Environmental Features (`ndvi_mean`, `modis_lst_celsius`)**:
   - If a road segment falls into a raster edge or NoData region, `SimpleImputer(strategy='median')` is fitted strictly on the spatial cross-validation training fold and applied to the test fold.
   - Global column imputation across the entire dataset is **strictly prohibited** to prevent spatial data leakage.

2. **Categorical Features (`district`, `highway_class`)**:
   - Encoded via `OneHotEncoder(handle_unknown='ignore')`.

3. **Subsurface Ground-Penetrating Radar (`gpr_utility_survey_status`)**:
   - By default, unverified segments carry `FIELD_GPR_REQUIRED`. Interventions requiring deep excavation (`linear_street_trees`, `roadside_bioswales`) receive `CONDITIONAL` recommendations with explicit survey warnings rather than unverified unconditional clearance.
