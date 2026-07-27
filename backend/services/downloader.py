"""yt-dlp wrapper: extraction, the format ladder, and byte delivery.

yt-dlp is synchronous and CPU/network bound, so every call into it runs on a worker thread
via :func:`asyncio.to_thread` and is bounded by an :func:`asyncio.wait_for` deadline.

Two delivery paths exist:

* **Direct** — a progressive stream that already carries video and audio. We proxy its bytes
  straight through, replaying the headers yt-dlp negotiated. Nothing touches disk.
* **Render** — anything needing ffmpeg (a DASH video+audio mux, or an MP3 extraction). We
  download to a temp file, stream it, then delete it.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import math
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
import yt_dlp

from config import settings
from models.response import FormatOption, VideoMetadata
from services import detector
from services.cache import metadata_cache
from utils.errors import (
    AllDownError,
    ExtractionError,
    FileTooLargeError,
    FormatNotAvailableError,
    TimeoutError_,
    UnsupportedPlatformError,
    UpstreamUnavailableError,
    classify_extractor_error,
)
from utils.validators import sanitize_filename

log = logging.getLogger("alldown.downloader")

# Descending. Tiers above the source resolution are dropped, so short-form platforms
# simply produce a shorter ladder.
_TIERS: tuple[int, ...] = (2160, 1440, 1080, 720, 480, 360)

_TIER_LABELS: dict[int, str] = {
    2160: "4K", 1440: "1440p", 1080: "1080p", 720: "720p", 480: "480p", 360: "360p",
}

# The default choice. Above this a YouTube download is a multi-hundred-megabyte server-side
# mux, which is the wrong thing to pre-select for someone who pasted a link and wants a file.
_RECOMMENDED_CEILING = 1080

# At most this many video cards. Six is a wall of near-identical options; four reads as a
# choice. The highest tier always survives so 4K stays reachable when it exists.
_MAX_VIDEO_OPTIONS = 4

# 256 KiB rather than 64 KiB. Each chunk crosses an async boundary and a StreamingResponse
# iteration, so on a 300 MB file this is 1,200 hops instead of 4,800.
_STREAM_CHUNK = 256 * 1024

_MIME_BY_EXT: dict[str, str] = {
    "mp4": "video/mp4", "webm": "video/webm", "mkv": "video/x-matroska",
    "mov": "video/quicktime", "flv": "video/x-flv", "3gp": "video/3gpp",
    "mp3": "audio/mpeg", "m4a": "audio/mp4", "opus": "audio/opus",
    "ogg": "audio/ogg", "wav": "audio/wav", "jpg": "image/jpeg", "webp": "image/webp",
}

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


# --------------------------------------------------------------------------------------
# Internal types
# --------------------------------------------------------------------------------------


@dataclass
class InternalFormat:
    """The server-side half of a :class:`FormatOption`.

    Never serialised — it holds the signed CDN URL and the selector string, neither of
    which should leave the process.
    """

    id: str
    ext: str
    mime: str
    needs_mux: bool
    selector: str
    direct_url: str | None = None
    http_headers: dict[str, str] = field(default_factory=dict)
    filesize: int | None = None
    is_audio: bool = False


@dataclass
class Extraction:
    """One cached yt-dlp result plus everything derived from it."""

    url: str
    platform_id: str
    platform_name: str
    platform_color: str
    info: dict[str, Any]
    formats: list[FormatOption]
    internal: dict[str, InternalFormat]
    created_at: float = field(default_factory=time.monotonic)

    def to_metadata(self) -> VideoMetadata:
        info = self.info
        duration = info.get("duration")
        duration = int(duration) if isinstance(duration, (int, float)) and duration > 0 else None
        return VideoMetadata(
            platform=self.platform_id,
            platformName=self.platform_name,
            platformColor=self.platform_color,
            title=_clean_title(info),
            thumbnail=_pick_thumbnail(info),
            duration=duration,
            durationLabel=format_duration(duration),
            uploader=_clean_uploader(info),
            uploaderUrl=info.get("uploader_url") or info.get("channel_url"),
            viewCount=_safe_int(info.get("view_count")),
            likeCount=_safe_int(info.get("like_count")),
            webpageUrl=info.get("webpage_url") or self.url,
            isLive=bool(info.get("is_live")),
            # Copies, not the cached ladder itself: the caller stamps a freshly signed
            # download URL onto each option, and that must not leak into the cache.
            formats=[option.model_copy() for option in self.formats],
        )


# --------------------------------------------------------------------------------------
# Formatting helpers
# --------------------------------------------------------------------------------------


def format_bytes(value: int | None) -> str | None:
    if not value or value <= 0:
        return None
    units = ("B", "KB", "MB", "GB")
    index = min(int(math.log(value, 1024)), len(units) - 1)
    scaled = value / (1024 ** index)
    precision = 0 if index == 0 or scaled >= 100 else 1
    return f"{scaled:.{precision}f} {units[index]}"


def format_duration(seconds: int | None) -> str | None:
    if not seconds or seconds <= 0:
        return None
    hours, remainder = divmod(int(seconds), 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def _safe_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and value >= 0:
        return int(value)
    return None


def _clean_title(info: dict[str, Any]) -> str:
    for key in ("title", "fulltitle", "description", "id"):
        value = info.get(key)
        if isinstance(value, str) and value.strip():
            title = " ".join(value.split())
            # Some extractors use the whole caption as the title. Keep it readable.
            return title[:200] if len(title) > 200 else title
    return "Untitled video"


def _clean_uploader(info: dict[str, Any]) -> str | None:
    for key in ("uploader", "uploader_id", "channel", "creator", "webpage_url_basename"):
        value = info.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _pick_thumbnail(info: dict[str, Any]) -> str | None:
    thumbnail = info.get("thumbnail")
    if isinstance(thumbnail, str) and thumbnail.startswith("http"):
        return thumbnail
    thumbnails = info.get("thumbnails")
    if isinstance(thumbnails, list) and thumbnails:
        # Prefer the largest entry that declares a width; fall back to the last one,
        # which yt-dlp orders worst-to-best.
        sized = [t for t in thumbnails if isinstance(t, dict) and t.get("width") and t.get("url")]
        if sized:
            return max(sized, key=lambda t: t["width"])["url"]
        for candidate in reversed(thumbnails):
            if isinstance(candidate, dict) and isinstance(candidate.get("url"), str):
                return candidate["url"]
    return None


def _estimate_size(fmt: dict[str, Any], duration: float | None) -> int | None:
    for key in ("filesize", "filesize_approx"):
        value = fmt.get(key)
        if isinstance(value, (int, float)) and value > 0:
            return int(value)
    bitrate = fmt.get("tbr") or fmt.get("vbr") or fmt.get("abr")
    if isinstance(bitrate, (int, float)) and bitrate > 0 and duration:
        return int(bitrate * 1000 * duration / 8)
    return None


def _mime_for(ext: str) -> str:
    return _MIME_BY_EXT.get(ext.lower(), "application/octet-stream")


# --------------------------------------------------------------------------------------
# yt-dlp invocation
# --------------------------------------------------------------------------------------


def _base_opts() -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "no_color": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 20,
        "retries": 2,
        "fragment_retries": 2,
        "extractor_retries": 2,
        "ignoreerrors": False,
        "nocheckcertificate": False,
        "geo_bypass": True,
        "http_headers": {"User-Agent": _BROWSER_UA, "Accept-Language": "en-US,en;q=0.9"},
    }
    if settings.cookies_file and Path(settings.cookies_file).is_file():
        opts["cookiefile"] = settings.cookies_file
    if settings.proxy:
        opts["proxy"] = settings.proxy
    return opts


def _extract_sync(url: str) -> dict[str, Any]:
    """Blocking extraction. Always called through :func:`asyncio.to_thread`."""
    try:
        with yt_dlp.YoutubeDL(_base_opts()) as ydl:
            info = ydl.extract_info(url, download=False)
            cookiejar = ydl.cookiejar
    except yt_dlp.utils.DownloadError as exc:
        raise classify_extractor_error(str(exc)) from exc
    except yt_dlp.utils.ExtractorError as exc:
        raise classify_extractor_error(str(exc)) from exc
    except AllDownError:
        raise
    except Exception as exc:  # noqa: BLE001 - yt-dlp raises a wide surface
        raise classify_extractor_error(str(exc)) from exc

    if not info:
        raise ExtractionError(detail="yt-dlp returned no information")

    # Carousels, albums and channel links come back as playlists. Take the first
    # playable entry rather than failing — that is what the user pasted a link to.
    if info.get("_type") == "playlist":
        entries = [e for e in (info.get("entries") or []) if isinstance(e, dict)]
        if not entries:
            raise ExtractionError(detail="Playlist contained no downloadable entries")
        first = entries[0]
        # Preserve the playlist-level title when the entry has none.
        first.setdefault("title", info.get("title"))
        first.setdefault("webpage_url", info.get("webpage_url"))
        info = first

    # TikTok's CDN 403s any request that does not carry the anonymous session cookies
    # (ttwid, tt_chain_token, msToken) issued during extraction. Keep the jar so the
    # proxy can replay the right ones per host.
    info["_alldown_cookiejar"] = cookiejar
    return info


async def _extract(url: str) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_extract_sync, url),
            timeout=settings.extract_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        raise TimeoutError_(detail=f"Extraction exceeded {settings.extract_timeout_seconds}s") from exc


# --------------------------------------------------------------------------------------
# Format ladder
# --------------------------------------------------------------------------------------


def _usable_formats(info: dict[str, Any]) -> list[dict[str, Any]]:
    raw = info.get("formats")
    if not isinstance(raw, list):
        raw = []
    usable = [
        f for f in raw
        if isinstance(f, dict)
        and f.get("url")
        # Manifest-only entries (m3u8/dash playlists with no direct URL) cannot be proxied.
        and f.get("protocol") not in ("m3u8", "m3u8_native", "http_dash_segments", "rtmp", "ism")
    ]
    if usable:
        return usable
    # Some extractors return HLS only. Keep them — yt-dlp can still render them locally,
    # they just cannot take the direct path.
    return [f for f in raw if isinstance(f, dict) and f.get("url")]


def _is_progressive(fmt: dict[str, Any]) -> bool:
    return fmt.get("vcodec") not in (None, "none") and fmt.get("acodec") not in (None, "none")


def _is_video_only(fmt: dict[str, Any]) -> bool:
    return fmt.get("vcodec") not in (None, "none") and fmt.get("acodec") in (None, "none")


def _is_audio_only(fmt: dict[str, Any]) -> bool:
    return fmt.get("vcodec") in (None, "none") and fmt.get("acodec") not in (None, "none")


def _can_stream_directly(fmt: dict[str, Any]) -> bool:
    protocol = fmt.get("protocol") or ""
    return protocol.startswith("http") and "dash" not in protocol and "m3u8" not in protocol


def _format_height(fmt: dict[str, Any]) -> int | None:
    """The resolution number a person would call this format.

    That is the **short side**, not the pixel height. A TikTok is 1080×1920 and everyone
    — including TikTok — calls it 1080p. Reading ``height`` alone labels it 1920 and the
    ladder then advertises a vertical clip as 4K.
    """
    height = fmt.get("height") if isinstance(fmt.get("height"), (int, float)) else None
    width = fmt.get("width") if isinstance(fmt.get("width"), (int, float)) else None

    sides = [int(v) for v in (height, width) if v and v > 0]
    if not sides:
        return None
    return min(sides)


def _tier_for(short_side: int) -> int | None:
    """Bucket a resolution into the largest tier it genuinely reaches.

    Rounding down means a quality is never overstated. The 5% grace stops near-misses
    (718p encodes, 1082p crops) from falling a whole tier.
    """
    for tier in _TIERS:
        if short_side * 1.05 >= tier:
            return tier
    return None


def _score_video(fmt: dict[str, Any]) -> tuple:
    """Rank candidates within one tier. Higher is better."""
    ext_rank = {"mp4": 3, "webm": 2, "mov": 1}.get((fmt.get("ext") or "").lower(), 0)
    # TikTok's `download` format is the watermarked render. The resolution-tagged
    # play_addr formats are clean, so never let `download` win a tier.
    watermark_penalty = 0 if (fmt.get("format_id") or "").lower() == "download" else 1
    return (
        watermark_penalty,
        1 if _is_progressive(fmt) else 0,
        1 if _can_stream_directly(fmt) else 0,
        ext_rank,
        fmt.get("tbr") or 0,
        fmt.get("fps") or 0,
    )


def _render_selector(
    video: dict[str, Any], audio: dict[str, Any] | None, tier: int, direct: bool
) -> str:
    """The yt-dlp format selector for a tier, pinned to the formats we measured."""
    video_id = video.get("format_id")
    if direct:
        return video_id or "best"

    generic = f"bestvideo[height<={tier}]+bestaudio/best[height<={tier}]"
    if not video_id:
        return generic

    audio_id = audio.get("format_id") if audio else None
    exact = f"{video_id}+{audio_id}" if audio_id else video_id
    return f"{exact}/{generic}"


def _trim_video_options(options: list[FormatOption]) -> list[FormatOption]:
    """Cut the tier list down to :data:`_MAX_VIDEO_OPTIONS`, keeping a useful spread.

    Dropping from the bottom would strip 360p, which is the one tier that matters on a
    slow connection. Instead keep the maximum available quality, then the tiers nearest
    1080/720/480/360 — so a 4K source offers 4K / 1080p / 720p / 480p rather than four
    variations of "very large".
    """
    if len(options) <= _MAX_VIDEO_OPTIONS:
        return options

    kept: list[FormatOption] = [options[0]]  # the highest tier available
    for preferred in (1080, 720, 480, 360):
        if len(kept) >= _MAX_VIDEO_OPTIONS:
            break
        match = next((o for o in options if o.height == preferred and o not in kept), None)
        if match is not None:
            kept.append(match)

    kept.sort(key=lambda o: o.height or 0, reverse=True)
    return kept


def _mark_recommended(options: list[FormatOption]) -> None:
    """Pre-select the best tier that a normal person actually wants.

    The highest available quality is rarely the right default: on YouTube that is a 4K
    DASH stream that has to be muxed server-side into hundreds of megabytes. Prefer the
    highest tier at or below 1080p, and within that prefer one that streams directly.
    """
    if not options:
        return

    eligible = [o for o in options if o.kind == "video" and (o.height or 0) <= _RECOMMENDED_CEILING]
    if not eligible:
        eligible = [o for o in options if o.kind == "video"]
    if not eligible:
        eligible = options

    best = max(eligible, key=lambda o: (o.height or 0, 0 if o.needsMux else 1))
    best.recommended = True


def _build_ladder(
    info: dict[str, Any], has_ffmpeg: bool
) -> tuple[list[FormatOption], dict[str, InternalFormat]]:
    """Reduce 30–80 raw formats to at most six meaningful choices."""
    duration = info.get("duration") if isinstance(info.get("duration"), (int, float)) else None
    candidates = _usable_formats(info)

    videos = [f for f in candidates if _is_progressive(f) or _is_video_only(f)]
    audios = [f for f in candidates if _is_audio_only(f)]

    # Picked once, up front, because the muxed tiers need to name it in their selector.
    # Letting yt-dlp resolve `bestaudio` at render time would mean the file we build is
    # not the file we measured.
    best_audio = max(audios, key=lambda a: (a.get("abr") or 0, a.get("tbr") or 0)) if audios else None

    options: list[FormatOption] = []
    internal: dict[str, InternalFormat] = {}

    # Bucket by tier once, rather than re-scanning per tier. Formats with no usable
    # dimensions land nowhere and are only reachable through the fallback below.
    buckets: dict[int, list[dict[str, Any]]] = {}
    for candidate in videos:
        side = _format_height(candidate)
        if side is None:
            continue
        tier = _tier_for(side)
        if tier is not None:
            buckets.setdefault(tier, []).append(candidate)

    for tier in _TIERS:
        bucket = buckets.get(tier)
        if not bucket:
            continue
        best = max(bucket, key=_score_video)

        progressive = _is_progressive(best)
        direct = progressive and _can_stream_directly(best)
        ext = (best.get("ext") or "mp4").lower()
        if not progressive:
            ext = "mp4"  # The mux target is always mp4.

        needs_mux = not direct
        if needs_mux and not has_ffmpeg:
            continue  # Cannot deliver a tier we can't mux.

        fmt_id = f"{ext}_{_TIER_LABELS[tier].lower()}"
        size = _estimate_size(best, duration)
        if not progressive:
            # A mux adds the audio track; approximate it so the UI is not badly wrong.
            audio_size = _estimate_size(best_audio, duration) if best_audio else None
            if size and audio_size:
                size += audio_size

        # Offering a tier we would refuse to transfer just moves the failure later, to
        # after the user has picked it and waited.
        if size and size > settings.max_download_bytes:
            log.debug("dropping %s: estimated %s exceeds the transfer ceiling", fmt_id, size)
            continue

        options.append(
            FormatOption(
                id=fmt_id,
                label=f"{ext.upper()} · {_TIER_LABELS[tier]}",
                ext=ext,
                quality=_TIER_LABELS[tier],
                height=tier,
                fps=_safe_int(best.get("fps")),
                kind="video",
                filesize_approx=size,
                filesizeLabel=format_bytes(size),
                recommended=False,
                needsMux=needs_mux,
                note="Merged on our server — starts a few seconds slower" if needs_mux else None,
            )
        )
        internal[fmt_id] = InternalFormat(
            id=fmt_id,
            ext=ext,
            mime=_mime_for(ext),
            needs_mux=needs_mux,
            # Name the exact formats that were measured. A generic
            # `bestvideo[height<=N]+bestaudio` lets yt-dlp re-pick at render time, and it
            # frequently chooses a different codec than `_score_video` did — which is how a
            # tier advertised at 275 MB arrived as a 155 MB file. The generic form stays as
            # a fallback for when a format id has since disappeared.
            selector=_render_selector(best, best_audio, tier, direct),
            direct_url=best.get("url") if direct else None,
            http_headers=_headers_from(best, info),
            filesize=size,
        )

    # No tier matched — the source may report no height at all (some Twitter and Reddit
    # clips). Offer a single "best" so the tool still works.
    if not options and videos:
        best = max(videos, key=_score_video)
        progressive = _is_progressive(best)
        direct = progressive and _can_stream_directly(best)
        if direct or has_ffmpeg:
            ext = (best.get("ext") or "mp4").lower() if progressive else "mp4"
            size = _estimate_size(best, duration)
            options.append(
                FormatOption(
                    id=f"{ext}_best",
                    label=f"{ext.upper()} · Best available",
                    ext=ext,
                    quality="best",
                    height=_format_height(best),
                    fps=_safe_int(best.get("fps")),
                    kind="video",
                    filesize_approx=size,
                    filesizeLabel=format_bytes(size),
                    recommended=False,
                    needsMux=not direct,
                    note=None if direct else "Merged on our server — starts a few seconds slower",
                )
            )
            internal[f"{ext}_best"] = InternalFormat(
                id=f"{ext}_best",
                ext=ext,
                mime=_mime_for(ext),
                needs_mux=not direct,
                selector=best.get("format_id") or "best" if direct else "bestvideo+bestaudio/best",
                direct_url=best.get("url") if direct else None,
                http_headers=_headers_from(best, info),
                filesize=size,
            )

    options = _trim_video_options(options)
    _mark_recommended(options)

    # ---- Audio -----------------------------------------------------------------
    if audios or videos:
        best_audio = max(audios, key=lambda a: (a.get("abr") or 0, a.get("tbr") or 0)) if audios else None

        # m4a passthrough is free when the source already has one — no ffmpeg, no wait.
        if best_audio and (best_audio.get("ext") or "").lower() in ("m4a", "mp4") and _can_stream_directly(best_audio):
            size = _estimate_size(best_audio, duration)
            options.append(
                FormatOption(
                    id="m4a",
                    label="M4A · Audio",
                    ext="m4a",
                    quality="audio",
                    kind="audio",
                    filesize_approx=size,
                    filesizeLabel=format_bytes(size),
                    needsMux=False,
                )
            )
            internal["m4a"] = InternalFormat(
                id="m4a",
                ext="m4a",
                mime="audio/mp4",
                needs_mux=False,
                selector=best_audio.get("format_id") or "bestaudio",
                direct_url=best_audio.get("url"),
                http_headers=_headers_from(best_audio, info),
                filesize=size,
                is_audio=True,
            )

        if has_ffmpeg:
            # 192 kbps CBR — the size is predictable regardless of the source bitrate.
            mp3_size = int(192 * 1000 * duration / 8) if duration else None
            options.append(
                FormatOption(
                    id="mp3",
                    label="MP3 · Audio",
                    ext="mp3",
                    quality="audio",
                    kind="audio",
                    filesize_approx=mp3_size,
                    filesizeLabel=format_bytes(mp3_size),
                    needsMux=True,
                    note="Converted on our server — starts a few seconds slower",
                )
            )
            internal["mp3"] = InternalFormat(
                id="mp3",
                ext="mp3",
                mime="audio/mpeg",
                needs_mux=True,
                selector="bestaudio/best",
                filesize=mp3_size,
                is_audio=True,
            )

    return options, internal


def _cookie_header_for(info: dict[str, Any], target_url: str) -> str | None:
    """Cookies from the extraction session that apply to ``target_url``.

    Domain and path matching is delegated to the cookie jar rather than sending every
    cookie to every host — when a self-hoster supplies ``COOKIES_FILE`` the jar holds
    real login credentials, and those must not leak to a third-party CDN.
    """
    jar = info.get("_alldown_cookiejar")
    if jar is None:
        return None
    try:
        request = urllib.request.Request(target_url)
        jar.add_cookie_header(request)
        return request.get_header("Cookie")
    except Exception:  # noqa: BLE001 - a missing cookie is never worth failing over
        return None


def _headers_from(fmt: dict[str, Any], info: dict[str, Any]) -> dict[str, str]:
    """The exact headers the CDN expects.

    TikTok and Instagram 403 any request whose ``Referer``/``User-Agent``/cookies do not
    match what the extractor used, which is why a plain redirect to the CDN URL fails.
    """
    headers = dict(info.get("http_headers") or {})
    headers.update(fmt.get("http_headers") or {})
    headers.setdefault("User-Agent", _BROWSER_UA)
    headers.setdefault("Accept", "*/*")
    headers.setdefault("Accept-Language", "en-US,en;q=0.9")
    if info.get("webpage_url"):
        headers.setdefault("Referer", info["webpage_url"])

    target = fmt.get("url")
    if target:
        cookie = _cookie_header_for(info, target)
        if cookie:
            headers["Cookie"] = cookie

    # Hop-by-hop headers must not be replayed.
    for banned in ("Host", "Content-Length", "Connection", "Transfer-Encoding"):
        headers.pop(banned, None)
    return {str(k): str(v) for k, v in headers.items()}


# --------------------------------------------------------------------------------------
# Public service API
# --------------------------------------------------------------------------------------


async def build_extraction(url: str) -> Extraction:
    """Extract, classify and build the ladder. Not cached — see :func:`get_extraction`."""
    platform = detector.detect(url)
    info = await _extract(url)

    if platform is None:
        # yt-dlp supports 1000+ sites; if it extracted something, the link is valid even
        # though it is outside our advertised catalogue.
        extractor = (info.get("extractor_key") or info.get("extractor") or "").lower()
        if not extractor or extractor == "generic":
            raise UnsupportedPlatformError()
        platform_id = extractor
        platform_name = info.get("extractor_key") or extractor.title()
        platform_color = "#7C3AED"
    else:
        platform_id = platform.id
        platform_name = platform.name
        platform_color = platform.color

    options, internal = _build_ladder(info, has_ffmpeg())
    if not options:
        raise ExtractionError(detail="No downloadable format survived the ladder")

    return Extraction(
        url=url,
        platform_id=platform_id,
        platform_name=platform_name,
        platform_color=platform_color,
        info=info,
        formats=options,
        internal=internal,
    )


async def get_extraction(url: str) -> Extraction:
    """Cached :func:`build_extraction`, single-flighted per URL."""
    return await metadata_cache.get_or_set(f"extract:{url}", lambda: build_extraction(url))


async def get_metadata(url: str) -> VideoMetadata:
    """Everything the preview card needs, including pre-signed download links.

    Signing every format here costs one HMAC each and removes a whole round trip from the
    download path — the client can go straight to ``/api/file`` instead of asking
    ``/api/download`` for a URL it could already have had.
    """
    extraction = await get_extraction(url)
    metadata = extraction.to_metadata()

    # Imported here rather than at module scope: utils.tokens imports config, and a
    # top-level import would make the services layer depend on it for extraction alone.
    from utils import tokens

    for option in metadata.formats:
        internal = extraction.internal.get(option.id)
        if internal is None:
            continue
        filename = build_filename(extraction, internal)
        token, signature, _ = tokens.issue(extraction.url, internal.id, filename)
        option.downloadUrl = f"/api/file?t={token}&s={signature}"
        option.filename = filename

    return metadata


async def resolve_format(
    url: str, format_id: str, max_age: float | None = None
) -> tuple[Extraction, InternalFormat]:
    """Look a ``format_id`` back up, re-extracting when the cache cannot be trusted.

    ``max_age`` bounds how old the cached extraction may be. The metadata cache exists to
    make the *preview* cheap, and five minutes is right for that — but the CDN URLs inside
    an extraction can expire sooner, and YouTube's progressive links in particular start
    returning 403 well before the cache entry does. Byte delivery therefore asks for a
    tighter bound than the preview does.
    """
    extraction = await get_extraction(url)

    if max_age is not None and (time.monotonic() - extraction.created_at) > max_age:
        metadata_cache.invalidate(f"extract:{url}")
        extraction = await get_extraction(url)

    internal = extraction.internal.get(format_id)
    if internal is None:
        # The cached extraction may predate a platform-side format change. Retry once
        # against a fresh extraction before telling the user the quality is gone.
        metadata_cache.invalidate(f"extract:{url}")
        extraction = await get_extraction(url)
        internal = extraction.internal.get(format_id)
    if internal is None:
        raise FormatNotAvailableError()
    return extraction, internal


def build_filename(extraction: Extraction, internal: InternalFormat) -> str:
    return sanitize_filename(
        title=_clean_title(extraction.info),
        platform=extraction.platform_id,
        ext=internal.ext,
    )


# --------------------------------------------------------------------------------------
# Delivery — direct proxy
# --------------------------------------------------------------------------------------


async def stream_direct(
    internal: InternalFormat, range_header: str | None = None
) -> tuple[AsyncIterator[bytes], dict[str, str], int]:
    """Proxy a progressive stream.

    Returns ``(byte iterator, response headers, status code)``. The upstream connection is
    held open by the generator and closed when it is exhausted or the client disconnects.
    """
    if not internal.direct_url:
        raise FormatNotAvailableError(detail="Format has no direct URL")

    request_headers = dict(internal.http_headers)
    if range_header:
        request_headers["Range"] = range_header

    client = httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(connect=15.0, read=60.0, write=60.0, pool=15.0),
    )

    try:
        request = client.build_request("GET", internal.direct_url, headers=request_headers)
        upstream = await client.send(request, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        raise UpstreamUnavailableError(detail=str(exc)) from exc

    if upstream.status_code >= 400:
        status = upstream.status_code
        await upstream.aclose()
        await client.aclose()
        if status in (401, 403):
            raise UpstreamUnavailableError(
                "That download link expired. Please try again", detail=f"upstream {status}"
            )
        raise UpstreamUnavailableError(detail=f"upstream {status}")

    content_length = upstream.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > settings.max_download_bytes:
        await upstream.aclose()
        await client.aclose()
        raise FileTooLargeError()

    passthrough: dict[str, str] = {}
    for header in ("content-length", "content-range", "accept-ranges", "content-type"):
        if header in upstream.headers:
            passthrough[header] = upstream.headers[header]
    passthrough.setdefault("accept-ranges", "bytes")
    passthrough["content-type"] = internal.mime

    async def iterator() -> AsyncIterator[bytes]:
        transferred = 0
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=_STREAM_CHUNK):
                transferred += len(chunk)
                if transferred > settings.max_download_bytes:
                    log.warning("aborting oversized transfer at %s bytes", transferred)
                    break
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return iterator(), passthrough, upstream.status_code


# --------------------------------------------------------------------------------------
# Delivery — local render
# --------------------------------------------------------------------------------------


def _render_sync(url: str, internal: InternalFormat, workdir: str) -> Path:
    """Download (and mux or transcode) into ``workdir``. Returns the produced file."""
    outtmpl = os.path.join(workdir, "out.%(ext)s")
    opts = _base_opts()
    opts.update(
        {
            "skip_download": False,
            "format": internal.selector,
            "outtmpl": outtmpl,
            "overwrites": True,
            # Benchmarked on a 56 MB DASH render (median of the runs): 4 → 24.2s,
            # 8 → 15.1s, 16 → 20.3s. DASH renders are fragment-bound rather than
            # bandwidth-bound, and past eight the extra connections start contending.
            # This is the slowest thing the service does, so the tuning matters.
            "concurrent_fragment_downloads": 8,
        }
    )

    if internal.id == "mp3":
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    elif internal.needs_mux:
        opts["merge_output_format"] = "mp4"

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])  # noqa: S603
    except yt_dlp.utils.DownloadError as exc:
        raise classify_extractor_error(str(exc)) from exc
    except AllDownError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise classify_extractor_error(str(exc)) from exc

    produced = sorted(Path(workdir).glob("out.*"), key=lambda p: p.stat().st_size, reverse=True)
    # Prefer the extension we promised; postprocessors leave the source file behind.
    for candidate in produced:
        if candidate.suffix.lstrip(".").lower() == internal.ext:
            return candidate
    if produced:
        return produced[0]
    raise ExtractionError(detail="Render produced no output file")


async def render_and_stream(
    url: str, internal: InternalFormat
) -> tuple[AsyncIterator[bytes], dict[str, str], int]:
    """Render to a temp file, then stream it and delete it.

    The whole render completes before the first byte is sent — a muxed file has no valid
    prefix, so there is nothing meaningful to stream early.
    """
    workdir = tempfile.mkdtemp(prefix="alldown_", dir=settings.temp_dir)

    try:
        path = await asyncio.wait_for(
            asyncio.to_thread(_render_sync, url, internal, workdir),
            timeout=settings.render_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        raise TimeoutError_(detail=f"Render exceeded {settings.render_timeout_seconds}s") from exc
    except BaseException:
        shutil.rmtree(workdir, ignore_errors=True)
        raise

    size = path.stat().st_size
    if size > settings.max_download_bytes:
        shutil.rmtree(workdir, ignore_errors=True)
        raise FileTooLargeError()

    async def iterator() -> AsyncIterator[bytes]:
        try:
            with path.open("rb") as handle:
                while chunk := handle.read(_STREAM_CHUNK):
                    yield chunk
        finally:
            with contextlib.suppress(Exception):
                shutil.rmtree(workdir, ignore_errors=True)

    headers = {
        "content-length": str(size),
        "content-type": internal.mime,
        "accept-ranges": "none",
    }
    return iterator(), headers, 200


# --------------------------------------------------------------------------------------
# Delivery — orchestration
# --------------------------------------------------------------------------------------

# How stale a cached extraction may be before byte delivery re-runs it. Comfortably inside
# the window where every platform's signed URLs are still honoured.
_DELIVERY_MAX_AGE_SECONDS = 90


async def open_stream(
    url: str, format_id: str, range_header: str | None = None
) -> tuple[AsyncIterator[bytes], dict[str, str], int]:
    """Deliver the bytes for a format, degrading rather than failing.

    Three attempts, each strictly more reliable and more expensive than the last:

    1. Proxy the cached direct URL.
    2. If the CDN rejects it, re-extract and proxy the new one — signed URLs expire, and a
       403 here means "stale", not "forbidden".
    3. If that still fails, let yt-dlp fetch it locally and stream the result. Slower, but
       it re-negotiates everything from scratch and works whenever the platform works.
    """
    # Resolve without the freshness bound first, only to learn which path this format
    # takes. A render re-negotiates every URL through yt-dlp itself, so forcing a
    # re-extraction before one is pure waste — and that is the slow path (MP3, and every
    # YouTube tier above 720p), exactly where the extra couple of seconds hurts most.
    _, internal = await resolve_format(url, format_id)

    if internal.needs_mux or not internal.direct_url:
        return await render_and_stream(url, internal)

    # The direct path proxies a signed CDN URL straight from the extraction, so here the
    # age of that extraction genuinely matters.
    _, internal = await resolve_format(url, format_id, max_age=_DELIVERY_MAX_AGE_SECONDS)

    try:
        return await stream_direct(internal, range_header)
    except UpstreamUnavailableError as first_error:
        log.info("direct stream rejected (%s); re-extracting", first_error.detail)

    metadata_cache.invalidate(f"extract:{url}")
    _, internal = await resolve_format(url, format_id)

    if internal.needs_mux or not internal.direct_url:
        return await render_and_stream(url, internal)

    try:
        return await stream_direct(internal, range_header)
    except UpstreamUnavailableError as second_error:
        log.warning("direct stream failed twice (%s); falling back to a local render", second_error.detail)
        return await render_and_stream(url, internal)


# --------------------------------------------------------------------------------------
# Environment probes
# --------------------------------------------------------------------------------------

_ffmpeg_cache: bool | None = None


def has_ffmpeg() -> bool:
    """Whether muxing and MP3 extraction are available. Probed once."""
    global _ffmpeg_cache
    if _ffmpeg_cache is None:
        _ffmpeg_cache = shutil.which("ffmpeg") is not None
        if not _ffmpeg_cache:
            log.warning("ffmpeg not found — MP3 and high-resolution muxed formats are disabled")
    return _ffmpeg_cache


async def warm_up() -> None:
    """Pay yt-dlp's one-off costs at boot instead of charging them to the first visitor.

    The first YouTube extraction in a process downloads and parses the site's player
    JavaScript to solve the signature challenge. That is several seconds, and without this
    it lands on whoever happens to paste the first link after a deploy.

    Failures are swallowed: a cold cache is a slow first request, not a broken service.
    """
    try:
        await asyncio.wait_for(
            asyncio.to_thread(_extract_sync, "https://www.youtube.com/watch?v=aqz-KE-bpKQ"),
            timeout=30,
        )
        log.info("warm-up complete — extractor caches primed")
    except Exception as exc:  # noqa: BLE001
        log.info("warm-up skipped (%s); the first request will be slower", type(exc).__name__)


def ytdlp_version() -> str | None:
    try:
        return yt_dlp.version.__version__
    except Exception:  # noqa: BLE001
        with contextlib.suppress(Exception):
            return subprocess.run(
                ["yt-dlp", "--version"], capture_output=True, text=True, timeout=10, check=True
            ).stdout.strip()
        return None
