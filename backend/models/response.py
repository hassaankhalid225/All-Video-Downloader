"""Response contracts.

Field names are camelCase where the frontend reads them directly and snake_case where the
brief's API spec fixed them (``filesize_approx``, ``download_url``). Consistency with the
published spec wins over internal tidiness.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FormatOption(BaseModel):
    id: str
    label: str
    ext: str
    quality: str
    height: int | None = None
    fps: int | None = None
    kind: Literal["video", "audio"] = "video"
    filesize_approx: int | None = None
    filesizeLabel: str | None = None
    recommended: bool = False
    needsMux: bool = False
    note: str | None = None

    # Pre-signed so a download is one request instead of two. `POST /api/download` still
    # exists and the client falls back to it when this token has aged out.
    downloadUrl: str | None = None
    filename: str | None = None


class VideoMetadata(BaseModel):
    success: Literal[True] = True
    platform: str
    platformName: str
    platformColor: str
    title: str
    thumbnail: str | None = None
    duration: int | None = None
    durationLabel: str | None = None
    uploader: str | None = None
    uploaderUrl: str | None = None
    viewCount: int | None = None
    likeCount: int | None = None
    webpageUrl: str | None = None
    isLive: bool = False
    formats: list[FormatOption] = Field(default_factory=list)


class DownloadResult(BaseModel):
    success: Literal[True] = True
    download_url: str
    filename: str
    filesize: int | None = None
    mime_type: str = "application/octet-stream"
    expires_in: int = 300
    needs_render: bool = False


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded"] = "ok"
    yt_dlp_version: str | None = None
    ffmpeg: bool = False
    uptime: int = 0
    cache_entries: int = 0
    version: str = "1.0.0"


class PlatformInfo(BaseModel):
    id: str
    name: str
    color: str
    icon: str
    contentTypes: list[str]
    hosts: list[str]
    notes: str | None = None


class PlatformCatalogue(BaseModel):
    success: Literal[True] = True
    platforms: list[PlatformInfo]


class ErrorBody(BaseModel):
    code: str
    message: str
    detail: str | None = None


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorBody
