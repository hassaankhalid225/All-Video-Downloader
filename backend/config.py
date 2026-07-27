"""Runtime configuration, read once from the environment."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

VERSION = "1.0.0"


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, "").strip() or default)
    except ValueError:
        return default


def _env_list(key: str, default: list[str]) -> list[str]:
    raw = os.getenv(key, "").strip()
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    debug: bool = field(default_factory=lambda: _env_bool("DEBUG", False))

    allowed_origins: list[str] = field(
        default_factory=lambda: _env_list(
            "ALLOWED_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000"]
        )
    )

    rate_limit_per_minute: int = field(default_factory=lambda: _env_int("RATE_LIMIT_PER_MINUTE", 20))
    download_rate_limit_per_minute: int = field(
        default_factory=lambda: _env_int("DOWNLOAD_RATE_LIMIT_PER_MINUTE", 10)
    )

    # 15 minutes rather than 5. This used to be bounded by the lifetime of the CDN URLs
    # inside an extraction, but byte delivery now enforces its own 90-second freshness
    # check and re-extracts, so the preview cache is free to outlive them. A link shared
    # in a group chat is answered in single-digit milliseconds for the whole quarter hour.
    cache_ttl_seconds: int = field(default_factory=lambda: _env_int("CACHE_TTL_SECONDS", 900))
    cache_max_entries: int = field(default_factory=lambda: _env_int("CACHE_MAX_ENTRIES", 1024))

    max_download_size_mb: int = field(default_factory=lambda: _env_int("MAX_DOWNLOAD_SIZE_MB", 500))
    token_ttl_seconds: int = field(default_factory=lambda: _env_int("TOKEN_TTL_SECONDS", 300))

    extract_timeout_seconds: int = field(default_factory=lambda: _env_int("EXTRACT_TIMEOUT_SECONDS", 45))
    render_timeout_seconds: int = field(default_factory=lambda: _env_int("RENDER_TIMEOUT_SECONDS", 300))

    # Optional Netscape cookie jar. Instagram, Facebook and age-gated YouTube need one for
    # anything beyond fully public content. Nothing is bundled — self-hosters supply it.
    cookies_file: str | None = field(default_factory=lambda: os.getenv("COOKIES_FILE") or None)
    proxy: str | None = field(default_factory=lambda: os.getenv("YTDLP_PROXY") or None)

    # Signs /api/file tokens. A generated value means tokens die on restart, which is
    # correct for dev and wrong for a multi-instance deployment — set it in production.
    secret_key: str = field(default_factory=lambda: os.getenv("SECRET_KEY") or secrets.token_urlsafe(32))

    temp_dir: str | None = field(default_factory=lambda: os.getenv("TEMP_DIR") or None)

    # Prime the extractor caches at boot so the first visitor after a deploy does not pay
    # for downloading and parsing YouTube's player JavaScript. Costs one request at start.
    warm_up: bool = field(default_factory=lambda: _env_bool("WARM_UP", True))

    @property
    def max_download_bytes(self) -> int:
        return self.max_download_size_mb * 1024 * 1024

    @property
    def secret_key_is_ephemeral(self) -> bool:
        return not os.getenv("SECRET_KEY")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
