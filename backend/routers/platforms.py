"""GET /api/platforms — the catalogue the UI renders and detects against."""

from __future__ import annotations

from fastapi import APIRouter

from models import PlatformCatalogue, PlatformInfo
from services import detector

router = APIRouter(prefix="/api", tags=["platforms"])


@router.get("/platforms", response_model=PlatformCatalogue, summary="Supported platforms")
async def list_platforms() -> PlatformCatalogue:
    return PlatformCatalogue(
        platforms=[PlatformInfo(**detector.as_dict(p)) for p in detector.PLATFORMS]
    )
