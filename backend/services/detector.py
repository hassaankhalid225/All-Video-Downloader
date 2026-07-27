"""Platform identification from a URL.

Pure functions, no I/O — this module is the single source of truth for which platforms
AllDown claims to support, and the frontend's ``lib/constants.ts`` mirrors it.

Matching is host-first (cheap, unambiguous) then path-shape, so ``instagram.com/reel/x``
resolves but ``instagram.com/accounts/login`` does not.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Platform:
    """Everything the UI needs to render a platform's identity."""

    id: str
    name: str
    color: str
    """Brand accent. Drives the ``--accent`` custom property on the client."""
    icon: str
    """Icon key the frontend maps to a react-icons component."""
    content_types: tuple[str, ...]
    hosts: tuple[str, ...]
    path_patterns: tuple[re.Pattern[str], ...] = field(default=(), repr=False)
    """Optional path allow-list. Empty means every path on a matching host qualifies."""
    notes: str = ""


def _p(*parts: str) -> tuple[re.Pattern[str], ...]:
    return tuple(re.compile(p, re.I) for p in parts)


PLATFORMS: tuple[Platform, ...] = (
    Platform(
        id="tiktok",
        name="TikTok",
        color="#FE2C55",
        icon="tiktok",
        content_types=("Videos", "Photo posts"),
        hosts=("tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com"),
        # Short links (vm./vt.) carry no meaningful path, so the host alone qualifies them.
        path_patterns=_p(
            r"^/@[^/]+/(video|photo)/\d+",
            r"^/v/\d+",
            r"^/t/\w+",
            r"^/[\w.-]{4,}/?$",
        ),
    ),
    Platform(
        id="instagram",
        name="Instagram",
        color="#E1306C",
        icon="instagram",
        content_types=("Reels", "Posts", "Stories", "IGTV"),
        hosts=("instagram.com", "instagr.am", "ddinstagram.com"),
        path_patterns=_p(
            r"^/(p|reel|reels|tv)/[\w-]+",
            r"^/stories/[^/]+/\d+",
            r"^/share/(reel|p)/[\w-]+",
            r"^/[\w.]+/(p|reel|reels|tv)/[\w-]+",
        ),
        notes="Private accounts and some Stories need a cookie jar.",
    ),
    Platform(
        id="youtube",
        name="YouTube",
        color="#FF0000",
        icon="youtube",
        content_types=("Videos", "Shorts", "Music", "Live replays"),
        hosts=("youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"),
        path_patterns=_p(
            r"^/watch",
            r"^/shorts/[\w-]+",
            r"^/live/[\w-]+",
            r"^/embed/[\w-]+",
            r"^/v/[\w-]+",
            r"^/[\w-]{6,}/?$",  # youtu.be/<id>
        ),
    ),
    Platform(
        id="twitter",
        name="X (Twitter)",
        color="#1D9BF0",
        icon="twitter",
        content_types=("Videos", "GIFs", "Spaces"),
        hosts=("twitter.com", "x.com", "mobile.twitter.com", "fxtwitter.com", "vxtwitter.com", "t.co"),
        path_patterns=_p(
            r"^/[^/]+/status/\d+",
            r"^/i/(status|web/status)/\d+",
            r"^/i/spaces/\w+",
            r"^/\w{8,}/?$",  # t.co short link
        ),
    ),
    Platform(
        id="facebook",
        name="Facebook",
        color="#1877F2",
        icon="facebook",
        content_types=("Videos", "Reels", "Watch", "Stories"),
        hosts=("facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch", "fb.com"),
        path_patterns=_p(
            r"^/[^/]+/videos/",
            r"^/(reel|watch|video)",
            r"^/share/(v|r)/[\w-]+",
            r"^/story\.php",
            r"^/permalink\.php",
            r"^/\w+/?$",  # fb.watch/<id>
        ),
    ),
    Platform(
        id="pinterest",
        name="Pinterest",
        color="#E60023",
        icon="pinterest",
        content_types=("Pins", "Idea Pins", "Videos"),
        hosts=("pinterest.com", "pin.it", "pinterest.co.uk", "pinterest.ca", "pinterest.fr", "pinterest.de", "pinterest.com.au"),
        path_patterns=_p(
            r"^/pin/[\w-]+",
            r"^/\w{5,}/?$",  # pin.it short link
        ),
    ),
    Platform(
        id="reddit",
        name="Reddit",
        color="#FF4500",
        icon="reddit",
        content_types=("Videos", "GIFs", "Posts"),
        hosts=("reddit.com", "old.reddit.com", "np.reddit.com", "redd.it", "v.redd.it"),
        path_patterns=_p(
            r"^/r/[^/]+/comments/\w+",
            r"^/r/[^/]+/s/\w+",
            r"^/\w+/?$",  # redd.it short link
        ),
    ),
    Platform(
        id="snapchat",
        name="Snapchat",
        color="#FFFC00",
        icon="snapchat",
        content_types=("Spotlight", "Public Stories"),
        hosts=("snapchat.com", "story.snapchat.com", "t.snapchat.com"),
        path_patterns=_p(
            r"^/spotlight/\w+",
            r"^/p/[\w-]+",
            r"^/add/[^/]+",
            r"^/[^/]+/\d+",
        ),
        notes="Only public Spotlight and Public Story content is extractable.",
    ),
    Platform(
        id="linkedin",
        name="LinkedIn",
        color="#0A66C2",
        icon="linkedin",
        content_types=("Post videos", "Native uploads"),
        hosts=("linkedin.com", "www.linkedin.com", "lnkd.in"),
        path_patterns=_p(
            r"^/posts/[\w-]+",
            r"^/feed/update/",
            r"^/video/",
            r"^/\w+/?$",  # lnkd.in short link
        ),
    ),
    Platform(
        id="vimeo",
        name="Vimeo",
        color="#1AB7EA",
        icon="vimeo",
        content_types=("Videos", "Staff Picks"),
        hosts=("vimeo.com", "player.vimeo.com"),
        path_patterns=_p(
            r"^/\d+",
            r"^/channels/[^/]+/\d+",
            r"^/groups/[^/]+/videos/\d+",
            r"^/video/\d+",
        ),
    ),
    Platform(
        id="dailymotion",
        name="Dailymotion",
        color="#0EA5E9",
        icon="dailymotion",
        content_types=("Videos", "Shorts"),
        hosts=("dailymotion.com", "dai.ly", "geo.dailymotion.com"),
        path_patterns=_p(
            r"^/video/\w+",
            r"^/embed/video/\w+",
            r"^/\w+/?$",  # dai.ly short link
        ),
    ),
    Platform(
        id="twitch",
        name="Twitch",
        color="#9146FF",
        icon="twitch",
        content_types=("Clips", "VODs", "Highlights"),
        hosts=("twitch.tv", "m.twitch.tv", "clips.twitch.tv"),
        path_patterns=_p(
            r"^/videos/\d+",
            r"^/[^/]+/clip/[\w-]+",
            r"^/[\w-]+/?$",  # clips.twitch.tv/<slug>
        ),
    ),
)

PLATFORMS_BY_ID: dict[str, Platform] = {p.id: p for p in PLATFORMS}

# host → platform, including the "www." variant of every declared host.
_HOST_INDEX: dict[str, Platform] = {}
for _platform in PLATFORMS:
    for _host in _platform.hosts:
        _HOST_INDEX[_host] = _platform
        _HOST_INDEX[f"www.{_host}"] = _platform

# Hosts whose entire purpose is redirecting — any path on them is a valid target.
_SHORTENER_HOSTS = frozenset({
    "vm.tiktok.com", "vt.tiktok.com", "youtu.be", "fb.watch", "fb.com", "pin.it",
    "redd.it", "v.redd.it", "dai.ly", "lnkd.in", "t.co", "instagr.am", "t.snapchat.com",
})


def _normalise_host(host: str) -> str:
    host = host.lower().strip()
    if ":" in host:  # strip an explicit port
        host = host.split(":", 1)[0]
    return host.rstrip(".")


def detect(url: str) -> Platform | None:
    """Return the platform a URL belongs to, or ``None`` when nothing matches.

    ``None`` covers both "host we don't know" and "host we know but a path that isn't
    downloadable content" — the caller decides whether that's a 422 or a hand-off to
    yt-dlp's generic extractor.
    """
    if not url or not isinstance(url, str):
        return None

    candidate = url.strip()
    if not candidate:
        return None
    if "://" not in candidate:
        candidate = f"https://{candidate}"

    try:
        parts = urlsplit(candidate)
    except ValueError:
        return None

    if parts.scheme not in ("http", "https"):
        return None

    host = _normalise_host(parts.hostname or "")
    if not host:
        return None

    platform = _HOST_INDEX.get(host)
    if platform is None:
        # Fall back to a suffix match so regional and subdomain variants
        # (de.pinterest.com, gaming.facebook.com) still resolve.
        for known_host, known_platform in _HOST_INDEX.items():
            if host.endswith(f".{known_host}"):
                platform = known_platform
                break
    if platform is None:
        return None

    if host in _SHORTENER_HOSTS:
        return platform if parts.path.strip("/") else None

    if not platform.path_patterns:
        return platform

    path = parts.path or "/"
    if any(pattern.search(path) for pattern in platform.path_patterns):
        return platform

    # A known host with an unrecognised path — a profile page, a login screen, the
    # homepage. Treat it as not-content rather than pretending it will extract.
    return None


def detect_host_only(url: str) -> Platform | None:
    """Host match without the path check.

    Used for error copy: it lets the API say "that Instagram link doesn't point at a
    post" instead of the generic "not supported".
    """
    if not url:
        return None
    candidate = url if "://" in url else f"https://{url}"
    try:
        host = _normalise_host(urlsplit(candidate).hostname or "")
    except ValueError:
        return None
    if not host:
        return None
    if host in _HOST_INDEX:
        return _HOST_INDEX[host]
    for known_host, known_platform in _HOST_INDEX.items():
        if host.endswith(f".{known_host}"):
            return known_platform
    return None


def as_dict(platform: Platform) -> dict:
    """Serialise for the ``/api/platforms`` catalogue."""
    return {
        "id": platform.id,
        "name": platform.name,
        "color": platform.color,
        "icon": platform.icon,
        "contentTypes": list(platform.content_types),
        "hosts": [h for h in platform.hosts],
        "notes": platform.notes or None,
    }
