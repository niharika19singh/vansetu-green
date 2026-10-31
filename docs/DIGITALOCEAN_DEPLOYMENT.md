# MLH — Best Use of DigitalOcean Deployment Architecture

## 1. Deployment Artifacts Included in Repository

- **DigitalOcean App Platform Spec:** [`.do/app.yaml`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/.do/app.yaml) (Region: `blr` — Bangalore, India for low-latency municipal access across NCT Delhi).
- **Backend Container:** [`backend/Dockerfile`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/Dockerfile) (`python:3.11-slim` + `gdal-bin`, `libgdal-dev`, `libgeos-dev`, `libproj-dev` + `/api/health` healthcheck on port `7860`).
- **Frontend Container:** [`frontend/Dockerfile`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/Dockerfile) (Multi-stage `node:20-alpine` Vite build $\to$ `nginx:1.27-alpine` on port `8080`).
- **Local Multi-Container Orchestration:** [`docker-compose.yml`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/docker-compose.yml) (orchestrating `tigerdata-timescaledb`, `vansetu-backend`, and `vansetu-frontend`).

---

## 2. DigitalOcean Spaces (S3-Compatible) Geospatial Asset Pipeline

Large satellite GeoTIFF rasters (`delhi_ndvi_10m.tif` at ~83 MB and `delhi_lst_modis_daily_celsius.tif`) can be hosted in **DigitalOcean Spaces** (`https://blr1.digitaloceanspaces.com/vansetu-geospatial-rasters/rasters/`).

In [`RasterService._ensure_asset_from_do_spaces`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/raster_service.py#L96-L116):
- On startup, if a local GeoTIFF is absent in a stateless App Platform container and `DO_SPACES_ENDPOINT` + `DO_SPACES_BUCKET` are configured, the backend automatically streams the GeoTIFF from DigitalOcean Spaces before initializing `rasterio`.

---

## 3. One-Command Deployment via `doctl`

```bash
# Validate App Platform spec
doctl apps spec validate .do/app.yaml

# Create or update the DigitalOcean App Platform deployment
doctl apps create --spec .do/app.yaml
```
