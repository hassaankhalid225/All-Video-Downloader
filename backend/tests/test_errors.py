"""Extractor-message classification.

yt-dlp reports nearly everything as one generic error type, so these strings are the only
signal available. Each case below is a real message shape seen from the extractors.
"""

import pytest

from utils import errors


@pytest.mark.parametrize(
    "raw,expected",
    [
        # Private / auth
        ("ERROR: [youtube] abc: Private video. Sign in if you've been granted access", errors.PrivateContentError),
        ("ERROR: [instagram] Requested content is not available, rate-limit reached or login required", errors.PrivateContentError),
        ("ERROR: [youtube] Sign in to confirm your age", errors.PrivateContentError),
        ("ERROR: [youtube] This video is available to this channel's members only", errors.PrivateContentError),
        ("ERROR: Use --cookies-from-browser or --cookies for the authentication", errors.PrivateContentError),
        ("ERROR: unable to download video data: HTTP Error 403: Forbidden", errors.PrivateContentError),
        # Geo
        ("ERROR: [youtube] The uploader has not made this video available in your country", errors.GeoRestrictedError),
        ("ERROR: This video is geo-restricted", errors.GeoRestrictedError),
        # Gone
        ("ERROR: [youtube] abc: Video unavailable. This video has been removed by the uploader", errors.ContentNotFoundError),
        ("ERROR: [dailymotion] x8xnxpb: Not found.", errors.ContentNotFoundError),
        ("ERROR: [twitter] 123: Page not found", errors.ContentNotFoundError),
        ("ERROR: [youtube] This video is no longer available because the account was terminated", errors.ContentNotFoundError),
        # Upstream throttling
        ("ERROR: Unable to download webpage: HTTP Error 429: Too Many Requests", errors.RateLimitedError),
        # Wrong kind of link
        ("ERROR: Unsupported URL: https://example.com/page", errors.UnsupportedPlatformError),
        ("ERROR: [TikTok] 123: No video formats found!; please report this issue", errors.NoMediaFoundError),
        # Network
        ("ERROR: Unable to download webpage: The read operation timed out", errors.TimeoutError_),
        ("ERROR: Unable to download webpage: <urlopen error [Errno 111] Connection refused>", errors.UpstreamUnavailableError),
        ("ERROR: HTTP Error 503: Service Unavailable", errors.UpstreamUnavailableError),
        # Unknown
        ("ERROR: something nobody has seen before", errors.ExtractionError),
        ("", errors.ExtractionError),
    ],
)
def test_classification(raw, expected):
    assert isinstance(errors.classify_extractor_error(raw), expected)


def test_photo_post_is_not_reported_as_unsupported_platform():
    """A TikTok photo carousel is a supported platform with nothing to download.

    Saying 'this platform is not yet supported' would send the user looking for a
    different site when they just need a different link.
    """
    error = errors.classify_extractor_error("ERROR: [TikTok] 123: No video formats found!")
    assert error.status_code == 422
    assert error.code == "NO_MEDIA_FOUND"
    assert "photo" in error.message.lower()


@pytest.mark.parametrize(
    "exc,status",
    [
        (errors.InvalidUrlError, 400),
        (errors.PrivateContentError, 403),
        (errors.ContentNotFoundError, 404),
        (errors.FormatNotAvailableError, 404),
        (errors.UnsupportedPlatformError, 422),
        (errors.NoMediaFoundError, 422),
        (errors.RateLimitedError, 429),
        (errors.GeoRestrictedError, 451),
        (errors.ExtractionError, 500),
        (errors.BadTokenError, 400),
        (errors.TokenExpiredError, 410),
        (errors.FileTooLargeError, 413),
        (errors.UpstreamUnavailableError, 502),
        (errors.TimeoutError_, 504),
    ],
)
def test_status_codes_match_the_published_spec(exc, status):
    assert exc().status_code == status


def test_messages_are_safe_to_render():
    """No URLs, paths or stack traces in anything shown to a user."""
    for name in dir(errors):
        candidate = getattr(errors, name)
        if isinstance(candidate, type) and issubclass(candidate, errors.AllDownError):
            message = candidate().message
            assert message
            assert message[0].isupper()
            assert "http" not in message.lower()
            assert "Traceback" not in message


def test_raw_detail_is_carried_but_separate():
    error = errors.classify_extractor_error("ERROR: [youtube] abc: Private video")
    assert error.detail == "ERROR: [youtube] abc: Private video"
    assert error.detail != error.message
