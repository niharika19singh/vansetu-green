"""
VanSetu GreenTech — Urban Corridor Assessment & Prioritization Service.

Loads the 44 verified NCT Delhi road corridors, samples native and display
satellite rasters (Sentinel-2 10m NDVI & MODIS 1km LST) along each corridor's
LineString vertices, attaches nearest CPCB AQI telemetry/baselines, runs the
explainable Tri-Vector scoring engine, and evaluates the 5 GreenTech
intervention categories.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
import math
import logging
import numpy as np
from scipy.ndimage import label, binary_dilation
from shapely.geometry import LineString, Polygon, mapping

from app.config import settings, DATASET_PROVENANCE
from app.services.raster_service import raster_service
from app.services.aqi_service import aqi_service, haversine_km
from app.services.scoring_service import (
    scoring_service,
    POLICY_SCENARIOS,
    DISTRICT_VULNERABILITY_INDEX,
)
from app.services.intervention_service import intervention_service

logger = logging.getLogger(__name__)


def _linestring_length_m(coords: List[List[float]]) -> float:
    """Calculate total great-circle length in meters for a WGS84 LineString."""
    total_km = 0.0
    for i in range(len(coords) - 1):
        lng1, lat1 = coords[i][0], coords[i][1]
        lng2, lat2 = coords[i + 1][0], coords[i + 1][1]
        total_km += haversine_km(lat1, lng1, lat2, lng2)
    return round(max(total_km * 1000.0, 80.0), 1)


def _interpolate_sample_points(coords: List[List[float]], num_samples: int = 12) -> List[Tuple[float, float]]:
    """Interpolate evenly spaced (lat, lng) points along a LineString for raster zonal sampling."""
    if not coords:
        return []
    if len(coords) == 1:
        return [(float(coords[0][1]), float(coords[0][0]))]
    line = LineString(coords)
    if line.length <= 0:
        return [(float(coords[0][1]), float(coords[0][0]))]

    pts: List[Tuple[float, float]] = []
    for i in range(num_samples):
        frac = i / max(num_samples - 1, 1)
        pt = line.interpolate(frac, normalized=True)
        pts.append((float(pt.y), float(pt.x)))
    return pts


class CorridorService:
    """
    Service for urban corridor geospatial enrichment, multi-criteria prioritization,
    scenario sensitivity comparison, and intervention planning.
    """

    def __init__(self) -> None:
        self._corridors_cache: Optional[List[Dict[str, Any]]] = None
        self._lst_low: float = 23.0
        self._lst_high: float = 29.0

    def _ensure_enriched_corridors(self) -> List[Dict[str, Any]]:
        """Load and enrich all 44 NCT Delhi corridors from cached GeoJSON."""
        if self._corridors_cache is not None:
            return self._corridors_cache

        raster_service.load_data()
        stats = raster_service.stats
        # Compute city-wide P2 and P98 on native LST for consistent [0, 1] normalization
        valid_lst = raster_service.lst_native[~np.isnan(raster_service.lst_native)]
        if valid_lst.size > 0:
            self._lst_low = float(np.percentile(valid_lst, settings.lst_percentile_low))
            self._lst_high = float(np.percentile(valid_lst, settings.lst_percentile_high))

        path = settings.roads_cache_path
        if not path.exists():
            raise FileNotFoundError(f"Corridors GeoJSON not found at {path}")

        with open(path, "r", encoding="utf-8") as f:
            raw_geojson = json.load(f)

        features = raw_geojson.get("features", [])
        enriched: List[Dict[str, Any]] = []

        for idx, feat in enumerate(features, start=1):
            geom = feat.get("geometry", {})
            props = feat.get("properties", {})
            coords = geom.get("coordinates", [])
            if not coords:
                continue

            cid = props.get("id", f"delhi_corridor_{idx:03d}")
            name = props.get("name", f"Urban Corridor {idx}")
            highway = props.get("highway", "secondary")
            district = props.get("district", "Central Delhi")
            is_walkable = bool(props.get("is_walkable", highway not in ("motorway", "trunk")))
            length_m = _linestring_length_m(coords)

            # Sample raster values along corridor vertices
            sample_pts = _interpolate_sample_points(coords, num_samples=12)
            ndvi_samples: List[float] = []
            lst_display_samples: List[float] = []
            lst_native_samples: List[float] = []
            gdi_samples: List[float] = []

            for lat, lng in sample_pts:
                pt_vals = raster_service.get_values_at_point(lat, lng)
                if pt_vals["ndvi"] is not None:
                    ndvi_samples.append(pt_vals["ndvi"])
                if pt_vals["lst_display_10m"] is not None:
                    lst_display_samples.append(pt_vals["lst_display_10m"])
                if pt_vals["lst_native_1km"] is not None:
                    lst_native_samples.append(pt_vals["lst_native_1km"])
                if pt_vals["gdi"] is not None:
                    gdi_samples.append(pt_vals["gdi"])

            # Centroid coordinate
            line_obj = LineString(coords)
            centroid = line_obj.centroid
            c_lat, c_lng = round(float(centroid.y), 6), round(float(centroid.x), 6)

            ndvi_mean = round(float(np.mean(ndvi_samples)), 4) if ndvi_samples else None
            lst_mean = round(float(np.mean(lst_display_samples)), 2) if lst_display_samples else None
            lst_max = round(float(np.max(lst_display_samples)), 2) if lst_display_samples else None
            lst_native_mean = round(float(np.mean(lst_native_samples)), 2) if lst_native_samples else None
            gdi_mean = round(float(np.mean(gdi_samples)), 4) if gdi_samples else None

            # Normalize NDVI and LST to [0, 1] (preserving None if missing!)
            ndvi_norm: Optional[float] = None
            if ndvi_mean is not None:
                ndvi_span = max(settings.ndvi_max - settings.ndvi_min, 1e-5)
                ndvi_norm = round(
                    float(max(0.0, min(1.0, (ndvi_mean - settings.ndvi_min) / ndvi_span))), 4
                )

            lst_norm: Optional[float] = None
            if lst_mean is not None:
                lst_span = max(self._lst_high - self._lst_low, 1e-5)
                lst_norm = round(
                    float(max(0.0, min(1.0, (lst_mean - self._lst_low) / lst_span))), 4
                )

            # Nearest CPCB AQI station
            aqi_info = aqi_service.get_aqi_at_point(c_lat, c_lng)
            aqi_val = aqi_info.get("aqi")
            aqi_norm = aqi_info.get("aqi_normalized")

            # Compute baseline Tri-Vector score
            base_score = scoring_service.compute_corridor_score(
                lst_norm=lst_norm,
                ndvi_norm=ndvi_norm,
                aqi_norm=aqi_norm,
                highway_type=highway,
                district=district,
                length_m=length_m,
                aqi_distance_km=aqi_info.get("distance_km"),
                aqi_is_live=bool(aqi_info.get("is_live", False)),
                lst_native_resolution_m=1000.0,
                scenario="baseline",
                raw_context={
                    "lst_display_10m_celsius": lst_mean,
                    "lst_native_1km_celsius": lst_native_mean,
                    "lst_max_celsius": lst_max,
                    "ndvi_10m_mean": ndvi_mean,
                    "aqi": aqi_val,
                    "pm25": aqi_info.get("pm25"),
                    "pm10": aqi_info.get("pm10"),
                    "aqi_station": aqi_info.get("station_name"),
                    "aqi_distance_km": aqi_info.get("distance_km"),
                    "aqi_data_mode": aqi_info.get("data_mode"),
                },
            )

            # Compute 5-category intervention plan
            norm_inputs = base_score["calculation_breakdown"]["normalized_inputs"]
            int_plan = intervention_service.evaluate_corridor_interventions(
                heat_norm=norm_inputs["heat"],
                green_deficit_norm=norm_inputs["green_deficit"],
                aqi_norm=norm_inputs["pollution"],
                pedestrian_norm=norm_inputs["pedestrian"],
                feasibility_score=base_score["feasibility_score"],
                confidence_score=base_score["confidence_score"],
                highway_type=highway,
                length_m=length_m,
                district=district,
            )

            enriched.append(
                {
                    "id": cid,
                    "name": name,
                    "district": district,
                    "highway": highway,
                    "is_walkable": is_walkable,
                    "length_m": length_m,
                    "length_km": round(length_m / 1000.0, 3),
                    "centroid": [c_lat, c_lng],
                    "geometry": geom,
                    # Environmental indicators (both native & display resolutions)
                    "ndvi_mean": ndvi_mean,
                    "ndvi_norm": ndvi_norm,
                    "green_deficit": norm_inputs["green_deficit"],
                    "lst_mean": lst_mean,
                    "lst_max": lst_max,
                    "lst_native_mean": lst_native_mean,
                    "lst_norm": lst_norm,
                    "gdi_mean": gdi_mean,
                    "aqi": aqi_val,
                    "aqi_norm": aqi_norm,
                    "pm25": aqi_info.get("pm25"),
                    "pm10": aqi_info.get("pm10"),
                    "aqi_category": aqi_info.get("category"),
                    "aqi_station": aqi_info.get("station_name"),
                    "aqi_distance_km": aqi_info.get("distance_km"),
                    "aqi_is_live": bool(aqi_info.get("is_live", False)),
                    "aqi_data_mode": aqi_info.get("data_mode"),
                    "resolution_disclosure": {
                        "ndvi_native_resolution_m": 10.0,
                        "lst_native_resolution_m": 1000.0,
                        "lst_display_resolution_m": 10.0,
                        "lst_resampling_note": "Native 1km MODIS LST is bilinearly interpolated to 10m for display alignment only.",
                    },
                    # Scoring & Tri-Vector
                    "priority_score": base_score["priority_score"],
                    "severity": base_score["severity"],
                    "severity_color": base_score["severity_color"],
                    "feasibility_score": base_score["feasibility_score"],
                    "confidence_score": base_score["confidence_score"],
                    "tri_vector": base_score["tri_vector"],
                    "data_completeness": base_score["data_completeness"],
                    "calculation_breakdown": base_score["calculation_breakdown"],
                    # Interventions
                    "recommended_intervention": int_plan["primary_recommendation"]["name"],
                    "recommended_intervention_id": int_plan["primary_recommendation"]["id"],
                    "intervention_plan": int_plan,
                }
            )

        # Compute baseline rank order
        enriched.sort(
            key=lambda c: (
                -(c["priority_score"] if c["priority_score"] is not None else -1.0),
                c["id"],
            )
        )
        for rank_idx, corr in enumerate(enriched, start=1):
            corr["baseline_rank"] = rank_idx
            corr["rank"] = rank_idx

        self._corridors_cache = enriched
        return self._corridors_cache

    def get_corridors(
        self,
        *,
        district: Optional[str] = None,
        scenario: str = "baseline",
        custom_weights: Optional[Dict[str, float]] = None,
        heat_weight: Optional[float] = None,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Return prioritized urban corridors as GeoJSON + structured ranking list.
        Supports:
        - District filtering (`district`)
        - Policy scenario selection (`scenario`)
        - Custom 6-factor weights (`custom_weights`)
        - Two-factor What-If sensitivity (`heat_weight` in [0, 1])
        """
        base_corridors = self._ensure_enriched_corridors()
        scenario_id = scoring_service.resolve_scenario_id(scenario)

        # Optional district filter (case-insensitive)
        if district and district.strip().lower() not in ("all", "all districts", ""):
            d_target = district.strip().lower()
            filtered = [
                c for c in base_corridors if c["district"].strip().lower() == d_target
            ]
        else:
            filtered = list(base_corridors)

        # Two-factor What-If mode if heat_weight is explicitly provided
        what_if_mode = heat_weight is not None
        if what_if_mode:
            hw_val = float(heat_weight)
            if math.isnan(hw_val) or hw_val < 0.0 or hw_val > 1.0:
                raise ValueError(f"heat_weight must be between 0.0 and 1.0, got {heat_weight}")
            gw_val = round(1.0 - hw_val, 4)

        # First compute baseline two-factor ranks if in what-if mode
        baseline_two_factor: Dict[str, Tuple[float, int]] = {}
        if what_if_mode:
            b_scores: List[Tuple[str, float]] = []
            for c in filtered:
                h_n = c["lst_norm"] if c["lst_norm"] is not None else 0.5
                g_n = c["green_deficit"] if c["green_deficit"] is not None else 0.5
                b_sc = round(0.60 * h_n + 0.40 * g_n, 4)
                b_scores.append((c["id"], b_sc))
            b_scores.sort(key=lambda x: (-x[1], x[0]))
            for r_idx, (cid, b_sc) in enumerate(b_scores, start=1):
                baseline_two_factor[cid] = (b_sc, r_idx)

        evaluated: List[Dict[str, Any]] = []
        for c in filtered:
            item = dict(c)
            if what_if_mode:
                h_n = c["lst_norm"] if c["lst_norm"] is not None else 0.5
                g_n = c["green_deficit"] if c["green_deficit"] is not None else 0.5
                wi_score = round(hw_val * h_n + gw_val * g_n, 4)
                b_sc, b_rk = baseline_two_factor[c["id"]]
                item["priority_score"] = wi_score
                item["gdi_mean"] = wi_score
                item["baseline_score"] = b_sc
                item["baseline_rank"] = b_rk
                item["score_delta"] = round(wi_score - b_sc, 4)
                item["active_mode"] = "what_if_two_factor"
                item["what_if_weights"] = {"heat_weight": hw_val, "green_weight": gw_val}
            elif scenario_id != "baseline" or custom_weights is not None:
                sc_eval = scoring_service.compute_corridor_score(
                    lst_norm=c["lst_norm"],
                    ndvi_norm=c["ndvi_norm"],
                    aqi_norm=c["aqi_norm"],
                    highway_type=c["highway"],
                    district=c["district"],
                    length_m=c["length_m"],
                    aqi_distance_km=c["aqi_distance_km"],
                    aqi_is_live=c["aqi_is_live"],
                    scenario=scenario_id,
                    custom_weights=custom_weights,
                    raw_context=c["calculation_breakdown"]["raw_inputs"],
                )
                item["baseline_score"] = c["priority_score"]
                item["priority_score"] = sc_eval["priority_score"]
                item["severity"] = sc_eval["severity"]
                item["severity_color"] = sc_eval["severity_color"]
                item["tri_vector"] = sc_eval["tri_vector"]
                item["calculation_breakdown"] = sc_eval["calculation_breakdown"]
                item["score_delta"] = (
                    round(sc_eval["priority_score"] - c["priority_score"], 4)
                    if (sc_eval["priority_score"] is not None and c["priority_score"] is not None)
                    else 0.0
                )
                item["active_mode"] = "multi_criteria_scenario"
            else:
                item["baseline_score"] = c["priority_score"]
                item["score_delta"] = 0.0
                item["active_mode"] = "multi_criteria_baseline"

            evaluated.append(item)

        # Rank descending by priority_score
        evaluated.sort(
            key=lambda x: (
                -(x["priority_score"] if x["priority_score"] is not None else -1.0),
                x["id"],
            )
        )
        for new_rank, item in enumerate(evaluated, start=1):
            item["rank"] = new_rank
            item["rank_delta"] = item["baseline_rank"] - new_rank  # Positive = moved up

        if limit is not None and limit > 0:
            evaluated = evaluated[:limit]

        # Build GeoJSON FeatureCollection
        features = []
        for item in evaluated:
            props = {k: v for k, v in item.items() if k != "geometry"}
            features.append(
                {
                    "type": "Feature",
                    "geometry": item["geometry"],
                    "properties": props,
                }
            )

        districts_available = sorted(list({c["district"] for c in base_corridors}))

        return {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}},
            "metadata": {
                "total_corridors": len(evaluated),
                "city_total_corridors": len(base_corridors),
                "district_filter": district or "All Districts",
                "districts_available": districts_available,
                "active_scenario": scenario_id,
                "scenario_metadata": POLICY_SCENARIOS[scenario_id],
                "what_if_heat_weight": heat_weight,
                "provenance": DATASET_PROVENANCE["corridors"],
            },
            "features": features,
            "corridors": [{k: v for k, v in item.items() if k != "geometry"} for item in evaluated],
        }

    def get_corridor_by_id(self, corridor_id: str, scenario: str = "baseline") -> Dict[str, Any]:
        """Retrieve a single corridor with its full scoring trace, sensitivity profile, and intervention plan."""
        result = self.get_corridors(scenario=scenario)
        for feat in result["features"]:
            if str(feat["properties"]["id"]) == str(corridor_id):
                # Also attach 5-scenario sensitivity profile for this specific corridor
                sens = scoring_service.run_sensitivity_analysis(
                    self._ensure_enriched_corridors(), focus_scenario=scenario
                )
                corr_sens = next(
                    (c for c in sens["corridors"] if str(c["id"]) == str(corridor_id)),
                    None,
                )
                payload = dict(feat["properties"])
                payload["geometry"] = feat["geometry"]
                payload["sensitivity_profile"] = corr_sens
                payload["explanation"] = self.explain_corridor(payload)
                return payload
        raise KeyError(f"Corridor '{corridor_id}' not found.")

    def explain_corridor(self, corridor_props: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a deterministic, mathematically transparent explanation of a corridor's
        priority score, drivers, and recommended interventions (no external AI/LLM calls).
        """
        calc = corridor_props.get("calculation_breakdown", {})
        contribs = calc.get("weighted_contributions", {})
        norm_in = calc.get("normalized_inputs", {})
        active_w = calc.get("active_weights", {})

        # Rank drivers by weighted contribution
        valid_contribs = [
            (k, v, norm_in.get(k), active_w.get(k))
            for k, v in contribs.items()
            if v is not None
        ]
        valid_contribs.sort(key=lambda x: -x[1])

        top_drivers = [
            {
                "indicator": k,
                "normalized_value": n_val,
                "active_weight": w_val,
                "weighted_contribution": c_val,
                "share_of_score_pct": round(
                    (c_val / max(corridor_props.get("priority_score") or 1e-5, 1e-5)) * 100.0, 1
                ),
            }
            for k, c_val, n_val, w_val in valid_contribs
        ]

        primary_int = corridor_props.get("intervention_plan", {}).get("primary_recommendation", {})
        return {
            "engine": "VanSetu Deterministic Mathematical Rationale Engine (Zero-LLM)",
            "corridor_id": corridor_props.get("id"),
            "corridor_name": corridor_props.get("name"),
            "district": corridor_props.get("district"),
            "priority_score": corridor_props.get("priority_score"),
            "rank": corridor_props.get("rank"),
            "baseline_rank": corridor_props.get("baseline_rank"),
            "rank_delta": corridor_props.get("rank_delta", 0),
            "formula_trace": calc.get("formula_trace"),
            "top_drivers": top_drivers,
            "data_integrity_summary": (
                f"Mean LST is {corridor_props.get('lst_mean')}°C (10m display) / "
                f"{corridor_props.get('lst_native_mean')}°C (1,000m native MODIS pixel); "
                f"Sentinel-2 10m NDVI is {corridor_props.get('ndvi_mean')}; "
                f"Nearest CPCB station ({corridor_props.get('aqi_station')}, {corridor_props.get('aqi_distance_km')} km) "
                f"reports AQI {corridor_props.get('aqi')} [{corridor_props.get('aqi_data_mode')}]."
            ),
            "primary_intervention_summary": {
                "name": primary_int.get("name"),
                "suitability_score": primary_int.get("suitability_score"),
                "rationale": primary_int.get("selection_rationale"),
                "total_five_year_lifecycle_inr_lakhs": (
                    primary_int.get("cost_breakdown", {}).get("total_five_year_lifecycle_inr_lakhs")
                ),
            },
        }

    def get_raster_priority_zones_geojson(
        self, percentile_threshold: float = 85.0, max_zones: int = 25
    ) -> Dict[str, Any]:
        """
        Perform raster-based connected-component hotspot analysis on the GDI grid
        to identify contiguous urban heat & green-deficit zones.
        """
        raster_service.load_data()
        gdi = raster_service.gdi
        ndvi = raster_service.ndvi
        lst = raster_service.lst

        # Downsample by 10x for fast connected-component polygon extraction (~100m grid)
        step = 10
        gdi_sub = gdi[::step, ::step]
        ndvi_sub = ndvi[::step, ::step]
        lst_sub = lst[::step, ::step]

        valid_vals = gdi_sub[~np.isnan(gdi_sub)]
        if valid_vals.size == 0:
            return {"type": "FeatureCollection", "features": []}

        thresh = float(np.percentile(valid_vals, percentile_threshold))
        mask = (~np.isnan(gdi_sub)) & (gdi_sub >= thresh)
        mask = binary_dilation(mask, iterations=1)
        labeled, num_features = label(mask)

        transform = raster_service.transform
        dx = transform.a * step
        dy = transform.e * step
        x0 = transform.c
        y0 = transform.f

        zones: List[Dict[str, Any]] = []
        for region_id in range(1, num_features + 1):
            rows, cols = np.where(labeled == region_id)
            if rows.size < 12:
                continue

            r_min, r_max = int(rows.min()), int(rows.max())
            c_min, c_max = int(cols.min()), int(cols.max())

            west = x0 + c_min * dx
            east = x0 + (c_max + 1) * dx
            north = y0 + r_min * dy
            south = y0 + (r_max + 1) * dy

            zone_gdi = float(np.nanmean(gdi_sub[rows, cols]))
            zone_ndvi = float(np.nanmean(ndvi_sub[rows, cols]))
            zone_lst = float(np.nanmean(lst_sub[rows, cols]))
            area_km2 = round(float(rows.size * (step * 0.01) ** 2), 3)

            poly = Polygon(
                [
                    (west, south),
                    (east, south),
                    (east, north),
                    (west, north),
                    (west, south),
                ]
            )
            zones.append(
                {
                    "zone_id": f"raster_hotspot_{region_id:03d}",
                    "gdi_mean": round(zone_gdi, 4),
                    "ndvi_mean": round(zone_ndvi, 4),
                    "lst_mean": round(zone_lst, 2),
                    "pixel_count": int(rows.size),
                    "area_km2": area_km2,
                    "geometry": mapping(poly),
                }
            )

        zones.sort(key=lambda z: -z["gdi_mean"])
        zones = zones[:max_zones]

        features = [
            {
                "type": "Feature",
                "geometry": z["geometry"],
                "properties": {k: v for k, v in z.items() if k != "geometry"},
            }
            for z in zones
        ]
        return {
            "type": "FeatureCollection",
            "metadata": {
                "percentile_threshold": percentile_threshold,
                "gdi_cutoff": round(thresh, 4),
                "zone_count": len(features),
                "analysis_type": "raster_connected_component_hotspots",
            },
            "features": features,
        }

    def get_districts_summary(self, scenario: str = "baseline") -> List[Dict[str, Any]]:
        """Aggregate corridor metrics by NCT Delhi administrative district."""
        res = self.get_corridors(scenario=scenario)
        by_dist: Dict[str, List[Dict[str, Any]]] = {}
        for c in res["corridors"]:
            by_dist.setdefault(c["district"], []).append(c)

        summaries: List[Dict[str, Any]] = []
        for dist_name, items in sorted(by_dist.items()):
            scores = [x["priority_score"] for x in items if x["priority_score"] is not None]
            lsts = [x["lst_mean"] for x in items if x["lst_mean"] is not None]
            ndvis = [x["ndvi_mean"] for x in items if x["ndvi_mean"] is not None]
            aqis = [x["aqi"] for x in items if x["aqi"] is not None]
            total_len_km = round(sum(x["length_km"] for x in items), 2)
            vuln_info = DISTRICT_VULNERABILITY_INDEX.get(dist_name, {"index": 0.65, "density_tier": "Moderate"})

            summaries.append(
                {
                    "district": dist_name,
                    "corridor_count": len(items),
                    "total_corridor_length_km": total_len_km,
                    "mean_priority_score": round(sum(scores) / len(scores), 4) if scores else None,
                    "max_priority_score": round(max(scores), 4) if scores else None,
                    "mean_lst_celsius": round(sum(lsts) / len(lsts), 2) if lsts else None,
                    "mean_ndvi": round(sum(ndvis) / len(ndvis), 4) if ndvis else None,
                    "mean_aqi": round(sum(aqis) / len(aqis), 1) if aqis else None,
                    "vulnerability_index": vuln_info["index"],
                    "density_tier": vuln_info["density_tier"],
                    "top_corridor": items[0]["name"] if items else None,
                }
            )

        summaries.sort(key=lambda d: -(d["mean_priority_score"] or 0.0))
        return summaries


corridor_service = CorridorService()
