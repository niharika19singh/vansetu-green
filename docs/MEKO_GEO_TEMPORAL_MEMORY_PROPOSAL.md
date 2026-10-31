# Meko Feature Proposal: First-Class Geo-Temporal Memory (`spatial_scope` & `temporal_validity`)

**Authors:** Niharika Singh & Kunal (Team VanSetu — HackCBS 9.0, Track A: Open Project)  
**Target Platform:** YugabyteDB / Meko MCP (`https://mcp.mekodata.ai/mcp`)

---

## 1. Problem Statement: Limitations of Text-Only Semantic Recall in Civic & Geospatial AI

While building **VanSetu — Urban Climate Action Intelligence** on Meko MCP (`memory_add`, `memory_search`, `memory_promote`, `knowledgebase_search`), we discovered a structural limitation when AI agents operate over physical infrastructure, municipal governance, logistics, or environmental response:

1. **Topological Blindness in Semantic Embeddings:**
   - Suppose a municipal engineer records a subsurface 66kV high-voltage cable conflict on *Lal Bahadur Shastri Marg (`C-14`, `ward-12`)* at `[77.2245, 28.6358]`.
   - When an agent later plans an adjacent intersecting corridor 180 meters away that does not share the lexical string `"C-14"` or `"Lal Bahadur Shastri Marg"`, pure vector/lexical `memory_search` fails to retrieve the nearby underground utility hazard—or conversely retrieves an unrelated `"66kV cable"` memory from 18 km away across the city.
2. **Seasonal & Temporal Decay of Physical Facts:**
   - Civic and environmental facts have explicit temporal lifespans: a monsoon waterlogging restriction is valid July–September, and a temporary utility trenching moratorium expires once civil work completes. Standard text memories lack native `valid_from` / `valid_until` filtering at query time.

---

## 2. Proposed Meko Protocol Extension: `spatial_scope` & `temporal_window`

We propose extending Meko's `memory_add`, `memory_search`, and `knowledgebase_search` MCP tool schemas with an optional, first-class **`spatial_scope`** and **`temporal_window`** specification backed by YugabyteDB's distributed PostgreSQL/PostGIS indexing.

### 2.1 Proposed `memory_add` Schema Extension

```json
{
  "datapack_id": "dp-vansetu-climate-knowledge",
  "agent_id": "intervention_planning_agent",
  "text": "Underground 66kV BSES power duct & DJB water main at 0.7m depth prohibits deep tree-pit excavation.",
  "spatial_scope": {
    "ward_id": "ward-12",
    "corridor_id": "C-14",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [77.2210, 28.6312],
        [77.2285, 28.6394]
      ]
    },
    "buffer_meters": 50
  },
  "temporal_window": {
    "observed_at": "2026-09-14T00:00:00Z",
    "valid_from": "2026-09-14T00:00:00Z",
    "valid_until": null,
    "seasonality": "all_year"
  },
  "governance": {
    "evidence_reference": "survey-014",
    "verification_status": "human_verified"
  }
}
```

### 2.2 Proposed `memory_search` & `knowledgebase_search` Filter Extension

```json
{
  "datapack_id": "dp-vansetu-climate-knowledge",
  "agent_id": "climate_planner_agent",
  "query": "underground utility excavation constraints",
  "spatial_filter": {
    "ward_id": "ward-12",
    "corridor_id": "C-14",
    "near_point": [77.2245, 28.6358],
    "max_distance_meters": 500,
    "intersects_bbox": [77.210, 28.620, 77.240, 28.650]
  },
  "temporal_filter": {
    "valid_at": "2026-10-31T00:00:00Z",
    "exclude_expired": true
  },
  "require_human_verified": true
}
```

---

## 3. YugabyteDB Storage & Hybrid Ranking Architecture

Because Meko is powered by **YugabyteDB**, implementing `spatial_scope` requires zero external spatial sidecars:

1. **Storage Layer:**
   - Add a `GEOGRAPHY(Geometry, 4326)` column `spatial_geom` with a GiST index (`CREATE INDEX ON meko_memories USING GIST (spatial_geom)`) alongside `pgvector` embeddings and JSONB metadata (`ward_id`, `corridor_id`).
2. **Hybrid Geo-Semantic Retrieval Score:**
   \[
   \text{Score}(q, m) = \alpha \cdot \text{CosineSim}(e_q, e_m) + \beta \cdot \mathbb{I}(\text{AdministrativeMatch}) + \gamma \cdot \exp\!\left(-\frac{d_{\text{Geo}}(q, m)}{r_0}\right)
   \]
   where $d_{\text{Geo}}(q, m)$ is the geodesic distance in meters (`ST_Distance`) and memories with expired `valid_until < NOW()` are filtered out before ranking.

---

## 4. Reference Implementation in VanSetu

In [`backend/app/services/meko_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/meko_service.py#L662-L804), we built a working prototype of this exact specification on top of Meko:
- Every memory carries `ward_id`, `corridor_id`, `spatial_applicability`, `observation_date`, `valid_from`, `evidence_reference`, and `verification_status`.
- `MekoService.search_memories()` performs hybrid semantic + exact corridor/ward matching + Haversine geodesic proximity filtering (`include_nearby_km=3.0`).
- Elevating `spatial_scope` into a native Meko MCP primitive will unlock Meko for smart cities, disaster response, autonomous robotics, and supply-chain agents.
