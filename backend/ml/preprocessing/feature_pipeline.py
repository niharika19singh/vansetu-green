"""
VanSetu GreenTech — Segment Feature Extraction & GeoParquet Pipeline (Phase 3B).

Assembles multi-domain road segment features for all 1,302 Delhi road segments.
Saves versioned datasets in GeoParquet format with explicit missingness metadata
and strict scientific provenance classifications for every feature.
"""
from __future__ import annotations

import os
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import mapping

from ml.preprocessing.segmentation import CorridorSegmenter
from ml.preprocessing.zonal_stats import ZonalStatsSampler
from ml.sources.cpcb_airquality import CpcbAirQualityAdapter
from ml.sources.delhi_administrative import DelhiAdministrativeBoundaryAdapter


class FeatureProvenance(str, Enum):
    DIRECTLY_OBSERVED = "DIRECTLY_OBSERVED"
    SATELLITE_DERIVED = "SATELLITE_DERIVED"
    GIS_DERIVED = "GIS_DERIVED"
    PROXY_ESTIMATE = "PROXY_ESTIMATE"
    ENGINEERING_ESTIMATE = "ENGINEERING_ESTIMATE"
    FIELD_VERIFIED = "FIELD_VERIFIED"
    UNAVAILABLE = "UNAVAILABLE"


# Authoritative feature provenance registry
FEATURE_PROVENANCE_REGISTRY: Dict[str, str] = {
    "segment_id": FeatureProvenance.GIS_DERIVED.value,
    "corridor_id": FeatureProvenance.GIS_DERIVED.value,
    "corridor_code": FeatureProvenance.GIS_DERIVED.value,
    "corridor_name": FeatureProvenance.GIS_DERIVED.value,
    "segment_index": FeatureProvenance.GIS_DERIVED.value,
    "length_metres": FeatureProvenance.GIS_DERIVED.value,
    "start_chainage_m": FeatureProvenance.GIS_DERIVED.value,
    "end_chainage_m": FeatureProvenance.GIS_DERIVED.value,
    "centroid_lat": FeatureProvenance.GIS_DERIVED.value,
    "centroid_lon": FeatureProvenance.GIS_DERIVED.value,
    "district": FeatureProvenance.GIS_DERIVED.value,
    "district_id": FeatureProvenance.GIS_DERIVED.value,
    "is_boundary_edge": FeatureProvenance.GIS_DERIVED.value,
    "highway_class": FeatureProvenance.GIS_DERIVED.value,
    "ndvi_mean": FeatureProvenance.SATELLITE_DERIVED.value,
    "ndvi_median": FeatureProvenance.SATELLITE_DERIVED.value,
    "ndvi_p10": FeatureProvenance.SATELLITE_DERIVED.value,
    "ndvi_p90": FeatureProvenance.SATELLITE_DERIVED.value,
    "ndvi_valid_pixel_fraction": FeatureProvenance.SATELLITE_DERIVED.value,
    "ndmi": FeatureProvenance.UNAVAILABLE.value,
    "ndmi_proxy": FeatureProvenance.UNAVAILABLE.value,
    "ndbi": FeatureProvenance.UNAVAILABLE.value,
    "ndbi_proxy": FeatureProvenance.UNAVAILABLE.value,
    "modis_lst_celsius": FeatureProvenance.SATELLITE_DERIVED.value,
    "thermal_anomaly_celsius": FeatureProvenance.SATELLITE_DERIVED.value,
    "lst_sampling_mode": FeatureProvenance.GIS_DERIVED.value,
    "built_up_fraction": FeatureProvenance.PROXY_ESTIMATE.value,
    "open_space_fraction": FeatureProvenance.PROXY_ESTIMATE.value,
    "nearest_cpcb_station_id": FeatureProvenance.DIRECTLY_OBSERVED.value,
    "nearest_cpcb_station_name": FeatureProvenance.DIRECTLY_OBSERVED.value,
    "cpcb_distance_km": FeatureProvenance.GIS_DERIVED.value,
    "air_quality_spatial_representativeness": FeatureProvenance.GIS_DERIVED.value,
    "is_walkable": FeatureProvenance.ENGINEERING_ESTIMATE.value,
    "road_class_guideline_row_m": FeatureProvenance.ENGINEERING_ESTIMATE.value,
    "estimated_row_width_m": FeatureProvenance.ENGINEERING_ESTIMATE.value,
    "surveyed_row_width_m": FeatureProvenance.FIELD_VERIFIED.value,
    "clear_pedestrian_width_m": FeatureProvenance.FIELD_VERIFIED.value,
    "available_planting_verge_m": FeatureProvenance.FIELD_VERIFIED.value,
    "gpr_utility_survey_status": FeatureProvenance.FIELD_VERIFIED.value,
    "subsurface_utility_conflict_gpr": FeatureProvenance.FIELD_VERIFIED.value,
}


# Estimated ROW width guidelines by highway class (Indian Roads Congress / CPWD Street Design Guidelines)
IRC_ROW_GUIDELINES = {
    "pedestrian": {"min_row_m": 8.0, "walkable": True},
    "living_street": {"min_row_m": 10.0, "walkable": True},
    "residential": {"min_row_m": 12.0, "walkable": True},
    "tertiary": {"min_row_m": 18.0, "walkable": True},
    "secondary": {"min_row_m": 24.0, "walkable": True},
    "primary": {"min_row_m": 30.0, "walkable": True},
    "trunk": {"min_row_m": 45.0, "walkable": False},
}


class SegmentFeaturePipeline:
    """
    Builds the authoritative, versioned Delhi road segment feature dataset.
    """

    FEATURE_SCHEMA_VERSION = "2.1.0"

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.features_dir = self.data_dir / "features"
        self.features_dir.mkdir(parents=True, exist_ok=True)
        self.parquet_path = self.features_dir / "delhi_segment_features.parquet"
        self.geojson_path = self.features_dir / "delhi_segment_features.geojson"

        self.segmenter = CorridorSegmenter(target_length_m=75.0)
        self.sampler = ZonalStatsSampler(data_dir=self.data_dir)
        self.cpcb = CpcbAirQualityAdapter(data_dir=self.data_dir)
        self.admin = DelhiAdministrativeBoundaryAdapter(data_dir=self.data_dir)

    def extract_features_for_segment(self, segment_row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract multi-domain features for a single road segment with genuine scientific provenance.
        """
        seg_geom_4326 = segment_row["geometry"]
        seg_metric = segment_row.get("geometry_metric")
        if seg_metric is None:
            # Recreate metric line for buffer
            gs = gpd.GeoSeries([seg_geom_4326], crs="EPSG:4326").to_crs("EPSG:32643")
            seg_metric = gs.iloc[0]

        # 15m buffer around road centerline in UTM Zone 43N (metres)
        buf_metric = seg_metric.buffer(15.0)
        buf_4326 = gpd.GeoSeries([buf_metric], crs="EPSG:32643").to_crs("EPSG:4326").iloc[0]

        # 1. Vegetation features via 10m Sentinel-2
        ndvi_res = self.sampler.sample_ndvi_for_polygon(buf_4326)
        ndvi_mean = ndvi_res.get("ndvi_mean")
        ndvi_median = ndvi_res.get("ndvi_median")
        ndvi_p10 = ndvi_res.get("ndvi_p10")
        ndvi_p90 = ndvi_res.get("ndvi_p90")
        valid_ndvi_frac = ndvi_res.get("valid_pixel_count", 0) / max(1, ndvi_res.get("pixel_count", 1))

        # Scientific correction: NDMI requires SWIR Band 11 (Sentinel-2), absent from single-band NDVI composite.
        # Fictional proxy (ndvi * 0.72) is removed to maintain scientific integrity.
        ndmi_val = None
        ndmi_proxy_val = None
        ndmi_note = "UNAVAILABLE (SWIR Band 11 required; synthetic proxy disabled for scientific integrity)"

        # 2. Thermal features via 1,000m MODIS
        lst_res = self.sampler.sample_lst_for_polygon(buf_4326)
        lst_val = lst_res.get("lst_celsius")
        scene_baseline_celsius = self.sampler.get_scene_mean_lst()
        thermal_anomaly = round(float(lst_val - scene_baseline_celsius), 2) if lst_val is not None else None

        # 3. Built environment & land cover
        # Scientific correction: NDBI requires SWIR Band 11 / NIR Band 8 ratio.
        # Arbitrary linear formula is removed; proxy is explicitly disabled.
        ndbi_val = None
        ndbi_proxy_val = None
        ndbi_note = "UNAVAILABLE (SWIR/NIR ratio required; synthetic proxy disabled for scientific integrity)"

        # Estimated built-up / open-space fractions using empirical negative correlation with green canopy
        # Explicitly marked with PROXY_ESTIMATE provenance
        if ndvi_mean is not None:
            built_up_fraction = round(float(np.clip(0.85 - (ndvi_mean * 0.50), 0.10, 0.95)), 3)
            open_space_fraction = round(float(max(0.05, 1.0 - built_up_fraction)), 3)
        else:
            built_up_fraction = 0.750
            open_space_fraction = 0.250

        # 4. Air quality features via CPCB stations
        c_lat = segment_row["centroid_lat"]
        c_lon = segment_row["centroid_lon"]
        aq_match = self.cpcb.find_nearest_station(c_lat, c_lon)
        stn = aq_match["nearest_station"]

        # 5. Accessibility & physical geometry (Strict separation of guideline vs field-surveyed ROW)
        hw_class = segment_row.get("highway_class", "primary")
        irc_info = IRC_ROW_GUIDELINES.get(hw_class, {"min_row_m": 18.0, "walkable": True})
        is_walkable = irc_info["walkable"]
        guideline_row_m = irc_info["min_row_m"]

        # Field-verified parameters default to None until an accredited surveyor records empirical measurements
        surveyed_row_width_m = None
        clear_pedestrian_width_m = None
        available_planting_verge_m = None
        subsurface_utility_conflict_gpr = None

        # GPR utility survey status: UNVERIFIED by default for field integrity
        gpr_survey_status = "FIELD_GPR_REQUIRED"
        known_utility_conflict = False

        if segment_row.get("corridor_code") == "C-14":
            demo_fixture_note = "DEMO_FIXTURE_SURVEY_014_AVAILABLE_FOR_SIMULATION_ONLY"
        else:
            demo_fixture_note = "NO_HISTORICAL_SURVEY_ON_FILE"

        return {
            "segment_id": segment_row["segment_id"],
            "corridor_id": segment_row["corridor_id"],
            "corridor_code": segment_row["corridor_code"],
            "corridor_name": segment_row["corridor_name"],
            "segment_index": segment_row["segment_index"],
            "length_metres": segment_row["length_metres"],
            "start_chainage_m": segment_row["start_chainage_m"],
            "end_chainage_m": segment_row["end_chainage_m"],
            "centroid_lat": c_lat,
            "centroid_lon": c_lon,
            "district": segment_row["district"],
            "district_id": segment_row["district_id"],
            "is_boundary_edge": segment_row["is_boundary_edge"],
            "highway_class": hw_class,
            # Vegetation
            "ndvi_mean": ndvi_mean,
            "ndvi_median": ndvi_median,
            "ndvi_p10": ndvi_p10,
            "ndvi_p90": ndvi_p90,
            "ndvi_valid_pixel_fraction": round(float(valid_ndvi_frac), 4),
            "ndmi": ndmi_val,
            "ndmi_proxy": ndmi_proxy_val,
            "ndmi_status": ndmi_note,
            # Thermal
            "modis_lst_celsius": lst_val,
            "thermal_anomaly_celsius": thermal_anomaly,
            "lst_baseline_celsius": scene_baseline_celsius,
            "lst_sampling_mode": lst_res.get("sampling_mode", "UNAVAILABLE"),
            "lst_resolution_disclaimer": "MOD11A2 1,000m coarse spatial resolution; captures regional UHI, not microclimate",
            # Built environment
            "ndbi": ndbi_val,
            "ndbi_proxy": ndbi_proxy_val,
            "ndbi_status": ndbi_note,
            "built_up_fraction": built_up_fraction,
            "open_space_fraction": open_space_fraction,
            # Air quality
            "nearest_cpcb_station_id": stn["station_id"] if stn else None,
            "nearest_cpcb_station_name": stn["name"] if stn else None,
            "cpcb_distance_km": aq_match["distance_km"],
            "air_quality_spatial_representativeness": aq_match["spatial_representativeness"],
            # Physical geometry & Right-of-Way
            "is_walkable": is_walkable,
            "road_class_guideline_row_m": guideline_row_m,
            "estimated_row_width_m": guideline_row_m,  # Backwards compatibility alias
            "row_width_provenance": FeatureProvenance.ENGINEERING_ESTIMATE.value,
            "surveyed_row_width_m": surveyed_row_width_m,
            "clear_pedestrian_width_m": clear_pedestrian_width_m,
            "available_planting_verge_m": available_planting_verge_m,
            "subsurface_utility_conflict_gpr": subsurface_utility_conflict_gpr,
            "gpr_utility_survey_status": gpr_survey_status,
            "known_utility_conflict": known_utility_conflict,
            "demo_fixture_note": demo_fixture_note,
            # Metadata & Provenance
            "feature_schema_version": self.FEATURE_SCHEMA_VERSION,
            "native_ndvi_resolution": "10m",
            "native_lst_resolution": "1,000m",
            "geometry": seg_geom_4326,
            "feature_provenance": FEATURE_PROVENANCE_REGISTRY,
        }

    def generate_and_save_dataset(
        self,
        corridors_geojson: Optional[Path] = None,
        limit_corridors: Optional[int] = None,
    ) -> gpd.GeoDataFrame:
        """
        Segment corridors, extract zonal features, and save to GeoParquet and GeoJSON.
        """
        geojson_path = corridors_geojson or (self.data_dir / "delhi_roads_cached.geojson")
        segs_gdf = self.segmenter.segment_all_corridors(geojson_path)

        if limit_corridors is not None:
            unique_corrs = segs_gdf["corridor_code"].unique()[:limit_corridors]
            segs_gdf = segs_gdf[segs_gdf["corridor_code"].isin(unique_corrs)]

        feature_records = []
        for _, row in segs_gdf.iterrows():
            rec = self.extract_features_for_segment(dict(row))
            # Remove nested dict before saving to parquet/geojson column
            rec_flat = dict(rec)
            rec_flat.pop("feature_provenance", None)
            feature_records.append(rec_flat)

        features_gdf = gpd.GeoDataFrame(feature_records, geometry="geometry", crs="EPSG:4326")

        # Save to GeoParquet (requires pyarrow)
        try:
            features_gdf.to_parquet(self.parquet_path)
        except Exception:
            # Fallback for plain pandas parquet if geo-metadata wrapper fails
            df_plain = pd.DataFrame(features_gdf.drop(columns=["geometry"]))
            df_plain.to_parquet(self.parquet_path)

        # Also save lightweight GeoJSON
        try:
            features_gdf.to_file(self.geojson_path, driver="GeoJSON")
        except Exception:
            pass

        return features_gdf

    def load_feature_dataset(self) -> gpd.GeoDataFrame:
        """Load cached GeoParquet feature dataset or build if missing."""
        if self.parquet_path.exists():
            try:
                return gpd.read_parquet(self.parquet_path)
            except Exception:
                df = pd.read_parquet(self.parquet_path)
                return gpd.GeoDataFrame(df)
        return self.generate_and_save_dataset()
