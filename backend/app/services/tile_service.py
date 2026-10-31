"""
VanSetu GreenTech — Geospatial Slippy-Map XYZ Tile Service.

Renders 256x256 RGBA PNG tiles from the loaded geospatial rasters
(NDVI, LST, GDI, and high-priority corridor zones) with strict NaN transparency
and sub-tile geographic bounding-box alignment.
"""
from io import BytesIO
from typing import Tuple, Dict, Any
import math
import numpy as np
from PIL import Image
import matplotlib.cm as cm
from scipy.ndimage import zoom
from cachetools import TTLCache

from app.config import settings
from app.services.raster_service import raster_service


def _tile_xyz_to_lonlat_bounds(z: int, x: int, y: int) -> Tuple[float, float, float, float]:
    """Convert Web Mercator slippy-map tile (z, x, y) to (west, south, east, north) in EPSG:4326."""
    n = 2.0 ** z
    west = x / n * 360.0 - 180.0
    east = (x + 1) / n * 360.0 - 180.0
    lat_rad_north = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat_rad_south = math.atan(math.sinh(math.pi * (1.0 - 2.0 * (y + 1) / n)))
    north = math.degrees(lat_rad_north)
    south = math.degrees(lat_rad_south)
    return (west, south, east, north)


class TileService:
    """Service for rendering RGBA PNG map tiles from geospatial rasters."""

    def __init__(self) -> None:
        self._cache: TTLCache = TTLCache(maxsize=2048, ttl=settings.tile_cache_ttl)
        self._transparent_tile: bytes = self._create_transparent_tile()

    def _create_transparent_tile(self) -> bytes:
        img = Image.new("RGBA", (settings.tile_size, settings.tile_size), (0, 0, 0, 0))
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def get_tile(self, layer: str, z: int, x: int, y: int) -> bytes:
        """Render or fetch cached 256x256 PNG tile for (layer, z, x, y)."""
        layer_key = layer.lower()
        if layer_key not in ("ndvi", "lst", "gdi", "corridors"):
            raise ValueError(f"Unsupported tile layer '{layer}'. Valid: ndvi, lst, gdi, corridors")

        cache_key = (layer_key, z, x, y)
        if cache_key in self._cache:
            return self._cache[cache_key]

        raster_service.load_data()
        r_west, r_south, r_east, r_north = raster_service.bounds
        t_west, t_south, t_east, t_north = _tile_xyz_to_lonlat_bounds(z, x, y)

        # Return transparent tile if no spatial intersection
        if t_east <= r_west or t_west >= r_east or t_north <= r_south or t_south >= r_north:
            return self._transparent_tile

        arr = raster_service.gdi if layer_key == "corridors" else raster_service.get_layer(layer_key)
        transform = raster_service.transform
        h_ras, w_ras = arr.shape

        # Compute intersection box in geographic coordinates
        ix_west = max(t_west, r_west)
        ix_east = min(t_east, r_east)
        ix_south = max(t_south, r_south)
        ix_north = min(t_north, r_north)

        if ix_east <= ix_west or ix_north <= ix_south:
            return self._transparent_tile

        # Map intersection to raster pixel indices
        col_start = max(0, int((ix_west - transform.c) / transform.a))
        col_end = min(w_ras, int(math.ceil((ix_east - transform.c) / transform.a)))
        row_start = max(0, int((ix_north - transform.f) / transform.e))
        row_end = min(h_ras, int(math.ceil((ix_south - transform.f) / transform.e)))

        if col_end <= col_start or row_end <= row_start:
            return self._transparent_tile

        sub = arr[row_start:row_end, col_start:col_end]
        if sub.size == 0 or np.all(np.isnan(sub)):
            return self._transparent_tile

        # Map intersection onto the 256x256 output tile canvas
        tile_sz = settings.tile_size
        px_left = max(0, int(round((ix_west - t_west) / (t_east - t_west) * tile_sz)))
        px_right = min(tile_sz, int(round((ix_east - t_west) / (t_east - t_west) * tile_sz)))
        px_top = max(0, int(round((t_north - ix_north) / (t_north - t_south) * tile_sz)))
        px_bottom = min(tile_sz, int(round((t_north - ix_south) / (t_north - t_south) * tile_sz)))

        target_w = max(1, px_right - px_left)
        target_h = max(1, px_bottom - px_top)

        # Resample slice to target sub-tile dimensions using nearest-neighbor for NaN mask
        nan_mask = np.isnan(sub)
        filled = np.where(nan_mask, float(np.nanmean(sub)), sub)
        zy = target_h / sub.shape[0]
        zx = target_w / sub.shape[1]
        resized_vals = zoom(filled, (zy, zx), order=1)[:target_h, :target_w]
        resized_nan = zoom(nan_mask.astype(np.uint8), (zy, zx), order=0)[:target_h, :target_w] > 0

        rgba_sub = self._apply_colormap(layer_key, resized_vals, resized_nan)

        canvas = np.zeros((tile_sz, tile_sz, 4), dtype=np.uint8)
        canvas[px_top : px_top + target_h, px_left : px_left + target_w] = rgba_sub

        img = Image.fromarray(canvas, mode="RGBA")
        buf = BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()
        self._cache[cache_key] = png_bytes
        return png_bytes

    def _apply_colormap(
        self, layer: str, data: np.ndarray, nan_mask: np.ndarray
    ) -> np.ndarray:
        """Normalize layer values and map to RGBA uint8 array, keeping NaNs transparent."""
        if layer == "ndvi":
            norm = np.clip((data - (-0.1)) / (0.75 - (-0.1)), 0.0, 1.0)
            cmap = cm.get_cmap("YlGn")
            rgba = (cmap(norm) * 255).astype(np.uint8)
            rgba[..., 3] = 185
        elif layer == "lst":
            stats = raster_service.stats.get("lst", {})
            p10 = stats.get("p10") or 23.5
            p90 = stats.get("p90") or 28.2
            norm = np.clip((data - (p10 - 0.5)) / max((p90 + 0.5) - (p10 - 0.5), 1.0), 0.0, 1.0)
            cmap = cm.get_cmap("inferno")
            rgba = (cmap(norm) * 255).astype(np.uint8)
            rgba[..., 3] = 185
        elif layer == "gdi":
            norm = np.clip(data, 0.0, 1.0)
            cmap = cm.get_cmap("RdYlGn_r")
            rgba = (cmap(norm) * 255).astype(np.uint8)
            rgba[..., 3] = 185
        else:
            # corridors hotspot raster layer
            thresh = 0.62
            norm = np.clip((data - thresh) / (1.0 - thresh), 0.0, 1.0)
            cmap = cm.get_cmap("magma")
            rgba = (cmap(norm) * 255).astype(np.uint8)
            rgba[..., 3] = np.where(data >= thresh, 200, 0).astype(np.uint8)

        rgba[nan_mask, 3] = 0
        return rgba

    def get_legend(self, layer: str) -> Dict[str, Any]:
        """Return color ramp legend and scientific metadata for a raster layer."""
        key = layer.lower()
        legends = {
            "ndvi": {
                "layer": "ndvi",
                "title": "Sentinel-2 Vegetation Index (NDVI)",
                "unit": "Index [-0.2 to 0.8]",
                "native_resolution": "10m (Sentinel-2 MSI)",
                "display_resolution": "10m",
                "stops": [
                    {"value": -0.1, "color": "#ffffe5", "label": "Barren / Impervious (<0.0)"},
                    {"value": 0.2, "color": "#d9f0a3", "label": "Sparse Scrub (0.2)"},
                    {"value": 0.4, "color": "#78c679", "label": "Moderate Canopy (0.4)"},
                    {"value": 0.7, "color": "#005a32", "label": "Dense Forest Canopy (>0.65)"},
                ],
            },
            "lst": {
                "layer": "lst",
                "title": "MODIS Land Surface Temperature (LST)",
                "unit": "°C (Daytime Seasonal Mean)",
                "native_resolution": "1,000m (1km MODIS MOD11A1)",
                "display_resolution": "10m (Bilinear display alignment only)",
                "stops": [
                    {"value": 23.0, "color": "#1b0c41", "label": "Cool CanopySink (~23°C)"},
                    {"value": 25.0, "color": "#721f81", "label": "Moderate Urban (~25°C)"},
                    {"value": 26.8, "color": "#f1605d", "label": "Elevated Surface Heat (~27°C)"},
                    {"value": 28.8, "color": "#fcffa4", "label": "Severe Thermal Hotspot (>28.5°C)"},
                ],
            },
            "gdi": {
                "layer": "gdi",
                "title": "Green Deficit & Heat Vulnerability Index (GDI)",
                "unit": "Composite Score [0.0 to 1.0]",
                "native_resolution": "1,000m thermal / 10m vegetation",
                "display_resolution": "10m",
                "stops": [
                    {"value": 0.2, "color": "#1a9850", "label": "Low Deficit (Well Buffered)"},
                    {"value": 0.45, "color": "#fee08b", "label": "Moderate Deficit"},
                    {"value": 0.65, "color": "#f46d43", "label": "High Green & Thermal Stress"},
                    {"value": 0.85, "color": "#a50026", "label": "Critical Intervention Zone"},
                ],
            },
            "corridors": {
                "layer": "corridors",
                "title": "Raster Priority Corridor Hotspots",
                "unit": "GDI >= 0.62",
                "native_resolution": "100m aggregated",
                "display_resolution": "10m",
                "stops": [
                    {"value": 0.62, "color": "#721f81", "label": "Priority Threshold (0.62)"},
                    {"value": 0.85, "color": "#fcfdbf", "label": "Peak Corridor Core (>0.85)"},
                ],
            },
        }
        if key not in legends:
            raise ValueError(f"Unknown layer '{layer}'")
        return legends[key]


tile_service = TileService()
