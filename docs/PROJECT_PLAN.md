# AllDown — Project Plan

Status legend: `[ ]` planned · `[~]` in progress · `[x]` done

All phases are complete. Verification results are recorded at the bottom.

---

## Phase 0 — Research & documentation

- [x] Verify toolchain: Python 3.11.9, Node 24.18, npm 11.16, yt-dlp 2026.07.04, ffmpeg 8.1.2
- [x] Resolve dependency versions against the registry
- [x] `ARCHITECTURE.md`, `API_SPEC.md`, `PROJECT_PLAN.md`, `COMPONENT_MAP.md`

**Version decisions.** The brief pins Next.js 14 and Tailwind v3; both are honoured.
`next@14.2.x` + `react@18.3.x` is the most battle-tested App Router combination and avoids
the Tailwind v4 config rewrite, which would invalidate the CSS-variable token system the
brief specifies. Registry latest at build time was `next@16.2.12` / `tailwindcss@4.3.3` —
noted here so the upgrade path is a deliberate future decision, not an oversight.

| Package | Registry latest | Using | Why |
| --- | --- | --- | --- |
| next | 16.2.12 | 14.2.35 | Brief specifies 14 (App Router) |
| tailwindcss | 4.3.3 | 3.4.x | Brief specifies v3; v4 drops `tailwind.config.ts` |
| react | 19.2.8 | 18.3.x | Pairs with Next 14 |
| framer-motion | 12.42.2 | 11.x | React 18 peer range |
| yt-dlp | 2026.07.04 | >= 2026.7.4 | Extraction breaks without frequent updates |

---

## Phase 1 — Backend

- [x] `utils/errors.py` — exception hierarchy + HTTP mapping
- [x] `utils/validators.py` — URL normalise, SSRF guard, filename sanitiser
- [x] `services/detector.py` — 12 platforms, host + path matching, pure functions
- [x] `services/cache.py` — TTL cache with per-key single-flight
- [x] `services/downloader.py` — yt-dlp: metadata, format ladder, resolve, render, stream
- [x] `models/` — pydantic request/response contracts
- [x] `middleware/rate_limit.py` — slowapi, per-route limits, `Retry-After`
- [x] `routers/` — metadata, download + file, health, platforms
- [x] `main.py` — app factory, lifespan, CORS, global exception handlers

**Order matters.** `detector.py` first because it has zero dependencies and the whole
platform catalogue derives from it — the frontend's `constants.ts` mirrors it.

---

## Phase 1b — Backend verification

- [x] `pip install -r requirements-dev.txt` in a local venv
- [x] `pytest` — detector, validators, error mapping, format ladder, tokens, delivery, endpoints
- [x] Live smoke: real URLs through `/api/metadata`, `/api/download` and `/api/file`

Live extraction is network- and platform-dependent. Tests that hit the network are marked
`@pytest.mark.live` and excluded from the default run so CI stays deterministic.

---

## Phase 2 — Frontend foundation

- [x] `package.json`, `tsconfig.json` (strict), `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
- [x] `app/globals.css` — CSS custom properties for the full token set, base layer, keyframes
- [x] `lib/constants.ts` — platform catalogue mirroring `detector.py`
- [x] `lib/detect.ts` — client-side platform detection for the instant badge
- [x] `lib/api.ts` — typed fetch wrappers with `AbortController` support
- [x] `lib/utils.ts` — `cn`, byte and duration formatters, clipboard read, colour helpers
- [x] `app/layout.tsx` — Inter + JetBrains Mono, metadata, skip link
- [x] `app/api/{metadata,download,file,health}/route.ts` — proxy handlers

---

## Phase 3 — Hero & downloader tool

- [x] `ParticleBackground` — drifting orbs (CSS) + grid overlay + 20 Framer particles
- [x] `UrlInput` — the signature element; adopts the detected platform's colour
- [x] `PlatformDetector` — animated icon swap inside the input
- [x] `PlatformStrip` — logo row, detected platform scales and brightens
- [x] `HeroSection` — staggered headline, marquee sub-headline
- [x] `useDownloadFlow` — the 7-state reducer, abortable
- [x] `VideoPreview`, `FormatSelector`, `FormatCard`, `DownloadButton`, `ProgressState`, `SuccessState`
- [x] `Toast` provider, `Spinner`, `PlatformBadge`, `Accordion`, `Reveal`, `Section`

**Design direction.** The brief fixes the palette and Inter, so the free axis is the
*utility face* and the *signature*. Utility face is JetBrains Mono: URLs, byte counts,
durations, resolutions and format ids are machine artifacts and are set as such — it gives
the tool a technical honesty that a single-family Inter page would not have. The signature
is colour adoption: paste a link and the input's glow ring, caret, chip, format cards and
CTA gradient spring to that platform's brand colour. One bold move, everything else stays
quiet purple.

---

## Phase 3b — Marketing sections

- [x] `Navbar` — slide-down on load, scroll-aware background
- [x] `HowItWorks` — 3 steps, drawn connecting line (genuine sequence, so numbering earns its place)
- [x] `SupportedPlatforms` — 12-card grid, per-platform colour glow on hover
- [x] `Features` — 6 cards, viewport-triggered stagger
- [x] `FAQ` — 8-item accordion, height animated, keyboard operable
- [x] `Footer` — links, platform quick links, live backend status dot

---

## Phase 4 — Platform pages

- [x] `/tiktok`, `/instagram`, `/youtube`, `/twitter`, `/facebook`, `/pinterest`
- [x] Shared `PlatformPage` template driven by a per-platform content record
- [x] Per page: accent-tinted hero, pre-scoped tool, 5 FAQs, ~500-word guide, breadcrumbs
- [x] Supporting pages: about, privacy, terms, DMCA, contact, 404

---

## Phase 5 — SEO

- [x] Root metadata, per-page metadata, canonical URLs
- [x] JSON-LD: `WebApplication`, `FAQPage`, `HowTo` (home), `BreadcrumbList` + `FAQPage` (platform)
- [x] `app/sitemap.ts`, `app/robots.ts`
- [x] OG image (1200×630) generated at the edge via `next/og`

---

## Phase 6 — Animation

- [x] Page-load sequence: 200/400/600/800/1000/1200 ms beats per the brief
- [x] Scroll reveals, accordion, line draw
- [x] Micro-interactions: focus ring, card lift, CTA gradient shift, error shake, success draw
- [x] `prefers-reduced-motion` honoured throughout

---

## Phase 7 — Performance & production

- [x] `next.config.js`: image formats, compression, security headers, no `X-Powered-By`
- [x] `.env.example` for both tiers
- [x] Client-side rate-limit countdown on 429

---

## Phase 8 — Testing

- [x] Backend: 230 offline tests + 7 live tests, all passing
- [x] Frontend: `tsc --noEmit` clean, `next build` clean with zero warnings
- [x] Browser E2E: 24 checks across desktop, mobile 375px and reduced motion, all passing

---

## Phase 9 — Deployment

- [x] `backend/railway.toml`, `backend/Dockerfile`, `backend/nixpacks.toml`
- [x] `frontend/vercel.json`, `frontend/Dockerfile`
- [x] `docker-compose.yml` for both tiers
- [x] `README.md`

---

## Verification record

**Backend** — `pytest`: 230 passed. `pytest -m live`: 7 passed.

**Frontend** — `tsc --noEmit`: clean. `next build`: 17 routes, zero warnings.
Homepage first-load JS 162 kB; static pages 87 kB.

**Live end-to-end**, real URLs through metadata → download → byte stream:

| Platform | Result |
| --- | --- |
| YouTube (long video) | 1440p/1080p/720p/480p + M4A + MP3; muxed render streamed |
| YouTube Shorts | Full flow including the browser download |
| TikTok | 1080p/720p/480p + MP3, watermark-free, direct proxy (206) |
| Instagram (public post) | 1080p→360p + audio, muxed render streamed |
| Vimeo | Correctly reported 403 (extractor auth failure) |
| Dailymotion (bad id) | Correctly reported 404 |
| example.com | Correctly rejected |

**Browser E2E** — headline and h1 structure, JSON-LD present, accent adoption on paste and
re-adoption on a second paste, metadata → preview, exactly one preselected format, arrow-key
navigation in the radio group, full download to the success state, error panel with a human
message, platform page breadcrumbs and preset accent, no horizontal scroll at 1440px or
375px, all touch targets ≥ 40px, reduced-motion render, zero console errors.

---

## Bugs found and fixed during verification

1. **`from __future__ import annotations` broke FastAPI body parsing.** slowapi's decorator
   is defined in its own module, so FastAPI resolved the string annotations against
   *slowapi's* globals and silently downgraded `body: MetadataRequest` to a query
   parameter. Removed from the rate-limited routers.
2. **Vertical videos were labelled by their long side.** A 1080×1920 TikTok read as
   "1440p". The resolution label is now the short side, which is what every platform uses.
3. **TikTok's CDN 403'd the proxy.** It requires the anonymous session cookies issued
   during extraction. The cookie jar is now carried and replayed with per-host matching, so
   a self-hoster's real login cookies never leak to a third-party CDN.
4. **4K was recommended by default.** On a ten-minute video that is a ~700 MB server-side
   mux. The default is now the best tier at or below 1080p.
5. **Formats above the transfer ceiling were offered.** Picking one failed only after the
   wait. They are dropped from the ladder instead.
6. **Stale CDN URLs surfaced as 403.** The metadata cache holds an extraction for 5 minutes,
   but YouTube's progressive URLs expire sooner. Delivery now enforces a 90-second freshness
   bound and degrades through re-extract → local render rather than failing.
7. **Error toasts outlived the errors.** Pasting a bad link then a good one left the failure
   on screen beside a working preview.
8. **Sub-40px touch targets** in the navbar, footer and paste affordances.
9. **Misclassified extractor messages** — geo-blocks read as "removed", terminated accounts
   as unknown, throttle responses as a generic failure.

### A second pass, after reviewing the platform pages on a real screen

10. **240px of dead space above the fold on every platform page.** The breadcrumb's
    navbar clearance and the hero's own top padding were stacking. The hero now takes a
    `compact` mode for pages that already clear the navbar.
11. **The scroll cue was stranded mid-page.** It points at "How it works", which on a
    platform page sits below the facts strip and a 1,200-word guide — so following it
    skipped the content the visitor came for. Homepage only now.
12. **The facts strip floated orphaned** between two ~100px gaps. It describes the tool, so
    it now renders inside the hero directly beneath it.
13. **CTA contrast failed on 8 of 12 platforms.** See `COMPONENT_MAP.md` for the resolution.
14. **The SEO guide was `opacity: 0` until JavaScript ran.** The body copy a platform page
    exists for should never depend on a scroll observer; `Reveal` was removed from it.
15. **The primary button dimmed to 40% for the whole extraction**, reading as disabled
    during the one or two seconds the user is actually watching it. It now keeps its colour
    and shows a spinner with a "Working…" label; only an empty field greys it out.

### Caught by the running server, after the performance pass

16. **`output: standalone` crashed the server on every thumbnail.** Added for the
    Dockerfile, it puts Next's image optimizer into a mode that requires `sharp` — which
    was not installed, so each thumbnail request threw and killed the process. Two bugs in
    one: thumbnails would have been broken in the Docker deployment, and `next start`
    refuses to serve a standalone build at all. `sharp` is now a dependency and copied into
    the container, and standalone is opt-in via `BUILD_STANDALONE=true`.

    The E2E now asserts the thumbnail actually decodes (`naturalWidth > 0`) and that the
    optimizer returns 200, rather than only checking the element exists — the gap that let
    this through.

17. **The advertised file size described a different file than the one delivered.** Muxed
    tiers rendered with a generic `bestvideo[height<=N]+bestaudio` selector, so yt-dlp
    re-picked a codec at render time instead of using the format `_score_video` had
    measured. A tier shown as 275 MB arrived as 155 MB; a Short shown as 85.9 KB arrived
    as 50 KB. The selector now pins the exact video and audio format ids that produced the
    estimate, with the generic form kept as a fallback. Verified end to end: 275 MB
    advertised → 275.4 MB delivered, 85.9 KB → 86.0 KB.

**Not a bug:** two background servers exited silently with code 255 during testing. Neither
logged anything, and the crash could not be reproduced by a 1,080-request soak, five
mid-stream download aborts, a completed 275 MB transfer, or a full browser run. Both were
long-lived tasks hitting the 30-minute cap configured on them. The one genuine crash
(missing `sharp`) logged a clear error every time.

---

## Performance pass

Measured first. Cold extraction is 2.1–2.8 s and belongs to yt-dlp — restricting YouTube
player clients was benchmarked and made it *slower* (3.0–3.5 s) or broke extraction. So the
work went into removing everything around it.

| Change | Effect |
| --- | --- |
| A paste skips the debounce | −400 ms on every paste |
| Metadata ships a signed URL per format | Download is 1 request, not 2 (verified) |
| Preview cache 5 → 15 min, safe now that delivery revalidates | 3–7 ms on a shared link |
| `warm_up()` at boot | First visitor after a deploy no longer pays the cold start |
| Stream chunks 64 KiB → 256 KiB | 4× fewer async hops on a large file |
| Fragment downloads 4 → 8 | 56 MB render: **24.2s → 15.1s** median (16 is worse, at 20.3s) |
| Renders skip the freshness re-extraction | −2s on every MP3 and muxed download from a warm cache |
| 20 particle animations → CSS keyframes | 20 JS animation loops removed from every page |
| Platform grid → Server Component | Hover was React state doing CSS's job |
| `LazyMotion` + `domAnimation` | First-load JS 161 kB → **133 kB** |

Measured end to end in a real browser, YouTube Shorts, 4 runs:

- paste → preview, warm cache: **147 ms** best / 177 ms median
- click → file saved: 2.98 s (dominated by the server-side mux)
- API calls per download: **1**

---

## Known constraints

1. **Instagram, Facebook and Snapchat frequently require cookies.** Public Reels and posts
   usually extract; private or age-gated content will not. The backend supports an optional
   `COOKIES_FILE` env var pointing at a Netscape cookie jar for self-hosters, and returns a
   clear 403 otherwise. No credentials are bundled.
2. **Datacenter IP blocks.** TikTok and Instagram rate-limit cloud egress ranges harder than
   residential ones. Production should expect a higher failure rate than local dev and may
   need a proxy — `YTDLP_PROXY` is respected.
3. **YouTube throttling.** Long videos extract slowly. Formats above 720p are DASH-only and
   require a mux, which is why they are flagged `needsMux` and warned about in the UI.
4. **yt-dlp must be kept current.** Extraction breaks when platforms change their delivery,
   and a newer release is nearly always the fix. Redeploy the backend weekly.
