"""Per-IP rate limiting.

Behind Vercel and Railway the socket peer is a proxy, so the client IP has to come from
``X-Forwarded-For``. slowapi's default key function reads the socket, which would bucket
every user of the deployment together.
"""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from config import settings


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Left-most entry is the original client; the rest are proxies.
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "anonymous"


limiter = Limiter(key_func=client_ip, headers_enabled=True)

METADATA_LIMIT = f"{settings.rate_limit_per_minute}/minute"
DOWNLOAD_LIMIT = f"{settings.download_rate_limit_per_minute}/minute"


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """429 in the standard error envelope, with a usable ``Retry-After``."""
    retry_after = getattr(exc, "retry_after", None) or 60
    response = JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMITED",
                "message": "Too many requests. Please wait a moment",
                "detail": f"Limit: {exc.detail}" if settings.debug else None,
            },
        },
    )
    response.headers["Retry-After"] = str(int(retry_after))
    return response
