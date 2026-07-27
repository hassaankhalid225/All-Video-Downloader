# AllDown — Component Map

Every component, its props, its state, and the one job it does.
`"use client"` is marked explicitly; everything unmarked is a Server Component.

---

## Design tokens

| Token | Value | Used for |
| --- | --- | --- |
| `--bg-primary` | `#080810` | Page background |
| `--bg-secondary` | `#0F0F1A` | Cards, the input bar |
| `--bg-tertiary` | `#16162A` | Elevated surfaces, hover fills |
| `--border` | `#1E1E35` | All hairlines |
| `--text-primary` | `#F0F0FF` | Headlines, values |
| `--text-secondary` | `#8888AA` | Body copy |
| `--text-muted` | `#444466` | Placeholders, disabled |
| `--brand` | `#7C3AED` | Primary purple |
| `--brand-light` | `#A855F7` | Hover, gradient end |
| `--brand-glow` | `rgba(124,58,237,0.3)` | Focus glow |
| `--success` / `--error` / `--warning` | `#10B981` / `#EF4444` / `#F59E0B` | State |
| `--accent` | *runtime* | Detected platform colour — the signature |
| `--accent-cta` / `--accent-cta-deep` | *runtime* | The two stops of a solid control |
| `--accent-fg` | *runtime* | Label colour for those controls |

`--accent` defaults to `--brand` and is rewritten on the `<html>` element whenever a
platform is detected. Everything that should react to the paste reads `var(--accent)`, so
the colour change is one assignment rather than prop drilling.

**Solid controls need their own pair.** Brand colours are chosen for logos, not for 14px
labels on a filled button: white on YouTube red is 4.0:1 and white on Snapchat yellow is
unreadable. `ctaSurface()` resolves this per platform:

1. If either white or near-black already clears 4.5:1 on the raw colour, the brand colour
   is kept **exactly** and the label flips to whichever works. Most vivid brands — TikTok
   red, YouTube red, Reddit orange, Snapchat yellow — land here and stay fully saturated.
2. Only when neither label passes (Instagram pink, Facebook blue) is the fill deepened, by
   the smallest step that lets white through.

The gradient is single-hue for the same reason. An earlier version ran brand → secondary
(TikTok red → cyan); no single label colour can clear 4.5:1 across a span that wide, so the
second stop is now the same hue, deepened. The secondary brand colour still drives the
ambient glow, where contrast is not at stake.

All twelve platforms measure ≥ 4.5:1 across both gradient stops.

### Type

| Role | Face | Applied to |
| --- | --- | --- |
| Display / body | **Inter** (400/500/600/700/800) | Headlines, copy, buttons, labels |
| Utility | **JetBrains Mono** (400/500) | URLs, byte counts, durations, resolutions, format ids, status codes |

The split is the point: human language is Inter, machine artifacts are mono.

---

## `components/layout/`

### `Navbar.tsx` — `"use client"`
Fixed header. Transparent at the top, blurred `--bg-primary/80` with a bottom hairline once
`scrollY > 12`.

| Prop | Type | Default |
| --- | --- | --- |
| `activePlatform` | `PlatformId \| null` | `null` |

State: `scrolled: boolean`, `menuOpen: boolean` (mobile sheet).
Load animation: slides down `-100% → 0` at 200 ms.

---

## `components/hero/`

### `HeroSection.tsx` — `"use client"`
Composes the background, headline, sub-headline, tool and platform strip. Owns nothing but
the load-sequence orchestration (a Framer `staggerChildren` parent).

| Prop | Type | Purpose |
| --- | --- | --- |
| `platform` | `Platform \| null` | Set on platform pages to tint the hero and preset copy |
| `eyebrow` / `title` / `subtitle` | `ReactNode` | Overridable per page |

### `ParticleBackground.tsx` — `"use client"`
Three drifting mesh orbs (pure CSS keyframes — no JS cost), an SVG grid overlay, and 20
Framer-animated particles on slow randomised paths. Returns `null` for the particle layer
when `prefers-reduced-motion` is set; the orbs freeze rather than disappear.

| Prop | Type | Default |
| --- | --- | --- |
| `particleCount` | `number` | `20` |
| `accent` | `string` | `var(--brand)` |

### `UrlInput.tsx` — `"use client"` — **signature component**
The paste bar. Wraps the input in a gradient blur ring that is invisible until
`:focus-within`, then blooms in the current `--accent`.

| Prop | Type | Purpose |
| --- | --- | --- |
| `value` | `string` | Controlled URL |
| `onChange` | `(v: string) => void` | |
| `onSubmit` | `() => void` | Enter key or CTA |
| `state` | `FlowState` | Drives the inline affordance |
| `platform` | `Platform \| null` | Colour source |
| `error` | `string \| null` | Triggers the shake |

State: `isPasting` (clipboard permission in flight), `shakeKey` (increments to re-fire the
shake animation on repeated errors).
Behaviour: `navigator.clipboard.readText()` behind a permission check, falling back to
focusing the field with a hint when the API is unavailable (Firefox, insecure origins).

### `PlatformDetector.tsx` — `"use client"`
The chip inside the input's left edge. `AnimatePresence` swap: old icon scales out, new one
springs in. Shows a spinner during `DETECTING`.

| Prop | Type |
| --- | --- |
| `platform` | `Platform \| null` |
| `detecting` | `boolean` |

### `PlatformStrip.tsx` — `"use client"`
Horizontal logo row below the input. The active platform scales to `1.18` and goes full
colour; the others desaturate to 35 % opacity. Staggered fade-in at 1000 ms on load.

| Prop | Type |
| --- | --- |
| `active` | `PlatformId \| null` |

---

## `components/downloader/`

### `DownloaderTool.tsx` — `"use client"`
The single interactive island on the homepage. Holds `useDownloadFlow` and renders the
right sub-tree for the current state.

| Prop | Type | Purpose |
| --- | --- | --- |
| `presetPlatform` | `PlatformId \| undefined` | Platform pages scope the placeholder and error copy |

### `useDownloadFlow.ts` (hook, `lib/`)
The state machine. Returns `{ state, url, platform, metadata, formats, selectedFormat, error, progress, actions }`.

```ts
type FlowState =
  | 'IDLE' | 'DETECTING' | 'FETCHING_METADATA'
  | 'PREVIEW' | 'DOWNLOADING' | 'SUCCESS' | 'ERROR'
```

| Action | Effect |
| --- | --- |
| `setUrl(v)` | `IDLE`/`ERROR` → `DETECTING`; aborts any in-flight request; debounces 400 ms |
| `fetchMetadata()` | `DETECTING` → `FETCHING_METADATA` → `PREVIEW` \| `ERROR` |
| `selectFormat(id)` | Preview only |
| `download()` | `PREVIEW` → `DOWNLOADING` → `SUCCESS` \| `ERROR` |
| `reset()` | → `IDLE`, clears everything |
| `dismissError()` | `ERROR` → previous stable state |

Every fetch carries an `AbortSignal` from a ref that `setUrl` replaces, so a stale
extraction can never overwrite a newer one.

### `VideoPreview.tsx` — `"use client"`
Thumbnail (16:9, `object-cover`, platform badge overlaid bottom-left), title clamped to two
lines, uploader, duration and view count in mono.

| Prop | Type |
| --- | --- |
| `metadata` | `VideoMetadata` |

### `FormatSelector.tsx` — `"use client"`
Two-column grid (one on mobile) of `FormatCard`. Radio-group semantics: `role="radiogroup"`,
arrow-key roving focus.

| Prop | Type |
| --- | --- |
| `formats` | `FormatOption[]` |
| `selected` | `string \| null` |
| `onSelect` | `(id: string) => void` |

### `FormatCard.tsx` — `"use client"`
One option. Icon by `kind`, label in Inter, size and resolution in mono. Selected state:
`--accent` border plus an inset glow. `RECOMMENDED` pill on the flagged tier. A `needsMux`
tier shows a small "server render" note so the extra wait is expected.

| Prop | Type |
| --- | --- |
| `format` | `FormatOption` |
| `selected` | `boolean` |
| `onSelect` | `() => void` |

### `DownloadButton.tsx` — `"use client"`
Morphs between three shapes: idle CTA → determinate progress bar → success check. The
progress bar is the same element re-laid-out, so the transform is a `layout` animation
rather than a swap.

| Prop | Type |
| --- | --- |
| `state` | `FlowState` |
| `progress` | `number` (0–100) |
| `disabled` | `boolean` |
| `onClick` | `() => void` |

### `ProgressState.tsx` — `"use client"`
The indeterminate bar and status line under the input during `DETECTING` and
`FETCHING_METADATA`. Copy: "Detecting platform…" then "Fetching video info…".

### `SuccessState.tsx` — `"use client"`
Spring-drawn check (SVG `pathLength`), "Downloaded successfully", a restrained 12-particle
burst, and a "Download another" reset button.

---

## `components/ui/`

| Component | Props | Job |
| --- | --- | --- |
| `PlatformBadge.tsx` | `platform`, `size?`, `withName?` | Icon + name pill in the platform's colour |
| `Toast.tsx` | provider + `useToast()` | Bottom-centre, auto-dismiss 6 s, `role="status"`. Exposes `clear()` — a toast must not outlive the state it described, so recovering to `PREVIEW`/`SUCCESS` drops it |
| `Spinner.tsx` | `size?`, `className?` | `currentColor` ring, respects reduced motion |
| `Section.tsx` | `id`, `eyebrow?`, `title`, `subtitle?`, `children` | Consistent section rhythm and heading levels |
| `Reveal.tsx` | `children`, `delay?`, `y?` | `whileInView` fade-up wrapper, `once: true` |
| `Accordion.tsx` | `items: {q, a}[]` | Height-animated, `aria-expanded`, arrow-key navigation |

---

## `components/sections/`

| Component | Data source | Notes |
| --- | --- | --- |
| `HowItWorks.tsx` | inline (3 steps) | Numbered because it is a real sequence; SVG line draws on scroll |
| `SupportedPlatforms.tsx` | `PLATFORMS` | 12 cards, hover lift with the platform's colour glow |
| `Features.tsx` | inline (6) | Staggered `Reveal` |
| `FAQ.tsx` | `FAQS` | 8 items via `Accordion`; the same array feeds the JSON-LD |
| `Footer.tsx` | `PLATFORMS`, `LEGAL_LINKS` | Live health dot polling `/api/health` every 60 s |
| `PlatformGuide.tsx` | `PLATFORM_CONTENT[id]` | The ~500-word SEO guide on platform pages |

---

## `lib/`

| Module | Exports |
| --- | --- |
| `constants.ts` | `PLATFORMS`, `PLATFORM_COLORS`, `FAQS`, `FEATURES`, `STEPS`, `SITE` |
| `platform-content.ts` | `PLATFORM_CONTENT` — per-platform hero copy, FAQs, guide prose |
| `detect.ts` | `detectPlatform(url)` — mirrors `services/detector.py` |
| `api.ts` | `fetchMetadata`, `requestDownload`, `checkHealth`, `ApiError` |
| `utils.ts` | `cn`, `formatBytes`, `formatDuration`, `formatCount`, `readClipboard`, `truncate` |
| `types.ts` | `Platform`, `PlatformId`, `VideoMetadata`, `FormatOption`, `DownloadResult`, `FlowState` |
| `use-download-flow.ts` | the reducer hook above |
| `use-reduced-motion.ts` | `usePrefersReducedMotion()` |

---

## Accessibility floor

- Every interactive element is a real `<button>`/`<a>` with a visible `:focus-visible` ring
  in `--accent`.
- The format grid is a radio group with roving `tabIndex` and arrow keys.
- Flow-state changes announce through an `aria-live="polite"` region; errors use
  `role="alert"`.
- Touch targets are ≥ 44 px at 375 px width.
- All motion is wrapped by `usePrefersReducedMotion()`; reduced motion keeps opacity
  transitions and drops transforms.
- Contrast: `--text-secondary` on `--bg-primary` is 5.9:1; `--text-muted` is used only for
  non-essential text and placeholders.
