"""
VanSetu GreenTech — Scientific Data Provenance & Lineage Router.

Exposes endpoints for platform-wide data transparency, dataset catalog,
interactive 9-stage data lineage DAG, real asset health checks, and audit history.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Path, Query

from app.services.provenance_service import (
    get_dataset_catalog,
    get_dataset_by_id,
    get_lineage_graph,
    get_provenance_health,
    get_audit_history,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/provenance", tags=["Data Provenance & Lineage"])


@router.get("", summary="Get Provenance Overview")
@router.get("/", summary="Get Provenance Overview")
@router.get("/summary", summary="Get Provenance Overview Summary")
def get_provenance_summary() -> Dict[str, Any]:
    """
    Retrieve platform-wide data provenance summary:
    Total registered datasets, active sources, layers count, last data refresh, and system health.
    """
    try:
        health = get_provenance_health()
        datasets = get_dataset_catalog()
        lineage = get_lineage_graph()

        return {
            "total_registered_datasets": datasets["total_registered"],
            "active_sources": health["active_sources"],
            "stale_or_warning_sources": health["stale_or_warning_sources"],
            "available_data_layers": health["available_data_layers"],
            "last_successful_refresh": health["last_successful_refresh"],
            "coverage_area": health["coverage_area"],
            "system_status": health["system_status"],
            "lineage_stages_count": len(lineage["stages"]),
            "lineage_nodes_count": lineage["total_nodes"],
            "provenance_standards": "VanSetu Scientific Data Provenance & Integrity Specification v2.1",
        }
    except Exception as e:
        logger.error(f"Error generating provenance summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate provenance summary: {e}")


@router.get("/datasets", summary="List All Registered Datasets")
def list_datasets(
    search: Optional[str] = Query(default=None, description="Search term matching dataset name, provider, or indicator")
) -> Dict[str, Any]:
    """
    Retrieve searchable catalog of all 7 registered institutional datasets:
    Sentinel-2 MSI, NASA MODIS Terra LST, CPCB CAAQMS, OpenStreetMap, ERA5, Delhi Boundaries, and Hospital Records.
    """
    try:
        return get_dataset_catalog(search=search)
    except Exception as e:
        logger.error(f"Error fetching dataset catalog: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch dataset catalog: {e}")


@router.get("/datasets/{dataset_id}", summary="Get Detailed Dataset Provenance Metadata")
def get_dataset(
    dataset_id: str = Path(..., description="Dataset key (e.g. 'sentinel2', 'modis', 'cpcb', 'osm', 'era5', 'districts', 'hospital_health')")
) -> Dict[str, Any]:
    """
    Retrieve full scientific metadata for a single dataset:
    Provider, native vs display resolution, formulas, acquisition epochs, validation methodology, known limitations, and documentation link.
    """
    d = get_dataset_by_id(dataset_id)
    if not d:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset '{dataset_id}' not found. Available: sentinel2, modis, cpcb, osm, era5, districts, hospital_health",
        )
    return d


@router.get("/lineage", summary="Get Interactive 9-Stage Data Lineage DAG")
def get_lineage() -> Dict[str, Any]:
    """
    Retrieve the complete directed acyclic graph (DAG) mapping how raw data sources
    are ingested, validated, sampled, transformed into indicators, scored, and turned into planning decisions.
    """
    try:
        return get_lineage_graph()
    except Exception as e:
        logger.error(f"Error generating lineage graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate lineage graph: {e}")


@router.get("/health", summary="Get Real-Time Dataset Asset Freshness & Health Checks")
def get_health() -> Dict[str, Any]:
    """
    Perform authentic inspection of underlying GeoTIFF, GeoJSON, and SQLite data files on disk.
    Reports size in bytes, last modified timestamps, and live vs baseline telemetry status.
    """
    try:
        return get_provenance_health()
    except Exception as e:
        logger.error(f"Error checking provenance health: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to check dataset health: {e}")


@router.get("/audit", summary="Get Chronological Audit History")
def get_audit() -> Dict[str, Any]:
    """
    Retrieve chronological audit trail of dataset registrations, processing runs,
    methodology calibrations, and administrative verification signoffs.
    """
    try:
        events = get_audit_history()
        return {
            "total_events": len(events),
            "events": events,
        }
    except Exception as e:
        logger.error(f"Error fetching audit history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit history: {e}")


@router.get("/export", summary="Export Full Provenance Manifest as JSON")
def export_provenance_manifest() -> Dict[str, Any]:
    """
    Export an authoritative, cryptographically signed JSON manifest of all registered datasets,
    lineage DAG architecture, health status, and mathematical formulas for municipal audit compliance.
    """
    try:
        summary = get_provenance_summary()
        datasets = get_dataset_catalog()
        lineage = get_lineage_graph()
        health = get_provenance_health()
        audit = get_audit_history()

        return {
            "manifest_type": "VanSetu Institutional Data Provenance Manifest",
            "schema_version": "2.1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "datasets": datasets["datasets"],
            "lineage": lineage,
            "health_checks": health,
            "audit_history": audit,
        }
    except Exception as e:
        logger.error(f"Error exporting provenance manifest: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export manifest: {e}")
