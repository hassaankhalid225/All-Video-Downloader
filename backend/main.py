"""AllDown API — FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import VERSION, settings
from middleware.rate_limit import limiter, rate_limit_handler
from routers import download, health, metadata, platforms
from services import downloader
from utils.errors import AllDownError

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
log = logging.getLogger("alldown")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    version = downloader.ytdlp_version()
    log.info("AllDown %s starting — yt-dlp %s, ffmpeg %s", VERSION, version or "MISSING", downloader.has_ffmpeg())
    if not version:
        log.error("yt-dlp is not importable. Every extraction will fail.")
    if not downloader.has_ffmpeg():
        log.warning("ffmpeg missing — MP3 and muxed high-resolution formats are unavailable.")
    if settings.secret_key_is_ephemeral:
        log.warning("SECRET_KEY is unset — download tokens will not survive a restart.")

    # Backgrounded so the healthcheck passes immediately; the warm-up finishes while the
    # first requests are still arriving.
    warm_up_task = asyncio.create_task(downloader.warm_up()) if settings.warm_up else None

    yield

    if warm_up_task and not warm_up_task.done():
        warm_up_task.cancel()
    log.info("AllDown shutting down")


app = FastAPI(
    title="AllDown API",
    description="All-in-One Social Media Video Downloader. Powered by yt-dlp.",
    version=VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Requested-With"],
    # The browser needs these to name the saved file and show progress.
    expose_headers=["Content-Disposition", "Content-Length", "Retry-After"],
    max_age=3600,
)


def _error_response(status_code: int, code: str, message: str, detail: str | None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                # Extractor output can contain URLs and internal paths. Dev only.
                "detail": detail if settings.debug else None,
            },
        },
    )


@app.exception_handler(AllDownError)
async def handle_alldown_error(request: Request, exc: AllDownError) -> JSONResponse:
    if exc.status_code >= 500:
        log.error("%s: %s", exc.code, exc.detail or exc.message)
    else:
        log.info("%s: %s", exc.code, exc.message)
    return _error_response(exc.status_code, exc.code, exc.message, exc.detail)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _error_response(
        400, "INVALID_REQUEST", "Please enter a valid social media URL", str(exc.errors())
    )


@app.exception_handler(RateLimitExceeded)
async def handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return rate_limit_handler(request, exc)


@app.exception_handler(Exception)
async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    log.exception("unhandled error on %s", request.url.path)
    return _error_response(
        500, "INTERNAL_ERROR", "Something went wrong. Please try again", str(exc)
    )


app.include_router(health.router)
app.include_router(platforms.router)
app.include_router(metadata.router)
app.include_router(download.router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "name": "AllDown API",
        "version": VERSION,
        "docs": "/docs" if settings.debug else None,
        "endpoints": ["/api/health", "/api/platforms", "/api/metadata", "/api/download", "/api/file"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.debug)
