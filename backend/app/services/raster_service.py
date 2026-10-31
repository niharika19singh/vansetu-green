"""
VanSetu GreenTech — Geospatial Raster Processing Service.

Handles loading, CRS validation, nodata masking, native-vs-display resolution
preservation, Green Deficit Index (GDI) computation, and spatial queries
for Sentinel-2 NDVI (10m native) and MODIS Terra LST (1,000m native).
"""
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
import logging
import numpy as np
import rasterio
from rasterio.crs import CRS
from scipy.ndimage import zoom

from app.config import settings, DATASET_PROVENANCE

logger = logging.getLogger(__name__)

EXPECTED_CRS = CRS.from_epsg(4326)


class RasterService:
    """
    Service for loading, validating, and querying geospatial raster datasets.

    Scientific Integrity Guarantees:
    1. Preserves native MODIS LST array (57x79, ~1,000m) alongside the
       bilinearly resampled display array (5572x7794, ~10m).
    2. Validates Coordinate Reference Systems (EPSG:4326) upon ingestion.
    3. Converts file nodata and sentinel values (<= -9999) to IEEE 754 NaN;
       never silently coerces missing pixels to 0.0.
    """

    def __init__(self) -> None:
        self._ndvi_data: Optional[np.ndarray] = None
        self._lst_native_data: Optional[np.ndarray] = None
        self._lst_display_data: Optional[np.ndarray] = None
        self._gdi_data: Optional[np.ndarray] = None

        self._ndvi_meta: Optional[ dict] = None
        self._lst_native_meta: Optional[dict] = None

        self._bounds: Optional[Tuple[float, float, float, float]] = None
        self._lst_native_bounds: Optional[Tuple[float, float, float, float]] = None

        self._transform: Optional[rasterio.Affine] = None
        self._lst_native_transform: Optional[rasterio.Affine] = None

        self._crs: Optional[CRS] = None
        self._lst_native_crs: Optional[CRS] = None

        self._stats: Dict[str, Any] = {}
        self._loaded: bool = False

    def load_data(self) -> None:
        """Load NDVI and LST GeoTIFFs, validate CRS, mask nodata, and compute GDI."""
        if self._loaded:
            return

        logger.info("Loading NDVI raster from %s", settings.ndvi_path)
        self._ndvi_data, self._ndvi_meta, self._bounds, self._transform, self._crs = (
            self._load_geotiff(settings.ndvi_path, valid_min=-1.0, valid_max=1.0)
        )

        logger.info("Loading LST raster from %s", settings.lst_path)
        (
            self._lst_native_data,
            self._lst_native_meta,
            self._lst_native_bounds,
            self._lst_native_transform,
            self._lst_native_crs,
        ) = self._load_geotiff(settings.lst_path, valid_min=-50.0, valid_max=80.0)

        # Preserve native LST (1km, 57x79) and create aligned display grid (10m, 5572x7794)
        if self._ndvi_data.shape != self._lst_native_data.shape:
            logger.info(
                "Preserving native LST grid %s (1,000m) and generating display-aligned grid %s (10m)",
                self._lst_native_data.shape,
                self._ndvi_data.shape,
            )
            self._lst_display_data = self._resample_to_match_nan_safe(
                self._lst_native_data, self._ndvi_data.shape
            )
        else:
            self._lst_display_data = self._lst_native_data.copy()

        # Compute Green Deficit Index (GDI) with strict NaN propagation
        logger.info("Computing Green Deficit Index (GDI)...")
        self._gdi_data = self._compute_gdi(self._ndvi_data, self._lst_display_data)

        self._compute_statistics()
        self._loaded = True
        logger.info("Geospatial raster pipeline initialized and verified.")

    def _ensure_asset_from_do_spaces(self, path: Path) -> None:
        """If local raster is missing and DigitalOcean Spaces is configured, fetch from DO Spaces."""
        if path.exists():
            return
        if not settings.do_spaces_endpoint or not settings.do_spaces_bucket:
            return
        try:
            import httpx

            endpoint = settings.do_spaces_endpoint.rstrip("/")
            url = f"{endpoint}/{settings.do_spaces_bucket}/rasters/{path.name}"
            logger.info("Fetching geospatial raster %s from DigitalOcean Spaces (%s)...", path.name, url)
            path.parent.mkdir(parents=True, exist_ok=True)
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(url)
                if resp.status_code == 200 and len(resp.content) > 1024:
                    path.write_bytes(resp.content)
                    logger.info("Downloaded %s (%d bytes) from DigitalOcean Spaces.", path.name, len(resp.content))
        except Exception as exc:
            logger.warning("DigitalOcean Spaces fallback download failed for %s: %s", path.name, exc)

    def _load_geotiff(
        self,
        path: Path,
        valid_min: float = -1e6,
        valid_max: float = 1e6,
    ) -> Tuple[np.ndarray, dict, Tuple[float, float, float, float], rasterio.Affine, CRS]:
        """Load a GeoTIFF, validate its CRS, and convert nodata/out-of-range pixels to NaN."""
        if not path.exists():
            self._ensure_asset_from_do_spaces(path)
        if not path.exists():
            raise FileNotFoundError(f"Geospatial raster file not found: {path}")

        with rasterio.open(path) as src:
            if src.crs is None:
                raise ValueError(f"Raster {path.name} is missing a Coordinate Reference System (CRS).")

            # Validate EPSG:4326 geographic CRS
            if src.crs != EXPECTED_CRS and src.crs.to_epsg() != 4326:
                raise ValueError(
                    f"Raster {path.name} has CRS {src.crs}, expected EPSG:4326 (WGS84)."
                )

            raw = src.read(1).astype(np.float32)
            nodata_val = src.nodata
            meta = src.meta.copy()
            bounds = (src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top)
            transform = src.transform
            crs = src.crs

        # Mask explicit nodata value, sentinel values (<= -9999), and physical out-of-range artifacts
        if nodata_val is not None and not np.isnan(nodata_val):
            raw[np.isclose(raw, float(nodata_val), rtol=1e-5)] = np.nan

        raw[raw <= -9999.0] = np.nan
        raw[(raw < valid_min) | (raw > valid_max)] = np.nan

        return raw, meta, bounds, transform, crs

    def _resample_to_match_nan_safe(
        self, source: np.ndarray, target_shape: Tuple[int, int]
    ) -> np.ndarray:
        """
        Resample a coarse 2D array to target_shape using normalized bilinear convolution
        so that NaN pixels do not corrupt neighboring valid pixels or turn into zeros.
        """
        zoom_factors = (
            target_shape[0] / source.shape[0],
            target_shape[1] / source.shape[1],
        )
        nan_mask = np.isnan(source)
        if not np.any(nan_mask):
            return zoom(source, zoom_factors, order=1).astype(np.float32)

        # Normalized convolution for NaN-aware bilinear interpolation
        filled = np.where(nan_mask, 0.0, source).astype(np.float32)
        weights = (~nan_mask).astype(np.float32)

        upsampled_vals = zoom(filled, zoom_factors, order=1)
        upsampled_weights = zoom(weights, zoom_factors, order=1)

        with np.errstate(invalid="ignore", divide="ignore"):
            result = np.where(
                upsampled_weights > 1e-3,
                upsampled_vals / upsampled_weights,
                np.nan,
            )
        return result.astype(np.float32)

    def _compute_gdi(self, ndvi: np.ndarray, lst: np.ndarray) -> np.ndarray:
        """
        Compute composite Green Deficit Index (GDI) in [0, 1].
        Pixels where either NDVI or LST is NaN remain NaN (never 0).
        """
        valid_mask = (~np.isnan(ndvi)) & (~np.isnan(lst))
        gdi = np.full(ndvi.shape, np.nan, dtype=np.float32)
        if not np.any(valid_mask):
            return gdi

        # Normalize NDVI to [0, 1] using physical bounds [-0.2, 0.8]
        ndvi_Range = settings.ndvi_max - settings.ndvi_min
        ndvi_norm = np.clip((ndvi - settings.ndvi_min) / ndvi_Range, 0.0, 1.0)
        green_deficit = 1.0 - ndvi_norm

        # Normalize LST using robust city-wide percentiles (P2 to P98)
        valid_lst = lst[valid_mask]
        lst_low = float(np.percentile(valid_lst, settings.lst_percentile_low))
        lst_high = float(np.percentile(valid_lst, settings.lst_percentile_high))
        lst_span = max(lst_high - lst_low, 1e-5)
        lst_norm = np.clip((lst - lst_low) / lst_span, 0.0, 1.0)

        combined = settings.lst_weight * lst_norm + settings.ndvi_weight * green_deficit
        gdi[valid_mask] = np.clip(combined[valid_mask], 0.0, 1.0).astype(np.float32)
        return gdi

    def _compute_statistics(self) -> None:
        """Compute summary statistics for native and display rasters, excluding NaNs."""
        def _layer_stats(arr: np.ndarray, native_shape: Tuple[int, int], display_shape: Tuple[int, int], native_res_m: float, display_res_m: float) -> Dict[str, Any]:
            valid = arr[~np.isnan(arr)]
            total_pixels = int(arr.size)
            valid_pixels = int(valid.size)
            nodata_pixels = total_pixels - valid_pixels
            return {
                "min": float(np.min(valid)) if valid_pixels else None,
                "max": float(np.max(valid)) if valid_pixels else None,
                "mean": float(np.mean(valid)) if valid_pixels else None,
                "std": float(np.std(valid)) if valid_pixels else None,
                "p10": float(np.percentile(valid, 10)) if valid_pixels else None,
                "p25": float(np.percentile(valid, 25)) if valid_pixels else None,
                "p50": float(np.percentile(valid, 50)) if valid_pixels else None,
                "p75": float(np.percentile(valid, 75)) if valid_pixels else None,
                "p90": float(np.percentile(valid, 90)) if valid_pixels else None,
                "native_shape": list(native_shape),
                "display_shape": list(display_shape),
                "native_resolution_m": native_res_m,
                "display_resolution_m": display_res_m,
                "valid_pixel_count": valid_pixels,
                "nodata_pixel_count": nodata_pixels,
                "nodata_fraction": round(nodata_pixels / max(total_pixels, 1), 6),
                "crs": str(self._crs),
            }

        self._stats = {
            "ndvi": _layer_stats(
                self._ndvi_data,
                native_shape=self._ndvi_data.shape,
                display_shape=self._ndvi_data.shape,
                native_res_m=10.0,
                display_res_m=10.0,
            ),
            # Primary LST stats computed on the true native 1km array (57x79)
            "lst": {
                **_layer_stats(
                    self._lst_native_data,
                    native_shape=self._lst_native_data.shape,
                    display_shape=self._lst_display_data.shape,
                    native_res_m=1000.0,
                    display_res_m=10.0,
                ),
                "display_grid_mean": float(np.nanmean(self._lst_display_data)),
                "resampling_method": "bilinear_for_display_alignment_only",
            },
            "gdi": _layer_stats(
                self._gdi_data,
                native_shape=self._lst_native_data.shape,
                display_shape=self._gdi_data.shape,
                native_res_m=1000.0,
                display_res_m=10.0,
            ),
            "bounds": {
                "west": self._bounds[0],
                "south": self._bounds[1],
                "east": self._bounds[2],
                "north": self._bounds[3],
                "center": [
                    round((self._bounds[1] + self._bounds[3]) / 2.0, 6),
                    round((self._bounds[0] + self._bounds[2]) / 2.0, 6),
                ],
            },
            "shape": list(self._ndvi_data.shape),
            "native_shapes": {
                "ndvi": list(self._ndvi_data.shape),
                "lst": list(self._lst_native_data.shape),
            },
            "crs": {
                "ndvi": str(self._crs),
                "lst": str(self._lst_native_crs),
                "validated_epsg_4326": True,
            },
            "provenance": DATASET_PROVENANCE,
        }

    @property
    def ndvi(self) -> np.ndarray:
        self._ensure_loaded()
        return self._ndvi_data

    @property
    def lst(self) -> np.ndarray:
        """Display-aligned LST grid (matches NDVI shape for tile rendering & composite slicing)."""
        self._ensure_loaded()
        return self._lst_display_data

    @property
    def lst_native(self) -> np.ndarray:
        """True native 1,000m MODIS LST grid (57x79)."""
        self._ensure_loaded()
        return self._lst_native_data

    @property
    def gdi(self) -> np.ndarray:
        self._ensure_loaded()
        return self._gdi_data

    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        self._ensure_loaded()
        return self._bounds

    @property
    def transform(self) -> rasterio.Affine:
        self._ensure_loaded()
        return self._transform

    @property
    def lst_native_transform(self) -> rasterio.Affine:
        self._ensure_loaded()
        return self._lst_native_transform

    @property
    def crs(self) -> CRS:
        self._ensure_loaded()
        return self._crs

    @property
    def stats(self) -> Dict[str, Any]:
        self._ensure_loaded()
        return self._stats

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load_data()

    def get_layer(self, layer_name: str) -> np.ndarray:
        """Get raster array by name ('ndvi', 'lst', 'lst_native', 'gdi')."""
        self._ensure_loaded()
        key = layer_name.lower()
        layers = {
            "ndvi": self._ndvi_data,
            "lst": self._lst_display_data,
            "lst_native": self._lst_native_data,
            "gdi": self._gdi_data,
        }
        if key not in layers:
            raise ValueError(f"Unknown raster layer: {layer_name}. Available: {list(layers.keys())}")
        return layers[key]

    def get_values_at_point(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Sample raster values at a geographic coordinate (lat, lng in EPSG:4326).

        Returns both:
        - `lst_native_1km`: Un-interpolated 1,000m native MODIS pixel value.
        - `lst_display_10m` / `lst`: Bilinearly resampled 10m display value.
        - `ndvi`: 10m native Sentinel-2 NDVI value.
        - `gdi`: Composite Green Deficit Index value.
        """
        self._ensure_loaded()

        # Check display grid bounds
        in_display_bounds = (
            self._bounds[0] <= lng <= self._bounds[2]
            and self._bounds[1] <= lat <= self._bounds[3]
        )
        if not in_display_bounds:
            return {
                "lat": lat,
                "lng": lng,
                "in_bounds": False,
                "ndvi": None,
                "lst": None,
                "lst_native_1km": None,
                "lst_display_10m": None,
                "gdi": None,
            }

        # 10m grid index (NDVI, display LST, GDI)
        col_10m = int((lng - self._transform.c) / self._transform.a)
        row_10m = int((lat - self._transform.f) / self._transform.e)

        ndvi_val: Optional[float] = None
        lst_display_val: Optional[float] = None
        gdi_val: Optional[float] = None

        if 0 <= row_10m < self._ndvi_data.shape[0] and 0 <= col_10m < self._ndvi_data.shape[1]:
            v_ndvi = self._ndvi_data[row_10m, col_10m]
            v_lst_disp = self._lst_display_data[row_10m, col_10m]
            v_gdi = self._gdi_data[row_10m, col_10m]
            ndvi_val = None if np.isnan(v_ndvi) else round(float(v_ndvi), 4)
            lst_display_val = None if np.isnan(v_lst_disp) else round(float(v_lst_disp), 2)
            gdi_val = None if np.isnan(v_gdi) else round(float(v_gdi), 4)

        # Native 1,000m MODIS grid index (57x79)
        col_1km = int((lng - self._lst_native_transform.c) / self._lst_native_transform.a)
        row_1km = int((lat - self._lst_native_transform.f) / self._lst_native_transform.e)
        lst_native_val: Optional[float] = None
        if (
            0 <= row_1km < self._lst_native_data.shape[0]
            and 0 <= col_1km < self._lst_native_data.shape[1]
        ):
            v_lst_nat = self._lst_native_data[row_1km, col_1km]
            lst_native_val = None if np.isnan(v_lst_nat) else round(float(v_lst_nat), 2)

        return {
            "lat": lat,
            "lng": lng,
            "in_bounds": True,
            "ndvi": ndvi_val,
            "lst": lst_display_val if lst_display_val is not None else lst_native_val,
            "lst_native_1km": lst_native_val,
            "lst_display_10m": lst_display_val,
            "gdi": gdi_val,
            "nodata_flags": {
                "ndvi_is_nodata": ndvi_val is None,
                "lst_native_is_nodata": lst_native_val is None,
                "gdi_is_nodata": gdi_val is None,
            },
            "resolution_metadata": {
                "ndvi_native_resolution_m": 10.0,
                "lst_native_resolution_m": 1000.0,
                "lst_display_resolution_m": 10.0,
                "lst_resampling_method": "bilinear_interpolation_for_display_alignment",
                "native_pixel_indices": {"row_1km": row_1km, "col_1km": col_1km},
                "display_pixel_indices": {"row_10m": row_10m, "col_10m": col_10m},
            },
        }


raster_service = RasterService()
