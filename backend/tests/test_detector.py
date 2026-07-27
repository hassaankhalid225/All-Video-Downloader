"""Platform detection — the table that everything else keys off."""

import pytest

from services import detector

# (url, expected platform id)
POSITIVE = [
    # TikTok
    ("https://www.tiktok.com/@user/video/7301234567890123456", "tiktok"),
    ("https://tiktok.com/@a.b_c/video/123", "tiktok"),
    ("https://vm.tiktok.com/ZMabcdef/", "tiktok"),
    ("https://vt.tiktok.com/ZSabc123/", "tiktok"),
    ("https://m.tiktok.com/v/123456.html", "tiktok"),
    ("https://www.tiktok.com/@user/photo/7301234567890123456", "tiktok"),
    # Instagram
    ("https://www.instagram.com/reel/Cx1y2z3AbCd/", "instagram"),
    ("https://www.instagram.com/p/Cx1y2z3AbCd/", "instagram"),
    ("https://instagram.com/tv/Cx1y2z3AbCd/", "instagram"),
    ("https://www.instagram.com/stories/someone/3212345678901234567/", "instagram"),
    ("https://www.instagram.com/share/reel/AbCdEf/", "instagram"),
    # YouTube
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"),
    ("https://youtu.be/dQw4w9WgXcQ", "youtube"),
    ("https://www.youtube.com/shorts/tPEE9ZwTmy0", "youtube"),
    ("https://m.youtube.com/watch?v=abc", "youtube"),
    ("https://music.youtube.com/watch?v=abc", "youtube"),
    ("https://www.youtube.com/live/abcdefg", "youtube"),
    # X / Twitter
    ("https://twitter.com/nasa/status/1234567890", "twitter"),
    ("https://x.com/nasa/status/1234567890", "twitter"),
    ("https://mobile.twitter.com/nasa/status/1234567890", "twitter"),
    ("https://x.com/i/status/1234567890", "twitter"),
    # Facebook
    ("https://www.facebook.com/somepage/videos/123456789/", "facebook"),
    ("https://fb.watch/abcDEF123/", "facebook"),
    ("https://www.facebook.com/reel/123456789", "facebook"),
    ("https://www.facebook.com/watch?v=123", "facebook"),
    ("https://web.facebook.com/share/v/abc123/", "facebook"),
    # Pinterest
    ("https://www.pinterest.com/pin/1234567890/", "pinterest"),
    ("https://pin.it/abcdef", "pinterest"),
    ("https://de.pinterest.com/pin/999/", "pinterest"),
    ("https://www.pinterest.co.uk/pin/123/", "pinterest"),
    # Reddit
    ("https://www.reddit.com/r/videos/comments/abc123/some_title/", "reddit"),
    ("https://old.reddit.com/r/aww/comments/xyz/title/", "reddit"),
    ("https://www.reddit.com/r/videos/s/AbCdEf/", "reddit"),
    ("https://v.redd.it/abcdef123", "reddit"),
    # LinkedIn
    ("https://www.linkedin.com/posts/someone_activity-123456", "linkedin"),
    ("https://www.linkedin.com/feed/update/urn:li:activity:123/", "linkedin"),
    ("https://lnkd.in/abcdef", "linkedin"),
    # Vimeo
    ("https://vimeo.com/123456789", "vimeo"),
    ("https://vimeo.com/channels/staffpicks/123456789", "vimeo"),
    ("https://player.vimeo.com/video/123456789", "vimeo"),
    # Dailymotion
    ("https://www.dailymotion.com/video/x8abcde", "dailymotion"),
    ("https://dai.ly/x8abcde", "dailymotion"),
    # Snapchat
    ("https://www.snapchat.com/spotlight/abc123", "snapchat"),
    ("https://story.snapchat.com/p/abc-def", "snapchat"),
    # Twitch
    ("https://www.twitch.tv/videos/1234567890", "twitch"),
    ("https://clips.twitch.tv/SomeClipSlug", "twitch"),
    ("https://www.twitch.tv/streamer/clip/ABCdef", "twitch"),
]

NEGATIVE = [
    "https://example.com/video/123",
    "https://www.google.com/",
    # A known host, but not a piece of content.
    "https://www.instagram.com/accounts/login/",
    "https://www.youtube.com/",
    "https://www.tiktok.com/",
    "not a url at all",
    "",
    "   ",
    "ftp://tiktok.com/@a/video/1",
    "javascript:alert(1)",
]


@pytest.mark.parametrize("url,expected", POSITIVE)
def test_detects_supported_urls(url, expected):
    platform = detector.detect(url)
    assert platform is not None, f"expected {expected}, got no match for {url}"
    assert platform.id == expected


@pytest.mark.parametrize("url", NEGATIVE)
def test_rejects_unsupported_urls(url):
    assert detector.detect(url) is None


def test_scheme_is_optional():
    assert detector.detect("www.tiktok.com/@u/video/123").id == "tiktok"


def test_catalogue_is_internally_consistent():
    ids = [p.id for p in detector.PLATFORMS]
    assert len(ids) == len(set(ids)), "platform ids must be unique"
    assert len(detector.PLATFORMS) == 12

    for platform in detector.PLATFORMS:
        assert platform.color.startswith("#") and len(platform.color) == 7
        assert platform.hosts, f"{platform.id} declares no hosts"
        assert platform.content_types, f"{platform.id} declares no content types"
        assert platform.name


def test_detect_host_only_matches_non_content_paths():
    """Used to tell the user their Instagram *profile* link isn't a post."""
    assert detector.detect("https://www.instagram.com/someuser/") is None
    assert detector.detect_host_only("https://www.instagram.com/someuser/").id == "instagram"
    assert detector.detect_host_only("https://example.com/x") is None


def test_as_dict_is_serialisable():
    payload = detector.as_dict(detector.PLATFORMS_BY_ID["tiktok"])
    assert payload["id"] == "tiktok"
    assert isinstance(payload["contentTypes"], list)
    assert isinstance(payload["hosts"], list)
