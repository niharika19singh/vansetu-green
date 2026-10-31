"""
VanSetu GreenTech — Regional Health & Climate Intelligence Router.

Exposes:
- GET /api/health/regional-indicators: Regional heat-health indicators with truthful missing data states.
- GET /api/health/abha-status: Truthful ABHA / ABDM ecosystem integration readiness.
- GET /api/admin/health-data/sources: Registered hospital data providers (Govt Admin only).
- POST /api/admin/health-data/sources: Register hospital data provider (Govt Admin only).
- POST /api/admin/health-data/uploads: Upload and validate de-identified aggregate dataset (Govt Admin only).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.hospital_health_service import get_hospital_health_service
from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    get_optional_current_user,
    require_permission,
)

logger = logging.getLogger("vansetu.routers.health")

router = APIRouter(prefix="/api", tags=["Regional Health & Climate Intelligence"])


class RegisterProviderRequest(BaseModel):
    provider_id: str = Field(description="Unique code, e.g. 'HOSP-GTB-04'")
    hospital_name: str = Field(description="Official name of hospital or healthcare facility")
    district: str = Field(description="NCT Delhi administrative district")
    facility_type: str = Field(description="Facility classification, e.g. 'Tertiary Government Hospital'")
    coverage_area: str = Field(description="Catchment description")


class IngestAggregateRequest(BaseModel):
    provider_id: str
    district: str
    reporting_period: str = Field(description="e.g. '2026-Q2'")
    heat_illness_visits: int = Field(ge=0)
    heatstroke_emergency_attendances: int = Field(ge=0)
    respiratory_emergency_visits: int = Field(ge=0)
    total_emergency_admissions: int = Field(ge=0)
    population_denominator: Optional[int] = Field(default=None, gt=0)
    provenance_notes: str = Field(description="Source description and verification notes")


# -----------------------------------------------------------------------------
# Regional Health Indicators & Prioritisation
# -----------------------------------------------------------------------------

@router.get("/health/regional-indicators")
def get_regional_health_indicators(
    district: Optional[str] = Query(None, description="Optional NCT Delhi district filter"),
    period: Optional[str] = Query(None, description="Optional reporting period filter"),
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Retrieve validated regional health indicators and hospital-contributed aggregates.
    Truthfully reports HEALTH_DATA_NOT_AVAILABLE for unmonitored districts.
    """
    svc = get_hospital_health_service()
    return svc.get_regional_indicators(district=district, period=period)


@router.get("/health/corridors/{corridor_district}/health-factor")
def get_corridor_health_factor(
    corridor_district: str,
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Retrieve explainable regional health vulnerability factor for a specific district.
    Shows how clinical heat emergency attendance rates modulate corridor prioritization.
    """
    svc = get_hospital_health_service()
    return svc.compute_corridor_health_vulnerability(corridor_district)


@router.get("/health/abha-status")
def get_abha_abdm_readiness() -> Dict[str, Any]:
    """
    Truthfully reports the status of Ayushman Bharat Digital Mission (ABDM) integration.
    Discloses SANDBOX_CONFIGURED state, zero patient PII guarantees, and consent architecture.
    """
    svc = get_hospital_health_service()
    return svc.get_abha_abdm_readiness_status()


# -----------------------------------------------------------------------------
# Hospital Source Management (Government Admin)
# -----------------------------------------------------------------------------

@router.get("/admin/health-data/sources")
def list_hospital_data_sources(
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_HOSPITAL_SOURCES)),
) -> Dict[str, Any]:
    """List registered hospital data providers (Government Admin only)."""
    svc = get_hospital_health_service()
    providers = svc.list_providers()
    return {"count": len(providers), "providers": providers}


@router.post("/admin/health-data/sources", status_code=status.HTTP_201_CREATED)
def register_hospital_data_source(
    body: RegisterProviderRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_HOSPITAL_SOURCES)),
) -> Dict[str, Any]:
    """Register an accredited hospital data provider."""
    svc = get_hospital_health_service()
    try:
        return svc.register_provider(
            provider_id=body.provider_id,
            hospital_name=body.hospital_name,
            district=body.district,
            facility_type=body.facility_type,
            coverage_area=body.coverage_area,
            user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/admin/health-data/uploads", status_code=status.HTTP_201_CREATED)
def upload_hospital_aggregate_dataset(
    body: IngestAggregateRequest,
    current_user: AuthenticatedUser = Depends(require_permission(Permission.MANAGE_HOSPITAL_SOURCES)),
) -> Dict[str, Any]:
    """
    Ingest and validate an aggregate hospital health dataset.
    Strictly rejects patient PII, individual records, or invalid districts.
    """
    svc = get_hospital_health_service()
    try:
        return svc.validate_and_ingest_aggregate_dataset(
            provider_id=body.provider_id,
            district=body.district,
            reporting_period=body.reporting_period,
            heat_illness_visits=body.heat_illness_visits,
            heatstroke_emergency_attendances=body.heatstroke_emergency_attendances,
            respiratory_emergency_visits=body.respiratory_emergency_visits,
            total_emergency_admissions=body.total_emergency_admissions,
            population_denominator=body.population_denominator,
            provenance_notes=body.provenance_notes,
            user=current_user,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
