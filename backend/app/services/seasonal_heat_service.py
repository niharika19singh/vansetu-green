"""
Feature 5: Seasonal Urban Heat Intelligence Service.

Provides multi-temporal seasonal thermal profiles across Delhi's 3 distinct climate windows:
1. Pre-Monsoon (March–June): Peak dry summer heat, maximum LST (Empirical MODIS MOD11A2)
2. Monsoon (July–September): Cloud cover, moisture buffering (Synthetic Demonstration Estimate)
3. Post-Monsoon / Winter (October–February): Atmospheric inversion & smog (Synthetic Demonstration Estimate)

Scientific Guardrail & Transparency:
- The local repository currently contains only Pre-Monsoon 2024 MODIS LST GeoTIFF data.
- Monsoon and Winter observations are explicitly classified as SYNTHETIC ESTIMATES for illustration.
- Multi-seasonal hotspot persistence is marked UNVERIFIED_INSUFFICIENT_MULTI_TEMPORAL_OBSERVATIONS.
- Radiometric surface skin temperature (LST) is strictly distinguished from human physiological comfort (UTCI/WBGT).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from app.services.corridor_service import get_all_corridors, get_corridor_by_id

logger = logging.getLogger(__name__)

# Regional Delhi seasonal baseline averages (°C radiometric surface skin temperature)
DELHI_SEASONAL_BASELINES = {
    "pre_monsoon": {
        "period": "March – June 2024",
        "description": "Peak dry summer with intense solar insolation and heatwave conditions.",
        "city_mean_lst_celsius": 34.8,
        "city_max_lst_celsius": 46.2,
        "satellite_platform": "NASA MODIS Terra (MOD11A2) Pre-Monsoon 2024 composite",
        "is_measured": True,
        "data_classification": "EMPIRICAL_SATELLITE_MEASUREMENT",
    },
    "monsoon": {
        "period": "July – September 2024",
        "description": "Monsoon rainy season with extensive cloud cover and high relative humidity.",
        "city_mean_lst_celsius": 30.5,
        "city_max_lst_celsius": 36.8,
        "satellite_platform": "SYNTHETIC ESTIMATE (Cloud-cleared monsoon MOD11A2 not ingested)",
        "is_measured": False,
        "data_classification": "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION",
        "derivation_rationale": "Empirical monsoon GeoTIFF unavailable; estimated via regional thermal buffering factor.",
    },
    "post_monsoon_winter": {
        "period": "October 2024 – February 2025",
        "description": "Winter season characterized by atmospheric inversion, dense fog, and severe AQI.",
        "city_mean_lst_celsius": 21.2,
        "city_max_lst_celsius": 27.5,
        "satellite_platform": "SYNTHETIC ESTIMATE (Winter MOD11A2 not ingested)",
        "is_measured": False,
        "data_classification": "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION",
        "derivation_rationale": "Empirical winter GeoTIFF unavailable; estimated via seasonal solar zenith reduction.",
    },
}


def get_corridor_seasonal_profile(corridor_id: str) -> Dict[str, Any]:
    """
    Retrieve multi-temporal seasonal observations and thermal anomaly classifications for a corridor.
    Explicitly discloses empirical vs synthetic observation status.
    """
    corr = get_corridor_by_id(corridor_id)
    if not corr:
        raise ValueError(f"Corridor '{corridor_id}' not found.")

    cid = corr.get("id")
    code = corr.get("code", f"C-{cid}")
    name = corr.get("name")
    district = corr.get("district")
    base_lst = corr.get("lst_mean")

    if base_lst is None:
        observations = [
            {
                "season": "Pre-Monsoon (Peak Summer)",
                "period": "Mar–Jun 2024",
                "lst_celsius": None,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["pre_monsoon"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": None,
                "anomaly_status": "DATA_UNAVAILABLE",
                "is_measured": False,
                "data_classification": "DATA_UNAVAILABLE",
                "source_sensor": "NASA MODIS Terra (MOD11A2) L3 8-day composite (1,000m)",
            },
            {
                "season": "Monsoon (Cloud & Moisture)",
                "period": "Jul–Sep 2024",
                "lst_celsius": None,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["monsoon"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": None,
                "anomaly_status": "DATA_UNAVAILABLE",
                "is_measured": False,
                "data_classification": "DATA_UNAVAILABLE",
                "source_sensor": "SYNTHETIC_MODEL_ESTIMATE",
                "disclosure": "Empirical monsoon satellite acquisition not ingested in local dataset.",
            },
            {
                "season": "Post-Monsoon / Winter (Inversion & Smog)",
                "period": "Oct 2024–Feb 2025",
                "lst_celsius": None,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["post_monsoon_winter"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": None,
                "anomaly_status": "DATA_UNAVAILABLE",
                "is_measured": False,
                "data_classification": "DATA_UNAVAILABLE",
                "source_sensor": "SYNTHETIC_MODEL_ESTIMATE",
                "disclosure": "Empirical winter satellite acquisition not ingested in local dataset.",
            },
        ]
        hotspot_classification = "DATA_UNAVAILABLE"
        hotspot_confidence = "DATA_UNAVAILABLE"
        ver_status = "DATA_UNAVAILABLE"
        empirical_obs_count = 0
        synthetic_obs_count = 0
    else:
        # 1. Pre-monsoon: Empirical from ingested NASA MODIS Terra LST GeoTIFF
        pre_lst = round(base_lst, 1)
        pre_anomaly = round(pre_lst - DELHI_SEASONAL_BASELINES["pre_monsoon"]["city_mean_lst_celsius"], 1)

        # 2. Monsoon: Synthetic demonstration estimate (Monsoon raster not ingested)
        monsoon_lst = round(base_lst * 0.88 + 0.5, 1)
        monsoon_anomaly = round(monsoon_lst - DELHI_SEASONAL_BASELINES["monsoon"]["city_mean_lst_celsius"], 1)

        # 3. Winter: Synthetic demonstration estimate (Winter raster not ingested)
        winter_lst = round(base_lst * 0.62 + 0.2, 1)
        winter_anomaly = round(winter_lst - DELHI_SEASONAL_BASELINES["post_monsoon_winter"]["city_mean_lst_celsius"], 1)

        observations = [
            {
                "season": "Pre-Monsoon (Peak Summer)",
                "period": "Mar–Jun 2024",
                "lst_celsius": pre_lst,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["pre_monsoon"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": pre_anomaly,
                "anomaly_status": "SIGNIFICANT_HOTSPOT" if pre_anomaly >= 2.5 else ("ELEVATED" if pre_anomaly >= 1.0 else "NOMINAL"),
                "is_measured": True,
                "data_classification": "EMPIRICAL_SATELLITE_MEASUREMENT",
                "source_sensor": "NASA MODIS Terra (MOD11A2) L3 8-day composite (1,000m)",
            },
            {
                "season": "Monsoon (Cloud & Moisture)",
                "period": "Jul–Sep 2024",
                "lst_celsius": monsoon_lst,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["monsoon"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": monsoon_anomaly,
                "anomaly_status": "SIGNIFICANT_HOTSPOT" if monsoon_anomaly >= 2.5 else ("ELEVATED" if monsoon_anomaly >= 1.0 else "NOMINAL"),
                "is_measured": False,
                "data_classification": "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION",
                "source_sensor": "SYNTHETIC_MODEL_ESTIMATE",
                "disclosure": "Empirical monsoon satellite acquisition not ingested in local dataset.",
            },
            {
                "season": "Post-Monsoon / Winter (Inversion & Smog)",
                "period": "Oct 2024–Feb 2025",
                "lst_celsius": winter_lst,
                "regional_baseline_celsius": DELHI_SEASONAL_BASELINES["post_monsoon_winter"]["city_mean_lst_celsius"],
                "thermal_anomaly_celsius": winter_anomaly,
                "anomaly_status": "SIGNIFICANT_HOTSPOT" if winter_anomaly >= 2.5 else ("ELEVATED" if winter_anomaly >= 1.0 else "NOMINAL"),
                "is_measured": False,
                "data_classification": "SYNTHETIC_SEASONAL_ESTIMATE_FOR_ILLUSTRATION",
                "source_sensor": "SYNTHETIC_MODEL_ESTIMATE",
                "disclosure": "Empirical winter satellite acquisition not ingested in local dataset.",
            },
        ]

        if pre_anomaly < 0:
            hotspot_classification = "COOL_CORRIDOR_REFUGE"
            hotspot_confidence = "MODERATE"
        elif pre_anomaly >= 2.5:
            hotspot_classification = "PERSISTENT_THERMAL_HOTSPOT"
            hotspot_confidence = "PERSISTENCE_UNVERIFIED_ONE_EMPIRICAL_SEASON"
        else:
            hotspot_classification = "TRANSIENT_THERMAL_ANOMALY"
            hotspot_confidence = "PERSISTENCE_UNVERIFIED_ONE_EMPIRICAL_SEASON"
        ver_status = "UNVERIFIED_INSUFFICIENT_MULTI_TEMPORAL_OBSERVATIONS"
        empirical_obs_count = 1
        synthetic_obs_count = 2

    return {
        "corridor_id": cid,
        "corridor_code": code,
        "corridor_name": name,
        "district": district,
        "hotspot_classification": hotspot_classification,
        "hotspot_confidence": hotspot_confidence,
        "verification_status": ver_status,
        "observations_count": len(observations),
        "empirical_observations_count": empirical_obs_count,
        "synthetic_observations_count": synthetic_obs_count,
        "seasonal_observations": observations,
        "multi_sensor_provenance": {
            "primary_sensor": "NASA MODIS Terra MOD11A2 L3 Land Surface Temperature",
            "native_spatial_resolution": "1,000m × 1,000m",
            "display_resampling": "10m × 10m bilinear interpolation onto Sentinel-2 grid",
            "landsat_comparison": {
                "sensor": "USGS Landsat 8/9 TIRS Collection 2 Level-2",
                "native_thermal_resolution": "100m native sensor pixel",
                "delivered_grid": "30m USGS resampled grid",
                "ingestion_status": "PROPOSED_FUTURE_SENSOR_UPGRADE (Not currently ingested)",
                "recommended_for": "Segment-level micro-hotspot confirmation prior to major civil capital works",
            },
        },
        "scientific_disclaimer": {
            "utci_status": "NOT_AVAILABLE",
            "wbgt_status": "NOT_AVAILABLE",
            "mandatory_notice": (
                "Radiometric Land Surface Temperature (LST) measures surface skin emission and does NOT represent "
                "pedestrian 2m air temperature or human physiological thermal comfort (UTCI/WBGT). "
                "Notice on Seasonal Observations: Ingested GeoTIFFs contain Pre-Monsoon 2024 data only. "
                "Monsoon and Winter values are synthetic illustrative models and must not be used as certified multi-temporal empirical proof."
            ),
        },
    }


def get_all_persistent_hotspots() -> Dict[str, Any]:
    """
    Filter all corridors to identify persistent thermal hotspots across seasonal observations.
    """
    corridors = get_all_corridors()
    hotspots = []

    for corr in corridors:
        cid = corr.get("id")
        try:
            profile = get_corridor_seasonal_profile(str(cid))
            if profile["hotspot_classification"] in ("SINGLE_SEASON_HOTSPOT_CANDIDATE", "PERSISTENT_THERMAL_HOTSPOT"):
                anomaly_val = profile["seasonal_observations"][0]["thermal_anomaly_celsius"]
                hotspots.append({
                    "corridor_id": cid,
                    "corridor_code": corr.get("code", f"C-{cid}"),
                    "corridor_name": corr.get("name"),
                    "district": corr.get("district"),
                    "pre_monsoon_lst": profile["seasonal_observations"][0]["lst_celsius"],
                    "thermal_anomaly": anomaly_val,
                    "confidence": profile["hotspot_confidence"],
                    "verification_status": profile["verification_status"],
                })
        except Exception as e:
            logger.warning(f"Error computing seasonal profile for {cid}: {e}")

    hotspots.sort(key=lambda x: (x["thermal_anomaly"] is not None, x["thermal_anomaly"]), reverse=True)

    return {
        "count": len(hotspots),
        "classification_rule": "Empirical pre-monsoon thermal anomaly >= 2.5°C identified as single-season candidate (persistence unverified due to synthetic seasonal proxy).",
        "single_season_hotspots": hotspots,
        "persistent_hotspots": hotspots,
    }
