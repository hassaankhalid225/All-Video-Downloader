"""GET /api/health — Railway's healthcheck and the footer's status dot."""

from __future__ import annotations

import time

from fastapi import APIRouter

from config import VERSION
from models import HealthStatus
from services import downloader
from services.cache import metadata_cache

router = APIRouter(prefix="/api", tags=["health"])

_STARTED_AT = time.monotonic()


@router.get("/health", response_model=HealthStatus, summary="Service health")
async def health() -> HealthStatus:
    version = downloader.ytdlp_version()
    return HealthStatus(
        # Answer even when degraded, so the frontend can show an honest banner instead of
        # a network failure the user cannot interpret.
        status="ok" if version else "degraded",
        yt_dlp_version=version,
        ffmpeg=downloader.has_ffmpeg(),
        uptime=int(time.monotonic() - _STARTED_AT),
        cache_entries=metadata_cache.size,
        version=VERSION,
    )
