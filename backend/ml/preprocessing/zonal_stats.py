"""
VanSetu GreenTech — Zonal Statistics Raster Sampler (Phase 3A).

Performs accurate polygon zonal statistics over road segment buffers using Rasterio.
Calculates pixel counts, valid pixel fractions, NoData percentages, and distributions
without fabricating resolutions or inventing values.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import numpy as np
import rasterio
from rasterio.mask import mask
from shapely.geometry import mapping


class ZonalStatsSampler:
    """Extracts genuine zonal distributions from local GeoTIFF rasters."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir or (Path(__file__).parent.parent.parent / "data")
        self.ndvi_path = self.data_dir / "delhi_ndvi_10m.tif"
        self.lst_path = self.data_dir / "delhi_lst_modis_daily_celsius.tif"

    def sample_ndvi_for_polygon(self, polygon_geom_4326: Any) -> Dict[str, Any]:
        """
        Sample 10m Sentinel-2 NDVI raster over the segment polygon buffer.
        """
        if not self.ndvi_path.exists():
            return {
                "available": False,
                "status": "DATA_UNAVAILABLE",
                "native_resolution": "10m",
            }

        try:
            with rasterio.open(self.ndvi_path) as src:
                geojson_geom = [mapping(polygon_geom_4326)]
                out_image, out_transform = mask(src, geojson_geom, crop=True, nodata=-9999.0)
                data = out_image[0]

                # Filter valid pixels (NDVI valid between -1.0 and 1.0)
                valid_mask = (data != -9999.0) & (~np.isnan(data)) & (data >= -1.0) & (data <= 1.0)
                total_pixels = int(data.size)
                valid_pixels = int(np.sum(valid_mask))

                if valid_pixels == 0:
                    return {
                        "available": True,
                        "pixel_count": total_pixels,
                        "valid_pixel_count": 0,
                        "nodata_fraction": 1.0,
                        "ndvi_mean": None,
                        "ndvi_median": None,
                        "ndvi_p10": None,
                        "ndvi_p90": None,
                        "native_resolution": "10m",
                    }

                vals = data[valid_mask]
                return {
                    "available": True,
                    "pixel_count": total_pixels,
                    "valid_pixel_count": valid_pixels,
                    "nodata_fraction": round(float((total_pixels - valid_pixels) / total_pixels), 4),
                    "ndvi_mean": round(float(np.mean(vals)), 4),
                    "ndvi_median": round(float(np.median(vals)), 4),
                    "ndvi_p10": round(float(np.percentile(vals, 10)), 4),
                    "ndvi_p90": round(float(np.percentile(vals, 90)), 4),
                    "ndvi_min": round(float(np.min(vals)), 4),
                    "ndvi_max": round(float(np.max(vals)), 4),
                    "native_resolution": "10m (Sentinel-2 L2A)",
                }
        except Exception as exc:
            return {
                "available": False,
                "status": "SAMPLING_ERROR",
                "error": str(exc),
                "native_resolution": "10m",
            }

    def sample_lst_for_polygon(self, polygon_geom_4326: Any) -> Dict[str, Any]:
        """
        Sample 1,000m MODIS Land Surface Temperature raster over the segment buffer.
        Discloses coarse spatial resolution honestly.
        """
        if not self.lst_path.exists():
            return {
                "available": False,
                "status": "DATA_UNAVAILABLE",
                "native_resolution": "1,000m (MODIS native grid)",
            }

        try:
            with rasterio.open(self.lst_path) as src:
                geojson_geom = [mapping(polygon_geom_4326)]
                out_image, out_transform = mask(src, geojson_geom, crop=True, nodata=-9999.0)
                data = out_image[0]

                # Filter valid terrestrial LST values (realistic Delhi 10°C to 60°C)
                valid_mask = (data != -9999.0) & (~np.isnan(data)) & (data > 0.0) & (data < 70.0)
                total_pixels = int(data.size)
                valid_pixels = int(np.sum(valid_mask))

                if valid_pixels == 0:
                    # Fallback to centroid point sampling if polygon is smaller than 1km pixel
                    centroid = polygon_geom_4326.centroid
                    coords = [(centroid.x, centroid.y)]
                    sample_gen = src.sample(coords)
                    pt_val = next(sample_gen)[0]
                    if pt_val > 0.0 and pt_val < 70.0:
                        return {
                            "available": True,
                            "pixel_count": 1,
                            "valid_pixel_count": 1,
                            "nodata_fraction": 0.0,
                            "lst_celsius": round(float(pt_val), 2),
                            "sampling_mode": "CENTROID_GRID_INTERSECTION",
                            "native_resolution": "1,000m (MOD11A2 native grid)",
                        }
                    return {
                        "available": True,
                        "pixel_count": total_pixels,
                        "valid_pixel_count": 0,
                        "nodata_fraction": 1.0,
                        "lst_celsius": None,
                        "native_resolution": "1,000m (MOD11A2 native grid)",
                    }

                vals = data[valid_mask]
                return {
                    "available": True,
                    "pixel_count": total_pixels,
                    "valid_pixel_count": valid_pixels,
                    "nodata_fraction": round(float((total_pixels - valid_pixels) / total_pixels), 4),
                    "lst_celsius": round(float(np.mean(vals)), 2),
                    "lst_min": round(float(np.min(vals)), 2),
                    "lst_max": round(float(np.max(vals)), 2),
                    "sampling_mode": "POLYGON_ZONAL_MASK",
                    "native_resolution": "1,000m (MOD11A2 native grid)",
                }
        except Exception as exc:
            return {
                "available": False,
                "status": "SAMPLING_ERROR",
                "error": str(exc),
                "native_resolution": "1,000m (MODIS)",
            }
