# VanSetu GreenTech — Segment-Level Machine Learning Feature Schema

## 1. Schema Overview

The VanSetu GreenTech feature store comprises multi-domain engineered geospatial, physical, environmental, and administrative features computed across all **1,302 road segments** in NCT Delhi.

- **Primary Storage**: `backend/data/features/delhi_segment_features.parquet` (compressed Apache Parquet)
- **Geospatial GeoJSON**: `backend/data/features/delhi_segment_features.geojson`
- **Metric Computation CRS**: `EPSG:32643` (WGS 84 / UTM Zone 43N)
- **Output Geographic CRS**: `EPSG:4326` (WGS 84 Lat/Lon)
- **Schema Version**: `2.1.0-DELHI-ML`

---

## 2. Scientific Provenance Classifications

Every feature in the VanSetu feature store is explicitly tagged with one of seven provenance categories:

| Provenance Category | Definition & Governance | Examples |
| :--- | :--- | :--- |
| **`DIRECTLY_OBSERVED`** | Ground measurements or station coordinates directly verified without modeling. | CAAQM Station IDs, Station Lat/Lon coordinates |
| **`SATELLITE_DERIVED`** | Derived from calibrated, open satellite earth observation missions (ESA Copernicus, NASA). | Sentinel-2 10m NDVI distributions, MODIS 1km Daily LST, Regional Thermal Anomaly |
| **`GIS_DERIVED`** | Calculated via deterministic computational geometry in metric UTM Zone 43N (`EPSG:32643`). | Segment geodesic length, chainage, 15m road buffer, district spatial joins, distance to CPCB stations |
| **`ENGINEERING_ESTIMATE`** | Established municipal design guidelines (IRC:SP:84, CPWD Guidelines) based on roadway class. | `road_class_guideline_row_m`, highway class walkability |
| **`FIELD_VERIFIED`** | Human-in-the-loop ground truth verified via official municipal work orders, GPR scans, or surveys. | `surveyed_row_width_m`, `clear_pedestrian_width_m`, `gpr_utility_survey_status` |
| **`PROXY_ESTIMATE`** | Empirical proxy estimates with disclosed margins of uncertainty. | `built_up_fraction`, `open_space_fraction` |
| **`UNAVAILABLE`** | Features whose requisite physical bands are absent from current inputs; synthetic formulas disabled. | `ndmi` (SWIR Band 11 required), `ndbi` (SWIR/NIR ratio required) |

---

## 3. Feature Definitions Table

| # | Feature Name | Data Type | Provenance Category | Source / Baseline | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `segment_id` | String | `GIS_DERIVED` | Geometric Segmentation | Deterministic 75m segment code (e.g., `C-14-S001`). |
| 2 | `corridor_id` | String | `GIS_DERIVED` | Geometric Segmentation | Parent corridor identifier. |
| 3 | `corridor_code` | String | `GIS_DERIVED` | Administrative | Standard corridor code (e.g., `C-14`). |
| 4 | `corridor_name` | String | `GIS_DERIVED` | OSM Delhi | Official road corridor name. |
| 5 | `segment_index` | Integer | `GIS_DERIVED` | Geometric Segmentation | Sequential segment index along corridor. |
| 6 | `length_metres` | Float | `GIS_DERIVED` | Shapely in `EPSG:32643` | Actual geodesic length of the segment. |
| 7 | `start_chainage_m` | Float | `GIS_DERIVED` | Geometric Segmentation | Cumulative distance from corridor origin. |
| 8 | `end_chainage_m` | Float | `GIS_DERIVED` | Geometric Segmentation | Cumulative distance at segment termination. |
| 9 | `centroid_lat` | Float | `GIS_DERIVED` | Geometric Centroid | WGS 84 latitude of segment centroid. |
| 10 | `centroid_lon` | Float | `GIS_DERIVED` | Geometric Centroid | WGS 84 longitude of segment centroid. |
| 11 | `district` | Categorical | `GIS_DERIVED` | SEC Delhi Revenue Districts | Official NCT Delhi Revenue District name. |
| 12 | `district_id` | String | `GIS_DERIVED` | SEC Delhi | Revenue district code. |
| 13 | `is_boundary_edge` | Boolean | `GIS_DERIVED` | 50m Boundary Buffer | True if segment lies within 50m of district border. |
| 14 | `highway_class` | Categorical | `GIS_DERIVED` | OpenStreetMap | Functional road class (`primary`, `secondary`, `tertiary`, `residential`, `pedestrian`, `trunk`). |
| 15 | `ndvi_mean` | Float | `SATELLITE_DERIVED` | Sentinel-2 L2A (10m) | Mean NDVI sampled across 15m centerline buffer. |
| 16 | `ndvi_median` | Float | `SATELLITE_DERIVED` | Sentinel-2 L2A (10m) | Median NDVI within 15m buffer. |
| 17 | `ndvi_p10` | Float | `SATELLITE_DERIVED` | Sentinel-2 L2A (10m) | 10th percentile NDVI (soil/imperviousness indicator). |
| 18 | `ndvi_p90` | Float | `SATELLITE_DERIVED` | Sentinel-2 L2A (10m) | 90th percentile NDVI (canopy density indicator). |
| 19 | `ndvi_valid_pixel_fraction` | Float | `SATELLITE_DERIVED` | Sentinel-2 L2A (10m) | Fraction of non-NoData reflectance pixels in buffer. |
| 20 | `ndmi` | Nullable Float | `UNAVAILABLE` | SWIR Band 11 Required | **UNAVAILABLE**: SWIR Band 11 required; synthetic proxy disabled. |
| 21 | `ndbi` | Nullable Float | `UNAVAILABLE` | SWIR/NIR Ratio Required | **UNAVAILABLE**: SWIR/NIR ratio required; synthetic proxy disabled. |
| 22 | `modis_lst_celsius` | Float | `SATELLITE_DERIVED` | NASA MODIS MOD11A2 (1,000m) | Regional daytime Land Surface Temperature in Celsius. |
| 23 | `thermal_anomaly_celsius` | Float | `SATELLITE_DERIVED` | MODIS vs Scene Mean ($25.76^\circ\text{C}$) | Surface temperature anomaly relative to empirical Delhi scene mean. |
| 24 | `lst_sampling_mode` | Categorical | `GIS_DERIVED` | Spatial Intersection | Sampling mode (`POLYGON_ZONAL_MASK` or `CENTROID_GRID_INTERSECTION`). |
| 25 | `built_up_fraction` | Float | `PROXY_ESTIMATE` | Vegetative Inverse Proxy | Estimated impervious fraction ($0.10$ to $0.95$). |
| 26 | `open_space_fraction` | Float | `PROXY_ESTIMATE` | Vegetative Inverse Proxy | Estimated permeable/verge fraction ($1.0 - \text{built\_up}$). |
| 27 | `nearest_cpcb_station_id` | String | `DIRECTLY_OBSERVED` | CPCB / DPCC Network | Nearest CAAQM monitoring station ID. |
| 28 | `nearest_cpcb_station_name` | String | `DIRECTLY_OBSERVED` | CPCB / DPCC Network | Official name of nearest CAAQM station. |
| 29 | `cpcb_distance_km` | Float | `GIS_DERIVED` | Haversine Formula | Distance to nearest CAAQM station in kilometres. |
| 30 | `air_quality_spatial_representativeness` | Categorical | `GIS_DERIVED` | Distance Decay Rule | `MICROCLIMATE_REPRESENTATIVE` ($\le 3\text{ km}$), `SUB_REGIONAL_PROXY` ($3-5\text{ km}$), or `REGIONAL_BACKGROUND` ($> 5\text{ km}$). |
| 31 | `is_walkable` | Boolean | `ENGINEERING_ESTIMATE` | IRC Highway Guidelines | Whether pedestrian footway access is physically supported. |
| 32 | `road_class_guideline_row_m` | Float | `ENGINEERING_ESTIMATE` | IRC:SP:84 / CPWD Guidelines | Standard guideline ROW width based on highway class. |
| 33 | `estimated_row_width_m` | Float | `ENGINEERING_ESTIMATE` | IRC:SP:84 / CPWD Guidelines | Backward-compatible alias for guideline ROW width. |
| 34 | `surveyed_row_width_m` | Nullable Float | `FIELD_VERIFIED` | Accredited Field Cross-Section | Measured physical roadway width. Defaults to `None`. |
| 35 | `clear_pedestrian_width_m` | Nullable Float | `FIELD_VERIFIED` | Accredited Field Cross-Section | Measured obstruction-free footway width. Defaults to `None`. |
| 36 | `available_planting_verge_m` | Nullable Float | `FIELD_VERIFIED` | Accredited Field Cross-Section | Measured unpaved verge width. Defaults to `None`. |
| 37 | `gpr_utility_survey_status` | Categorical | `FIELD_VERIFIED` | Ground-Penetrating Radar | `FIELD_GPR_REQUIRED`, `PENDING_REVIEW`, or `VERIFIED_CLEAR`. |
| 38 | `subsurface_utility_conflict_gpr` | Nullable Bool | `FIELD_VERIFIED` | Ground-Penetrating Radar | True if underground high-voltage/water utilities conflict. |
| 39 | `feature_schema_version` | String | `GIS_DERIVED` | Pipeline Metadata | Authoritative schema version tag (`2.1.0`). |

---

## 4. Scientific Integrity Safeguards

1. **Elimination of Arbitrary Constants**:
   - The thermal anomaly baseline is dynamically derived from the empirical mean ($25.76^\circ\text{C}$) of all valid terrestrial pixels in `delhi_lst_modis_daily_celsius.tif`, replacing static unreferenced offsets.
   - MODIS coarse $1,000\text{m}$ resolution is explicitly disclosed on every API response and UI visualization.

2. **Removal of Fictional Synthetic Proxies**:
   - The previously proposed `ndmi_proxy = ndvi * 0.72` and `ndbi_proxy = 0.45 - (ndvi * 0.65)` formulas have been completely removed.
   - Genuine NDMI requires SWIR Band 11; because `delhi_ndvi_10m.tif` is a single-band pre-computed composite, NDMI is marked `UNAVAILABLE` rather than fabricated.

3. **Separation of Guideline Estimates from Field Measurements**:
   - `road_class_guideline_row_m` reflects Indian Roads Congress design specifications based on OSM road hierarchy.
   - Guideline width can **never** establish unconditional physical feasibility for tree pits or swales; `surveyed_row_width_m` remains `None` until an accredited surveyor records empirical cross-section measurements.
