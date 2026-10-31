# VanSetu GreenTech — Machine Learning Production Deployment Guide

## 1. Production Architecture Overview

The VanSetu GreenTech ML Pipeline is built for **hybrid cloud deployment**, integrating DigitalOcean App Platform for API hosting, DigitalOcean Spaces (S3-compatible object storage) for large geospatial raster assets, and SQLite/TimescaleDB for persistent ground-truth telemetry.

---

## 2. DigitalOcean Spaces Storage Architecture

Large satellite GeoTIFF files (such as the 238.94 MB Sentinel-2 10m NDVI composite) and versioned model artifacts are stored in DigitalOcean Spaces to maintain a lightweight application image.

### Storage Layout:
```text
spaces://vansetu-geospatial-assets/
├── rasters/
│   ├── delhi_ndvi_10m.tif                        # 238.94 MB (EPSG:4326, 7794x5572)
│   ├── delhi_lst_modis_daily_celsius.tif         # 20.38 KB (EPSG:4326, 79x57)
│   └── delhi_landsat_lst_30m.tif                 # Optional 30m thermal composite
├── features/
│   ├── delhi_segment_features.parquet            # 180 KB (1,302 segments, 39 features)
│   └── delhi_segment_features.geojson            # 1.2 MB (GeoJSON for Leaflet overlay)
└── models/
    ├── registry_index.json                       # Version history and approval statuses
    └── artifacts/
        └── intervention_suitability_hgb_v1.0.joblib # Model weights and preprocessing pipeline
```

---

## 3. Environment Variables Configuration

The following environment variables configure the ML subsystem:

```bash
# ==============================================================================
# DIGITALOCEAN SPACES / OBJECT STORAGE
# ==============================================================================
DO_SPACES_ENDPOINT=blr1.digitaloceanspaces.com
DO_SPACES_KEY=your_do_spaces_access_key
DO_SPACES_SECRET=your_do_spaces_secret_key
DO_SPACES_BUCKET=vansetu-geospatial-assets
DO_SPACES_REGION=blr1

# ==============================================================================
# UPSTREAM DATA INGESTION APIS (OPTIONAL - LOCAL FALLBACK ALWAYS AVAILABLE)
# ==============================================================================
COPERNICUS_CLIENT_ID=your_copernicus_oauth_client_id
COPERNICUS_CLIENT_SECRET=your_copernicus_oauth_client_secret
NASA_EARTHDATA_TOKEN=your_nasa_earthdata_bearer_token
USGS_M2M_USERNAME=your_usgs_username
USGS_M2M_PASSWORD=your_usgs_password
CDS_API_URL=https://cds.climate.copernicus.eu/api
CDS_API_KEY=your_ecmwf_cds_api_key
CPCB_API_KEY=your_cpcb_or_data_gov_in_api_key

# ==============================================================================
# ML PIPELINE RUNTIME & SECURITY CONFIGURATION
# ==============================================================================
VANSETU_DATA_DIR=/app/backend/data
VANSETU_MODELS_DIR=/app/backend/models
ML_MIN_LABELS_GATE=50
ML_MIN_CORRIDORS_GATE=3
ML_AUTO_DOWNLOAD_SPACES_ASSETS=true

# Keyed HMAC Secret for constant-time, indexed O(1) API token lookups (REQUIRED in production)
VANSETU_TOKEN_HMAC_SECRET=your_cryptographically_secure_random_hmac_secret_string

# Server-Side Municipal Authentication Tokens (JSON array loaded at bootstrap)
# Tokens are indexed using keyed HMAC-SHA256 digests; raw tokens are never persisted in plaintext.
VANSETU_MUNICIPAL_TOKENS_JSON='[{"user_id":"MUNICIPAL_OFFICER_01","username":"officer.delhi","full_name":"Senior Climate Officer","role":"SENIOR_REVIEWER","organization":"GNCTD Planning","token":"vs_secure_random_hex_32"}]'
```

---

## 4. Authentication, Keyed HMAC Indexing & Token Rotation

### Constant-Time O(1) Token Lookup:
Incoming Bearer tokens are indexed via keyed HMAC-SHA256 (`compute_token_hmac`) using `VANSETU_TOKEN_HMAC_SECRET`. This replaces linear table scans with constant-time indexed database queries (`idx_cred_token_hmac`), preventing timing side-channel attacks and scale bottlenecks.

### Atomic Token Rotation:
Token rotation executes in a single SQLite ACID transaction (`with conn:`) inside `CredentialStore.rotate_token()`:
1. The old token's credential record is revoked (`is_active = 0, revoked_at = ?`).
2. A cryptographically fresh token (`vs_{token_urlsafe}`) is generated and its keyed HMAC digest inserted in the same transaction.
3. There is no window of vulnerability where the old token is invalidated but the new token fails to persist.

### Process-Local vs Distributed Rate Limiting:
In-memory sliding-window rate limiting in `AuthManager` is **process-local** (per worker process). When running multi-worker Uvicorn configurations or multi-pod container replicas in Kubernetes, distributed rate limiting must be provisioned at the edge (Cloudflare / Nginx reverse proxy) or through a shared Redis instance.

---

## 5. Durable Evidence Document Storage & Audit Integrity

Physical municipal evidence (GPR utility scans, PWD work orders, tree census registers) is managed through `EvidenceStorageManager`:
- **Storage Tiering**: Evidence documents are saved locally and mirrored transparently to DigitalOcean Spaces (`blr1` region in Bangalore) when credentials are provided.
- **Randomized Object Keys**: Client filenames are never used as S3 object keys. Documents are assigned random keys: `evidence/{evidence_id}/{token_hex}.{ext}`.
- **Strict Private Access**: Objects uploaded to Spaces use `ACL="private"`. Direct public bucket reads are blocked.
- **Integrity vs Veracity Separation**:
  - *Integrity Verification*: Cryptographic SHA-256 checksums verify that binary bytes on disk match the uploaded file without data corruption or tampering.
  - *Factual Veracity Verification*: An intact checksum proves only that the file has not been altered; factual municipal veracity is certified exclusively through signed municipal officer inspection records.
- **Immutable Verification Audit Trail**: Every approval, rejection, or re-review decision is logged to the append-only `evidence_verification_history` table with timestamps, reviewer ID, role, decision, and original document checksum.
- **Scoped Endpoint Security**:
  - `GET /api/ml/evidence` and `GET /api/ml/evidence/{id}` require `VIEW_EVIDENCE`.
  - Field Assessors are scoped strictly to documents they uploaded.
  - Internal filesystem paths (`storage_path`) are stripped from all client responses.

---

## 6. Offline & Local Development Mode

If deployed in an air-gapped municipal network or offline hackathon environment without DigitalOcean Spaces access:
1. Ensure `delhi_ndvi_10m.tif` and `delhi_lst_modis_daily_celsius.tif` exist in `backend/data/`.
2. The pipeline automatically detects local raster assets and transitions to `IngestionStatus.AVAILABLE_LOCAL_CACHE`.
3. If no trained `.joblib` model exists, the service automatically initiates `DETERMINISTIC_RULE_BASED_ENGINE_ACTIVE` with 100% test coverage and zero API errors.
4. Physical evidence documents are safely stored in local container volume fallback (`LOCAL_STORAGE_ONLY`).

---

## 7. Health Check & Auditing Commands

### Audit Data Ecosystem Connectivity:
```bash
curl -X GET http://localhost:8000/api/ml/data-status | jq .
```

### Audit Evidence Storage Provider Status:
```bash
curl -X GET http://localhost:8000/api/ml/evidence/storage/status \
  -H "Authorization: Bearer <TOKEN>" | jq .
```

### Check Active Model Version & Evidence Gate:
```bash
curl -X GET http://localhost:8000/api/ml/model-status | jq .
```

### Inspect Segment Features:
```bash
curl -X GET http://localhost:8000/api/ml/features/C-14-S001 | jq .
```

### Request Intervention Recommendation:
```bash
curl -X POST http://localhost:8000/api/ml/interventions/recommend \
  -H "Content-Type: application/json" \
  -d '{"segment_id": "C-14-S001", "policy_objective": "heat_resilience", "budget_lakh": 12.0}' | jq .
```
