"""
VanSetu GreenTech — ISRO NRSC Bhuvan LULC Ingestion Adapter (Priority 2 Remediation).

Interfaces ISRO National Remote Sensing Centre (NRSC) Bhuvan Land Use / Land Cover (LULC 1:50K).
Reports accurate status semantics: configured vs fetching vs data unavailable.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional
import httpx

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class BhuvanLanduseAdapter(BaseSourceAdapter):
    """Adapter for ISRO NRSC Bhuvan Land Use / Land Cover 1:50,000 mapping."""

    BHUVAN_WMS_ENDPOINT = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms"

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="ISRO NRSC Bhuvan Land Use / Land Cover (LULC 1:50K)",
            provider="National Remote Sensing Centre (NRSC) / Indian Space Research Organisation (ISRO)",
            portal_url="https://bhuvan.nrsc.gov.in/",
            license_type="Government of India Open Access / Bhuvan Terms of Service",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.bhuvan_token = os.getenv("BHUVAN_API_KEY", "").strip()

    def check_connection(self) -> Dict[str, Any]:
        has_token = bool(self.bhuvan_token)
        live_verified = False
        conn_error = None

        if has_token:
            try:
                # Test WMS GetCapabilities availability
                resp = httpx.get(
                    self.BHUVAN_WMS_ENDPOINT,
                    params={"service": "WMS", "request": "GetCapabilities"},
                    timeout=4.0,
                )
                if resp.status_code == 200:
                    live_verified = True
                else:
                    conn_error = f"Bhuvan WMS returned HTTP {resp.status_code}"
            except Exception as exc:
                conn_error = f"Connection error: {exc}"

        if live_verified:
            status = IngestionStatus.LIVE_CONNECTION_VERIFIED
        elif has_token and conn_error:
            status = IngestionStatus.INGESTION_FAILED
        elif has_token:
            status = IngestionStatus.CREDENTIALS_CONFIGURED
        else:
            status = IngestionStatus.NOT_CONFIGURED

        return {
            "source_name": self.source_name,
            "status": status.value,
            "live_api_configured": has_token,
            "live_connection_verified": live_verified,
            "connection_error": conn_error,
            "requires_credentials": ["BHUVAN_API_KEY"],
            "wms_endpoint": self.BHUVAN_WMS_ENDPOINT,
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()
        st = IngestionStatus(conn["status"])

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="1:50,000 scale thematic vector/raster (~24m spatial resolution)",
            native_temporal_resolution="Multi-annual cycle (Cycle 2 / Cycle 3)",
            crs="EPSG:4326 / LCC WGS 84",
            acquisition_period="National Natural Resources Management System (NNRMS) LULC",
            ingestion_status=st,
            is_live_connected=conn["live_connection_verified"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "BHUVAN_API_KEY not configured. Thematic land use classification currently in local reference mode."
            ),
            manual_acquisition_procedure=(
                "Register on Bhuvan portal https://bhuvan.nrsc.gov.in/, open Bhuvan Thematic Services, "
                "select LULC 1:50K for Delhi State, request WCS/WMS clipping or shapefile download."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        conn = self.check_connection()
        return {
            "available": conn["live_connection_verified"],
            "status": conn["status"],
            "message": "Bhuvan WMS land cover query configured. Requires live authenticated token for remote layer fetch.",
            "provenance": self.get_provenance().to_dict(),
        }
