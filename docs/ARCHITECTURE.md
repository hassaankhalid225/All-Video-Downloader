# AllDown — Architecture

> All-in-One Social Media Video Downloader.
> Frontend: Next.js 14 (App Router) · Backend: FastAPI + yt-dlp.

---

## 1. System overview

```
┌──────────────┐        ┌───────────────────────┐        ┌──────────────────┐
│   Browser    │        │  Next.js 14 (Vercel)  │        │ FastAPI (Railway)│
│              │        │                       │        │                  │
│  React 18    │ fetch  │  app/api/metadata     │ httpx  │ /api/metadata    │
│  Framer      ├───────►│  app/api/download     ├───────►│ /api/download    │
│  Tailwind    │        │  (server-side proxy)  │        │ /api/health      │
│              │        │                       │        │        │         │
│              │        │  app/api/file (pipe)  │        │   yt-dlp engine  │
└──────┬───────┘        └───────────────────────┘        └────────┬─────────┘
       │                                                          │
       │           direct byte stream (Content-Disposition)       │
       └──────────────────────────────────────────────────────────┘
                        /api/file?token=… proxies the CDN
```

Three tiers, one hard rule: **the browser never talks to the FastAPI service directly**.
Next.js route handlers proxy every call. That keeps the backend origin out of the client
bundle, lets us set our own CORS/caching policy, and means the API base URL can rotate
without a frontend redeploy.

---

## 2. Why this shape

| Decision | Reason |
| --- | --- |
| yt-dlp as the only extraction engine | One dependency covers 1000+ sites and is updated weekly. Writing per-platform scrapers means maintaining 11 breakages. |
| FastAPI, not Next.js API routes for extraction | yt-dlp is a Python process. Running it needs a long-lived container with the binary + ffmpeg on PATH — that is not a serverless function. |
| Proxy the download bytes instead of redirecting | Platform CDNs (TikTok, Instagram) return 403 when the `Referer`/`User-Agent` do not match the extractor's. A redirect hands the browser a URL it cannot fetch. The proxy replays the exact headers yt-dlp negotiated. |
| In-memory TTL cache, not Redis | Metadata is cheap to re-derive and worthless after ~5 min. A single-process TTLCache removes the infra dependency. Swap in Redis only when horizontally scaling. |
| Signed short-lived tokens for the file route | The direct CDN URL leaks the user's extraction. A 5-minute HMAC token scoped to `(url, format_id)` keeps the stream endpoint from becoming an open proxy. |

---

## 3. Backend module map

```
backend/
├── main.py                 FastAPI app, lifespan, CORS, exception handlers
├── config.py               Settings from env (pydantic-settings style, stdlib os.environ)
├── models/
│   ├── request.py          MetadataRequest, DownloadRequest
│   └── response.py         VideoMetadata, FormatOption, DownloadResult, HealthStatus, ErrorBody
├── services/
│   ├── detector.py         URL → platform identity (pure, no I/O, fully unit-testable)
│   ├── downloader.py       yt-dlp wrapper: get_metadata / get_download_url / stream
│   └── cache.py            TTL cache + single-flight lock per URL
├── routers/
│   ├── metadata.py         POST /api/metadata
│   ├── download.py         POST /api/download, GET /api/file
│   └── health.py           GET /api/health
├── middleware/
│   └── rate_limit.py       slowapi limiter + 429 handler with Retry-After
├── utils/
│   ├── validators.py       URL normalisation, SSRF guard, filename sanitiser
│   └── errors.py           AllDownError hierarchy → HTTP status mapping
└── tests/                  pytest suite
```

### Data flow — metadata

```
POST /api/metadata {url}
  → validators.normalize_url()          strip trackers, expand nothing yet
  → detector.detect(url)                platform id or UnsupportedPlatform(422)
  → cache.get_or_set(key=url)           5 min TTL, single-flight per key
      → downloader.get_metadata()       yt-dlp extract_info(download=False)
          runs in a worker thread (yt-dlp is blocking)
          → format ladder built from info["formats"]
  → VideoMetadata
```

### Data flow — download

```
POST /api/download {url, format_id}
  → resolve format_id against a fresh (or cached) extraction
  → produce { download_url: "/api/file?t=<signed token>", filename, filesize }

GET /api/file?t=<token>
  → verify HMAC + expiry
  → re-resolve the direct media URL
  → httpx.stream() the bytes back with:
        Content-Disposition: attachment; filename*=UTF-8''alldown_tiktok_title.mp4
        Content-Length / Content-Type from upstream
        Range passthrough so the browser can resume
```

Audio (`mp3`, `m4a`) and any format needing a mux go through a **local yt-dlp render**
into a temp file, then stream-and-delete. Progressive video formats are proxied without
touching disk.

### Delivery is a degrading chain, not a single attempt

`downloader.open_stream` tries three things in order, each more reliable and more
expensive than the last:

1. **Proxy the cached direct URL.**
2. **Re-extract and proxy the new one.** Signed CDN URLs expire *sooner than the metadata
   cache holds them* — YouTube's progressive links in particular start returning 403 while
   the cache entry is still warm. A 403 here means "stale", not "forbidden", so it must not
   surface to the user as an access error.
3. **Render locally and stream the file.** Slower, but it re-negotiates everything through
   yt-dlp and works whenever the platform itself works.

Delivery also enforces a tighter freshness bound than the preview does
(`_DELIVERY_MAX_AGE_SECONDS`, 90 s against the cache's 300 s). The cache exists to make the
*preview* cheap; bytes need a URL that is actually still valid. Re-extracting proactively
is cheaper than a failed transfer plus a retry.

---

## 4. Format ladder

yt-dlp returns 30–80 raw formats. The UI shows at most 6. `downloader._build_ladder()`:

1. Keep progressive MP4 (`vcodec != none and acodec != none`) — these need no muxing and
   download fastest.
2. If a height tier (1080/720/480/360) has no progressive entry, fall back to
   `bestvideo[height<=N]+bestaudio` and mark it `needs_mux: true`.
3. Always append one `mp3` (audio-only, 192 kbps) and, when the source has an m4a stream,
   one `m4a` passthrough.
4. Sort descending by height; the highest available video tier is flagged `recommended`.
5. Deduplicate by `(ext, height)`; drop tiers above the source resolution.

`filesize_approx` comes from `filesize` → `filesize_approx` → `tbr * duration / 8`, in that
order, so the UI always has a number to show.

---

## 5. Error model

A single exception hierarchy in `utils/errors.py` maps to HTTP codes and user-facing copy.
yt-dlp's stderr is pattern-matched (`_classify_ytdlp_error`) — it reports almost everything
as a generic `DownloadError`, so the message text is the only signal available.

| Exception | HTTP | User message |
| --- | --- | --- |
| `InvalidUrlError` | 400 | Please enter a valid social media URL |
| `PrivateContentError` | 403 | This content is private or restricted |
| `ContentNotFoundError` | 404 | This content no longer exists |
| `UnsupportedPlatformError` | 422 | This platform is not yet supported |
| `RateLimitedError` | 429 | Too many requests. Please wait a moment |
| `GeoRestrictedError` | 451 | This content is not available in our server region |
| `ExtractionError` | 500 | Could not process this link. Please try again |

Every response body is `{ "success": false, "error": { "code", "message", "detail" } }`.
`detail` carries the raw extractor line and is only rendered in dev.

---

## 6. Frontend architecture

`app/page.tsx` is a Server Component that renders static marketing sections and mounts one
Client Component island: `<DownloaderTool />`. Nothing else ships interactivity, so the
homepage's JS budget stays small.

State lives in a single reducer, `useDownloadFlow`, implementing the seven-state machine:

```
IDLE ──paste──► DETECTING ──debounce 400ms──► FETCHING_METADATA ──► PREVIEW
                    │                              │                  │
                    └────► ERROR ◄─────────────────┘                  │ select+click
                              ▲                                        ▼
                              └──────────────────────────── DOWNLOADING ──► SUCCESS
```

Transitions are the only way state changes; every network call is aborted via `AbortController`
when the URL input changes, so a slow TikTok extraction cannot land on top of a newer YouTube one.

Platform detection is duplicated client-side (`lib/detect.ts`) purely for the instant
badge — the server remains the authority.

### Rendering strategy

| Route | Strategy |
| --- | --- |
| `/` | Static, revalidate never |
| `/tiktok`, `/instagram`, … | Static, generated at build |
| `/api/*` | Dynamic route handlers (`force-dynamic`) |
| `sitemap.xml`, `robots.txt` | Generated at build |

---

## 7. Security

- **SSRF guard** — the resolved host must be public; `localhost`, RFC1918, link-local and
  `.internal` are rejected before yt-dlp sees the URL.
- **Signed file tokens** — HMAC-SHA256 over `(url, format_id, exp)` with `SECRET_KEY`. Prevents
  the stream endpoint being used as a general-purpose proxy.
- **Size ceiling** — `MAX_DOWNLOAD_SIZE_MB` (default 500) rejected before streaming starts.
- **Rate limits** — 20 metadata/min and 10 download/min per IP, `Retry-After` on 429.
- **Headers** — `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, and no
  `X-Powered-By`.
- **No logging of URLs** at info level — the URL is the user's private activity.

---

## 8. Where the time goes

Measured, not guessed. Cold extraction is the floor and it belongs to yt-dlp — restricting
YouTube player clients was tried and made it *slower* or broke extraction outright, so the
optimisation work went into removing everything around it.

| Stage | Cost | Notes |
| --- | --- | --- |
| Paste → request sent | ~0 ms | A paste skips the debounce; it is already a complete URL |
| Extraction, cold | 2.1–2.8 s | yt-dlp + the platform. The floor. |
| Extraction, cached | 3–7 ms | 15-minute TTL |
| Click → transfer starts | 1 request | The signed URL ships with the metadata |
| Direct proxy | wire speed | 256 KiB chunks |
| Server render (mux/MP3) | seconds | 8 parallel fragment downloads |

Four decisions follow from this:

1. **A paste does not wait.** The 400 ms debounce exists for typing. A paste arrives whole,
   and pasting is how essentially everyone uses the tool.
2. **The download is one request, not two.** `/api/metadata` signs a URL for every format,
   so clicking goes straight to `/api/file`. `/api/download` remains for the case where
   that token has aged out, and the client retries through it on a 410.
3. **The preview cache outlives the media URLs.** It used to be capped at 5 minutes because
   the CDN links inside an extraction expire. Now that delivery runs its own freshness
   check, the cache is free to run for 15 minutes — so a link shared in a group chat is
   answered in milliseconds for everyone after the first person.
4. **The first visitor does not pay for the cold start.** yt-dlp downloads and parses
   YouTube's player JavaScript on its first extraction in a process. `warm_up()` does that
   at boot, in the background so the healthcheck still passes immediately.

On the client, the hero's twenty drifting particles are CSS keyframes rather than twenty
JavaScript animation loops, and the animation runtime is loaded through `LazyMotion` with
only the `domAnimation` feature set — 161 kB → 133 kB of first-load JavaScript.

---

## 9. Scaling notes

The service is stateless apart from the metadata cache. To scale out:
swap `services/cache.py` for Redis (`get_or_set` is the only interface to reimplement), and
move `/api/file` behind a CDN with `Cache-Control: private, no-store` preserved.
yt-dlp should be pinned and updated on a weekly job — extraction breaks when platforms change,
and the fix is nearly always a new yt-dlp release.
