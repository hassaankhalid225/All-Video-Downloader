"""POST /api/metadata — everything the preview card needs.

Note: no ``from __future__ import annotations`` here. slowapi's ``@limiter.limit``
wrapper is defined in its own module, so FastAPI would resolve string annotations
against *slowapi's* globals and silently downgrade the body model to a query param.
"""

import logging

from fastapi import APIRouter, Request, Response

from middleware.rate_limit import METADATA_LIMIT, limiter
from models import MetadataRequest, VideoMetadata
from services import detector, downloader
from utils.errors import UnsupportedPlatformError
from utils.validators import normalize_url

log = logging.getLogger("alldown.metadata")

router = APIRouter(prefix="/api", tags=["metadata"])


@router.post(
    "/metadata",
    response_model=VideoMetadata,
    summary="Extract video metadata and available formats",
)
@limiter.limit(METADATA_LIMIT)
async def read_metadata(
    request: Request, response: Response, body: MetadataRequest
) -> VideoMetadata:
    # `response` is unused here but required: slowapi writes the X-RateLimit-* headers
    # onto it, and FastAPI merges them into the final response.
    url = normalize_url(body.url)

    platform = detector.detect(url)
    if platform is None:
        # Distinguish "we don't know this site" from "we know it, but that link is not a
        # post". The second is far more common and deserves a better message.
        host_match = detector.detect_host_only(url)
        if host_match is not None:
            raise UnsupportedPlatformError(
                f"That {host_match.name} link doesn't point at a video. "
                f"Open the {host_match.content_types[0].lower().rstrip('s')} and copy its link"
            )
        # Not in our catalogue — yt-dlp may still handle it, so let extraction decide.

    # Deliberately not logging the URL: it is the user's private activity.
    log.info("metadata request platform=%s", platform.id if platform else "unknown")
    return await downloader.get_metadata(url)
