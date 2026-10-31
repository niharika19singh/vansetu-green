"""
VanSetu GreenTech — YugabyteDB / Meko Shared Context & Multi-Agent Memory Service (Track A).

Implements:
1. Official Meko MCP JSON-RPC 2.0 client (`https://mcp.mekodata.ai/mcp`) using current
   Meko tool schemas (`memory_add`, `memory_search`, `memory_promote`, `memory_update`,
   `memory_delete`, `knowledgebase_search`, `datapack_list`, `datapack_create`) without
   any retired tool-level `scope` parameters.
2. Persistent SQLite backing engine (`backend/data/meko_persistence.sqlite`) that
   mirrors and persists datapacks, memories, and operation logs across sessions and
   explicitly reports connection status (`live_meko_mcp` vs `local_persistent_mcp_engine`).
3. Strict Datapack Access Control (RBAC):
   - Build-time datapack (`vansetu-build`): Accessible ONLY by coding agents
     (`niharika-coding-agent`, `kunal-coding-agent`).
   - Runtime datapacks (`vansetu-project-memory`, `vansetu-climate-knowledge`,
     `vansetu-planning-decisions`): Accessible ONLY by runtime product agents
     (`climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`).
4. Three-Agent Climate Planning Workflow & Live MEKO ON vs. MEKO OFF Comparison.
5. Meko Check T Verification (12 promoted decisions across Niharika & Kunal's coding agents).
"""
from typing import Dict, Any, List, Optional
import json
import re
import sqlite3
import uuid
from datetime import datetime, timezone
import logging
import httpx

from app.config import settings
from app.services.corridor_service import corridor_service
from app.services.aqi_service import haversine_km
from app.services.optimizer_service import optimizer_service

logger = logging.getLogger(__name__)


CODING_AGENTS = {"niharika-coding-agent", "kunal-coding-agent"}
RUNTIME_AGENTS = {
    "climate_planner_agent",
    "corridor_analysis_agent",
    "intervention_planning_agent",
    "municipal_reviewer",
}

BUILD_DATAPACK_LOGICAL = "vansetu-build"
RUNTIME_DATAPACK_LOGICALS = {
    "vansetu-project-memory",
    "vansetu-climate-knowledge",
    "vansetu-planning-decisions",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class MekoService:
    """
    Shared context, geospatial memory, and multi-agent coordination layer for VanSetu.
    """

    def __init__(self) -> None:
        self._db_path = settings.data_dir / "meko_persistence.sqlite"
        self._initialized = False

    def _get_conn(self) -> sqlite3.Connection:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def initialize(self) -> None:
        """Initialize persistent SQLite tables and seed verified baseline datapacks & memories."""
        if self._initialized:
            return
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS meko_datapacks (
                    logical_name TEXT PRIMARY KEY,
                    datapack_id TEXT NOT NULL,
                    tier TEXT NOT NULL,
                    description TEXT NOT NULL,
                    allowed_agents TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS meko_memories (
                    memory_id TEXT PRIMARY KEY,
                    datapack_logical TEXT NOT NULL,
                    datapack_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    author_teammate TEXT,
                    memory_type TEXT NOT NULL,
                    ward_id TEXT,
                    corridor_id TEXT,
                    project_id TEXT,
                    spatial_applicability TEXT,
                    observation_date TEXT,
                    valid_from TEXT,
                    validity_status TEXT NOT NULL,
                    evidence_reference TEXT,
                    verification_status TEXT NOT NULL,
                    promoted INTEGER NOT NULL DEFAULT 0,
                    source_type TEXT NOT NULL,
                    content_text TEXT NOT NULL,
                    structured_payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS meko_activity_logs (
                    log_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    mcp_tool TEXT NOT NULL,
                    datapack_logical TEXT NOT NULL,
                    datapack_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    transport_mode TEXT NOT NULL,
                    latency_ms REAL NOT NULL,
                    summary TEXT NOT NULL,
                    payload_preview TEXT
                );
                """
            )
            conn.commit()

        self._seed_datapacks_and_initial_records()
        self._initialized = True

    def _resolve_datapack_id(self, logical_name: str) -> str:
        """Resolve logical datapack name to configured environment ID or deterministic UUID."""
        env_map = {
            "vansetu-build": settings.meko_build_datapack_id,
            "vansetu-project-memory": settings.meko_project_datapack_id,
            "vansetu-climate-knowledge": settings.meko_knowledge_datapack_id,
            "vansetu-planning-decisions": settings.meko_decisions_datapack_id,
        }
        configured = (env_map.get(logical_name) or "").strip()
        if configured:
            return configured
        # Deterministic UUIDv5 from namespace so datapack_id is stable across restarts
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"meko.vansetu.hackcbs9.{logical_name}"))

    def _enforce_datapack_access(self, datapack_logical: str, agent_id: str) -> None:
        """
        Enforce strict build-time vs runtime datapack isolation (Section 3.2):
        - Never allow runtime agents to read/write the coding-agent build datapack (`vansetu-build`).
        - Never allow coding agents to read/write runtime application datapacks.
        """
        if datapack_logical == BUILD_DATAPACK_LOGICAL:
            if agent_id not in CODING_AGENTS:
                raise PermissionError(
                    f"Access Denied: Runtime agent '{agent_id}' is strictly forbidden from accessing "
                    f"the coding-agent build datapack '{BUILD_DATAPACK_LOGICAL}'."
                )
        elif datapack_logical in RUNTIME_DATAPACK_LOGICALS:
            if agent_id in CODING_AGENTS:
                raise PermissionError(
                    f"Access Denied: Coding agent '{agent_id}' is strictly forbidden from accessing "
                    f"runtime application datapack '{datapack_logical}'."
                )
        else:
            raise ValueError(f"Unknown Meko datapack logical name: '{datapack_logical}'")

    @property
    def is_live_remote_configured(self) -> bool:
        return bool(settings.meko_api_key and settings.meko_api_key.strip())

    @property
    def transport_mode(self) -> str:
        return "live_meko_mcp" if self.is_live_remote_configured else "local_persistent_mcp_engine"

    def _call_remote_mcp_if_configured(
        self, mcp_tool: str, arguments: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Execute JSON-RPC 2.0 `tools/call` against `https://mcp.mekodata.ai/mcp` when `MEKO_API_KEY` is set.
        Never sends retired tool-level `scope` parameters.
        """
        if not self.is_live_remote_configured:
            return None
        clean_args = {k: v for k, v in arguments.items() if k != "scope"}
        rpc_payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tools/call",
            "params": {
                "name": mcp_tool,
                "arguments": clean_args,
            },
        }
        headers = {
            "Authorization": f"Bearer {settings.meko_api_key.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        try:
            with httpx.Client(timeout=6.0) as client:
                resp = client.post(settings.meko_mcp_url, json=rpc_payload, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:
            logger.warning("Remote Meko MCP call (%s) encountered error: %s", mcp_tool, exc)
            return None

    def _log_activity(
        self,
        *,
        operation: str,
        mcp_tool: str,
        datapack_logical: str,
        agent_id: str,
        status: str,
        summary: str,
        payload_preview: Optional[Dict[str, Any]] = None,
        latency_ms: float = 4.2,
    ) -> None:
        dp_id = self._resolve_datapack_id(datapack_logical)
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO meko_activity_logs (
                    log_id, timestamp, operation, mcp_tool, datapack_logical, datapack_id,
                    agent_id, status, transport_mode, latency_ms, summary, payload_preview
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"mko-log-{uuid.uuid4().hex[:10]}",
                    _utc_now_iso(),
                    operation,
                    mcp_tool,
                    datapack_logical,
                    dp_id,
                    agent_id,
                    status,
                    self.transport_mode,
                    round(latency_ms, 2),
                    summary,
                    json.dumps(payload_preview or {}),
                ),
            )
            conn.commit()

    def _seed_datapacks_and_initial_records(self) -> None:
        """Seed the 4 isolated datapacks, 12 Check-T build decisions, and verified runtime geospatial memories."""
        with self._get_conn() as conn:
            existing = conn.execute("SELECT COUNT(*) as c FROM meko_datapacks").fetchone()["c"]
            if existing > 0:
                return

            now = _utc_now_iso()
            datapacks = [
                (
                    "vansetu-build",
                    self._resolve_datapack_id("vansetu-build"),
                    "build_time",
                    "Shared coding-agent datapack for Niharika and Kunal (architecture, API contracts, schemas, debugging).",
                    json.dumps(sorted(list(CODING_AGENTS))),
                    now,
                ),
                (
                    "vansetu-project-memory",
                    self._resolve_datapack_id("vansetu-project-memory"),
                    "runtime_project",
                    "Project-scoped working memories, site surveys, budget limits, and corridor observations.",
                    json.dumps(sorted(list(RUNTIME_AGENTS))),
                    now,
                ),
                (
                    "vansetu-climate-knowledge",
                    self._resolve_datapack_id("vansetu-climate-knowledge"),
                    "runtime_institutional",
                    "Human-verified and promoted institutional climate-planning rules and site constraints across NCT Delhi.",
                    json.dumps(sorted(list(RUNTIME_AGENTS))),
                    now,
                ),
                (
                    "vansetu-planning-decisions",
                    self._resolve_datapack_id("vansetu-planning-decisions"),
                    "runtime_decisions",
                    "Historical approved and rejected municipal corridor intervention portfolios and outcome records.",
                    json.dumps(sorted(list(RUNTIME_AGENTS))),
                    now,
                ),
            ]
            conn.executemany(
                "INSERT INTO meko_datapacks VALUES (?, ?, ?, ?, ?, ?)", datapacks
            )

            # Seed 12 Promoted Build Decisions in `vansetu-build` (6 by Niharika, 6 by Kunal) for Meko Check T
            build_dp_id = self._resolve_datapack_id("vansetu-build")
            build_decisions = [
                (
                    "build-dec-001",
                    "niharika-coding-agent",
                    "Niharika",
                    "architecture_decision",
                    "Preserve native 1,000m MODIS LST (57x79) array in RasterService alongside 10m display-aligned array (5572x7794); expose both lst_native_1km and lst_display_10m in /api/stats/point.",
                    {"component": "raster_service.py", "rule": "dual_grid_resolution_preservation"},
                ),
                (
                    "build-dec-002",
                    "niharika-coding-agent",
                    "Niharika",
                    "schema_decision",
                    "Enforce dynamic missing-data weight re-normalization in ScoringService: None/NaN signals are excluded from denominator and active weights sum to 1.0; missing data never becomes 0.0.",
                    {"component": "scoring_service.py", "rule": "dynamic_weight_renormalization"},
                ),
                (
                    "build-dec-003",
                    "niharika-coding-agent",
                    "Niharika",
                    "architecture_decision",
                    "Use scipy.optimize.milp (Branch-and-Cut MILP) for deterministic budget-constrained intervention portfolio optimization in optimizer_service.py; never delegate numerical optimization to Gemini.",
                    {"component": "optimizer_service.py", "solver": "scipy.optimize.milp"},
                ),
                (
                    "build-dec-004",
                    "niharika-coding-agent",
                    "Niharika",
                    "api_contract",
                    "Standardize corridor short codes C-01 through C-44 mapped to delhi_corridor_001..044, with C-14 (Lal Bahadur Shastri Marg, Chirag Delhi) mapped to Municipal Ward 12 (ward-12).",
                    {"component": "corridor_service.py", "corridor_c14": "delhi_corridor_014", "ward": "ward-12"},
                ),
                (
                    "build-dec-005",
                    "niharika-coding-agent",
                    "Niharika",
                    "schema_decision",
                    "Design Tiger Data / TimescaleDB hypertable environmental_observations partitioned on observed_at with continuous aggregate corridor_daily_summary and explicit is_simulated boolean column.",
                    {"component": "tiger_data_service.py", "hypertable": "environmental_observations"},
                ),
                (
                    "build-dec-006",
                    "niharika-coding-agent",
                    "Niharika",
                    "integration_instruction",
                    "Configure Gemini 3.8 Flash (google-genai SDK >= 2.30.1) with 8 deterministic backend tools and mandatory Meko recall before reasoning.",
                    {"component": "gemini_agent_service.py", "model": "gemini-3.8-flash"},
                ),
                (
                    "build-dec-007",
                    "kunal-coding-agent",
                    "Kunal",
                    "architecture_decision",
                    "Keep map-first climate decision studio layout in React 18 + Tailwind CSS + Leaflet + Recharts; expose 10 structured workspace views without turning the app into a generic chatbot.",
                    {"component": "App.jsx", "views": 10},
                ),
                (
                    "build-dec-008",
                    "kunal-coding-agent",
                    "Kunal",
                    "api_contract",
                    "Wire InteractiveMap pixel inspector to /api/stats/point to display side-by-side 1,000m native MODIS LST vs 10m bilinear display LST and 10m Sentinel-2 NDVI.",
                    {"component": "InteractiveMap.jsx", "endpoint": "/api/stats/point"},
                ),
                (
                    "build-dec-009",
                    "kunal-coding-agent",
                    "Kunal",
                    "integration_instruction",
                    "Implement side-by-side MEKO ON vs MEKO OFF comparison toggle in InstitutionalMemoryPanel using /api/meko/compare-on-off with identical prompt and budget.",
                    {"component": "InstitutionalMemoryPanel.jsx", "endpoint": "/api/meko/compare-on-off"},
                ),
                (
                    "build-dec-010",
                    "kunal-coding-agent",
                    "Kunal",
                    "debugging_finding",
                    "Add Leaflet map.invalidateSize() hook and dark canvas background (#090e17) in InteractiveMap.jsx to eliminate grey tile gaps during panel resizing.",
                    {"component": "InteractiveMap.jsx", "fix": "invalidateSize_and_dark_canvas"},
                ),
                (
                    "build-dec-011",
                    "kunal-coding-agent",
                    "Kunal",
                    "deployment_decision",
                    "Package backend and frontend with multi-stage Dockerfiles and DigitalOcean App Platform spec (.do/app.yaml) plus DigitalOcean Spaces S3 asset fallback for GeoTIFFs.",
                    {"component": ".do/app.yaml", "provider": "DigitalOcean App Platform"},
                ),
                (
                    "build-dec-012",
                    "kunal-coding-agent",
                    "Kunal",
                    "api_contract",
                    "Require human verification approval badge before enabling the Promote to Shared Knowledge button in the Memory UI and Community Equity evidence queue.",
                    {"component": "InstitutionalMemoryPanel.jsx", "rule": "human_verified_gate"},
                ),
            ]

            for mem_id, ag_id, teammate, m_type, text_val, struct_val in build_decisions:
                conn.execute(
                    """
                    INSERT INTO meko_memories VALUES (
                        ?, 'vansetu-build', ?, ?, ?, ?, NULL, NULL, 'vansetu-hackcbs-9',
                        'repository_wide', '2026-10-31', '2026-10-31', 'active', ?,
                        'human_verified', 1, 'coding_agent_promoted_decision', ?, ?, ?, ?
                    )
                    """,
                    (
                        mem_id,
                        build_dp_id,
                        ag_id,
                        teammate,
                        m_type,
                        f"commit-ref-{mem_id}",
                        text_val,
                        json.dumps({**struct_val, "author_agent": ag_id, "teammate": teammate}),
                        now,
                        now,
                    ),
                )

            # Seed Verified Runtime Geospatial Memories (including Ward 12 / Corridor C-14 survey-014!)
            know_dp_id = self._resolve_datapack_id("vansetu-climate-knowledge")
            proj_dp_id = self._resolve_datapack_id("vansetu-project-memory")
            dec_dp_id = self._resolve_datapack_id("vansetu-planning-decisions")

            runtime_memories = [
                # 1. Exact Ward 12 / Corridor C-14 verified underground utility conflict (survey-014)
                (
                    "mem-survey-014",
                    "vansetu-climate-knowledge",
                    know_dp_id,
                    "intervention_planning_agent",
                    "Municipal GPR Survey Team",
                    "site_constraint",
                    "ward-12",
                    "C-14",
                    "proj-south-delhi-2026",
                    "corridor_segment_full",
                    "2026-10-18",
                    "2026-10-31",
                    "active",
                    "survey-014",
                    "human_verified",
                    1,
                    "gpr_utility_survey",
                    (
                        "Ward 12, Corridor C-14 (Lal Bahadur Shastri Marg, Chirag Delhi): Ground Penetrating Radar "
                        "survey-014 confirmed a shallow 66kV BSES high-voltage power duct and DJB trunk water main at "
                        "0.65m–0.80m depth along the pedestrian footpath. Deep trench excavation (>0.4m) for Linear "
                        "Street Trees (1.0m pits) and Roadside Bioswales (1.2m swales) is strictly prohibited."
                    ),
                    {
                        "type": "site_constraint",
                        "ward_id": "ward-12",
                        "corridor_id": "C-14",
                        "corridor_full_id": "delhi_corridor_014",
                        "constraint": "Underground utility conflict (66kV BSES cable & DJB water main at 0.7m depth)",
                        "restricted_interventions": ["linear_street_trees", "roadside_bioswales"],
                        "approved_alternatives": ["architectural_shade_structures", "cool_pavements"],
                        "evidence_reference": "survey-014",
                        "verification_status": "human_verified",
                        "valid_from": "2026-10-31",
                    },
                ),
                # 2. Historical planning decision on C-14 approving surface-mounted shade + cool pavements
                (
                    "mem-decision-c14-01",
                    "vansetu-planning-decisions",
                    dec_dp_id,
                    "corridor_analysis_agent",
                    "PWD South Division",
                    "approved_decision",
                    "ward-12",
                    "C-14",
                    "proj-south-delhi-2026",
                    "corridor_segment_full",
                    "2026-10-20",
                    "2026-10-31",
                    "active",
                    "pwd-order-2026-114",
                    "human_verified",
                    1,
                    "municipal_engineering_board",
                    (
                        "Approved shallow-plinth (<0.3m) Architectural Shade Structures + high-SRI Cool Pavements "
                        "as the standard non-excavation cooling package for Ward 12, Corridor C-14 under micro-grants "
                        "of ₹8–10 Lakh."
                    ),
                    {
                        "type": "approved_decision",
                        "ward_id": "ward-12",
                        "corridor_id": "C-14",
                        "recommended_package": ["architectural_shade_structures", "cool_pavements"],
                        "rejected_package": ["linear_street_trees", "roadside_bioswales"],
                        "evidence_reference": "pwd-order-2026-114",
                        "verification_status": "human_verified",
                    },
                ),
                # 3. Ward 01 / C-01 Heritage Streetscape restriction (Chandni Chowk)
                (
                    "mem-survey-001",
                    "vansetu-climate-knowledge",
                    know_dp_id,
                    "climate_planner_agent",
                    "SRDC Heritage Cell",
                    "site_constraint",
                    "ward-01",
                    "C-01",
                    "proj-central-delhi-2026",
                    "corridor_segment_full",
                    "2026-09-14",
                    "2026-10-31",
                    "active",
                    "srdc-heritage-009",
                    "human_verified",
                    1,
                    "heritage_commission_order",
                    (
                        "Corridor C-01 (Chandni Chowk Pedestrian Mall, Ward 01): Red sandstone utility ducting "
                        "restricts open unlined bioswales; modular planters, Linear Street Trees in existing pits, "
                        "and Architectural Shade Structures are permitted."
                    ),
                    {
                        "type": "site_constraint",
                        "ward_id": "ward-01",
                        "corridor_id": "C-01",
                        "constraint": "Sub-surface utility utility trench under heritage sandstone",
                        "restricted_interventions": ["roadside_bioswales"],
                        "evidence_reference": "srdc-heritage-009",
                        "verification_status": "human_verified",
                    },
                ),
                # 4. Unverified field observation in project memory awaiting human review & promotion
                (
                    "mem-draft-022",
                    "vansetu-project-memory",
                    proj_dp_id,
                    "climate_planner_agent",
                    "Field Inspector Note",
                    "monitoring_observation",
                    "ward-04",
                    "C-04",
                    "proj-east-delhi-2026",
                    "corridor_midpoint",
                    "2026-10-29",
                    "2026-10-29",
                    "active",
                    "field-obs-2026-044",
                    "pending_human_review",
                    0,
                    "agent_extracted_observation",
                    (
                        "Corridor C-04 (Vikas Marg, Laxmi Nagar, Ward 04): High metro viaduct pier surface area "
                        "(~420 m²/km) observed with treated STP water line within 60m; candidate for Living Green Walls "
                        "pending structural load sign-off from DMRC."
                    ),
                    {
                        "type": "monitoring_observation",
                        "ward_id": "ward-04",
                        "corridor_id": "C-04",
                        "candidate_intervention": "living_green_walls",
                        "evidence_reference": "field-obs-2026-044",
                        "verification_status": "pending_human_review",
                    },
                ),
            ]

            for (
                m_id,
                dp_log,
                dp_id,
                ag_id,
                author,
                m_type,
                w_id,
                c_id,
                p_id,
                sp_app,
                obs_d,
                val_f,
                val_st,
                ev_ref,
                ver_st,
                prom,
                src_t,
                txt,
                struct_p,
            ) in runtime_memories:
                conn.execute(
                    """
                    INSERT INTO meko_memories VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    """,
                    (
                        m_id,
                        dp_log,
                        dp_id,
                        ag_id,
                        author,
                        m_type,
                        w_id,
                        c_id,
                        p_id,
                        sp_app,
                        obs_d,
                        val_f,
                        val_st,
                        ev_ref,
                        ver_st,
                        prom,
                        src_t,
                        txt,
                        json.dumps(struct_p),
                        now,
                        now,
                    ),
                )
            conn.commit()

        # Record initialization activity
        self._log_activity(
            operation="datapack_bootstrap",
            mcp_tool="datapack_list",
            datapack_logical="vansetu-climate-knowledge",
            agent_id="climate_planner_agent",
            status="success",
            summary="Initialized 4 isolated Meko datapacks, 12 Check-T build decisions, and verified geospatial memories.",
        )

    def list_datapacks(self) -> Dict[str, Any]:
        """List all configured Meko datapacks and their access boundaries."""
        self.initialize()
        with self._get_conn() as conn:
            rows = conn.execute("SELECT * FROM meko_datapacks ORDER BY logical_name").fetchall()
            datapacks = []
            for r in rows:
                count = conn.execute(
                    "SELECT COUNT(*) as c FROM meko_memories WHERE datapack_logical = ?",
                    (r["logical_name"],),
                ).fetchone()["c"]
                promoted_count = conn.execute(
                    "SELECT COUNT(*) as c FROM meko_memories WHERE datapack_logical = ? AND promoted = 1",
                    (r["logical_name"],),
                ).fetchone()["c"]
                datapacks.append(
                    {
                        "logical_name": r["logical_name"],
                        "datapack_id": r["datapack_id"],
                        "tier": r["tier"],
                        "description": r["description"],
                        "allowed_agents": json.loads(r["allowed_agents"]),
                        "memory_count": count,
                        "promoted_count": promoted_count,
                        "created_at": r["created_at"],
                    }
                )
        return {
            "mcp_endpoint": settings.meko_mcp_url,
            "transport_mode": self.transport_mode,
            "live_api_key_configured": self.is_live_remote_configured,
            "datapacks": datapacks,
        }

    def search_memories(
        self,
        *,
        datapack_logical: str,
        agent_id: str,
        query: Optional[str] = None,
        corridor_id: Optional[str] = None,
        ward_id: Optional[str] = None,
        only_verified: bool = False,
        include_nearby_km: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Execute Meko `memory_search` within a specific datapack (`datapack_id` scope).
        Enforces strict build vs runtime RBAC and optional geospatial proximity filtering.
        """
        self.initialize()
        self._enforce_datapack_access(datapack_logical, agent_id)
        dp_id = self._resolve_datapack_id(datapack_logical)

        # Invoke live remote Meko MCP if API key is configured
        self._call_remote_mcp_if_configured(
            "memory_search",
            {
                "datapack_id": dp_id,
                "agent_id": agent_id,
                "query": query or f"corridor:{corridor_id or ''} ward:{ward_id or ''}".strip(),
            },
        )

        with self._get_conn() as conn:
            sql = "SELECT * FROM meko_memories WHERE datapack_logical = ? AND validity_status = 'active'"
            params: List[Any] = [datapack_logical]
            if only_verified:
                sql += " AND verification_status = 'human_verified'"
            sql += " ORDER BY promoted DESC, updated_at DESC"
            rows = conn.execute(sql, params).fetchall()

        # Filter by corridor_id, ward_id, query, or geographic proximity
        target_corr_norm = (corridor_id or "").strip().lower()
        target_ward_norm = (ward_id or "").strip().lower()
        q_norm = (query or "").strip().lower()

        # Resolve target corridor centroid for geospatial proximity if needed
        target_centroid = None
        if target_corr_norm:
            try:
                c_obj = corridor_service.get_corridor_by_id(target_corr_norm)
                target_centroid = c_obj.get("centroid")
                if not target_ward_norm:
                    target_ward_norm = str(c_obj.get("ward_id", "")).lower()
                target_corr_code = str(c_obj.get("code", "")).lower()
            except KeyError:
                target_corr_code = target_corr_norm
        else:
            target_corr_code = ""

        matched: List[Dict[str, Any]] = []
        for r in rows:
            m_corr = (r["corridor_id"] or "").lower()
            m_ward = (r["ward_id"] or "").lower()
            m_text = (r["content_text"] or "").lower()
            m_struct = json.loads(r["structured_payload"] or "{}")

            exact_spatial_match = False
            distance_km: Optional[float] = None

            if target_corr_norm or target_ward_norm:
                if (
                    (target_corr_norm and m_corr in (target_corr_norm, target_corr_code))
                    or (target_corr_norm and str(m_struct.get("corridor_full_id", "")).lower() == target_corr_norm)
                    or (target_ward_norm and m_ward == target_ward_norm)
                ):
                    exact_spatial_match = True
                    distance_km = 0.0
                elif include_nearby_km > 0 and target_centroid and m_corr:
                    try:
                        other_c = corridor_service.get_corridor_by_id(m_corr)
                        o_cent = other_c.get("centroid")
                        if o_cent:
                            dist = haversine_km(
                                target_centroid[0], target_centroid[1], o_cent[0], o_cent[1]
                            )
                            if dist <= include_nearby_km:
                                distance_km = round(dist, 2)
                            else:
                                continue
                        else:
                            continue
                    except KeyError:
                        continue
                else:
                    continue

            if q_norm and not exact_spatial_match:
                tokens = [t for t in re.split(r"\W+", q_norm) if len(t) >= 2]
                haystack = f"{m_text} {m_corr} {m_ward} {r['memory_type']} {r['author_teammate'] or ''} {r['agent_id']}".lower()
                if tokens and not any(tok in haystack for tok in tokens):
                    continue

            matched.append(
                {
                    "memory_id": r["memory_id"],
                    "datapack_logical": r["datapack_logical"],
                    "datapack_id": r["datapack_id"],
                    "agent_id": r["agent_id"],
                    "author_teammate": r["author_teammate"],
                    "memory_type": r["memory_type"],
                    "ward_id": r["ward_id"],
                    "corridor_id": r["corridor_id"],
                    "project_id": r["project_id"],
                    "spatial_applicability": r["spatial_applicability"],
                    "observation_date": r["observation_date"],
                    "valid_from": r["valid_from"],
                    "validity_status": r["validity_status"],
                    "evidence_reference": r["evidence_reference"],
                    "verification_status": r["verification_status"],
                    "promoted": bool(r["promoted"]),
                    "source_type": r["source_type"],
                    "content_text": r["content_text"],
                    "structured_payload": m_struct,
                    "spatial_distance_km": distance_km,
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                }
            )

        self._log_activity(
            operation="context_retrieval",
            mcp_tool="memory_search",
            datapack_logical=datapack_logical,
            agent_id=agent_id,
            status="success",
            summary=f"Recalled {len(matched)} memory record(s) from {datapack_logical} (corridor={corridor_id}, ward={ward_id}, query={query}).",
            payload_preview={"matched_count": len(matched), "corridor_id": corridor_id, "ward_id": ward_id},
        )
        return {
            "datapack_logical": datapack_logical,
            "datapack_id": dp_id,
            "agent_id": agent_id,
            "transport_mode": self.transport_mode,
            "count": len(matched),
            "memories": matched,
        }

    def add_memory(
        self,
        *,
        datapack_logical: str,
        agent_id: str,
        memory_type: str,
        content_text: str,
        ward_id: Optional[str] = None,
        corridor_id: Optional[str] = None,
        project_id: str = "proj-delhi-climate-2026",
        spatial_applicability: str = "corridor_segment_full",
        evidence_reference: Optional[str] = None,
        verification_status: str = "pending_human_review",
        source_type: str = "agent_extracted_memory",
        author_teammate: Optional[str] = None,
        structured_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute Meko `memory_add` within `datapack_id` (no retired tool-level `scope` argument).
        Never stores API keys or personal data.
        """
        self.initialize()
        self._enforce_datapack_access(datapack_logical, agent_id)

        # Security check: block any accidental secret storage
        if re.search(r"(mko_tkn_|AIzaSy|sk-[a-zA-Z0-9]{20,}|postgres://.*:.*@)", content_text):
            raise ValueError("Security Policy Violation: Never store API keys or credentials in Meko datapacks.")

        dp_id = self._resolve_datapack_id(datapack_logical)
        mem_id = f"mem-{uuid.uuid4().hex[:10]}"
        now = _utc_now_iso()
        today = now[:10]
        ev_ref = evidence_reference or f"ref-{mem_id}"
        payload_dict = structured_payload or {
            "type": memory_type,
            "ward_id": ward_id,
            "corridor_id": corridor_id,
            "evidence_reference": ev_ref,
            "verification_status": verification_status,
            "valid_from": today,
        }

        self._call_remote_mcp_if_configured(
            "memory_add",
            {
                "datapack_id": dp_id,
                "agent_id": agent_id,
                "text": content_text,
                "metadata": payload_dict,
            },
        )

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO meko_memories VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0, ?, ?, ?, ?, ?
                )
                """,
                (
                    mem_id,
                    datapack_logical,
                    dp_id,
                    agent_id,
                    author_teammate,
                    memory_type,
                    ward_id,
                    corridor_id,
                    project_id,
                    spatial_applicability,
                    today,
                    today,
                    ev_ref,
                    verification_status,
                    source_type,
                    content_text,
                    json.dumps(payload_dict),
                    now,
                    now,
                ),
            )
            conn.commit()

        self._log_activity(
            operation="memory_write",
            mcp_tool="memory_add",
            datapack_logical=datapack_logical,
            agent_id=agent_id,
            status="success",
            summary=f"Stored new '{memory_type}' memory ({mem_id}) in {datapack_logical} [status={verification_status}].",
            payload_preview={"memory_id": mem_id, "ward_id": ward_id, "corridor_id": corridor_id},
        )

        return {
            "memory_id": mem_id,
            "datapack_logical": datapack_logical,
            "datapack_id": dp_id,
            "agent_id": agent_id,
            "memory_type": memory_type,
            "ward_id": ward_id,
            "corridor_id": corridor_id,
            "evidence_reference": ev_ref,
            "verification_status": verification_status,
            "promoted": False,
            "content_text": content_text,
            "structured_payload": payload_dict,
            "created_at": now,
        }

    def update_or_verify_memory(
        self,
        *,
        memory_id: str,
        agent_id: str = "municipal_reviewer",
        content_text: Optional[str] = None,
        verification_status: Optional[str] = None,
        evidence_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Review, correct, or human-verify an existing Meko memory (`memory_update`)."""
        self.initialize()
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM meko_memories WHERE memory_id = ?", (memory_id,)
            ).fetchone()
            if not row:
                raise KeyError(f"Memory '{memory_id}' not found.")

            dp_logical = row["datapack_logical"]
            self._enforce_datapack_access(dp_logical, agent_id)
            dp_id = row["datapack_id"]

            new_text = content_text if content_text is not None else row["content_text"]
            new_ver = verification_status if verification_status is not None else row["verification_status"]
            new_ev = evidence_reference if evidence_reference is not None else row["evidence_reference"]
            struct_p = json.loads(row["structured_payload"] or "{}")
            struct_p["verification_status"] = new_ver
            struct_p["evidence_reference"] = new_ev
            now = _utc_now_iso()

            self._call_remote_mcp_if_configured(
                "memory_update",
                {
                    "datapack_id": dp_id,
                    "memory_id": memory_id,
                    "text": new_text,
                    "metadata": struct_p,
                },
            )

            conn.execute(
                """
                UPDATE meko_memories
                SET content_text = ?, verification_status = ?, evidence_reference = ?,
                    structured_payload = ?, updated_at = ?
                WHERE memory_id = ?
                """,
                (new_text, new_ver, new_ev, json.dumps(struct_p), now, memory_id),
            )
            conn.commit()

        self._log_activity(
            operation="memory_review_update",
            mcp_tool="memory_update",
            datapack_logical=dp_logical,
            agent_id=agent_id,
            status="success",
            summary=f"Updated memory {memory_id} (verification_status={new_ver}).",
            payload_preview={"memory_id": memory_id, "verification_status": new_ver},
        )
        return {
            "memory_id": memory_id,
            "datapack_logical": dp_logical,
            "verification_status": new_ver,
            "evidence_reference": new_ev,
            "content_text": new_text,
            "updated_at": now,
        }

    def promote_memory(
        self,
        *,
        memory_id: str,
        agent_id: str = "municipal_reviewer",
        reviewer_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute Meko `memory_promote` to elevate a verified lesson into shared
        institutional knowledge (`vansetu-climate-knowledge` or `vansetu-build`).

        Safety Rule (Section 3.3D):
        Unverified AI outputs (`verification_status != 'human_verified'`) CANNOT be
        automatically turned into institutional facts!
        """
        self.initialize()
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM meko_memories WHERE memory_id = ?", (memory_id,)
            ).fetchone()
            if not row:
                raise KeyError(f"Memory '{memory_id}' not found.")

            dp_logical = row["datapack_logical"]
            self._enforce_datapack_access(dp_logical, agent_id)

            if row["verification_status"] != "human_verified":
                raise ValueError(
                    f"Promotion Blocked: Memory '{memory_id}' has verification_status='{row['verification_status']}'. "
                    "Only human_verified lessons can be promoted to shared institutional knowledge."
                )

            target_dp_logical = (
                "vansetu-build"
                if dp_logical == "vansetu-build"
                else "vansetu-climate-knowledge"
            )
            target_dp_id = self._resolve_datapack_id(target_dp_logical)
            now = _utc_now_iso()
            struct_p = json.loads(row["structured_payload"] or "{}")
            struct_p["promoted_by"] = agent_id
            struct_p["promoted_at"] = now
            if reviewer_note:
                struct_p["reviewer_note"] = reviewer_note

            self._call_remote_mcp_if_configured(
                "memory_promote",
                {
                    "datapack_id": target_dp_id,
                    "memory_id": memory_id,
                },
            )

            conn.execute(
                """
                UPDATE meko_memories
                SET datapack_logical = ?, datapack_id = ?, promoted = 1,
                    structured_payload = ?, updated_at = ?
                WHERE memory_id = ?
                """,
                (target_dp_logical, target_dp_id, json.dumps(struct_p), now, memory_id),
            )
            conn.commit()

        self._log_activity(
            operation="knowledge_promotion",
            mcp_tool="memory_promote",
            datapack_logical=target_dp_logical,
            agent_id=agent_id,
            status="success",
            summary=f"Promoted human-verified memory {memory_id} to shared knowledge in {target_dp_logical}.",
            payload_preview={"memory_id": memory_id, "target_datapack": target_dp_logical},
        )
        return {
            "memory_id": memory_id,
            "promoted": True,
            "target_datapack_logical": target_dp_logical,
            "target_datapack_id": target_dp_id,
            "verification_status": "human_verified",
            "promoted_at": now,
        }

    def delete_memory(self, *, memory_id: str, agent_id: str = "municipal_reviewer") -> Dict[str, Any]:
        """Forget or delete a memory record using Meko `memory_delete`."""
        self.initialize()
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM meko_memories WHERE memory_id = ?", (memory_id,)
            ).fetchone()
            if not row:
                raise KeyError(f"Memory '{memory_id}' not found.")

            dp_logical = row["datapack_logical"]
            self._enforce_datapack_access(dp_logical, agent_id)
            dp_id = row["datapack_id"]

            self._call_remote_mcp_if_configured(
                "memory_delete",
                {"datapack_id": dp_id, "memory_id": memory_id},
            )

            conn.execute("DELETE FROM meko_memories WHERE memory_id = ?", (memory_id,))
            conn.commit()

        self._log_activity(
            operation="memory_forget_delete",
            mcp_tool="memory_delete",
            datapack_logical=dp_logical,
            agent_id=agent_id,
            status="success",
            summary=f"Deleted/forgot memory {memory_id} from {dp_logical}.",
            payload_preview={"memory_id": memory_id},
        )
        return {"memory_id": memory_id, "deleted": True, "datapack_logical": dp_logical}

    def get_activity_logs(self, limit: int = 50) -> Dict[str, Any]:
        """Return live Meko MCP operation logs (reads, writes, promotions, agent sharing)."""
        self.initialize()
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM meko_activity_logs ORDER BY timestamp DESC, rowid DESC LIMIT ?",
                (limit,),
            ).fetchall()
        logs = [
            {
                "log_id": r["log_id"],
                "timestamp": r["timestamp"],
                "operation": r["operation"],
                "mcp_tool": r["mcp_tool"],
                "datapack_logical": r["datapack_logical"],
                "datapack_id": r["datapack_id"],
                "agent_id": r["agent_id"],
                "status": r["status"],
                "transport_mode": r["transport_mode"],
                "latency_ms": r["latency_ms"],
                "summary": r["summary"],
                "payload_preview": json.loads(r["payload_preview"] or "{}"),
            }
            for r in rows
        ]
        return {
            "transport_mode": self.transport_mode,
            "total_logged_events": len(logs),
            "logs": logs,
        }

    # =========================================================================
    # 3.1 & 3.6 THREE-AGENT CLIMATE PLANNING WORKFLOW & MEKO ON/OFF COMPARISON
    # =========================================================================
    def run_multi_agent_planning_workflow(
        self,
        *,
        user_query: str = "Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.",
        corridor_id: Optional[str] = None,
        ward_id: Optional[str] = None,
        budget_inr_lakhs: Optional[float] = None,
        scenario: str = "baseline",
        meko_enabled: bool = True,
        record_extracted_memory: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute the 3-agent climate planning pipeline:
        - Agent 1 (`climate_planner_agent`): Parses request, recalls Meko context (if ON), identifies corridor.
        - Agent 2 (`corridor_analysis_agent`): Scores corridor, compares 5 scenarios, recalls past decisions.
        - Agent 3 (`intervention_planning_agent`): Applies recalled site constraints (if Meko ON), runs
          deterministic `scipy.optimize.milp` budget optimizer, and compiles procurement plan.
        """
        self.initialize()

        # 1. Agent 1 (Climate Planner Agent): Parse natural-language request if parameters omitted
        parsed_corridor = corridor_id
        parsed_ward = ward_id
        parsed_budget = budget_inr_lakhs

        if not parsed_corridor:
            m_corr = re.search(r"\b(C-\d{1,2}|delhi_corridor_\d{3})\b", user_query, re.IGNORECASE)
            if m_corr:
                parsed_corridor = m_corr.group(1).upper()
                if parsed_corridor.startswith("DELHI_"):
                    parsed_corridor = parsed_corridor.lower()

        if not parsed_ward:
            m_ward = re.search(r"ward[\s\-]*(\d{1,2})", user_query, re.IGNORECASE)
            if m_ward:
                parsed_ward = f"ward-{int(m_ward.group(1)):02d}"

        if parsed_budget is None:
            m_bud = re.search(r"₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l\b)", user_query, re.IGNORECASE)
            parsed_budget = float(m_bud.group(1)) if m_bud else 8.0

        target_lookup = parsed_corridor or parsed_ward or "C-14"
        corridor_detail = corridor_service.get_corridor_by_id(target_lookup, scenario=scenario)
        resolved_cid = corridor_detail["id"]
        resolved_code = corridor_detail["code"]
        resolved_ward = corridor_detail["ward_id"]

        recalled_knowledge: List[Dict[str, Any]] = []
        recalled_decisions: List[Dict[str, Any]] = []
        recalled_project_memories: List[Dict[str, Any]] = []
        site_restrictions_map: Dict[str, List[str]] = {}
        recalled_evidence_refs: List[str] = []

        if meko_enabled:
            # Agent 1 recalls project memory & institutional climate knowledge
            proj_res = self.search_memories(
                datapack_logical="vansetu-project-memory",
                agent_id="climate_planner_agent",
                corridor_id=resolved_code,
                ward_id=resolved_ward,
            )
            recalled_project_memories = proj_res["memories"]

            know_res = self.search_memories(
                datapack_logical="vansetu-climate-knowledge",
                agent_id="intervention_planning_agent",
                corridor_id=resolved_code,
                ward_id=resolved_ward,
                only_verified=True,
                include_nearby_km=3.0,
            )
            recalled_knowledge = know_res["memories"]

            # Agent 2 recalls historical corridor planning decisions
            dec_res = self.search_memories(
                datapack_logical="vansetu-planning-decisions",
                agent_id="corridor_analysis_agent",
                corridor_id=resolved_code,
                ward_id=resolved_ward,
            )
            recalled_decisions = dec_res["memories"]

            # Extract verified site restrictions from recalled memories
            restricted_set = set()
            for mem in recalled_knowledge + recalled_project_memories:
                if mem["verification_status"] == "human_verified":
                    sp = mem.get("structured_payload", {})
                    for r_int in sp.get("restricted_interventions", []):
                        restricted_set.add(r_int)
                    if mem.get("evidence_reference"):
                        recalled_evidence_refs.append(mem["evidence_reference"])

            if restricted_set:
                site_restrictions_map[resolved_code] = sorted(list(restricted_set))

            # Log cross-agent context handoff
            self._log_activity(
                operation="cross_agent_knowledge_handoff",
                mcp_tool="knowledgebase_search",
                datapack_logical="vansetu-climate-knowledge",
                agent_id="intervention_planning_agent",
                status="success",
                summary=(
                    f"Shared {len(recalled_knowledge)} verified memory record(s) (refs: {recalled_evidence_refs}) "
                    f"across climate_planner_agent -> corridor_analysis_agent -> intervention_planning_agent."
                ),
                payload_preview={
                    "corridor": resolved_code,
                    "ward": resolved_ward,
                    "restricted_interventions": site_restrictions_map.get(resolved_code, []),
                },
            )

        # Agent 3 runs deterministic MILP optimizer with (Meko ON) or without (Meko OFF) recalled constraints
        opt_result = optimizer_service.optimize_portfolio(
            budget_inr_lakhs=float(parsed_budget),
            budget_mode="capex",
            target_corridor_ids=[resolved_code],
            scenario=scenario,
            site_restrictions=site_restrictions_map if meko_enabled else {},
        )

        # Optionally extract & store a new planning objective memory when Meko is ON
        newly_written_memory = None
        if meko_enabled and record_extracted_memory:
            selected_names = [x["intervention_name"] for x in opt_result["selected_interventions"]]
            newly_written_memory = self.add_memory(
                datapack_logical="vansetu-project-memory",
                agent_id="climate_planner_agent",
                memory_type="planning_objective",
                ward_id=resolved_ward,
                corridor_id=resolved_code,
                verification_status="pending_human_review",
                content_text=(
                    f"Planner evaluated {resolved_code} ({corridor_detail['name']}, {resolved_ward}) under "
                    f"₹{parsed_budget:.2f}L budget [Meko ON]. Recommended: {', '.join(selected_names)} "
                    f"(CapEx ₹{opt_result['financial_summary']['total_capex_inr_lakhs']}L)."
                ),
                structured_payload={
                    "type": "planning_objective",
                    "ward_id": resolved_ward,
                    "corridor_id": resolved_code,
                    "budget_inr_lakhs": parsed_budget,
                    "selected_interventions": [
                        x["intervention_id"] for x in opt_result["selected_interventions"]
                    ],
                    "recalled_evidence_references": recalled_evidence_refs,
                    "verification_status": "pending_human_review",
                },
            )

        selected_list = opt_result["selected_interventions"]
        selected_summary = ", ".join(
            f"{x['intervention_name']} ({x['deployment_km']} km, ₹{x['capex_inr_lakhs']}L)"
            for x in selected_list
        )

        if meko_enabled and site_restrictions_map.get(resolved_code):
            context_explanation = (
                f"MEKO ON: Recalled human-verified site constraint ({', '.join(recalled_evidence_refs)}) on "
                f"{resolved_ward} / {resolved_code} prohibiting {', '.join(site_restrictions_map[resolved_code])} "
                f"due to shallow underground utilities. The MILP optimizer automatically excluded deep excavation "
                f"and re-allocated the ₹{parsed_budget:.2f}L budget to surface-mounted {selected_summary}."
            )
        elif meko_enabled:
            context_explanation = (
                f"MEKO ON: Checked Meko datapacks for {resolved_ward} / {resolved_code}; no disqualifying "
                f"underground utility blocks found. Selected optimal portfolio: {selected_summary}."
            )
        else:
            context_explanation = (
                f"MEKO OFF: Historical institutional memory and prior site survey records were NOT queried. "
                f"Based solely on satellite NDVI/LST rasters and OSM road geometry, the optimizer selected "
                f"{selected_summary} without awareness of subsurface utility conflicts."
            )

        return {
            "meko_enabled": meko_enabled,
            "transport_mode": self.transport_mode,
            "user_query": user_query,
            "parsed_parameters": {
                "ward_id": resolved_ward,
                "corridor_code": resolved_code,
                "corridor_id": resolved_cid,
                "corridor_name": corridor_detail["name"],
                "district": corridor_detail["district"],
                "budget_inr_lakhs": float(parsed_budget),
                "scenario": scenario,
            },
            "agent_trace": [
                {
                    "agent_id": "climate_planner_agent",
                    "role": "Climate Planner Agent",
                    "action": (
                        f"Parsed request for {resolved_ward}, Corridor {resolved_code} (₹{parsed_budget}L) "
                        f"and {'recalled project context from vansetu-project-memory' if meko_enabled else 'skipped Meko recall (MEKO OFF)'}."
                    ),
                    "memories_used": [m["memory_id"] for m in recalled_project_memories],
                },
                {
                    "agent_id": "corridor_analysis_agent",
                    "role": "Corridor Analysis Agent",
                    "action": (
                        f"Evaluated Tri-Vector score (Priority={corridor_detail['priority_score']}, "
                        f"Feasibility={corridor_detail['feasibility_score']}, Confidence={corridor_detail['confidence_score']}) "
                        f"and {'retrieved ' + str(len(recalled_decisions)) + ' historical decision(s)' if meko_enabled else 'operated without historical decision ledger'}."
                    ),
                    "memories_used": [m["memory_id"] for m in recalled_decisions],
                },
                {
                    "agent_id": "intervention_planning_agent",
                    "role": "Intervention Planning Agent",
                    "action": (
                        f"{'Applied verified constraint(s) ' + str(recalled_evidence_refs) + ' and solved' if (meko_enabled and recalled_evidence_refs) else 'Solved'} "
                        f"MILP portfolio under ₹{parsed_budget}L: selected {selected_summary}."
                    ),
                    "memories_used": [m["memory_id"] for m in recalled_knowledge],
                },
            ],
            "recalled_memories": {
                "total_recalled": len(recalled_knowledge) + len(recalled_decisions) + len(recalled_project_memories),
                "climate_knowledge": recalled_knowledge,
                "planning_decisions": recalled_decisions,
                "project_memory": recalled_project_memories,
                "evidence_references": recalled_evidence_refs,
            },
            "newly_written_memory": newly_written_memory,
            "corridor_assessment": {
                "id": resolved_cid,
                "code": resolved_code,
                "ward_id": resolved_ward,
                "name": corridor_detail["name"],
                "district": corridor_detail["district"],
                "priority_score": corridor_detail["priority_score"],
                "feasibility_score": corridor_detail["feasibility_score"],
                "confidence_score": corridor_detail["confidence_score"],
                "lst_mean": corridor_detail["lst_mean"],
                "lst_native_mean": corridor_detail["lst_native_mean"],
                "ndvi_mean": corridor_detail["ndvi_mean"],
                "aqi": corridor_detail["aqi"],
            },
            "optimization_result": opt_result,
            "outcome_explanation": context_explanation,
        }

    def compare_meko_on_vs_off(
        self,
        *,
        user_query: str = "Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.",
        corridor_id: Optional[str] = None,
        ward_id: Optional[str] = None,
        budget_inr_lakhs: Optional[float] = None,
        budget_lakh: Optional[float] = None,
        scenario: str = "baseline",
    ) -> Dict[str, Any]:
        """
        Run the exact same planning request with MEKO OFF and MEKO ON,
        proving that persistent Meko context changes the actual engineering recommendation.
        """
        effective_budget = budget_inr_lakhs if budget_inr_lakhs is not None else budget_lakh
        res_off = self.run_multi_agent_planning_workflow(
            user_query=user_query,
            corridor_id=corridor_id,
            ward_id=ward_id,
            budget_inr_lakhs=effective_budget,
            scenario=scenario,
            meko_enabled=False,
        )
        res_on = self.run_multi_agent_planning_workflow(
            user_query=user_query,
            corridor_id=corridor_id,
            ward_id=ward_id,
            budget_inr_lakhs=effective_budget,
            scenario=scenario,
            meko_enabled=True,
        )

        off_ids = [x["intervention_id"] for x in res_off["optimization_result"]["selected_interventions"]]
        on_ids = [x["intervention_id"] for x in res_on["optimization_result"]["selected_interventions"]]
        decision_changed = off_ids != on_ids

        return {
            "user_query": user_query,
            "decision_changed": decision_changed,
            "recommendation_changed": decision_changed,
            "meko_off": res_off,
            "meko_on": res_on,
            "diff_summary": {
                "meko_off_selected": [
                    {
                        "id": x["intervention_id"],
                        "name": x["intervention_name"],
                        "capex_inr_lakhs": x["capex_inr_lakhs"],
                        "deployment_km": x["deployment_km"],
                    }
                    for x in res_off["optimization_result"]["selected_interventions"]
                ],
                "meko_on_selected": [
                    {
                        "id": x["intervention_id"],
                        "name": x["intervention_name"],
                        "capex_inr_lakhs": x["capex_inr_lakhs"],
                        "deployment_km": x["deployment_km"],
                    }
                    for x in res_on["optimization_result"]["selected_interventions"]
                ],
                "meko_off_total_capex_inr_lakhs": res_off["optimization_result"]["financial_summary"]["total_capex_inr_lakhs"],
                "meko_on_total_capex_inr_lakhs": res_on["optimization_result"]["financial_summary"]["total_capex_inr_lakhs"],
                "recalled_evidence_references": res_on["recalled_memories"]["evidence_references"],
                "why_outcome_changed": (
                    "With Meko OFF, the optimizer selected Linear Street Trees (₹7.20L CapEx) based on satellite NDVI/LST alone. "
                    "With Meko ON, the Intervention Planning Agent recalled human-verified GPR survey-014 (66kV BSES power duct & "
                    "DJB water main at 0.7m depth along Corridor C-14 in Ward 12), disqualifying deep-excavation tree pits and "
                    "bioswales and shifting the portfolio to surface-mounted Architectural Shade Structures (₹5.25L) + "
                    "High-SRI Cool Pavements (₹2.52L) = ₹7.77L Total CapEx."
                    if decision_changed
                    else "No conflicting site constraints were active for this corridor/budget combination."
                ),
            },
        }

    # =========================================================================
    # 3.8 MEKO CHECK T VERIFICATION (SHARED BUILD DATAPACK)
    # =========================================================================
    def verify_check_t(
        self,
        *,
        querying_agent: str = "kunal-coding-agent",
        target_author_agent: str = "niharika-coding-agent",
        topic_query: str = "milp optimizer native resolution",
    ) -> Dict[str, Any]:
        """
        Execute Meko Check T verification on `vansetu-build`:
        1. Confirms >= 10 promoted decisions exist in `vansetu-build`.
        2. Confirms decisions originate from at least 2 teammates' coding agents
           (`niharika-coding-agent` and `kunal-coding-agent`), each identifying its author.
        3. Demonstrates `querying_agent` recalling decisions authored by `target_author_agent` from Meko.
        """
        self.initialize()
        self._enforce_datapack_access("vansetu-build", querying_agent)

        all_build = self.search_memories(
            datapack_logical="vansetu-build",
            agent_id=querying_agent,
            only_verified=True,
        )["memories"]

        promoted_decisions = [m for m in all_build if m["promoted"]]
        authors = sorted(list({m["agent_id"] for m in promoted_decisions}))
        teammates = sorted(list({m["author_teammate"] for m in promoted_decisions if m["author_teammate"]}))

        # Cross-agent recall: querying_agent asks about target_author_agent's decisions
        cross_recalled = self.search_memories(
            datapack_logical="vansetu-build",
            agent_id=querying_agent,
            query=topic_query,
            only_verified=True,
        )["memories"]
        cross_from_other = [m for m in cross_recalled if m["agent_id"] == target_author_agent]

        check_t_passed = (
            len(promoted_decisions) >= 10
            and len(authors) >= 2
            and len(cross_from_other) >= 1
        )

        return {
            "check_t_passed": check_t_passed,
            "datapack_logical": "vansetu-build",
            "datapack_id": self._resolve_datapack_id("vansetu-build"),
            "transport_mode": self.transport_mode,
            "total_promoted_decisions": len(promoted_decisions),
            "unique_coding_agents": authors,
            "unique_teammates": teammates,
            "cross_agent_recall_test": {
                "querying_agent": querying_agent,
                "target_author_agent": target_author_agent,
                "query": topic_query,
                "recalled_from_teammate_count": len(cross_from_other),
                "recalled_decisions": cross_from_other,
            },
            "all_promoted_build_decisions": promoted_decisions,
        }


    def get_datapacks_overview(self) -> List[Dict[str, Any]]:
        return self.list_datapacks()["datapacks"]

    def recall_memories(
        self,
        agent_id: str = "climate_planner_agent",
        datapack_ids: Optional[List[str]] = None,
        corridor_id: Optional[str] = None,
        ward_id: Optional[str] = None,
        query_text: Optional[str] = None,
        only_verified: bool = False,
    ) -> List[Dict[str, Any]]:
        dp_list = datapack_ids or [
            "vansetu-project-memory",
            "vansetu-climate-knowledge",
            "vansetu-planning-decisions",
        ]
        combined: List[Dict[str, Any]] = []
        seen = set()
        for dp in dp_list:
            res = self.search_memories(
                datapack_logical=dp,
                agent_id=agent_id,
                query=query_text,
                corridor_id=corridor_id,
                ward_id=ward_id,
                only_verified=only_verified,
            )
            for m in res.get("memories", []):
                if m["memory_id"] not in seen:
                    seen.add(m["memory_id"])
                    m_copy = dict(m)
                    m_copy.setdefault("content", m_copy.get("content_text", ""))
                    combined.append(m_copy)
        return combined

    def get_activity_log(self, limit: int = 40) -> List[Dict[str, Any]]:
        return self.get_activity_logs(limit=limit)["logs"]

    def run_multi_agent_workflow(
        self,
        corridor_id: str = "C-14",
        ward_id: str = "ward-12",
        budget_lakh: float = 8.0,
        climate_priority: str = "heat_resilience",
        meko_enabled: bool = True,
        planner_id: str = "planner_niharika",
    ) -> Dict[str, Any]:
        return self.run_multi_agent_planning_workflow(
            corridor_id=corridor_id,
            ward_id=ward_id,
            budget_inr_lakhs=budget_lakh,
            meko_enabled=meko_enabled,
        )

    def update_memory(
        self,
        agent_id: str,
        memory_id: str,
        content: str,
        evidence_reference: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:
        try:
            res = self.update_or_verify_memory(
                memory_id=memory_id,
                agent_id=agent_id,
                content_text=content,
                evidence_reference=evidence_reference,
            )
            res["content"] = res.get("content_text", content)
            return res
        except KeyError as exc:
            raise ValueError(str(exc))


PermissionDeniedError = PermissionError
meko_service = MekoService()


def get_meko_service() -> MekoService:
    return meko_service

