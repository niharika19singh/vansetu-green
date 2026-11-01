"""
VanSetu GreenTech — Explainable Corridor Prioritization & Sensitivity Engine.

Implements the Tri-Vector Decision Framework:
1. Priority Score [0, 1]: Multi-criteria weighted index across Heat Exposure,
   Vegetation Deficit, Air Quality, Pedestrian Needs, Compound Health Risk,
   and Socio-Spatial Vulnerability.
2. Implementation Feasibility [0, 1]: Civil/geometric suitability based on
   OSM highway classification, pedestrian walkability, and Right-of-Way profile.
3. Evidence Confidence [0, 1]: Explicit data quality score accounting for
   1,000m MODIS thermal resolution, AQI station distance, and missing signals.

Critical Scientific Guarantee:
Missing (None or NaN) indicators are NEVER silently interpreted as zero.
Instead, active weights are dynamically re-normalized over available signals.
"""
from typing import Dict, Any, List, Optional, Tuple
import math

from app.config import settings


# Canonical indicator keys
CANONICAL_INDICATORS = (
    "heat",
    "green_deficit",
    "pollution",
    "pedestrian",
    "health_risk",
    "vulnerable_pop",
)

# Alias map for API callers
INDICATOR_ALIASES: Dict[str, str] = {
    "heat": "heat",
    "heat_exposure": "heat",
    "lst": "heat",
    "green_deficit": "green_deficit",
    "vegetation_deficit": "green_deficit",
    "ndvi": "green_deficit",
    "pollution": "pollution",
    "air_quality": "pollution",
    "aqi": "pollution",
    "pedestrian": "pedestrian",
    "pedestrian_needs": "pedestrian",
    "footfall": "pedestrian",
    "health_risk": "health_risk",
    "compound_health_risk": "health_risk",
    "vulnerable_pop": "vulnerable_pop",
    "vulnerability": "vulnerable_pop",
    "socio_spatial_vulnerability": "vulnerable_pop",
}


# =============================================================================
# 5 POLICY SCENARIOS (Section 4C)
# =============================================================================
POLICY_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "baseline": {
        "id": "baseline",
        "name": "Baseline Scenario",
        "short_label": "Baseline",
        "description": (
            "Balanced multi-criteria baseline weighting thermal exposure, vegetation deficit, "
            "ambient air pollution, pedestrian demand, compound health risk, and socio-spatial vulnerability."
        ),
        "weights": {
            "heat": 0.25,
            "green_deficit": 0.20,
            "pollution": 0.20,
            "pedestrian": 0.15,
            "health_risk": 0.12,
            "vulnerable_pop": 0.08,
        },
    },
    "heat_resilience": {
        "id": "heat_resilience",
        "name": "Heat-Resilience Scenario",
        "short_label": "Heat Resilience",
        "description": (
            "Prioritizes urban heat island mitigation by elevating Land Surface Temperature (40%) "
            "and canopy deficit (25%) for extreme summer heatwave adaptation."
        ),
        "weights": {
            "heat": 0.40,
            "green_deficit": 0.25,
            "pollution": 0.15,
            "pedestrian": 0.10,
            "health_risk": 0.05,
            "vulnerable_pop": 0.05,
        },
    },
    "air_quality": {
        "id": "air_quality",
        "name": "Air-Quality Scenario",
        "short_label": "Air Quality",
        "description": (
            "Targets particulate matter (PM2.5/PM10) deposition and roadside phytoremediation "
            "by assigning 40% weight to ambient air pollution and 20% to green deficit."
        ),
        "weights": {
            "heat": 0.15,
            "green_deficit": 0.20,
            "pollution": 0.40,
            "pedestrian": 0.10,
            "health_risk": 0.10,
            "vulnerable_pop": 0.05,
        },
    },
    "pedestrian_equity": {
        "id": "pedestrian_equity",
        "name": "Pedestrian-Equity Scenario",
        "short_label": "Pedestrian Equity",
        "description": (
            "Maximizes thermal comfort along high-footfall walking corridors, transit access routes, "
            "and underserved neighborhoods (30% pedestrian needs, 20% socio-spatial vulnerability)."
        ),
        "weights": {
            "heat": 0.15,
            "green_deficit": 0.15,
            "pollution": 0.10,
            "pedestrian": 0.30,
            "health_risk": 0.10,
            "vulnerable_pop": 0.20,
        },
    },
    "extreme_vulnerability": {
        "id": "extreme_vulnerability",
        "name": "Extreme-Vulnerability Scenario",
        "short_label": "Extreme Vulnerability",
        "description": (
            "Focuses investment on high-density socio-spatially vulnerable districts experiencing "
            "compounded heat-pollution health stress (25% vulnerability, 25% health risk, 20% heat)."
        ),
        "weights": {
            "heat": 0.20,
            "green_deficit": 0.05,
            "pollution": 0.15,
            "pedestrian": 0.10,
            "health_risk": 0.25,
            "vulnerable_pop": 0.25,
        },
    },
}

# Scenario aliases for seamless backward compatibility
SCENARIO_ALIASES: Dict[str, str] = {
    "baseline": "baseline",
    "balanced": "baseline",
    "default": "baseline",
    "heat_resilience": "heat_resilience",
    "heat": "heat_resilience",
    "air_quality": "air_quality",
    "air_quality_focus": "air_quality",
    "pollution": "air_quality",
    "pedestrian_equity": "pedestrian_equity",
    "pedestrian": "pedestrian_equity",
    "extreme_vulnerability": "extreme_vulnerability",
    "vulnerability": "extreme_vulnerability",
}


# OSM Highway Hierarchy profiles: pedestrian footfall proxy & implementation feasibility
HIGHWAY_PROFILES: Dict[str, Dict[str, Any]] = {
    "pedestrian": {"pedestrian_proxy": 0.92, "base_feasibility": 0.88, "row_width_m": 12.0, "walkable": True},
    "footway": {"pedestrian_proxy": 0.88, "base_feasibility": 0.85, "row_width_m": 8.0, "walkable": True},
    "living_street": {"pedestrian_proxy": 0.85, "base_feasibility": 0.84, "row_width_m": 10.0, "walkable": True},
    "residential": {"pedestrian_proxy": 0.76, "base_feasibility": 0.82, "row_width_m": 12.0, "walkable": True},
    "secondary": {"pedestrian_proxy": 0.82, "base_feasibility": 0.80, "row_width_m": 24.0, "walkable": True},
    "secondary_link": {"pedestrian_proxy": 0.74, "base_feasibility": 0.75, "row_width_m": 18.0, "walkable": True},
    "primary": {"pedestrian_proxy": 0.78, "base_feasibility": 0.74, "row_width_m": 30.0, "walkable": True},
    "primary_link": {"pedestrian_proxy": 0.70, "base_feasibility": 0.70, "row_width_m": 22.0, "walkable": True},
    "tertiary": {"pedestrian_proxy": 0.80, "base_feasibility": 0.84, "row_width_m": 16.0, "walkable": True},
    "tertiary_link": {"pedestrian_proxy": 0.72, "base_feasibility": 0.78, "row_width_m": 14.0, "walkable": True},
    "unclassified": {"pedestrian_proxy": 0.65, "base_feasibility": 0.76, "row_width_m": 12.0, "walkable": True},
    "trunk": {"pedestrian_proxy": 0.45, "base_feasibility": 0.42, "row_width_m": 45.0, "walkable": False},
    "motorway": {"pedestrian_proxy": 0.15, "base_feasibility": 0.25, "row_width_m": 60.0, "walkable": False},
}


# NCT Delhi District Socio-Spatial Vulnerability Index (derived from Census density,
# informal settlement share, elderly/child demographic exposure, and canopy access deficit)
DISTRICT_VULNERABILITY_INDEX: Dict[str, Dict[str, Any]] = {
    "North East Delhi": {"index": 0.88, "density_tier": "Extreme (>36,000/km²)", "source": "Census of India / Delhi Economic Survey"},
    "Central Delhi": {"index": 0.82, "density_tier": "Very High (>27,000/km²)", "source": "Census of India / Delhi Economic Survey"},
    "East Delhi": {"index": 0.79, "density_tier": "Very High (>27,000/km²)", "source": "Census of India / Delhi Economic Survey"},
    "Shahdara": {"index": 0.84, "density_tier": "Extreme (>30,000/km²)", "source": "Census of India / Delhi Economic Survey"},
    "North West Delhi": {"index": 0.74, "density_tier": "High", "source": "Census of India / Delhi Economic Survey"},
    "West Delhi": {"index": 0.72, "density_tier": "High (>19,000/km²)", "source": "Census of India / Delhi Economic Survey"},
    "North Delhi": {"index": 0.71, "density_tier": "High", "source": "Census of India / Delhi Economic Survey"},
    "South East Delhi": {"index": 0.68, "density_tier": "Moderate-High", "source": "Census of India / Delhi Economic Survey"},
    "South Delhi": {"index": 0.56, "density_tier": "Moderate", "source": "Census of India / Delhi Economic Survey"},
    "South West Delhi": {"index": 0.52, "density_tier": "Moderate-Low", "source": "Census of India / Delhi Economic Survey"},
    "New Delhi": {"index": 0.38, "density_tier": "Low (Institutional Lutyens Zone)", "source": "Census of India / Delhi Economic Survey"},
}

# Automatically support both full and canonical short district names
for _k, _v in list(DISTRICT_VULNERABILITY_INDEX.items()):
    if _k.endswith(" Delhi") and _k != "New Delhi":
        DISTRICT_VULNERABILITY_INDEX[_k[:-6].strip()] = _v



def _is_valid_number(val: Any) -> bool:
    """Return True if val is a finite float/int (not None, not NaN, not Inf)."""
    if val is None or isinstance(val, bool):
        return False
    if isinstance(val, (int, float)):
        return not (math.isnan(float(val)) or math.isinf(float(val)))
    return False


class ScoringService:
    """
    Explainable multi-criteria corridor scoring and scenario sensitivity service.
    """

    def resolve_scenario_id(self, scenario: Optional[str]) -> str:
        """Resolve scenario name or alias to a canonical scenario key."""
        if not scenario:
            return "baseline"
        key = scenario.strip().lower()
        if key not in SCENARIO_ALIASES:
            raise ValueError(
                f"Unknown scenario '{scenario}'. Valid scenarios: {list(POLICY_SCENARIOS.keys())}"
            )
        return SCENARIO_ALIASES[key]

    def get_scenarios_metadata(self) -> Dict[str, Any]:
        """Return all 5 policy scenarios and their configured weight profiles."""
        return {
            "default_scenario": "baseline",
            "scenarios": POLICY_SCENARIOS,
            "indicators": {
                "heat": {
                    "label": "Heat Exposure (MODIS LST)",
                    "resolution": "1,000m native / 10m display",
                    "description": "Normalized daytime Land Surface Temperature percentile exposure [0, 1].",
                },
                "green_deficit": {
                    "label": "Vegetation Deficit (1 - Sentinel-2 NDVI)",
                    "resolution": "10m native",
                    "description": "Canopy scarcity derived from 10m Sentinel-2 NIR/Red surface reflectance [0, 1].",
                },
                "pollution": {
                    "label": "Air Quality Stress (CPCB AQI)",
                    "resolution": "Station-level Haversine interpolation",
                    "description": "Normalized ambient AQI burden scaled across [50, 300] [0, 1].",
                },
                "pedestrian": {
                    "label": "Pedestrian Exposure Demand",
                    "resolution": "Vector road segment",
                    "description": "Footfall intensity derived from survey count or OSM road hierarchy [0, 1].",
                },
                "health_risk": {
                    "label": "Compound Thermal-Pollution Health Risk",
                    "resolution": "Co-exposure interaction",
                    "description": "Non-linear synergistic stress from simultaneous extreme heat and PM2.5/AQI exposure [0, 1].",
                },
                "vulnerable_pop": {
                    "label": "Socio-Spatial Vulnerability",
                    "resolution": "NCT Delhi District administrative level",
                    "description": "Demographic & housing density vulnerability index by administrative district [0, 1].",
                },
            },
        }

    def normalize_custom_weights(self, custom_weights: Dict[str, float]) -> Dict[str, float]:
        """Validate and normalize custom factor weights to canonical indicator keys."""
        resolved: Dict[str, float] = {k: 0.0 for k in CANONICAL_INDICATORS}
        for raw_key, raw_val in custom_weights.items():
            k_clean = raw_key.strip().lower()
            if k_clean not in INDICATOR_ALIASES:
                raise ValueError(
                    f"Unrecognized scoring factor '{raw_key}'. Valid factors: {list(CANONICAL_INDICATORS)}"
                )
            val = float(raw_val)
            if val < 0.0 or math.isnan(val):
                raise ValueError(f"Weight for '{raw_key}' must be non-negative, got {raw_val}.")
            canonical = INDICATOR_ALIASES[k_clean]
            resolved[canonical] += val

        total = sum(resolved.values())
        if total <= 0.0:
            raise ValueError("Sum of custom weights must be strictly positive (> 0).")
        return {k: round(v / total, 6) for k, v in resolved.items()}

    def compute_corridor_score(
        self,
        *,
        lst_norm: Optional[float],
        ndvi_norm: Optional[float],
        aqi_norm: Optional[float],
        highway_type: str = "secondary",
        district: str = "Central Delhi",
        pedestrian_override: Optional[float] = None,
        vulnerability_override: Optional[float] = None,
        health_risk_override: Optional[float] = None,
        length_m: float = 1000.0,
        aqi_distance_km: Optional[float] = None,
        aqi_is_live: bool = False,
        lst_native_resolution_m: float = 1000.0,
        scenario: str = "baseline",
        custom_weights: Optional[Dict[str, float]] = None,
        raw_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Compute the Tri-Vector assessment (Priority Score, Implementation Feasibility,
        Evidence Confidence) with full input and formula transparency.

        Missing Data Handling:
        If any indicator is None or NaN, it is NEVER replaced by 0.0.
        Instead, its weight is redistributed proportionally across valid indicators.
        """
        scenario_id = self.resolve_scenario_id(scenario)
        if custom_weights is not None:
            base_weights = self.normalize_custom_weights(custom_weights)
        else:
            base_weights = POLICY_SCENARIOS[scenario_id]["weights"].copy()

        # 1. Derive normalized indicator values (preserving None for missing inputs!)
        heat_val: Optional[float] = (
            round(float(max(0.0, min(1.0, lst_norm))), 4)
            if _is_valid_number(lst_norm)
            else None
        )
        green_deficit_val: Optional[float] = (
            round(float(max(0.0, min(1.0, 1.0 - float(ndvi_norm)))), 4)
            if _is_valid_number(ndvi_norm)
            else None
        )
        pollution_val: Optional[float] = (
            round(float(max(0.0, min(1.0, aqi_norm))), 4)
            if _is_valid_number(aqi_norm)
            else None
        )

        hw_clean = (highway_type or "secondary").strip().lower()
        hw_profile = HIGHWAY_PROFILES.get(hw_clean, HIGHWAY_PROFILES["secondary"])

        used_pedestrian_proxy = False
        if _is_valid_number(pedestrian_override):
            pedestrian_val: Optional[float] = round(float(max(0.0, min(1.0, pedestrian_override))), 4)
        elif hw_clean in HIGHWAY_PROFILES:
            pedestrian_val = round(float(hw_profile["pedestrian_proxy"]), 4)
            used_pedestrian_proxy = True
        else:
            pedestrian_val = None

        dist_info = DISTRICT_VULNERABILITY_INDEX.get(district, {"index": 0.65, "density_tier": "Moderate"})
        if _is_valid_number(vulnerability_override):
            vulnerable_val: Optional[float] = round(float(max(0.0, min(1.0, vulnerability_override))), 4)
        elif district in DISTRICT_VULNERABILITY_INDEX:
            vulnerable_val = round(float(dist_info["index"]), 4)
        else:
            vulnerable_val = None

        # Compound health risk: requires at least heat or pollution; never fabricated if both are missing
        if _is_valid_number(health_risk_override):
            health_risk_val: Optional[float] = round(float(max(0.0, min(1.0, health_risk_override))), 4)
        elif heat_val is not None and pollution_val is not None:
            # Synergistic thermal + particulate co-exposure index
            synergy = 0.50 * heat_val + 0.35 * pollution_val + 0.15 * (heat_val * pollution_val)
            health_risk_val = round(float(max(0.0, min(1.0, synergy))), 4)
        elif heat_val is not None:
            health_risk_val = round(float(0.85 * heat_val), 4)
        elif pollution_val is not None:
            health_risk_val = round(float(0.85 * pollution_val), 4)
        else:
            health_risk_val = None

        normalized_inputs: Dict[str, Optional[float]] = {
            "heat": heat_val,
            "green_deficit": green_deficit_val,
            "pollution": pollution_val,
            "pedestrian": pedestrian_val,
            "health_risk": health_risk_val,
            "vulnerable_pop": vulnerable_val,
        }

        # 2. Dynamic missing-data weight re-normalization
        active_signals: List[str] = [
            k for k in CANONICAL_INDICATORS if normalized_inputs[k] is not None
        ]
        missing_signals: List[str] = [
            k for k in CANONICAL_INDICATORS if normalized_inputs[k] is None
        ]

        active_weight_sum = sum(base_weights[k] for k in active_signals)
        active_weights: Dict[str, float] = {}
        weighted_contributions: Dict[str, Optional[float]] = {}
        formula_terms: List[str] = []

        if active_signals and active_weight_sum > 0:
            priority_accum = 0.0
            for k in CANONICAL_INDICATORS:
                val = normalized_inputs[k]
                if val is not None:
                    w_eff = base_weights[k] / active_weight_sum
                    contrib = w_eff * val
                    active_weights[k] = round(w_eff, 4)
                    weighted_contributions[k] = round(contrib, 4)
                    priority_accum += contrib
                    formula_terms.append(f"({w_eff:.3f} × {val:.3f} [{k}])")
                else:
                    active_weights[k] = 0.0
                    weighted_contributions[k] = None
            priority_score: Optional[float] = round(float(max(0.0, min(1.0, priority_accum))), 4)
            formula_trace = " + ".join(formula_terms) + f" = {priority_score:.4f}"
        else:
            for k in CANONICAL_INDICATORS:
                active_weights[k] = 0.0
                weighted_contributions[k] = None
            priority_score = None
            formula_trace = "INSUFFICIENT_DATA (all indicators missing; never coerced to 0.0)"

        # 3. Implementation Feasibility Score [0, 1]
        base_feas = float(hw_profile["base_feasibility"])
        walkable = bool(hw_profile["walkable"])
        row_width_m = float(hw_profile["row_width_m"])
        walkability_multiplier = 1.0 if walkable else 0.40
        length_factor = 1.0 if 150.0 <= length_m <= 3500.0 else 0.88
        feasibility_score = round(
            float(max(0.0, min(1.0, base_feas * walkability_multiplier * length_factor))), 4
        )

        # 4. Evidence Confidence Score [0, 1] with explicit penalty ledger
        confidence = 1.00
        penalties: List[Dict[str, Any]] = []

        if lst_native_resolution_m >= 500.0:
            confidence -= 0.12
            penalties.append(
                {
                    "reason": "coarse_thermal_resolution",
                    "deduction": -0.12,
                    "detail": f"MODIS LST native spatial resolution is {int(lst_native_resolution_m)}m (cannot resolve sub-street canopy shade).",
                }
            )

        if heat_val is None:
            confidence -= 0.25
            penalties.append(
                {
                    "reason": "missing_thermal_observation",
                    "deduction": -0.25,
                    "detail": "Land Surface Temperature is missing/nodata at this corridor.",
                }
            )

        if green_deficit_val is None:
            confidence -= 0.20
            penalties.append(
                {
                    "reason": "missing_ndvi_observation",
                    "deduction": -0.20,
                    "detail": "Sentinel-2 NDVI is missing/nodata at this corridor.",
                }
            )

        if pollution_val is None:
            confidence -= 0.15
            penalties.append(
                {
                    "reason": "missing_aqi_observation",
                    "deduction": -0.15,
                    "detail": "Ambient AQI station observation unavailable.",
                }
            )
        else:
            if not aqi_is_live:
                confidence -= 0.06
                penalties.append(
                    {
                        "reason": "historical_aqi_baseline",
                        "deduction": -0.06,
                        "detail": "AQI uses CPCB seasonal reference baseline rather than live telemetry.",
                    }
                )
            if aqi_distance_km is not None and aqi_distance_km > 10.0:
                confidence -= 0.10
                penalties.append(
                    {
                        "reason": "distant_aqi_station",
                        "deduction": -0.10,
                        "detail": f"Nearest CPCB station is {aqi_distance_km:.1f} km away (>10 km interpolation threshold).",
                    }
                )

        if used_pedestrian_proxy:
            confidence -= 0.05
            penalties.append(
                {
                    "reason": "pedestrian_hierarchy_proxy",
                    "deduction": -0.05,
                    "detail": f"Pedestrian demand estimated from OSM highway class '{hw_clean}' rather than automated footfall counter.",
                }
            )

        confidence_score = round(float(max(0.10, min(1.0, confidence))), 4)

        # Severity classification
        severity = self._classify_priority(priority_score)

        return {
            "scenario": scenario_id,
            "priority_score": priority_score,
            "severity": severity["tier"],
            "severity_color": severity["color"],
            "feasibility_score": feasibility_score,
            "confidence_score": confidence_score,
            "tri_vector": {
                "priority": priority_score,
                "feasibility": feasibility_score,
                "confidence": confidence_score,
            },
            "data_completeness": {
                "active_signal_count": len(active_signals),
                "total_signal_count": len(CANONICAL_INDICATORS),
                "completeness_ratio": round(len(active_signals) / len(CANONICAL_INDICATORS), 4),
                "active_signals": active_signals,
                "missing_signals": missing_signals,
                "missing_data_policy": "dynamic_weight_renormalization_never_zero",
            },
            "calculation_breakdown": {
                "raw_inputs": raw_context or {},
                "normalized_inputs": normalized_inputs,
                "configured_weights": base_weights,
                "active_weights": active_weights,
                "weighted_contributions": weighted_contributions,
                "formula_trace": formula_trace,
                "feasibility_breakdown": {
                    "highway_type": hw_clean,
                    "base_feasibility": base_feas,
                    "walkable_corridor": walkable,
                    "walkability_multiplier": walkability_multiplier,
                    "estimated_row_width_m": row_width_m,
                    "length_factor": length_factor,
                    "final_feasibility": feasibility_score,
                },
                "confidence_breakdown": {
                    "starting_confidence": 1.00,
                    "penalties": penalties,
                    "total_deduction": round(sum(p["deduction"] for p in penalties), 4),
                    "final_confidence": confidence_score,
                },
            },
        }

    def _classify_priority(self, score: Optional[float]) -> Dict[str, str]:
        if score is None:
            return {"tier": "Insufficient Data", "color": "#64748b"}
        if score >= 0.72:
            return {"tier": "Critical Priority", "color": "#ef4444"}
        if score >= 0.58:
            return {"tier": "High Priority", "color": "#f97316"}
        if score >= 0.45:
            return {"tier": "Moderate Priority", "color": "#eab308"}
        return {"tier": "Low Priority", "color": "#10b981"}

    def run_sensitivity_analysis(
        self, corridors: List[Dict[str, Any]], focus_scenario: str = "baseline"
    ) -> Dict[str, Any]:
        """
        Evaluate all corridors across all 5 policy scenarios, computing:
        - Comparative rankings per scenario
        - Score changes vs Baseline
        - Rank shifts vs Baseline
        - Ranking Stability Index S in [0, 1]
        """
        focus_id = self.resolve_scenario_id(focus_scenario)
        scenario_keys = list(POLICY_SCENARIOS.keys())
        n_corridors = len(corridors)

        # Map corridor_id -> {scenario_key -> score_dict}
        per_corridor_scores: Dict[Any, Dict[str, Dict[str, Any]]] = {}
        scenario_rankings: Dict[str, List[Tuple[Any, float]]] = {s: [] for s in scenario_keys}

        for corr in corridors:
            cid = corr["id"]
            per_corridor_scores[cid] = {}
            for sc_key in scenario_keys:
                sc_res = self.compute_corridor_score(
                    lst_norm=corr.get("lst_norm"),
                    ndvi_norm=corr.get("ndvi_norm"),
                    aqi_norm=corr.get("aqi_norm"),
                    highway_type=corr.get("highway", "secondary"),
                    district=corr.get("district", "Central Delhi"),
                    length_m=float(corr.get("length_m", 1000.0)),
                    aqi_distance_km=corr.get("aqi_distance_km"),
                    aqi_is_live=bool(corr.get("aqi_is_live", False)),
                    scenario=sc_key,
                    raw_context={
                        "lst_celsius": corr.get("lst_mean"),
                        "lst_native_1km_celsius": corr.get("lst_native_mean"),
                        "ndvi_mean": corr.get("ndvi_mean"),
                        "aqi": corr.get("aqi"),
                    },
                )
                per_corridor_scores[cid][sc_key] = sc_res
                score_val = sc_res["priority_score"] if sc_res["priority_score"] is not None else -1.0
                scenario_rankings[sc_key].append((cid, score_val))

        # Sort each scenario descending by score (deterministic tie-break by id)
        rank_lookup: Dict[str, Dict[Any, int]] = {s: {} for s in scenario_keys}
        for sc_key in scenario_keys:
            sorted_list = sorted(
                scenario_rankings[sc_key],
                key=lambda item: (-item[1], str(item[0])),
            )
            for idx, (cid, _) in enumerate(sorted_list, start=1):
                rank_lookup[sc_key][cid] = idx

        # Assemble comparative table
        comparative_results: List[Dict[str, Any]] = []
        for corr in corridors:
            cid = corr["id"]
            baseline_score = per_corridor_scores[cid]["baseline"]["priority_score"]
            baseline_rank = rank_lookup["baseline"][cid]

            focus_res = per_corridor_scores[cid][focus_id]
            focus_score = focus_res["priority_score"]
            focus_rank = rank_lookup[focus_id][cid]

            ranks_across = [rank_lookup[s][cid] for s in scenario_keys]
            scores_across = [
                per_corridor_scores[cid][s]["priority_score"]
                for s in scenario_keys
                if per_corridor_scores[cid][s]["priority_score"] is not None
            ]

            min_rank = min(ranks_across)
            max_rank = max(ranks_across)
            rank_span = max_rank - min_rank
            denom = max(n_corridors - 1, 1)
            stability_index = round(max(0.0, 1.0 - (rank_span / denom)), 4)

            if stability_index >= 0.85:
                stability_class = "Robust Priority"
            elif stability_index >= 0.65:
                stability_class = "Moderate Sensitivity"
            else:
                stability_class = "High Policy Sensitivity"

            mean_rank = sum(ranks_across) / len(ranks_across)
            rank_std = round(
                math.sqrt(sum((r - mean_rank) ** 2 for r in ranks_across) / len(ranks_across)),
                2,
            )

            scenario_comparison = {}
            for s in scenario_keys:
                s_score = per_corridor_scores[cid][s]["priority_score"]
                s_rank = rank_lookup[s][cid]
                scenario_comparison[s] = {
                    "scenario_name": POLICY_SCENARIOS[s]["name"],
                    "score": s_score,
                    "rank": s_rank,
                    "score_delta_vs_baseline": (
                        round(s_score - baseline_score, 4)
                        if (s_score is not None and baseline_score is not None)
                        else None
                    ),
                    "rank_shift_vs_baseline": baseline_rank - s_rank,  # Positive = moved up in priority
                }

            comparative_results.append(
                {
                    "id": cid,
                    "name": corr.get("name"),
                    "district": corr.get("district"),
                    "highway": corr.get("highway"),
                    "length_m": corr.get("length_m"),
                    "active_scenario": focus_id,
                    "active_score": focus_score,
                    "active_rank": focus_rank,
                    "baseline_score": baseline_score,
                    "baseline_rank": baseline_rank,
                    "score_delta_vs_baseline": (
                        round(focus_score - baseline_score, 4)
                        if (focus_score is not None and baseline_score is not None)
                        else None
                    ),
                    "rank_shift_vs_baseline": baseline_rank - focus_rank,
                    "stability_metrics": {
                        "stability_index": stability_index,
                        "stability_class": stability_class,
                        "min_rank": min_rank,
                        "max_rank": max_rank,
                        "rank_range": rank_span,
                        "rank_std": rank_std,
                        "score_min": min(scores_across) if scores_across else None,
                        "score_max": max(scores_across) if scores_across else None,
                    },
                    "scenario_comparison": scenario_comparison,
                    "tri_vector": focus_res["tri_vector"],
                    "calculation_breakdown": focus_res["calculation_breakdown"],
                }
            )

        # Sort comparative results by active_rank ascending
        comparative_results.sort(key=lambda item: item["active_rank"])

        # Summary metrics across all corridors
        avg_stability = (
            round(
                sum(c["stability_metrics"]["stability_index"] for c in comparative_results)
                / len(comparative_results),
                4,
            )
            if comparative_results
            else 1.0
        )
        robust_top10 = [
            c["name"]
            for c in comparative_results[:10]
            if c["stability_metrics"]["max_rank"] <= 12
        ]

        return {
            "active_scenario": focus_id,
            "active_scenario_metadata": POLICY_SCENARIOS[focus_id],
            "total_corridors": n_corridors,
            "summary": {
                "mean_stability_index": avg_stability,
                "robust_top_10_corridors": robust_top10,
                "robust_top_10_count": len(robust_top10),
                "scenarios_evaluated": scenario_keys,
            },
            "scenarios": POLICY_SCENARIOS,
            "corridors": comparative_results,
        }


scoring_service = ScoringService()
