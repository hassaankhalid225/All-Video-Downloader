"""The format ladder — reducing 30-80 raw yt-dlp formats to a handful of real choices."""

import pytest

from services.downloader import (
    _build_ladder,
    _format_height,
    _tier_for,
    format_bytes,
    format_duration,
)


def video(fid, width, height, *, progressive=True, ext="mp4", tbr=1000, proto="https", fps=30):
    return {
        "format_id": fid,
        "url": f"https://cdn.example.com/{fid}",
        "ext": ext,
        "width": width,
        "height": height,
        "tbr": tbr,
        "fps": fps,
        "protocol": proto,
        "vcodec": "h264",
        "acodec": "aac" if progressive else "none",
    }


def audio(fid, abr=128, ext="m4a"):
    return {
        "format_id": fid,
        "url": f"https://cdn.example.com/{fid}",
        "ext": ext,
        "abr": abr,
        "tbr": abr,
        "protocol": "https",
        "vcodec": "none",
        "acodec": "aac",
    }


class TestResolutionLabelling:
    def test_landscape_uses_height(self):
        assert _format_height(video("a", 1920, 1080)) == 1080

    def test_vertical_uses_the_short_side(self):
        """A TikTok is 1080x1920 and every platform calls that 1080p, not 1920p."""
        assert _format_height(video("a", 1080, 1920)) == 1080
        assert _format_height(video("a", 720, 1280)) == 720

    def test_square_works(self):
        assert _format_height(video("a", 1080, 1080)) == 1080

    def test_missing_dimensions(self):
        assert _format_height({"format_id": "x"}) is None

    @pytest.mark.parametrize(
        "side,tier",
        [
            (2160, 2160), (1440, 1440), (1080, 1080), (720, 720), (480, 480), (360, 360),
            (1082, 1080),        # near-miss rounds up into its own tier
            (718, 720),          # 5% grace
            (1024, 720),         # genuinely between tiers: never overstate
            (576, 480),
            (240, None),         # below the lowest tier
        ],
    )
    def test_tier_assignment_never_overstates(self, side, tier):
        assert _tier_for(side) == tier


class TestLadder:
    def test_youtube_shape_produces_tiers_plus_audio(self):
        info = {
            "duration": 600,
            "formats": [
                video("137", 1920, 1080, progressive=False),
                video("136", 1280, 720, progressive=False),
                video("135", 854, 480, progressive=False),
                video("18", 640, 360, progressive=True),
                audio("140"),
            ],
        }
        options, internal = _build_ladder(info, has_ffmpeg=True)
        ids = [o.id for o in options]

        assert "mp4_1080p" in ids
        assert "mp4_720p" in ids
        assert "mp3" in ids
        assert set(ids) == set(internal) & set(ids)
        for option in options:
            assert option.id in internal

    def test_vertical_tiktok_is_not_advertised_as_4k(self):
        info = {
            "duration": 51,
            "formats": [
                video("bytevc1_1080p", 1080, 1920),
                video("h264_720p", 720, 1280),
                video("bytevc1_540p", 576, 1024),
            ],
        }
        options, _ = _build_ladder(info, has_ffmpeg=True)
        qualities = {o.quality for o in options if o.kind == "video"}
        assert "4K" not in qualities
        assert "1080p" in qualities

    def test_a_muxed_tier_renders_the_formats_it_measured(self):
        """The advertised size has to describe the file that actually gets built.

        A generic `bestvideo[height<=N]+bestaudio` lets yt-dlp re-pick a different codec at
        render time — that is how a tier shown as 275 MB arrived as a 155 MB file.
        """
        info = {
            "duration": 600,
            "formats": [
                video("137", 1920, 1080, progressive=False, tbr=4000),
                video("248", 1920, 1080, progressive=False, ext="webm", tbr=3000),
                audio("140", abr=128),
            ],
        }
        _, internal = _build_ladder(info, has_ffmpeg=True)
        selector = internal["mp4_1080p"].selector

        assert selector.startswith("137+140"), f"should pin both ids, got {selector!r}"
        assert "/" in selector, "a fallback must survive a format id disappearing"

    def test_selector_falls_back_when_there_is_no_audio_stream(self):
        info = {"duration": 60, "formats": [video("137", 1920, 1080, progressive=False)]}
        _, internal = _build_ladder(info, has_ffmpeg=True)
        assert internal["mp4_1080p"].selector.startswith("137")

    def test_direct_formats_are_pinned_to_their_own_id(self):
        info = {"duration": 60, "formats": [video("18", 640, 360, progressive=True)]}
        _, internal = _build_ladder(info, has_ffmpeg=True)
        assert internal["mp4_360p"].selector == "18"

    def test_watermarked_tiktok_download_format_never_wins(self):
        """yt-dlp's TikTok `download` format carries the watermark."""
        info = {
            "duration": 30,
            "formats": [
                {**video("download", 1080, 1920), "tbr": 99999},
                video("h264_1080p", 1080, 1920, tbr=2000),
            ],
        }
        _, internal = _build_ladder(info, has_ffmpeg=True)
        assert internal["mp4_1080p"].selector != "download"

    def test_caps_the_number_of_video_options(self):
        info = {
            "duration": 600,
            "formats": [
                video("a", 3840, 2160, progressive=False),
                video("b", 2560, 1440, progressive=False),
                video("c", 1920, 1080, progressive=False),
                video("d", 1280, 720, progressive=False),
                video("e", 854, 480, progressive=False),
                video("f", 640, 360, progressive=True),
                audio("g"),
            ],
        }
        options, _ = _build_ladder(info, has_ffmpeg=True)
        assert len([o for o in options if o.kind == "video"]) <= 4

    def test_keeps_the_top_tier_when_trimming(self):
        info = {
            "duration": 10,
            "formats": [
                video("a", 3840, 2160, progressive=False, tbr=50),
                video("b", 2560, 1440, progressive=False, tbr=40),
                video("c", 1920, 1080, progressive=False, tbr=30),
                video("d", 1280, 720, progressive=False, tbr=20),
                video("e", 854, 480, progressive=False, tbr=10),
                video("f", 640, 360, progressive=True, tbr=5),
            ],
        }
        options, _ = _build_ladder(info, has_ffmpeg=True)
        assert options[0].quality == "4K"

    def test_recommends_1080p_not_the_largest_file(self):
        """4K on YouTube is a several-hundred-megabyte server-side mux. Bad default."""
        info = {
            "duration": 600,
            "formats": [
                video("a", 3840, 2160, progressive=False, tbr=40000),
                video("b", 1920, 1080, progressive=False, tbr=4000),
                video("c", 1280, 720, progressive=False, tbr=2000),
                audio("d"),
            ],
        }
        options, _ = _build_ladder(info, has_ffmpeg=True)
        recommended = [o for o in options if o.recommended]
        assert len(recommended) == 1
        assert recommended[0].quality == "1080p"

    def test_recommends_the_best_available_when_all_below_1080(self):
        info = {"duration": 30, "formats": [video("a", 1280, 720), video("b", 854, 480)]}
        options, _ = _build_ladder(info, has_ffmpeg=True)
        assert [o for o in options if o.recommended][0].quality == "720p"

    def test_no_mp3_without_ffmpeg(self):
        info = {"duration": 30, "formats": [video("a", 1280, 720), audio("b")]}
        options, _ = _build_ladder(info, has_ffmpeg=False)
        assert "mp3" not in [o.id for o in options]

    def test_muxed_tiers_are_dropped_without_ffmpeg(self):
        info = {
            "duration": 30,
            "formats": [video("a", 1920, 1080, progressive=False), video("b", 640, 360)],
        }
        options, _ = _build_ladder(info, has_ffmpeg=False)
        assert all(not o.needsMux for o in options)

    def test_falls_back_to_best_when_no_dimensions_are_reported(self):
        """Some Twitter and Reddit clips report no width or height at all."""
        info = {
            "duration": 20,
            "formats": [{
                "format_id": "http", "url": "https://cdn.example.com/x", "ext": "mp4",
                "protocol": "https", "vcodec": "h264", "acodec": "aac", "tbr": 800,
            }],
        }
        options, internal = _build_ladder(info, has_ffmpeg=True)
        assert any(o.quality == "best" for o in options)
        assert internal

    def test_drops_tiers_above_the_transfer_ceiling(self):
        """Offering a format we would refuse to send just moves the failure later."""
        from config import settings

        oversized = settings.max_download_bytes * 8 // 1000 + 1_000_000  # in seconds*kbps terms
        info = {
            "duration": oversized,
            "formats": [video("a", 1920, 1080, tbr=1000), video("b", 640, 360, tbr=1)],
        }
        options, _ = _build_ladder(info, has_ffmpeg=True)
        assert "mp4_1080p" not in [o.id for o in options]

    def test_estimates_size_from_bitrate_when_filesize_is_absent(self):
        info = {"duration": 100, "formats": [video("a", 1280, 720, tbr=1000)]}
        options, _ = _build_ladder(info, has_ffmpeg=False)
        target = next(o for o in options if o.id == "mp4_720p")
        assert target.filesize_approx == pytest.approx(1000 * 1000 * 100 / 8, rel=0.01)
        assert target.filesizeLabel

    def test_skips_manifest_only_formats_for_direct_delivery(self):
        info = {
            "duration": 30,
            "formats": [
                video("hls", 1920, 1080, proto="m3u8_native"),
                video("http", 1280, 720, proto="https"),
            ],
        }
        _, internal = _build_ladder(info, has_ffmpeg=True)
        assert internal["mp4_720p"].direct_url is not None


class TestFormatters:
    @pytest.mark.parametrize(
        "value,expected",
        [(None, None), (0, None), (512, "512 B"), (1536, "1.5 KB"), (15_000_000, "14.3 MB")],
    )
    def test_bytes(self, value, expected):
        assert format_bytes(value) == expected

    @pytest.mark.parametrize(
        "value,expected",
        [(None, None), (0, None), (45, "0:45"), (95, "1:35"), (3725, "1:02:05")],
    )
    def test_duration(self, value, expected):
        assert format_duration(value) == expected
