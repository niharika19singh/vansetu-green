"""
VanSetu GreenTech — Data Integrity & Training Eligibility Validator (Phase 0).

Strictly quarantines synthetic records, unverified demonstration fixtures,
and unverified measurements to prevent training data contamination.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class ValidationResult:
    is_eligible: bool
    reasons: List[str] = field(default_factory=list)
    quarantine_category: Optional[str] = None
    sanitized_record: Optional[Dict[str, Any]] = None


class ContaminatedDataError(ValueError):
    """Raised when data contamination or unverified records attempt to enter training pipelines."""
    pass


class TrainingDataEligibilityValidator:
    """
    Reusable data integrity validator that enforces strict empirical rules
    before any observation or label enters the ML training dataset.
    """

    ALLOWED_SUITABILITY_CLASSES = {"ELIGIBLE", "CONDITIONAL", "INELIGIBLE"}
    EXCLUDED_SUPERVISED_CLASSES = {"UNASSESSED"}

    # Bounding box for NCT Delhi in EPSG:4326
    DELHI_BBOX = {
        "min_lon": 76.80,
        "max_lon": 77.55,
        "min_lat": 28.35,
        "max_lat": 28.95,
    }

    @classmethod
    def validate_environmental_observation(cls, record: Dict[str, Any]) -> ValidationResult:
        """
        Validate an environmental time-series or sensor observation.
        Rejects synthetic records, invalid coordinates, missing units, or fabricated sources.
        """
        reasons = []

        # 1. Contamination check: Reject any explicitly or implicitly simulated data
        if record.get("is_simulated") in (1, True, "1", "true"):
            reasons.append("Flagged as simulated/synthetic demonstration record (is_simulated=True).")

        source = (record.get("source") or "").strip().lower()
        if not source:
            reasons.append("Missing observation source attribution.")
        elif any(synth_token in source for synth_token in ("synthetic", "demo", "simulated", "fixture", "mock")):
            reasons.append(f"Source indicates synthetic/unverified origin: '{source}'.")

        # 2. Timestamp check
        obs_time = record.get("observed_at") or record.get("timestamp")
        if not obs_time:
            reasons.append("Missing observation timestamp.")
        else:
            try:
                # ISO parsing check
                datetime.fromisoformat(str(obs_time).replace("Z", "+00:00"))
            except Exception:
                reasons.append(f"Invalid timestamp format: '{obs_time}'.")

        # 3. Spatial coordinates check (if point measurement)
        lat = record.get("lat") or record.get("latitude")
        lon = record.get("lon") or record.get("longitude") or record.get("lng")
        if lat is not None or lon is not None:
            try:
                lat_f, lon_f = float(lat), float(lon)
                if not (cls.DELHI_BBOX["min_lat"] <= lat_f <= cls.DELHI_BBOX["max_lat"] and
                        cls.DELHI_BBOX["min_lon"] <= lon_f <= cls.DELHI_BBOX["max_lon"]):
                    reasons.append(f"Coordinates ({lat_f}, {lon_f}) lie outside NCT Delhi bounding box.")
            except (ValueError, TypeError):
                reasons.append(f"Invalid coordinate format: lat={lat}, lon={lon}.")

        # 4. Units & Measurement Value
        val = record.get("value") or record.get("measurement_value")
        if val is None:
            reasons.append("Missing measurement value.")
        else:
            try:
                val_f = float(val)
                metric = (record.get("metric") or record.get("parameter") or "").lower()
                if "lst" in metric or "temp" in metric:
                    if val_f < -5.0 or val_f > 65.0:
                        reasons.append(f"Temperature value {val_f}°C outside realistic Delhi terrestrial range (-5 to 65°C).")
                elif "ndvi" in metric:
                    if val_f < -1.0 or val_f > 1.0:
                        reasons.append(f"NDVI value {val_f} outside physical range [-1.0, 1.0].")
                elif "aqi" in metric or "pm25" in metric or "pm10" in metric:
                    if val_f < 0.0 or val_f > 2000.0:
                        reasons.append(f"Air quality metric {val_f} outside sensor bounds [0, 2000].")
            except (ValueError, TypeError):
                reasons.append(f"Non-numeric measurement value: '{val}'.")

        if reasons:
            return ValidationResult(
                is_eligible=False,
                reasons=reasons,
                quarantine_category="SYNTHETIC_OR_MALFORMED_OBSERVATION",
            )

        return ValidationResult(is_eligible=True, sanitized_record=record)

    @classmethod
    def validate_suitability_label(cls, record: Dict[str, Any]) -> ValidationResult:
        """
        Validate a human-assessed intervention suitability record.
        Rejects model-generated labels, unassessed states, and unauthenticated reviews.
        """
        reasons = []

        # 1. State check
        label = (record.get("suitability_state") or record.get("label") or "").upper()
        if label in cls.EXCLUDED_SUPERVISED_CLASSES:
            reasons.append(f"Label '{label}' indicates lack of verified evidence and cannot serve as a training target.")
        elif label not in cls.ALLOWED_SUITABILITY_CLASSES:
            reasons.append(f"Invalid suitability state '{label}'. Allowed: {cls.ALLOWED_SUITABILITY_CLASSES}.")

        # 2. Reviewer provenance check
        reviewer_id = record.get("reviewer_id")
        reviewer_role = record.get("reviewer_role")
        if not reviewer_id:
            reasons.append("Missing authenticated reviewer_id.")
        if not reviewer_role:
            reasons.append("Missing reviewer_role.")

        # 3. Ground truth integrity: Ensure it wasn't auto-labeled by a model or heuristic
        gen_by = (record.get("generated_by") or record.get("label_source") or "").lower()
        if any(token in gen_by for token in ("model", "heuristic", "scorer", "auto", "llm", "gemini")):
            reasons.append(f"Circular ground-truth violation: label was generated by '{gen_by}' rather than a verified field assessor.")

        # 4. Mandatory evidence or survey reference
        ev_ref = record.get("evidence_reference") or record.get("survey_reference")
        if not ev_ref and label in ("ELIGIBLE", "INELIGIBLE"):
            reasons.append(f"Label '{label}' requires an explicit evidence_reference or survey_reference.")
        elif ev_ref and any(synth in str(ev_ref).lower() for synth in ("synthetic", "demo_fixture", "fictional")):
            reasons.append(f"Evidence reference '{ev_ref}' indicates a synthetic demonstration scenario.")

        # 5. Timestamp check
        ts = record.get("assessment_timestamp") or record.get("timestamp")
        if not ts:
            reasons.append("Missing assessment timestamp.")

        if reasons:
            return ValidationResult(
                is_eligible=False,
                reasons=reasons,
                quarantine_category="UNVERIFIED_OR_CIRCULAR_LABEL",
            )

        return ValidationResult(is_eligible=True, sanitized_record=record)

    @classmethod
    def validate_record(cls, record: Dict[str, Any]) -> Dict[str, Any]:
        """Validates an observation or label, raising ContaminatedDataError if invalid."""
        if "suitability_state" in record or "label" in record:
            res = cls.validate_suitability_label(record)
        else:
            res = cls.validate_environmental_observation(record)

        if not res.is_eligible:
            raise ContaminatedDataError(
                f"DATA_CONTAMINATION_PREVENTED [{res.quarantine_category}]: {'; '.join(res.reasons)}"
            )
        return res.sanitized_record or record