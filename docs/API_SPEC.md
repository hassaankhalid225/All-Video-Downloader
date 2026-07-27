# AllDown — API Specification

Base URL (dev): `http://localhost:8000`
All request and response bodies are `application/json` unless noted.
Every endpoint is prefixed `/api`.

---

## Conventions

**Success envelope**

```jsonc
{ "success": true, ...payload }
```

**Error envelope**

```jsonc
{
  "success": false,
  "error": {
    "code": "PRIVATE_CONTENT",       // stable machine code
    "message": "This content is private or restricted",  // safe to render
    "detail": "…raw extractor line…" // null in production
  }
}
```

**Rate-limit headers** are present on every response:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 17
Retry-After: 41            // only on 429
```

---

## POST /api/metadata

Extract everything needed to render the preview card. Cached for `CACHE_TTL_SECONDS`
(default 300) per normalised URL.

**Request**

```jsonc
{ "url": "https://www.tiktok.com/@user/video/7301234567890123456" }
```

| Field | Type | Rules |
| --- | --- | --- |
| `url` | string | 1–2048 chars, must parse as http(s), public host |

**200 Response**

```jsonc
{
  "success": true,
  "platform": "tiktok",
  "platformName": "TikTok",
  "title": "when the beat drops at exactly the right moment",
  "thumbnail": "https://p16-sign.tiktokcdn-us.com/…",
  "duration": 45,                     // seconds, null for live/unknown
  "durationLabel": "0:45",
  "uploader": "@nightowl",
  "uploaderUrl": "https://www.tiktok.com/@nightowl",
  "viewCount": 1204553,               // null when the extractor omits it
  "webpageUrl": "https://www.tiktok.com/@nightowl/video/7301234567890123456",
  "isLive": false,
  "formats": [
    {
      "id": "mp4_1080p",
      "label": "MP4 · 1080p",
      "ext": "mp4",
      "quality": "1080p",
      "height": 1080,
      "fps": 30,
      "kind": "video",                // "video" | "audio"
      "filesize_approx": 15003212,    // bytes, null if unknowable
      "filesizeLabel": "14.3 MB",
      "recommended": true,
      "needsMux": false               // true ⇒ server-side render, slower
    },
    { "id": "mp4_720p",  "label": "MP4 · 720p", "ext": "mp4", "quality": "720p",
      "height": 720, "fps": 30, "kind": "video", "filesize_approx": 8112004,
      "filesizeLabel": "7.7 MB", "recommended": false, "needsMux": false },
    { "id": "mp3",       "label": "MP3 · Audio", "ext": "mp3", "quality": "audio",
      "height": null, "fps": null, "kind": "audio", "filesize_approx": 1080000,
      "filesizeLabel": "1.0 MB", "recommended": false, "needsMux": true }
  ]
}
```

`formats` is never empty on a 200 — if no usable format survives the ladder, the endpoint
returns 500 `EXTRACTION_FAILED` instead.

**Errors** — 400 `INVALID_URL`, 403 `PRIVATE_CONTENT`, 404 `CONTENT_NOT_FOUND`,
422 `UNSUPPORTED_PLATFORM`, 429 `RATE_LIMITED`, 451 `GEO_RESTRICTED`, 500 `EXTRACTION_FAILED`.

---

## POST /api/download

Turn a `format_id` from the metadata response into a fetchable, expiring URL.
Does not transfer bytes.

**Request**

```jsonc
{
  "url": "https://www.tiktok.com/@user/video/7301234567890123456",
  "format_id": "mp4_1080p"
}
```

**200 Response**

```jsonc
{
  "success": true,
  "download_url": "/api/file?t=eyJ1IjoiaHR0cHM6…&s=9f2c…",
  "filename": "alldown_tiktok_when_the_beat_drops.mp4",
  "filesize": 15003212,
  "mime_type": "video/mp4",
  "expires_in": 300,
  "needs_render": false     // true ⇒ show "preparing" copy, transfer starts slower
}
```

`download_url` is relative. The frontend resolves it against its own origin so the browser
hits the Next.js proxy, never the backend host.

**Errors** — as above, plus 404 `FORMAT_NOT_AVAILABLE` when `format_id` no longer resolves
(the extraction expired and the platform re-issued different formats).

---

## GET /api/file

Streams the media. This is the URL the browser navigates to.

**Query**

| Param | Type | Notes |
| --- | --- | --- |
| `t` | string | Base64url payload: `{u, f, exp, n}` |
| `s` | string | HMAC-SHA256 of `t` using `SECRET_KEY` |

**200 Response** — binary body.

```
Content-Type: video/mp4
Content-Length: 15003212
Content-Disposition: attachment; filename="alldown_tiktok_video.mp4"; filename*=UTF-8''alldown_tiktok_video.mp4
Accept-Ranges: bytes
Cache-Control: private, no-store
```

`Range` requests are forwarded upstream and answered with 206 so downloads resume.

**Errors** — 400 `BAD_TOKEN` (malformed), 410 `TOKEN_EXPIRED`, 413 `FILE_TOO_LARGE`,
502 `UPSTREAM_UNAVAILABLE`.

---

## GET /api/health

Unauthenticated. Used by Railway's healthcheck and the status footer.

```jsonc
{
  "status": "ok",              // "ok" | "degraded"
  "yt_dlp_version": "2026.07.04",
  "ffmpeg": true,
  "uptime": 3617,              // seconds
  "cache_entries": 12,
  "version": "1.0.0"
}
```

`status` is `degraded` when yt-dlp cannot be invoked; the process still answers so the
frontend can show an honest banner rather than a blank failure.

---

## GET /api/platforms

Static catalogue used to render the supported-platforms grid and to keep client and
server detection in sync.

```jsonc
{
  "success": true,
  "platforms": [
    { "id": "tiktok", "name": "TikTok", "color": "#FE2C55",
      "contentTypes": ["Videos", "Photo posts"], "hosts": ["tiktok.com", "vm.tiktok.com"] }
  ]
}
```

---

## Next.js proxy routes

The frontend exposes the same three shapes on its own origin. They add nothing but
transport — same bodies, same status codes.

| Frontend route | Proxies to |
| --- | --- |
| `POST /api/metadata` | `POST {API_URL}/api/metadata` |
| `POST /api/download` | `POST {API_URL}/api/download` |
| `GET /api/file` | `GET {API_URL}/api/file` (streamed, headers preserved) |
| `GET /api/health` | `GET {API_URL}/api/health` |

The proxy forwards `x-forwarded-for` so per-IP rate limiting stays accurate behind Vercel.

---

## Rate limits

| Endpoint | Limit |
| --- | --- |
| `POST /api/metadata` | 20 / minute / IP |
| `POST /api/download` | 10 / minute / IP |
| `GET /api/file` | 10 / minute / IP |
| `GET /api/health` | unlimited |

Configurable through `RATE_LIMIT_PER_MINUTE` and `DOWNLOAD_RATE_LIMIT_PER_MINUTE`.
