"""
VanSetu GreenTech — Geospatial Layers & Data Provenance Router.
"""
from fastapi import APIRouter, HTTPException
from app.config import DATASET_PROVENANCE
from app.services.raster_service import raster_service

router = APIRouter(prefix="/api", tags=["Geospatial Layers & Provenance"])


@router.get("/layers")
def list_layers():
    """List all geospatial layers with native vs display resolution and observation metadata."""
    raster_service.load_data()
    stats = raster_service.stats
    layers = []
    for key, prov in DATASET_PROVENANCE.items():
        layer_stat = stats.get(key, {})
        layers.append(
            {
                **prov,
                "statistics": layer_stat,
            }
        )
    return {
        "count": len(layers),
        "bounds": stats.get("bounds"),
        "crs": stats.get("crs"),
        "layers": layers,
    }


@router.get("/layers/{layer_id}/metadata")
def get_layer_metadata(layer_id: str):
    """Get detailed scientific provenance and resolution metadata for a specific layer."""
    key = layer_id.strip().lower()
    if key not in DATASET_PROVENANCE:
        raise HTTPException(
            status_code=404,
            detail=f"Layer '{layer_id}' not found. Available layers: {list(DATASET_PROVENANCE.keys())}",
        )
    raster_service.load_data()
    return {
        **DATASET_PROVENANCE[key],
        "statistics": raster_service.stats.get(key),
        "bounds": raster_service.stats.get("bounds"),
    }


@router.get("/provenance")
def get_full_provenance():
    """Return the complete scientific data provenance and integrity registry."""
    raster_service.load_data()
    return {
        "scientific_integrity_policy": {
            "preserve_native_resolution": True,
            "missing_data_never_zero": True,
            "crs_validated_epsg_4326": True,
            "live_vs_historical_explicitly_labeled": True,
            "no_fabricated_climate_claims": True,
        },
        "native_shapes": raster_service.stats.get("native_shapes"),
        "display_shape": raster_service.stats.get("shape"),
        "datasets": DATASET_PROVENANCE,
    }
