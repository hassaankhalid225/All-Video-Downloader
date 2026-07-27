"""Request contracts."""

from __future__ import annotations

from pydantic import BaseModel, Field


class MetadataRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=4,
        max_length=2048,
        description="Any public social media URL.",
        json_schema_extra={"example": "https://www.tiktok.com/@user/video/7301234567890123456"},
    )


class DownloadRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)
    format_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="An `id` from the metadata response's `formats` array.",
        json_schema_extra={"example": "mp4_1080p"},
    )
