"""URL hygiene and filename safety.

Two jobs that must happen before yt-dlp is handed anything:

1. Normalise, so ``?utm_source=…`` variants of the same video share a cache entry.
2. Refuse anything that could turn the extractor into an SSRF gadget.
"""

from __future__ import annotations

import ipaddress
import re
import unicodedata
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .errors import InvalidUrlError

MAX_URL_LENGTH = 2048

# Tracking parameters that never change which video is addressed.
_TRACKING_PARAMS = frozenset({
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "fbclid", "gclid", "dclid", "msclkid", "twclid", "igshid", "igsh", "ref", "ref_src",
    "ref_url", "source", "_r", "_d", "share_app_id", "share_item_id", "share_link_id",
    "sharer_sharing_id", "tt_from", "u_code", "timestamp", "user_id", "sec_user_id",
    "social_share_type", "is_from_webapp", "sender_device", "sender_web_id",
    "checksum", "web_id", "si", "pp", "feature", "app", "mibextid", "rdid", "rcid",
    "s", "t", "share_id", "shareId", "trk", "originalSubdomain",
})

# Query keys that DO identify the resource and must survive normalisation.
_MEANINGFUL_PARAMS = frozenset({"v", "list", "story_fbid", "id", "video_id", "vid", "p", "comment_id"})

_PRIVATE_HOST_SUFFIXES = (".local", ".internal", ".localhost", ".home", ".lan")

_FILENAME_UNSAFE = re.compile(r"[^\w\-. ]+", re.UNICODE)
_FILENAME_RUNS = re.compile(r"[\s_]+")
_WINDOWS_RESERVED = frozenset({
    "con", "prn", "aux", "nul",
    *(f"com{i}" for i in range(1, 10)),
    *(f"lpt{i}" for i in range(1, 10)),
})


def normalize_url(raw: str) -> str:
    """Validate, canonicalise and strip tracking noise.

    Raises :class:`InvalidUrlError` for anything that is not a public http(s) URL.
    """
    if not raw or not isinstance(raw, str):
        raise InvalidUrlError()

    candidate = raw.strip()
    # Users paste from chat apps that wrap links in angle brackets or quotes.
    candidate = candidate.strip("<>\"'` \t\n\r")

    if not candidate:
        raise InvalidUrlError()
    if len(candidate) > MAX_URL_LENGTH:
        raise InvalidUrlError("That link is too long to be a valid video URL")
    if any(ch in candidate for ch in ("\n", "\r", "\t", " ")):
        candidate = candidate.split()[0]

    if "://" not in candidate:
        candidate = f"https://{candidate}"

    try:
        parts = urlsplit(candidate)
    except ValueError as exc:
        raise InvalidUrlError(detail=str(exc)) from exc

    if parts.scheme not in ("http", "https"):
        raise InvalidUrlError("Only http and https links are supported")

    host = (parts.hostname or "").lower().rstrip(".")
    if not host or "." not in host:
        raise InvalidUrlError()

    _reject_non_public_host(host)

    # Force https — every supported platform serves it, and it keeps cache keys stable.
    scheme = "https"

    query_pairs = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=False)
        if key in _MEANINGFUL_PARAMS or key.lower() not in _TRACKING_PARAMS
    ]
    query = urlencode(query_pairs)

    path = parts.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    netloc = host
    if parts.port and parts.port not in (80, 443):
        netloc = f"{host}:{parts.port}"

    # Fragments never address a different video.
    return urlunsplit((scheme, netloc, path, query, ""))


def _reject_non_public_host(host: str) -> None:
    """Block loopback, link-local, private and reserved destinations.

    yt-dlp will fetch whatever it is given. Without this, ``/api/metadata`` becomes a
    request-forgery primitive against anything reachable from the container.
    """
    if host in ("localhost", "localhost.localdomain") or host.endswith(_PRIVATE_HOST_SUFFIXES):
        raise InvalidUrlError()

    literal = host
    if literal.startswith("[") and literal.endswith("]"):
        literal = literal[1:-1]

    try:
        address = ipaddress.ip_address(literal)
    except ValueError:
        return  # A hostname. DNS rebinding is out of scope; the platform allow-list bounds it.

    if (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    ):
        raise InvalidUrlError()


def sanitize_filename(title: str, platform: str, ext: str, max_length: int = 80) -> str:
    """Build ``alldown_<platform>_<slug>.<ext>``.

    ASCII-folded and shell-safe: the value goes into a ``Content-Disposition`` header and
    lands on filesystems with wildly different rules.
    """
    ext = (ext or "mp4").lstrip(".").lower()[:8] or "mp4"
    platform_slug = _FILENAME_UNSAFE.sub("", (platform or "video").lower())[:20] or "video"

    folded = unicodedata.normalize("NFKD", title or "")
    folded = folded.encode("ascii", "ignore").decode("ascii")
    slug = _FILENAME_UNSAFE.sub(" ", folded)
    slug = _FILENAME_RUNS.sub("_", slug).strip("_.")
    slug = slug[:max_length].strip("_.")

    if not slug or slug.lower() in _WINDOWS_RESERVED:
        slug = "video"

    return f"alldown_{platform_slug}_{slug}.{ext}"


def looks_like_url(value: str) -> bool:
    """Cheap client-parity check used to decide whether to even try normalising."""
    if not value:
        return False
    candidate = value.strip()
    if "://" in candidate:
        return bool(re.match(r"^https?://[^\s/]+\.[^\s/]+", candidate, re.I))
    return bool(re.match(r"^[\w-]+(\.[\w-]+)+(/|$)", candidate))
