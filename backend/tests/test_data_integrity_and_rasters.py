"""
Tests for Geospatial Raster Processing & Scientific Data Integrity (Section 6 & 7).
"""
import numpy as np
from app.services.raster_service import raster_service
from app.services.aqi_service import aqi_service


def test_raster_native_vs_display_resolution_preserved():
    """Verify Sentinel-2 10m and MODIS 1,000m native grids are both preserved."""
    raster_service.load_data()
    # Sentinel-2 10m native shape
    assert raster_service.ndvi.shape == (5572, 7794)
    # MODIS 1,000m native shape MUST be preserved un-interpolated
    assert raster_service.lst_native.shape == (57, 79)
    # Display-aligned LST grid matches 10m NDVI shape for overlay alignment
    assert raster_service.lst.shape == (5572, 7794)
    assert raster_service.gdi.shape == (5572, 7794)

    stats = raster_service.stats
    assert stats["ndvi"]["native_resolution_m"] == 10.0
    assert stats["lst"]["native_resolution_m"] == 1000.0
    assert stats["lst"]["display_resolution_m"] == 10.0
    assert stats["lst"]["native_shape"] == [57, 79]
    assert stats["lst"]["display_shape"] == [5572, 7794]


def test_crs_validation_epsg_4326():
    """Verify Coordinate Reference Systems are validated as EPSG:4326."""
    raster_service.load_data()
    assert raster_service.crs.to_epsg() == 4326
    assert raster_service.stats["crs"]["validated_epsg_4326"] is True


def test_nodata_handling_never_coerced_to_zero():
    """Verify NaN/nodata pixels in NDVI remain NaN in GDI and are never treated as 0."""
    raster_service.load_data()
    ndvi_nan_mask = np.isnan(raster_service.ndvi)
    nan_count = int(np.sum(ndvi_nan_mask))
    assert nan_count > 0, "Expected nodata/NaN border pixels in Sentinel-2 NDVI raster"

    # Wherever NDVI is NaN, GDI must also be NaN (never silently 0.0)
    gdi_at_ndvi_nan = raster_service.gdi[ndvi_nan_mask]
    assert np.all(np.isnan(gdi_at_ndvi_nan))


def test_point_query_returns_both_native_1km_and_display_10m_lst():
    """Verify point queries return both un-interpolated 1km MODIS LST and 10m display LST."""
    pt = raster_service.get_values_at_point(28.6289, 77.2405)  # ITO Central Delhi
    assert pt["in_bounds"] is True
    assert pt["ndvi"] is not None
    assert pt["lst_native_1km"] is not None
    assert pt["lst_display_10m"] is not None
    assert pt["gdi"] is not None
    assert pt["resolution_metadata"]["lst_native_resolution_m"] == 1000.0
    assert pt["resolution_metadata"]["ndvi_native_resolution_m"] == 10.0

    # Out of bounds point returns None (not 0)
    out_pt = raster_service.get_values_at_point(19.0760, 72.8777)
    assert out_pt["in_bounds"] is False
    assert out_pt["ndvi"] is None
    assert out_pt["lst_native_1km"] is None
    assert out_pt["gdi"] is None


def test_aqi_provenance_never_claims_fallback_is_live():
    """Verify AQI baseline explicitly reports is_live=False and historical_reference_baseline when no token is set."""
    summary = aqi_service.get_summary()
    assert summary["station_count"] == 8
    if not summary["is_live"]:
        assert summary["data_mode"] == "historical_reference_baseline"
        assert "never represented as live" in summary["provenance_disclosure"].lower()
        for st in summary["stations"]:
            assert st["is_live"] is False
            assert st["data_mode"] == "historical_reference_baseline"
