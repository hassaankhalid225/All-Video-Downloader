"""Endpoint behaviour.

Extraction is stubbed so these stay deterministic and offline. The live counterparts are
in ``test_live.py`` behind the ``live`` marker.
"""

import pytest

from utils import errors

FAKE_INFO = {
    "id": "7301234567890123456",
    "title": "when the beat drops at exactly the right moment",
    "duration": 45,
    "uploader": "nightowl",
    "uploader_url": "https://www.tiktok.com/@nightowl",
    "view_count": 1204553,
    "like_count": 88123,
    "webpage_url": "https://www.tiktok.com/@nightowl/video/7301234567890123456",
    "thumbnail": "https://cdn.example.com/thumb.jpg",
    "extractor_key": "TikTok",
    "http_headers": {"User-Agent": "test", "Referer": "https://www.tiktok.com/"},
    "formats": [
        {
            "format_id": "h264_1080p", "url": "https://cdn.example.com/1080.mp4", "ext": "mp4",
            "width": 1080, "height": 1920, "tbr": 2000, "fps": 30, "protocol": "https",
            "vcodec": "h264", "acodec": "aac",
        },
        {
            "format_id": "h264_720p", "url": "https://cdn.example.com/720.mp4", "ext": "mp4",
            "width": 720, "height": 1280, "tbr": 1000, "fps": 30, "protocol": "https",
            "vcodec": "h264", "acodec": "aac",
        },
        {
            "format_id": "audio", "url": "https://cdn.example.com/a.m4a", "ext": "m4a",
            "abr": 128, "tbr": 128, "protocol": "https", "vcodec": "none", "acodec": "aac",
        },
    ],
}

TIKTOK_URL = "https://www.tiktok.com/@nightowl/video/7301234567890123456"


@pytest.fixture
def stub_extraction(monkeypatch):
    from services import downloader

    async def fake_extract(url):
        return dict(FAKE_INFO)

    monkeypatch.setattr(downloader, "_extract", fake_extract)


@pytest.fixture
def stub_failure(monkeypatch):
    from services import downloader

    def _install(exc):
        async def fake_extract(url):
            raise exc

        monkeypatch.setattr(downloader, "_extract", fake_extract)

    return _install


class TestHealth:
    def test_reports_the_engine_version(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] in ("ok", "degraded")
        assert body["version"]
        assert "uptime" in body and "cache_entries" in body

    def test_is_not_rate_limited(self, client):
        for _ in range(30):
            assert client.get("/api/health").status_code == 200


class TestPlatforms:
    def test_returns_the_full_catalogue(self, client):
        body = client.get("/api/platforms").json()
        assert body["success"] is True
        assert len(body["platforms"]) == 12
        ids = {p["id"] for p in body["platforms"]}
        assert {"tiktok", "instagram", "youtube", "twitter", "facebook", "pinterest"} <= ids

    def test_every_entry_has_what_the_ui_renders(self, client):
        for platform in client.get("/api/platforms").json()["platforms"]:
            assert platform["name"] and platform["color"].startswith("#")
            assert platform["contentTypes"] and platform["hosts"]


class TestMetadata:
    def test_happy_path(self, client, stub_extraction):
        response = client.post("/api/metadata", json={"url": TIKTOK_URL})
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["platform"] == "tiktok"
        assert body["platformName"] == "TikTok"
        assert body["title"] == FAKE_INFO["title"]
        assert body["duration"] == 45
        assert body["durationLabel"] == "0:45"
        assert body["formats"]

    def test_formats_match_the_published_schema(self, client, stub_extraction):
        for fmt in client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]:
            assert set(fmt) >= {"id", "label", "ext", "quality", "kind", "recommended", "needsMux"}
            assert fmt["kind"] in ("video", "audio")

    def test_exactly_one_recommended_format(self, client, stub_extraction):
        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert sum(1 for f in formats if f["recommended"]) == 1

    def test_vertical_video_is_labelled_by_its_short_side(self, client, stub_extraction):
        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert {"1080p", "720p"} <= {f["quality"] for f in formats}
        assert "4K" not in {f["quality"] for f in formats}

    def test_results_are_cached(self, client, stub_extraction):
        from services.cache import metadata_cache

        client.post("/api/metadata", json={"url": TIKTOK_URL})
        before = metadata_cache.hits
        client.post("/api/metadata", json={"url": TIKTOK_URL})
        assert metadata_cache.hits > before

    def test_tracking_params_share_a_cache_entry(self, client, stub_extraction):
        from services.cache import metadata_cache

        client.post("/api/metadata", json={"url": TIKTOK_URL})
        entries = metadata_cache.size
        client.post("/api/metadata", json={"url": f"{TIKTOK_URL}?utm_source=x&is_from_webapp=1"})
        assert metadata_cache.size == entries

    @pytest.mark.parametrize(
        "url", ["", "not-a-url", "http://localhost/x", "https://169.254.169.254/", "ftp://a.com/b"]
    )
    def test_rejects_bad_urls_with_400(self, client, url):
        assert client.post("/api/metadata", json={"url": url}).status_code == 400

    def test_missing_body_is_400(self, client):
        assert client.post("/api/metadata", json={}).status_code == 400

    def test_profile_link_gets_a_specific_message(self, client):
        """'Not supported' would send them to another site; they need another link."""
        response = client.post("/api/metadata", json={"url": "https://www.instagram.com/someuser/"})
        assert response.status_code == 422
        message = response.json()["error"]["message"]
        assert "Instagram" in message

    @pytest.mark.parametrize(
        "exc,status,code",
        [
            (errors.PrivateContentError(), 403, "PRIVATE_CONTENT"),
            (errors.ContentNotFoundError(), 404, "CONTENT_NOT_FOUND"),
            (errors.NoMediaFoundError(), 422, "NO_MEDIA_FOUND"),
            (errors.GeoRestrictedError(), 451, "GEO_RESTRICTED"),
            (errors.ExtractionError(), 500, "EXTRACTION_FAILED"),
            (errors.TimeoutError_(), 504, "EXTRACTION_TIMEOUT"),
        ],
    )
    def test_extractor_failures_map_to_the_documented_codes(
        self, client, stub_failure, exc, status, code
    ):
        stub_failure(exc)
        response = client.post("/api/metadata", json={"url": TIKTOK_URL})
        assert response.status_code == status
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == code
        assert body["error"]["message"]

    def test_failures_are_not_cached(self, client, stub_failure, monkeypatch):
        """A transient platform error must not poison the URL for the whole TTL."""
        stub_failure(errors.UpstreamUnavailableError())
        assert client.post("/api/metadata", json={"url": TIKTOK_URL}).status_code == 502

        from services import downloader

        async def works(url):
            return dict(FAKE_INFO)

        monkeypatch.setattr(downloader, "_extract", works)
        assert client.post("/api/metadata", json={"url": TIKTOK_URL}).status_code == 200

    def test_every_format_carries_a_signed_download_url(self, client, stub_extraction):
        """Saves a round trip: the client goes straight to /api/file on click."""
        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert formats
        for fmt in formats:
            assert fmt["downloadUrl"].startswith("/api/file?t=")
            assert "&s=" in fmt["downloadUrl"]
            assert fmt["filename"].startswith("alldown_tiktok_")
            assert fmt["filename"].endswith(f".{fmt['ext']}")

    def test_embedded_tokens_actually_verify(self, client, stub_extraction):
        from urllib.parse import parse_qs, urlparse

        from utils import tokens

        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        query = parse_qs(urlparse(formats[0]["downloadUrl"]).query)
        payload = tokens.verify(query["t"][0], query["s"][0])
        assert payload["f"] == formats[0]["id"]

    def test_signing_does_not_leak_into_the_cache(self, client, stub_extraction):
        """The ladder is shared and cached; stamping a token onto it would poison it."""
        from services.cache import metadata_cache

        client.post("/api/metadata", json={"url": TIKTOK_URL})
        cached = metadata_cache.get(f"extract:{TIKTOK_URL}")
        assert cached is not None
        assert all(option.downloadUrl is None for option in cached.formats)

    def test_tokens_are_reissued_on_a_cache_hit(self, client, stub_extraction):
        """A second visitor must not receive the first visitor's expiring token."""
        first = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        second = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert first[0]["downloadUrl"] and second[0]["downloadUrl"]

    def test_download_urls_are_absolute_when_a_public_origin_is_set(
        self, client, stub_extraction, monkeypatch
    ):
        """In production the browser must fetch media from the API, not through the proxy.

        Routing video through the frontend's serverless functions pays for every byte
        twice and dies at the platform's request-duration ceiling, which hands a slow
        connection a truncated file.
        """
        import dataclasses

        from config import settings
        from services import downloader

        # Settings is frozen, so swap in a modified copy on the module that reads it.
        # routers/download.py delegates to downloader.file_url, so this covers both paths.
        monkeypatch.setattr(
            downloader,
            "settings",
            dataclasses.replace(settings, public_base_url="https://api.example.com"),
        )

        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert all(f["downloadUrl"].startswith("https://api.example.com/api/file?t=") for f in formats)

        authorised = client.post(
            "/api/download", json={"url": TIKTOK_URL, "format_id": formats[0]["id"]}
        ).json()
        assert authorised["download_url"].startswith("https://api.example.com/api/file?t=")

        # And the helper itself, without the HTTP layer in the way.
        assert downloader.file_url("t", "s") == "https://api.example.com/api/file?t=t&s=s"

    def test_download_urls_stay_relative_by_default(self, client, stub_extraction):
        """Unset means local development, where the frontend proxy is the right path."""
        formats = client.post("/api/metadata", json={"url": TIKTOK_URL}).json()["formats"]
        assert all(f["downloadUrl"].startswith("/api/file?t=") for f in formats)

    def test_sends_rate_limit_headers(self, client, stub_extraction):
        response = client.post("/api/metadata", json={"url": TIKTOK_URL})
        assert "x-ratelimit-limit" in response.headers
        assert "x-ratelimit-remaining" in response.headers


class TestDownload:
    def test_returns_a_relative_signed_url(self, client, stub_extraction):
        response = client.post(
            "/api/download", json={"url": TIKTOK_URL, "format_id": "mp4_1080p"}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["download_url"].startswith("/api/file?t=")
        assert "&s=" in body["download_url"]
        assert body["filename"].startswith("alldown_tiktok_")
        assert body["filename"].endswith(".mp4")
        assert body["expires_in"] > 0

    def test_unknown_format_is_404(self, client, stub_extraction):
        response = client.post(
            "/api/download", json={"url": TIKTOK_URL, "format_id": "mp4_9999p"}
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "FORMAT_NOT_AVAILABLE"

    def test_missing_format_id_is_400(self, client):
        assert client.post("/api/download", json={"url": TIKTOK_URL}).status_code == 400

    def test_audio_download_declares_a_render(self, client, stub_extraction):
        body = client.post("/api/download", json={"url": TIKTOK_URL, "format_id": "mp3"}).json()
        assert body["needs_render"] is True
        assert body["filename"].endswith(".mp3")
        assert body["mime_type"] == "audio/mpeg"


class TestFile:
    def test_rejects_an_unsigned_token(self, client):
        assert client.get("/api/file?t=abc&s=def").status_code == 400

    def test_rejects_a_missing_token(self, client):
        assert client.get("/api/file").status_code == 400

    def test_rejects_an_expired_token(self, client):
        from utils import tokens

        token, signature, _ = tokens.issue(TIKTOK_URL, "mp4_1080p", "a.mp4", ttl=-10)
        response = client.get(f"/api/file?t={token}&s={signature}")
        assert response.status_code == 410
        assert response.json()["error"]["code"] == "TOKEN_EXPIRED"

    def test_a_forged_url_cannot_be_smuggled_in(self, client):
        """The signature is what stops /api/file becoming an open proxy."""
        from utils import tokens

        _, signature, _ = tokens.issue(TIKTOK_URL, "mp4_1080p", "a.mp4")
        forged, _, _ = tokens.issue("http://169.254.169.254/latest/", "mp4_1080p", "a.mp4")
        assert client.get(f"/api/file?t={forged}&s={signature}").status_code == 400


class TestErrorEnvelope:
    def test_every_error_uses_the_documented_shape(self, client):
        body = client.post("/api/metadata", json={"url": "nope"}).json()
        assert body["success"] is False
        assert set(body["error"]) == {"code", "message", "detail"}

    def test_unknown_route_is_404(self, client):
        assert client.get("/api/nothing-here").status_code == 404
