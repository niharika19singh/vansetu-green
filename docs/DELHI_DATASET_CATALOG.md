# VanSetu GreenTech — Delhi Environmental & Geospatial Dataset Catalog

## 1. Overview

VanSetu GreenTech integrates eight authentic environmental, meteorological, transport, and administrative datasets covering the National Capital Territory (NCT) of Delhi. Every dataset is cataloged below with its official provider, licensing terms, native spatial and temporal resolutions, coordinate reference system (CRS), and ingestion mechanism.

---

## 2. Dataset Catalog Matrix

| # | Dataset | Provider Agency | Official Portal | License | Native Resolution | CRS | Status in Workspace |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Copernicus Sentinel-2 Level-2A** | European Space Agency (ESA) / CDSE | [dataspace.copernicus.eu](https://dataspace.copernicus.eu/) | CC-BY 4.0 / Copernicus Open Access | 10m (B2, B3, B4, B8); 20m (B11, B12) | EPSG:4326 / EPSG:32643 | **Cached Local GeoTIFF**: `backend/data/delhi_ndvi_10m.tif` (238.94 MB, 7794x5572 pixels) |
| **2** | **NASA Terra/Aqua MODIS LST (MOD11A2)** | NASA LAADS DAAC | [ladsweb.modaps.eosdis.nasa.gov](https://ladsweb.modaps.eosdis.nasa.gov/) | Public Domain (NASA Open Data) | 1,000m (1 km sinusoidal / resampled) | EPSG:4326 | **Cached Local GeoTIFF**: `backend/data/delhi_lst_modis_daily_celsius.tif` (20.38 KB, 79x57 pixels) |
| **3** | **USGS Landsat 8/9 Level-2 ST** | USGS EarthExplorer / EROS | [earthexplorer.usgs.gov](https://earthexplorer.usgs.gov/) | Public Domain (USGS Open Data) | 30m Surface Temperature (Band 10 TIRS) | EPSG:32643 / EPSG:4326 | Configured adapter (`UsgsLandsatAdapter`) with EarthExplorer M2M API authentication |
| **4** | **ECMWF ERA5-Land Reanalysis** | ECMWF / Copernicus CDS | [cds.climate.copernicus.eu](https://cds.climate.copernicus.eu/) | Copernicus Licence / CC-BY 4.0 | 0.1° (~9 km) hourly meteorological grid | EPSG:4326 | Configured adapter (`Era5MeteoAdapter`) with CDS API authentication |
| **5** | **CPCB / DPCC CAAQM Network** | Central Pollution Control Board / DPCC | [app.cpcbccr.com/ccr](https://app.cpcbccr.com/ccr/) | NDSAP / Open Government Data India | 18 Point continuous monitoring stations | EPSG:4326 | 18 Verified stations in NCT Delhi with GPS fixes and spatial distance decay modeling |
| **6** | **OpenStreetMap Transport & Pedestrian Network** | OpenStreetMap Contributors | [openstreetmap.org](https://www.openstreetmap.org/) | Open Database License (ODbL) 1.0 | Sub-metre vector road centerlines & footways | EPSG:4326 / EPSG:32643 | **Cached Local GeoJSON**: `backend/data/delhi_roads_cached.geojson` (44 major corridors) |
| **7** | **ISRO NRSC Bhuvan LULC** | National Remote Sensing Centre (NRSC) | [bhuvan-app1.nrsc.gov.in](https://bhuvan-app1.nrsc.gov.in/) | National Spatial Data Infrastructure (NSDI) | 1:50,000 thematic scale | EPSG:4326 / LCC India | Configured adapter (`BhuvanLanduseAdapter`) with WMS/WFS capabilities |
| **8** | **NCT Delhi Administrative Boundaries** | SEC Delhi / Survey of India / Census 2011 | [sec.delhi.gov.in](https://sec.delhi.gov.in/) | Open Government Data (OGD) India | 11 District polygon boundaries | EPSG:4326 / EPSG:32643 | **Cached Local GeoJSON**: `backend/data/delhi_districts.json` (11 districts) |

---

## 3. Dataset-Specific Details & Limitations

### 1. Copernicus Sentinel-2 Level-2A (NDVI)
- **Asset**: `backend/data/delhi_ndvi_10m.tif`
- **Native Resolution**: 10 metres.
- **Physical Bounds**: Lat 28.397°N to 28.898°N, Lon 76.840°E to 77.341°E.
- **Validation**: Pixel values strictly range between $-0.430$ and $+0.868$ (mean: $0.310$). Negative values represent Yamuna river water bodies and wetlands; values $> 0.60$ represent Delhi Ridge reserved forests and Central Vista green belts.
- **Limitation**: Cloud contamination during monsoon months (July–September) requires pixel masking; seasonal composites are pre-monsoon (April–May peak heat).

### 2. NASA MODIS MOD11A2 Land Surface Temperature (LST)
- **Asset**: `backend/data/delhi_lst_modis_daily_celsius.tif`
- **Native Resolution**: 1,000 metres (1 km).
- **Physical Bounds**: Lat 28.406°N to 28.878°N, Lon 76.848°E to 77.336°E.
- **Validation**: Surface temperatures range between $22.74^\circ\text{C}$ and $29.00^\circ\text{C}$ (morning acquisition baseline). Thermal anomalies reach $+6.2^\circ\text{C}$ in industrial areas (Okhla, Bawana, Mayapuri) relative to forested ridge areas (Southern Ridge, Asola Bhatti).
- **Scientific Limitation & Transparency**: MODIS provides regional thermal context at 1,000m scale. It must **never** be misrepresented as 10m microclimate data. In segment zonal statistics, MODIS is transparently disclosed as coarse regional surface temperature.

### 3. CPCB / DPCC CAAQM Air Quality Stations
- **Asset**: 18 official continuous air monitoring stations across all 11 revenue districts.
- **Key Stations**: Anand Vihar (DL001), Mandir Marg (DL002), Punjabi Bagh (DL003), RK Puram (DL004), Rohini (DL009), Bawana (DL013), Okhla Phase-2 (DL012).
- **Representativeness Rule**: Segment distance to nearest station is computed via Haversine formula. If distance $> 5.0\text{ km}$, station data is flagged as *regional background* rather than *corridor-local microclimate*.

### 4. OpenStreetMap Road Network
- **Asset**: `backend/data/delhi_roads_cached.geojson`
- **Coverage**: 44 critical road corridors across NCT Delhi, including Ring Road, Outer Ring Road, Grand Trunk Road, Mathura Road, Aurobindo Marg, and Vikas Marg.
- **Metric Segmentation**: All 44 corridors are projected to `EPSG:32643` (UTM Zone 43N) and segmented into 1,302 consecutive 75-metre segments with deterministic IDs (`C-01-S001` through `C-44-S028`).

---

## 4. Manual Acquisition Workflows for Offline Environments

If upstream APIs are unreachable, local assets are automatically verified and served. To refresh local cached rasters:

1. **Sentinel-2 NDVI (10m)**:
   - Download Sentinel-2 L2A tile `T43RER` and `T43RFR` from Copernicus Browser.
   - Compute NDVI: $\frac{\text{B08} - \text{B04}}{\text{B08} + \text{B04}}$.
   - Clip to Delhi boundary polygon in `EPSG:4326`.
   - Save to `backend/data/delhi_ndvi_10m.tif`.

2. **MODIS LST (1,000m)**:
   - Order MOD11A2 8-day composite via NASA Earthdata Search.
   - Extract `LST_Day_1km`, apply scale factor $0.02$, convert Kelvin to Celsius ($-273.15$).
   - Reproject to EPSG:4326 and save to `backend/data/delhi_lst_modis_daily_celsius.tif`.
