"""
VanSetu GreenTech — Intervention Outcome Monitoring & Causal Inference Schema (Phase 8).

Defines rigorous empirical pre/post intervention deployment schemas, matched control sites,
and confounder tracking for future difference-in-differences (DiD) outcome learning.
Never trains on seeded synthetic outcomes or simple unadjusted before/after comparisons.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OutcomeMetricType(str, Enum):
    NDVI_PROGRESSION = "ndvi_progression"
    CANOPY_COVERAGE_PERCENT = "canopy_coverage_percent"
    TREE_SURVIVAL_PERCENT = "tree_survival_percent"
    LST_THERMAL_REDUCTION_CELSIUS = "lst_thermal_reduction_celsius"
    INFILTRATION_RATE_MM_HR = "infiltration_rate_mm_hr"
    WATERLOGGING_DAYS_PER_SEASON = "waterlogging_days_per_season"
    SURFACE_ALBEDO = "surface_albedo"
    SHADE_COVERAGE_DURATION_HOURS = "shade_coverage_duration_hours"


class DeploymentOutcomeObservation(BaseModel):
    deployment_id: str
    segment_id: str
    intervention_archetype: str
    installation_date: str
    observation_date: str
    is_post_intervention: bool = Field(description="True if post-installation measurement, False if baseline.")
    metric_type: OutcomeMetricType
    measured_value: float
    measurement_unit: str
    measurement_method: str = Field(description="FIELD_SENSOR, SATELLITE_RASTER, or MANUAL_SURVEY.")
    instrument_details: Optional[str] = None
    matched_control_segment_id: Optional[str] = Field(None, description="Nearby un-intervened segment for difference-in-differences comparison.")
    control_measured_value: Optional[float] = None
    weather_confounder_notes: Optional[str] = None
    reviewer_id: str
    verification_status: str = Field(default="EMPIRICAL_VERIFIED", description="EMPIRICAL_VERIFIED or PENDING_AUDIT. Never SYNTHETIC.")


class OutcomeLearningReadinessReport(BaseModel):
    is_outcome_model_trainable: bool = False
    status_code: str = "OUTCOME_LEARNING_PENDING_EMPIRICAL_FOLLOW_UP"
    total_verified_deployments: int = 0
    deployments_with_post_data: int = 0
    matched_control_pairs_count: int = 0
    required_deployments_gate: int = 30
    required_monitoring_duration_months: int = 12
    methodology: str = "DIFFERENCE_IN_DIFFERENCES_WITH_SPATIAL_MATCHING"
    confounders_tracked: List[str] = Field(default_factory=lambda: [
        "ERA5_ambient_temperature_anomaly",
        "seasonal_monsoon_rainfall_variation",
        "traffic_density_fluctuation",
        "irrigation_maintenance_compliance",
    ])
    disclaimer: str = (
        "Causal intervention efficacy cannot be established from naive before/after satellite differences. "
        "Outcome learning models will only be activated when empirical multi-season matched control observations mature."
    )
