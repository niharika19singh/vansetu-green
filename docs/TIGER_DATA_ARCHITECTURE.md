# MLH — Best Use of Tiger Data (TimescaleDB) Temporal Architecture

## 1. Purpose: Temporal Environmental Intelligence

Urban heat islands, vegetation health, and air pollution are inherently temporal processes. VanSetu integrates **Tiger Data (TimescaleDB)** in [`tiger_data_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/tiger_data_service.py) to store, aggregate, and compare multi-week corridor observations and post-intervention microclimate effectiveness.

---

## 2. Hypertable & Continuous Aggregate DDL

```sql
-- 1. Base Time-Series Table
CREATE TABLE IF NOT EXISTS environmental_observations (
    observed_at TIMESTAMPTZ NOT NULL,
    corridor_id TEXT NOT NULL,
    ward_id TEXT NOT NULL,
    source TEXT NOT NULL,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    quality_flag TEXT NOT NULL DEFAULT 'VALID',
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. TimescaleDB Hypertable partitioned by observed_at (7-day chunks)
SELECT create_hypertable(
    'environmental_observations',
    'observed_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- 3. Composite Time-Series Index
CREATE INDEX IF NOT EXISTS idx_env_obs_corridor_metric_time
    ON environmental_observations (corridor_id, metric, observed_at DESC);

-- 4. Continuous Aggregate for Daily Corridor Environmental Rollups
CREATE MATERIALIZED VIEW IF NOT EXISTS corridor_daily_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', observed_at) AS bucket_day,
    corridor_id,
    ward_id,
    metric,
    unit,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count,
    BOOL_OR(is_simulated) AS contains_simulated_data
FROM environmental_observations
GROUP BY bucket_day, corridor_id, ward_id, metric, unit
WITH NO DATA;
```

---

## 3. API Endpoints & Data Honesty Guarantees

| Endpoint | Responsibility |
| :--- | :--- |
| `GET /api/temporal/schema` | Returns TimescaleDB hypertable DDL, continuous aggregate definition, and connection status. |
| `GET /api/temporal/observations` | Queries time-ordered observations for a corridor (`lst_celsius`, `ndvi`, `aqi_us_epa`, `pedestrian_heat_index`, `soil_moisture_pct`). |
| `POST /api/temporal/observations` | Ingests new field or sensor observations into `environmental_observations`. |
| `GET /api/temporal/daily-summary` | Queries the `corridor_daily_summary` daily rollup (`avg_value`, `min_value`, `max_value`, `contains_simulated_data`). |
| `GET /api/temporal/trends/{corridor_id}` | Computes 30-day multi-metric trends and heatwave exceedance days ($\ge 39^\circ\text{C}$). |
| `GET /api/temporal/comparison` | Compares recent 7-day average against prior 14-day baseline period. |
| `GET /api/temporal/intervention-monitoring` | Tracks pre-deployment vs. post-deployment LST, NDVI, and AQI effectiveness. |

**Data Honesty Rule:** Day-0 anchor values derive from native Sentinel-2 (10m NDVI), MODIS (1000m LST), and CPCB stations (`is_simulated=false`). Backfilled diurnal/seasonal trajectories and pilot post-intervention projections are explicitly marked `is_simulated=true`.
