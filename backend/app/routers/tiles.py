"""
VanSetu GreenTech — Slippy-Map XYZ Raster Tile Router.
"""
from fastapi import APIRouter, HTTPException, Response
from app.services.tile_service import tile_service

router = APIRouter(prefix="/api/tiles", tags=["Raster Map Tiles"])


@router.get("/{layer}/{z}/{x}/{y}.png")
def get_raster_tile(layer: str, z: int, x: int, y: int):
    """Serve a 256x256 RGBA PNG slippy-map tile for ndvi, lst, gdi, or corridors."""
    if z < 0 or z > 20:
        raise HTTPException(status_code=400, detail="Zoom level z must be in [0, 20].")
    try:
        png_bytes = tile_service.get_tile(layer, z, x, y)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/{layer}/legend")
def get_layer_legend(layer: str):
    """Return color ramp stops and native vs display resolution notes for a tile layer."""
    try:
        return tile_service.get_legend(layer)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
