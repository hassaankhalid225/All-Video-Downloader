# AllDown

All-in-One Social Media Video Downloader. Paste a link from one of twelve platforms, pick a
quality, get the file.

**Next.js 14 (App Router) + Tailwind v3 + Framer Motion** on the front, **FastAPI + yt-dlp**
on the back.

---

## Run it locally

Two terminals. Backend first — the frontend proxies to it.

### 1. Backend

Requires **Python 3.11+** and **ffmpeg on PATH** (without ffmpeg there is no MP3 and no
muxed video above 720p).

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements-dev.txt
cp .env.example .env          # optional; every value has a default
uvicorn main:app --reload --port 8000
```

Check it: <http://localhost:8000/api/health>

### 2. Frontend

Requires **Node 18.17+**.

```bash
cd frontend
npm install
cp .env.example .env.local    # API_URL must point at the backend
npm run dev
```

Open <http://localhost:3000>. If something else already holds that port, pass another one
(`npm run dev -- -p 3100`) — only `NEXT_PUBLIC_SITE_URL` cares about the value, and it is
used for canonical URLs rather than for serving.

Keep both processes in their own terminals. They are long-lived servers, not build steps.

### Or with Docker

```bash
docker compose up --build
```

---

## Verify it

```bash
# Backend — 223 offline tests, no network
cd backend && pytest

# Backend — real extraction against live platforms
pytest -m live

# Frontend
cd frontend && npm run typecheck && npm run build
```

The live tests hit third-party servers. A failure there usually means a video was deleted or
a platform is throttling the egress IP, not that the build is broken.

---

## Layout

```
backend/
├── main.py              app factory, CORS, exception handlers
├── config.py            env-driven settings
├── services/
│   ├── detector.py      URL → platform. Pure, no I/O. Source of truth for the catalogue.
│   ├── downloader.py    yt-dlp: extraction, the format ladder, byte delivery
│   └── cache.py         TTL cache with per-key single-flight
├── routers/             metadata · download + file · health · platforms
├── models/              pydantic request/response contracts
├── middleware/          per-IP rate limiting
├── utils/               errors, validators, signed tokens
└── tests/

frontend/
├── app/
│   ├── page.tsx         homepage (static, one client island)
│   ├── (platforms)/     /tiktok /instagram /youtube /twitter /facebook /pinterest
│   ├── api/             proxy route handlers to the backend
│   └── …                about · privacy · terms · dmca · contact
├── components/          hero · downloader · sections · ui · layout
└── lib/                 types · constants · detect · api · the flow state machine
```

Deeper detail lives in [ARCHITECTURE.md](ARCHITECTURE.md), [API_SPEC.md](API_SPEC.md) and
[COMPONENT_MAP.md](COMPONENT_MAP.md).

---

## How it works

1. You paste a URL. The client identifies the platform immediately from a local rules table
   so the badge and colour appear without a round trip.
2. After a 400 ms pause, `POST /api/metadata` extracts the video through yt-dlp. Thirty to
   eighty raw formats are reduced to at most six real choices, each with a size estimate.
3. `POST /api/download` returns a signed URL that expires in five minutes.
4. `GET /api/file` streams the bytes. Progressive formats are proxied straight through;
   anything needing ffmpeg is rendered to a temp file, streamed, and deleted.

**The browser never talks to the backend directly.** Next.js route handlers proxy every
call, which keeps the backend origin out of the client bundle.

**Speed.** A paste starts extraction immediately — the debounce exists for typing, and a
paste is already a complete URL. Step 2 signs a download URL for every format, so step 3 is
a single request rather than two. Cached previews answer in 3–7 ms for 15 minutes, which is
what a link shared in a group chat hits. Cold extraction is 2.1–2.8 s and belongs to yt-dlp;
`WARM_UP` keeps the first visitor after a deploy from paying its one-off setup cost.
See [ARCHITECTURE.md](ARCHITECTURE.md#8-where-the-time-goes) for the measurements.

---

## Configuration

Backend (`backend/.env`) — see [.env.example](backend/.env.example) for all of it:

| Variable | Default | Notes |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `PUBLIC_BASE_URL` | — | **Set in production.** e.g. `https://api.yourdomain.com`. See below |
| `SECRET_KEY` | generated | **Set in production.** Signs `/api/file` tokens; unset means they die on restart |
| `RATE_LIMIT_PER_MINUTE` | `20` | Metadata requests per IP |
| `MAX_DOWNLOAD_SIZE_MB` | `500` | Transfer ceiling |
| `COOKIES_FILE` | — | Netscape cookie jar. Needed for Instagram/Facebook beyond public content |
| `YTDLP_PROXY` | — | Datacenter IPs get throttled harder than residential ones |

Frontend (`frontend/.env.local`):

| Variable | Notes |
| --- | --- |
| `API_URL` | Backend origin. Server-side only — deliberately not `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and OG tags |

---

## Deploy

**Backend → Railway.** `backend/railway.toml` is ready; it installs ffmpeg through nixpacks
and health-checks `/api/health`. Set `SECRET_KEY`, `ALLOWED_ORIGINS` and `PUBLIC_BASE_URL`.
A `Dockerfile` is there for anywhere else.

**Frontend → Vercel.** Set `API_URL` and `NEXT_PUBLIC_SITE_URL`. Point the apex domain at
Vercel and an `api.` subdomain at Railway.

### Do not let video through the frontend proxy

`PUBLIC_BASE_URL` is the one production setting that is not optional. Without it,
`/api/file` links stay relative and every byte is streamed through a Vercel function.
Two things go wrong:

- **You pay for the same bytes twice** — once as Railway egress, once as Vercel egress.
- **Large downloads are truncated.** Vercel Pro caps a function at 300 seconds. A 275 MB
  file needs 440 s on a 5 Mbps connection, so anyone slower than roughly 8 Mbps gets a
  corrupt file. This is a plan ceiling, not a billing tier — paying more does not lift it.

Set `PUBLIC_BASE_URL=https://api.yourdomain.com` and the browser fetches media straight
from Railway. The JSON endpoints keep going through the proxy, where the payloads are
kilobytes and the round trip is worth it. CORS on the backend already exposes
`Content-Disposition` and `Content-Length`, which is what the browser needs to name the
file and show progress.

**Thumbnails need `sharp`.** Video thumbnails are served through Next's image optimizer
rather than loaded directly, because TikTok and Instagram CDNs reject hot-linked requests
from a browser and would leave the preview blank. In production that optimizer requires
`sharp` — it is a dependency, and the Dockerfile copies it into the standalone bundle.
Without it every thumbnail request throws and takes the server down.

**`output: standalone` is opt-in.** It is set by `BUILD_STANDALONE=true`, which only the
Dockerfile does. `next start` cannot serve a standalone build, so leaving it always on
breaks `npm start` and every non-container host.

**Keep yt-dlp current.** Extraction breaks when platforms change, and the fix is nearly
always a newer yt-dlp. Redeploy the backend weekly, or add a scheduled
`pip install --upgrade yt-dlp` and restart.

---

## Known limits

These are properties of the platforms, not gaps in the build:

- **Private content is out of reach by design.** No accounts, so private profiles,
  members-only videos and protected posts return a clear error rather than a file.
- **Instagram and Facebook often need cookies** for anything beyond fully public posts. Set
  `COOKIES_FILE` if you self-host and need that; nothing is bundled.
- **Datacenter IPs get throttled.** TikTok and Instagram rate-limit cloud egress ranges far
  harder than residential ones, so production sees more failures than local dev. A
  residential proxy via `YTDLP_PROXY` is the usual answer.
- **TikTok photo carousels have no video track** and report as such.
- **Instagram carousels** yield the first video only; individual slides cannot be selected.

---

## Two deliberate deviations from the original brief

1. **`fetch` instead of Axios.** The brief lists Axios, but it also targets Lighthouse 90+.
   Shipping an HTTP client to the browser for two POST requests works against that, and the
   file proxy needs `fetch`'s streaming body regardless — Axios cannot stream in a route
   handler. `lib/api.ts` is a thin typed wrapper over `fetch`.
2. **`--text-muted` is `#444466`.** The brief specifies `#4444667`, which is seven hex
   digits and not a colour. `#444466` is the obvious intent.

The brief's Next 14 and Tailwind v3 pins are honoured, though 16 and 4 are current — see
[PROJECT_PLAN.md](PROJECT_PLAN.md) for the version table.

---

## Legal

AllDown hosts nothing. It fetches publicly accessible media at a user's request and streams
it through. What you download and what you do with it is your responsibility — see
[/terms](frontend/app/terms/page.tsx) and [/dmca](frontend/app/dmca/page.tsx).
