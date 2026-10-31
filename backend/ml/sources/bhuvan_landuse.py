"""
VanSetu GreenTech — ISRO NRSC Bhuvan LULC Ingestion Adapter (Phase 1G).

Interfaces ISRO National Remote Sensing Centre (NRSC) Bhuvan portal
for Land Use and Land Cover (LULC 1:50,000 / 1:250,000) thematic mapping.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from ml.sources.base import BaseSourceAdapter, IngestionStatus, SourceProvenance


class BhuvanLanduseAdapter(BaseSourceAdapter):
    """Adapter for ISRO / NRSC Bhuvan land use / land cover products."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        super().__init__(
            source_name="ISRO NRSC Bhuvan Land Use / Land Cover (LULC 1:50K)",
            provider="National Remote Sensing Centre (NRSC) / Indian Space Research Organisation (ISRO)",
            portal_url="https://bhuvan.nrsc.gov.in/",
            license_type="Government of India Open Access / Bhuvan Terms of Service",
        )
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.bhuvan_token = os.getenv("BHUVAN_API_KEY", "")

    def check_connection(self) -> Dict[str, Any]:
        live_configured = bool(self.bhuvan_token)
        return {
            "source_name": self.source_name,
            "status": IngestionStatus.CONNECTED_LIVE_API.value if live_configured else IngestionStatus.MISSING_CREDENTIALS.value,
            "live_api_configured": live_configured,
            "requires_credentials": ["BHUVAN_API_KEY"],
            "wms_endpoint": "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
        }

    def get_provenance(self) -> SourceProvenance:
        conn = self.check_connection()

        return SourceProvenance(
            source_name=self.source_name,
            provider_agency=self.provider,
            official_portal_url=self.portal_url,
            license_type=self.license_type,
            native_spatial_resolution="1:50,000 scale thematic vector/raster (~24m spatial resolution)",
            native_temporal_resolution="Multi-annual cycle (Cycle 2 / Cycle 3)",
            crs="EPSG:4326 / LCC WGS 84",
            acquisition_period="National Natural Resources Management System (NNRMS) LULC",
            ingestion_status=IngestionStatus(conn["status"]),
            is_live_connected=conn["live_api_configured"],
            missing_credentials_detail=(
                None if conn["live_api_configured"]
                else "BHUVAN_API_KEY not configured. WMS thematic queries require registered Bhuvan token."
            ),
            manual_acquisition_procedure=(
                "Register on Bhuvan portal https://bhuvan.nrsc.gov.in/, open Bhuvan Thematic Services, "
                "select LULC 1:50K for Delhi State, request WCS/WMS clipping or shapefile download."
            ),
        )

    def fetch_observations_or_raster(self, **kwargs: Any) -> Dict[str, Any]:
        prov = self.get_provenance()
        if not prov.is_live_connected:
            return {
                "available": False,
                "status": IngestionStatus.MISSING_CREDENTIALS.value,
                "message": "Bhuvan WMS API token required for live thematic queries.",
                "provenance": prov.to_dict(),
            }

        return {
            "available": True,
            "status": IngestionStatus.CONNECTED_LIVE_API.value,
            "provenance": prov.to_dict(),
        }
