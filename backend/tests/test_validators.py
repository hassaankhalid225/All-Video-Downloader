"""URL normalisation, the SSRF guard, and filename safety."""

import pytest

from utils.errors import InvalidUrlError
from utils.validators import looks_like_url, normalize_url, sanitize_filename


class TestNormalize:
    def test_strips_tracking_params(self):
        result = normalize_url(
            "https://www.tiktok.com/@u/video/7301?utm_source=x&is_from_webapp=1&sender_device=pc"
        )
        assert result == "https://www.tiktok.com/@u/video/7301"

    def test_keeps_meaningful_params(self):
        result = normalize_url("https://www.youtube.com/watch?v=abc&list=PL1&utm_medium=x")
        assert "v=abc" in result
        assert "list=PL1" in result
        assert "utm_medium" not in result

    def test_v_param_survives_even_though_short(self):
        """`v` is on the tracking blocklist for other sites but identifies YouTube videos."""
        assert normalize_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ").endswith("v=dQw4w9WgXcQ")

    def test_adds_missing_scheme(self):
        assert normalize_url("www.instagram.com/reel/ABC/").startswith("https://")

    def test_upgrades_http_to_https(self):
        assert normalize_url("http://vimeo.com/123").startswith("https://")

    def test_strips_chat_app_wrapping(self):
        assert normalize_url("<https://youtu.be/abc>") == "https://youtu.be/abc"
        assert normalize_url('  "https://youtu.be/abc"  ') == "https://youtu.be/abc"

    def test_drops_fragment(self):
        assert normalize_url("https://vimeo.com/123#t=10") == "https://vimeo.com/123"

    def test_strips_trailing_slash(self):
        assert normalize_url("https://vimeo.com/123/") == "https://vimeo.com/123"

    def test_is_idempotent(self):
        once = normalize_url("https://www.tiktok.com/@u/video/7301?utm_source=x")
        assert normalize_url(once) == once

    @pytest.mark.parametrize(
        "bad",
        [
            "", "   ", "not a url", "ftp://example.com/x", "javascript:alert(1)",
            "file:///etc/passwd", "https://", "https://nodot", "x" * 3000,
        ],
    )
    def test_rejects_malformed(self, bad):
        with pytest.raises(InvalidUrlError):
            normalize_url(bad)

    @pytest.mark.parametrize(
        "bad",
        [
            "http://localhost:8000/admin",
            "https://127.0.0.1/x",
            "https://10.0.0.5/v",
            "https://192.168.1.1/v",
            "https://172.16.0.1/v",
            "https://169.254.169.254/latest/meta-data/",  # cloud metadata service
            "https://[::1]/x",
            "https://something.internal/x",
            "https://box.local/x",
            "https://0.0.0.0/x",
        ],
    )
    def test_blocks_ssrf_targets(self, bad):
        """Without this the extractor is a request-forgery gadget."""
        with pytest.raises(InvalidUrlError):
            normalize_url(bad)


class TestFilenames:
    def test_uses_the_documented_shape(self):
        assert sanitize_filename("Hello World", "tiktok", "mp4") == "alldown_tiktok_Hello_World.mp4"

    def test_strips_path_traversal(self):
        name = sanitize_filename("../../etc/passwd", "reddit", "mp4")
        assert ".." not in name
        assert "/" not in name and "\\" not in name

    def test_folds_unicode_to_ascii(self):
        name = sanitize_filename("Ünïcödé — Tïtlé 🔥", "instagram", "m4a")
        assert name.isascii()
        assert name.endswith(".m4a")

    def test_avoids_windows_reserved_names(self):
        assert sanitize_filename("CON", "youtube", "mp3") == "alldown_youtube_video.mp3"
        assert sanitize_filename("nul", "youtube", "mp3") == "alldown_youtube_video.mp3"

    def test_handles_empty_title(self):
        assert sanitize_filename("", "vimeo", "mp4") == "alldown_vimeo_video.mp4"

    def test_truncates_long_titles(self):
        name = sanitize_filename("word " * 200, "tiktok", "mp4")
        assert len(name) < 120

    def test_normalises_extension(self):
        assert sanitize_filename("t", "x", ".MP4").endswith(".mp4")
        assert sanitize_filename("t", "x", "").endswith(".mp4")

    def test_no_quotes_that_would_break_content_disposition(self):
        name = sanitize_filename('a "quoted" title; with, delimiters', "tiktok", "mp4")
        assert '"' not in name and ";" not in name and "," not in name


class TestLooksLikeUrl:
    @pytest.mark.parametrize(
        "value,expected",
        [
            ("https://tiktok.com/@a/video/1", True),
            ("tiktok.com/@a/video/1", True),
            ("www.youtube.com", True),
            ("hello world", False),
            ("", False),
            ("just-text", False),
        ],
    )
    def test_matches_client_expectations(self, value, expected):
        assert looks_like_url(value) is expected
