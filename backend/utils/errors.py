"""Exception hierarchy and the mapping from extractor noise to user-facing copy.

yt-dlp reports nearly everything as a generic ``DownloadError``. The message text is the
only reliable signal about *why* extraction failed, so ``classify_extractor_error`` pattern
matches it. Patterns are ordered most-specific first.
"""

from __future__ import annotations

import re


class AllDownError(Exception):
    """Base for every error that maps cleanly onto an HTTP response.

    ``message`` is rendered to the user verbatim, so it must stay free of URLs,
    stack traces and extractor jargon. ``detail`` carries the raw line and is only
    exposed when ``DEBUG`` is on.
    """

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "Something went wrong. Please try again"

    def __init__(self, message: str | None = None, detail: str | None = None) -> None:
        self.message = message or self.__class__.message
        self.detail = detail
        super().__init__(self.message)


class InvalidUrlError(AllDownError):
    status_code = 400
    code = "INVALID_URL"
    message = "Please enter a valid social media URL"


class PrivateContentError(AllDownError):
    status_code = 403
    code = "PRIVATE_CONTENT"
    message = "This content is private or restricted"


class ContentNotFoundError(AllDownError):
    status_code = 404
    code = "CONTENT_NOT_FOUND"
    message = "This content no longer exists"


class FormatNotAvailableError(AllDownError):
    status_code = 404
    code = "FORMAT_NOT_AVAILABLE"
    message = "That quality is no longer available. Pick another one"


class UnsupportedPlatformError(AllDownError):
    status_code = 422
    code = "UNSUPPORTED_PLATFORM"
    message = "This platform is not yet supported"


class NoMediaFoundError(AllDownError):
    """A supported platform, a reachable post, but nothing downloadable in it.

    Distinct from :class:`UnsupportedPlatformError` because the fix is different: the user
    needs a different link, not a different site. Telling someone TikTok "is not yet
    supported" when they pasted a TikTok photo carousel is simply wrong.
    """

    status_code = 422
    code = "NO_MEDIA_FOUND"
    message = "We couldn't find a video in that post. It may be a photo or text-only post"


class RateLimitedError(AllDownError):
    status_code = 429
    code = "RATE_LIMITED"
    message = "Too many requests. Please wait a moment"


class GeoRestrictedError(AllDownError):
    status_code = 451
    code = "GEO_RESTRICTED"
    message = "This content is not available in our server region"


class ExtractionError(AllDownError):
    status_code = 500
    code = "EXTRACTION_FAILED"
    message = "Could not process this link. Please try again"


class BadTokenError(AllDownError):
    status_code = 400
    code = "BAD_TOKEN"
    message = "This download link is malformed. Start the download again"


class TokenExpiredError(AllDownError):
    status_code = 410
    code = "TOKEN_EXPIRED"
    message = "This download link expired. Start the download again"


class FileTooLargeError(AllDownError):
    status_code = 413
    code = "FILE_TOO_LARGE"
    message = "This file is larger than we can process"


class UpstreamUnavailableError(AllDownError):
    status_code = 502
    code = "UPSTREAM_UNAVAILABLE"
    message = "The platform did not respond. Please try again"


class TimeoutError_(AllDownError):
    status_code = 504
    code = "EXTRACTION_TIMEOUT"
    message = "This link took too long to process. Please try again"


# (compiled pattern, exception class) — first match wins.
_PATTERNS: list[tuple[re.Pattern[str], type[AllDownError]]] = [
    # Auth / privacy. Checked before "not available" because the extractor often says both.
    (re.compile(r"private (video|account|profile)|is private", re.I), PrivateContentError),
    (re.compile(r"sign in to confirm|log in|login required|requires authentication", re.I), PrivateContentError),
    (re.compile(r"cookies|--cookies-from-browser|authentication", re.I), PrivateContentError),
    (re.compile(r"members[- ]only|paid members|subscriber[- ]only|premium", re.I), PrivateContentError),
    (re.compile(r"age[- ]restricted|confirm your age|nsfw", re.I), PrivateContentError),
    (re.compile(r"only available to (music )?premium", re.I), PrivateContentError),
    # Geography. Must precede the "gone" patterns: YouTube phrases a geo-block as
    # "has not made this video available in your country", which reads as both.
    (re.compile(r"available in your country|available (in|from) your (country|region)", re.I), GeoRestrictedError),
    (re.compile(r"geo[- ]?restrict|blocked in your|not available in this (country|region)", re.I), GeoRestrictedError),
    (re.compile(r"video unavailable.*country|country.*not available", re.I), GeoRestrictedError),
    # Gone.
    (re.compile(r"removed by the (uploader|user)|has been removed", re.I), ContentNotFoundError),
    (re.compile(r"no longer (exists|available)", re.I), ContentNotFoundError),
    (re.compile(r"account (has been |was |is )?(terminated|suspended|deleted|closed)", re.I), ContentNotFoundError),
    (re.compile(r"video unavailable|this (post|video|tweet|reel) (is )?(un)?available", re.I), ContentNotFoundError),
    (re.compile(r"page not found|404|does not exist|not found", re.I), ContentNotFoundError),
    (re.compile(r"copyright (claim|grounds)|terms of service violation", re.I), ContentNotFoundError),
    # Upstream throttling.
    (re.compile(r"http error 429|too many requests|rate.?limit", re.I), RateLimitedError),
    # Wrong kind of link.
    (re.compile(r"unsupported url|no suitable extractor", re.I), UnsupportedPlatformError),
    (re.compile(r"no (video|media|formats?) (formats )?found|there.s no video", re.I), NoMediaFoundError),
    (re.compile(r"is not a valid url|unable to (download )?(web)?page.*invalid", re.I), InvalidUrlError),
    # Network.
    (re.compile(r"timed? ?out|timeout", re.I), TimeoutError_),
    # TikTok and Instagram return a valid-looking page with no usable payload when they
    # are throttling an IP. It reads as a parse failure, but retrying later works, so it
    # belongs with the upstream errors rather than the generic 500.
    (re.compile(r"unexpected response from webpage request|failed to parse (json|response)", re.I), UpstreamUnavailableError),
    (re.compile(r"unable to download (web)?page|connection (reset|refused|aborted)", re.I), UpstreamUnavailableError),
    (re.compile(r"http error 5\d\d", re.I), UpstreamUnavailableError),
    (re.compile(r"http error 40[13]", re.I), PrivateContentError),
]


def classify_extractor_error(raw: str) -> AllDownError:
    """Turn a yt-dlp error string into the right ``AllDownError``.

    Falls back to :class:`ExtractionError` so an unrecognised failure still produces a
    clean 500 rather than leaking the extractor's output to the user.
    """
    text = (raw or "").strip()
    for pattern, exc in _PATTERNS:
        if pattern.search(text):
            return exc(detail=text)
    return ExtractionError(detail=text)
