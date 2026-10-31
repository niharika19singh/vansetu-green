"""
VanSetu GreenTech — Deterministic Corridor Segmentation (Phase 2).

Divides Delhi pedestrian and road corridors into stable, 50-100m road segments.
Operates in EPSG:32643 (UTM Zone 43N, metric) to prevent latitude distortion;
outputs geometries in EPSG:4326 with deterministic IDs (e.g., C-14-S001).
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import geopandas as gpd
import numpy as np
from shapely.geometry import LineString, MultiLineString, Point, mapping
from shapely.ops import substring

from ml.sources.delhi_administrative import DelhiAdministrativeBoundaryAdapter


METRIC_CRS = "EPSG:32643"  # UTM Zone 43N (Delhi, metres)
GEOGRAPHIC_CRS = "EPSG:4326"


def segment_linestring_metric(
    line: LineString,
    target_segment_length_m: float = 75.0,
    min_segment_length_m: float = 25.0,
) -> List[Tuple[LineString, float, float]]:
    """
    Split a LineString into consecutive segments of approximately target_segment_length_m.
    Returns list of (segment_geometry, start_distance_m, end_distance_m).
    """
    total_len = line.length
    if total_len <= 0.0:
        return []

    # If shorter than 1.5 * target, keep as single segment
    if total_len < (target_segment_length_m * 1.5):
        return [(line, 0.0, total_len)]

    num_segments = max(1, int(round(total_len / target_segment_length_m)))
    seg_len = total_len / num_segments

    segments = []
    for i in range(num_segments):
        start_d = i * seg_len
        end_d = min(total_len, (i + 1) * seg_len)
        if (end_d - start_d) < min_segment_length_m and segments:
            # Merge with previous segment if tail is too short
            prev_geom, prev_start, _ = segments.pop()
            merged_geom = substring(line, prev_start, end_d)
            segments.append((merged_geom, prev_start, end_d))
        else:
            seg_geom = substring(line, start_d, end_d)
            segments.append((seg_geom, start_d, end_d))

    return segments


class CorridorSegmenter:
    """
    Generates deterministic, versioned road segments from NCT Delhi corridor networks.
    """

    def __init__(
        self,
        target_length_m: float = 75.0,
        min_length_m: float = 25.0,
        admin_adapter: Optional[DelhiAdministrativeBoundaryAdapter] = None,
    ) -> None:
        self.target_length_m = target_length_m
        self.min_length_m = min_length_m
        self.admin_adapter = admin_adapter or DelhiAdministrativeBoundaryAdapter()

    def process_corridor_feature(
        self,
        corridor_id: str,
        corridor_code: str,
        corridor_name: str,
        geometry_4326: Any,
        road_properties: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Segment a single corridor feature.
        """
        props = road_properties or {}
        # Ensure MultiLineString or LineString
        if geometry_4326.geom_type == "MultiLineString":
            lines = list(geometry_4326.geoms)
        elif geometry_4326.geom_type == "LineString":
            lines = [geometry_4326]
        else:
            return []

        # Reproject to metric UTM 43N
        gs_geo = gpd.GeoSeries(lines, crs=GEOGRAPHIC_CRS)
        gs_metric = gs_geo.to_crs(METRIC_CRS)

        segment_records = []
        global_seg_idx = 1

        code_prefix = corridor_code.upper().strip()
        if "DELHI_CORRIDOR_" in code_prefix:
            num_part = code_prefix.replace("DELHI_CORRIDOR_", "")
            if num_part.isdigit():
                code_prefix = f"C-{int(num_part):02d}"
        elif not code_prefix.startswith("C-") and code_prefix.isdigit():
            code_prefix = f"C-{int(code_prefix):02d}"

        for line_metric in gs_metric:
            sub_segs = segment_linestring_metric(
                line_metric,
                target_segment_length_m=self.target_length_m,
                min_segment_length_m=self.min_length_m,
            )

            for seg_metric, start_d, end_d in sub_segs:
                # Reproject segment back to EPSG:4326
                seg_geo_series = gpd.GeoSeries([seg_metric], crs=METRIC_CRS).to_crs(GEOGRAPHIC_CRS)
                seg_geom_4326 = seg_geo_series.iloc[0]

                seg_id = f"{code_prefix}-S{global_seg_idx:03d}"
                actual_len_m = round(float(seg_metric.length), 2)

                # Centroid in 4326
                centroid_4326 = seg_geom_4326.centroid
                centroid_lat = round(float(centroid_4326.y), 6)
                centroid_lon = round(float(centroid_4326.x), 6)

                # Midpoint on segment
                midpoint_metric = seg_metric.interpolate(seg_metric.length / 2.0)
                mid_series = gpd.GeoSeries([midpoint_metric], crs=METRIC_CRS).to_crs(GEOGRAPHIC_CRS)
                mid_4326 = mid_series.iloc[0]

                # Genuine spatial join for district
                admin_join = self.admin_adapter.spatial_join_geometry(seg_geom_4326, crs=GEOGRAPHIC_CRS)

                segment_records.append({
                    "segment_id": seg_id,
                    "corridor_id": str(corridor_id),
                    "corridor_code": code_prefix,
                    "corridor_name": corridor_name,
                    "segment_index": global_seg_idx,
                    "length_metres": actual_len_m,
                    "start_chainage_m": round(float(start_d), 2),
                    "end_chainage_m": round(float(end_d), 2),
                    "centroid_lat": centroid_lat,
                    "centroid_lon": centroid_lon,
                    "midpoint_lat": round(float(mid_4326.y), 6),
                    "midpoint_lon": round(float(mid_4326.x), 6),
                    "district": admin_join["district"],
                    "district_id": admin_join["district_id"],
                    "is_boundary_edge": admin_join["is_boundary_edge"],
                    "distance_to_boundary_metres": admin_join["distance_to_boundary_metres"],
                    "highway_class": props.get("highway", "primary"),
                    "geometry": seg_geom_4326,
                    "geometry_metric": seg_metric,
                })
                global_seg_idx += 1

        return segment_records

    def segment_all_corridors(self, corridors_geojson_path: Path) -> gpd.GeoDataFrame:
        """
        Segment all corridors in the GeoJSON into a consolidated GeoDataFrame.
        """
        gdf_raw = gpd.read_file(corridors_geojson_path)
        all_segments: List[Dict[str, Any]] = []

        for idx, row in gdf_raw.iterrows():
            c_id = row.get("id") or str(idx + 1)
            c_code = row.get("code") or f"C-{int(c_id):02d}" if str(c_id).isdigit() else str(c_id)
            c_name = row.get("name") or f"Corridor {c_code}"
            segs = self.process_corridor_feature(
                corridor_id=str(c_id),
                corridor_code=c_code,
                corridor_name=c_name,
                geometry_4326=row.geometry,
                road_properties=dict(row),
            )
            all_segments.extend(segs)

        gdf_out = gpd.GeoDataFrame(all_segments, geometry="geometry", crs=GEOGRAPHIC_CRS)
        return gdf_out
