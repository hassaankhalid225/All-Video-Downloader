"""Download-token signing.

Without a valid signature `/api/file` would fetch any URL a caller supplied, which turns
the service into an open proxy.
"""

import time

import pytest

from utils import tokens
from utils.errors import BadTokenError, TokenExpiredError


def test_round_trip():
    token, signature, ttl = tokens.issue("https://vimeo.com/1", "mp4_720p", "a.mp4")
    payload = tokens.verify(token, signature)
    assert payload["u"] == "https://vimeo.com/1"
    assert payload["f"] == "mp4_720p"
    assert payload["n"] == "a.mp4"
    assert ttl > 0


def test_rejects_a_forged_signature():
    token, _, _ = tokens.issue("https://vimeo.com/1", "mp4_720p", "a.mp4")
    with pytest.raises(BadTokenError):
        tokens.verify(token, "not-the-signature")


def test_rejects_a_tampered_payload():
    """The whole point: swapping the URL must invalidate the token."""
    _, signature, _ = tokens.issue("https://vimeo.com/1", "mp4_720p", "a.mp4")
    other_token, _, _ = tokens.issue("http://169.254.169.254/meta-data", "mp4_720p", "a.mp4")
    with pytest.raises(BadTokenError):
        tokens.verify(other_token, signature)


def test_rejects_expired_tokens():
    token, signature, _ = tokens.issue("https://vimeo.com/1", "mp4_720p", "a.mp4", ttl=-1)
    with pytest.raises(TokenExpiredError):
        tokens.verify(token, signature)


def test_accepts_a_token_that_is_still_valid():
    token, signature, _ = tokens.issue("https://vimeo.com/1", "mp4_720p", "a.mp4", ttl=60)
    assert tokens.verify(token, signature)["exp"] > int(time.time())


@pytest.mark.parametrize("token,signature", [("", ""), ("abc", ""), ("", "abc"), ("!!!", "!!!")])
def test_rejects_malformed_input(token, signature):
    with pytest.raises(BadTokenError):
        tokens.verify(token, signature)


def test_token_is_url_safe():
    token, signature, _ = tokens.issue(
        "https://vimeo.com/1?a=b&c=d", "mp4_720p", "ünïcödé name.mp4"
    )
    for value in (token, signature):
        assert "+" not in value and "/" not in value and "=" not in value
