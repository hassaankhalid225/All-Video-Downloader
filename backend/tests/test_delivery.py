"""Byte delivery: freshness, the retry, and the render fallback.

The bug these cover: the metadata cache keeps an extraction for five minutes, but the
signed CDN URLs inside it expire sooner. Streaming a cached-but-stale URL produced a 403
that looked to the user like "forbidden" when it actually meant "too old".
"""

import time

import pytest

from services import downloader
from services.cache import metadata_cache
from utils.errors import UpstreamUnavailableError

URL = "https://www.youtube.com/watch?v=test"


def make_internal(needs_mux=False, direct=True):
    return downloader.InternalFormat(
        id="mp4_360p",
        ext="mp4",
        mime="video/mp4",
        needs_mux=needs_mux,
        selector="18",
        direct_url="https://cdn.example.com/v.mp4" if direct else None,
        http_headers={"User-Agent": "test"},
        filesize=1000,
    )


def make_extraction(created_at=None):
    internal = make_internal()
    extraction = downloader.Extraction(
        url=URL,
        platform_id="youtube",
        platform_name="YouTube",
        platform_color="#FF0000",
        info={"title": "t", "formats": []},
        formats=[],
        internal={"mp4_360p": internal},
    )
    if created_at is not None:
        extraction.created_at = created_at
    return extraction


@pytest.fixture
def spy(monkeypatch):
    """Instrument the three collaborators open_stream orchestrates."""
    calls = {"extract": 0, "direct": 0, "render": 0}

    async def fake_build(url):
        calls["extract"] += 1
        return make_extraction()

    async def fake_direct(internal, range_header=None):
        calls["direct"] += 1
        return (iter(()), {"content-type": "video/mp4"}, 200)

    async def fake_render(url, internal):
        calls["render"] += 1
        return (iter(()), {"content-type": "video/mp4"}, 200)

    monkeypatch.setattr(downloader, "build_extraction", fake_build)
    monkeypatch.setattr(downloader, "stream_direct", fake_direct)
    monkeypatch.setattr(downloader, "render_and_stream", fake_render)
    metadata_cache.clear()
    return calls


async def test_direct_path_is_used_when_it_works(spy):
    await downloader.open_stream(URL, "mp4_360p")
    assert spy["direct"] == 1
    assert spy["render"] == 0
    assert spy["extract"] == 1


async def test_muxed_format_skips_the_direct_path(spy, monkeypatch):
    async def fake_build(url):
        spy["extract"] += 1
        extraction = make_extraction()
        extraction.internal["mp4_360p"] = make_internal(needs_mux=True, direct=False)
        return extraction

    monkeypatch.setattr(downloader, "build_extraction", fake_build)

    await downloader.open_stream(URL, "mp4_360p")
    assert spy["direct"] == 0
    assert spy["render"] == 1


async def test_a_rejected_url_triggers_a_fresh_extraction(spy, monkeypatch):
    """A 403 from the CDN means the signed URL aged out, not that access is denied."""
    attempts = {"n": 0}

    async def flaky_direct(internal, range_header=None):
        attempts["n"] += 1
        spy["direct"] += 1
        if attempts["n"] == 1:
            raise UpstreamUnavailableError(detail="upstream 403")
        return (iter(()), {"content-type": "video/mp4"}, 200)

    monkeypatch.setattr(downloader, "stream_direct", flaky_direct)

    await downloader.open_stream(URL, "mp4_360p")
    assert spy["direct"] == 2, "should retry after the rejection"
    assert spy["extract"] == 2, "the retry must use a fresh extraction"
    assert spy["render"] == 0


async def test_falls_back_to_a_local_render_when_the_proxy_keeps_failing(spy, monkeypatch):
    async def always_403(internal, range_header=None):
        spy["direct"] += 1
        raise UpstreamUnavailableError(detail="upstream 403")

    monkeypatch.setattr(downloader, "stream_direct", always_403)

    iterator, headers, status = await downloader.open_stream(URL, "mp4_360p")
    assert spy["direct"] == 2
    assert spy["render"] == 1, "the user gets their file even when the proxy cannot deliver"
    assert status == 200


async def test_a_render_does_not_pay_for_a_freshness_re_extraction(spy, monkeypatch):
    """yt-dlp re-resolves every URL during a render, so forcing one first is wasted time."""

    async def fake_build(url):
        spy["extract"] += 1
        extraction = make_extraction(created_at=time.monotonic() - 600)  # very stale
        extraction.internal["mp4_360p"] = make_internal(needs_mux=True, direct=False)
        return extraction

    monkeypatch.setattr(downloader, "build_extraction", fake_build)

    await downloader.open_stream(URL, "mp4_360p")
    assert spy["render"] == 1
    assert spy["extract"] == 1, "a stale entry is fine for a render; do not re-extract"


async def test_a_stale_cache_entry_is_re_extracted_before_delivery(spy):
    """The regression: a cached extraction older than the delivery bound must not be used."""
    stale = make_extraction(created_at=time.monotonic() - 600)
    metadata_cache.set(f"extract:{URL}", stale)

    await downloader.open_stream(URL, "mp4_360p")
    assert spy["extract"] >= 1, "stale entry should have been discarded and re-extracted"


async def test_a_fresh_cache_entry_is_reused(spy):
    fresh = make_extraction(created_at=time.monotonic())
    metadata_cache.set(f"extract:{URL}", fresh)

    await downloader.open_stream(URL, "mp4_360p")
    assert spy["extract"] == 0, "a fresh entry should not trigger another extraction"
    assert spy["direct"] == 1


async def test_metadata_still_uses_the_long_cache(spy):
    """Delivery is stricter than preview on purpose — the preview must stay cheap."""
    slightly_old = make_extraction(created_at=time.monotonic() - 120)
    metadata_cache.set(f"extract:{URL}", slightly_old)

    await downloader.get_extraction(URL)
    assert spy["extract"] == 0

    # …but the same entry is too old to deliver bytes from.
    await downloader.open_stream(URL, "mp4_360p")
    assert spy["extract"] == 1
