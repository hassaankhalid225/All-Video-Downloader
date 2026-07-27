"""POST /api/download and GET /api/file.

``/api/download`` authorises a transfer and hands back a signed, expiring URL.
``/api/file`` is the only endpoint that moves bytes.

Note: no ``from __future__ import annotations`` here — see ``routers/metadata.py``.
"""

import logging
from urllib.parse import quote

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import StreamingResponse

from middleware.rate_limit import DOWNLOAD_LIMIT, limiter
from models import DownloadRequest, DownloadResult
from services import downloader
from utils import tokens
from utils.validators import normalize_url

log = logging.getLogger("alldown.download")

router = APIRouter(prefix="/api", tags=["download"])


@router.post(
    "/download",
    response_model=DownloadResult,
    summary="Turn a format id into an expiring download URL",
)
@limiter.limit(DOWNLOAD_LIMIT)
async def create_download(
    request: Request, response: Response, body: DownloadRequest
) -> DownloadResult:
    # `response` carries slowapi's rate-limit headers. See routers/metadata.py.
    url = normalize_url(body.url)
    extraction, internal = await downloader.resolve_format(url, body.format_id)

    filename = downloader.build_filename(extraction, internal)
    token, signature, ttl = tokens.issue(url, internal.id, filename)

    log.info("download authorised platform=%s format=%s", extraction.platform_id, internal.id)

    return DownloadResult(
        download_url=f"/api/file?t={token}&s={signature}",
        filename=filename,
        filesize=internal.filesize,
        mime_type=internal.mime,
        expires_in=ttl,
        needs_render=internal.needs_mux,
    )


@router.get("/file", summary="Stream the media file")
@limiter.limit(DOWNLOAD_LIMIT)
async def stream_file(
    request: Request,
    response: Response,
    t: str = Query(..., description="Signed token payload"),
    s: str = Query(..., description="HMAC-SHA256 signature of the payload"),
) -> StreamingResponse:
    payload = tokens.verify(t, s)
    url, format_id, filename = payload["u"], payload["f"], payload["n"]

    # open_stream owns the freshness check, the retry on a rejected CDN URL, and the
    # local-render fallback. See services/downloader.open_stream.
    iterator, upstream_headers, status = await downloader.open_stream(
        url, format_id, range_header=request.headers.get("range")
    )

    headers = dict(upstream_headers)
    fallback_mime = upstream_headers.get("content-type", "application/octet-stream")
    # Both forms: the plain one for older clients, the RFC 5987 one for anything unicode.
    headers["content-disposition"] = (
        f'attachment; filename="{filename}"; filename*=UTF-8\'\'{quote(filename)}'
    )
    headers["cache-control"] = "private, no-store"
    headers["x-content-type-options"] = "nosniff"

    return StreamingResponse(
        iterator,
        status_code=status,
        media_type=fallback_mime,
        headers=headers,
    )
