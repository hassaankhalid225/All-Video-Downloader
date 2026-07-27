"""Live extraction against real URLs.

Excluded from the default run: these hit third-party servers, so they fail for reasons
that have nothing to do with this codebase (a video gets deleted, a platform blocks the
egress IP, yt-dlp needs an update). Run deliberately:

    pytest -m live

Treat a failure here as "check yt-dlp and the URL", not "the build is broken".
"""

import pytest

pytestmark = pytest.mark.live

# Long-lived, public, license-friendly content chosen so the fixtures do not rot quickly.
CASES = [
    ("youtube", "https://www.youtube.com/watch?v=aqz-KE-bpKQ"),
    ("youtube-shorts", "https://www.youtube.com/shorts/tPEE9ZwTmy0"),
]


@pytest.mark.parametrize("name,url", CASES)
def test_metadata_extraction(client, name, url):
    response = client.post("/api/metadata", json={"url": url})
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["title"]
    assert body["formats"], "extraction produced no usable formats"
    assert sum(1 for f in body["formats"] if f["recommended"]) == 1
    assert body["thumbnail"]


@pytest.mark.parametrize("name,url", CASES)
def test_download_authorisation(client, name, url):
    formats = client.post("/api/metadata", json={"url": url}).json()["formats"]
    recommended = next(f for f in formats if f["recommended"])

    response = client.post("/api/download", json={"url": url, "format_id": recommended["id"]})
    assert response.status_code == 200, response.text
    assert response.json()["download_url"].startswith("/api/file?t=")


def test_first_bytes_actually_transfer(client):
    """The proxy path end to end: extraction, token, and a real byte stream."""
    url = "https://www.youtube.com/shorts/tPEE9ZwTmy0"
    formats = client.post("/api/metadata", json={"url": url}).json()["formats"]
    direct = next((f for f in formats if not f["needsMux"] and f["kind"] == "video"), None)
    if direct is None:
        pytest.skip("no directly streamable format for this source")

    authorised = client.post("/api/download", json={"url": url, "format_id": direct["id"]}).json()
    response = client.get(authorised["download_url"])

    assert response.status_code in (200, 206)
    assert len(response.content) > 1024
    assert "attachment" in response.headers["content-disposition"]


def test_deleted_content_reports_404(client):
    response = client.post(
        "/api/metadata", json={"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa"}
    )
    assert response.status_code in (403, 404), response.text


def test_unsupported_site_is_rejected(client):
    """Anything outside the catalogue must fail cleanly rather than 200 with no formats.

    The exact code depends on how far the generic extractor gets: a missing page is a
    404, a real page with no media is a 422, an extractor crash is a 500.
    """
    response = client.post("/api/metadata", json={"url": "https://example.com/not-a-video"})
    assert response.status_code in (404, 422, 500), response.text
    assert response.json()["success"] is False
