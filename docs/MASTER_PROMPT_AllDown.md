# 🚀 MASTER PROMPT — AllDown (All-in-One Social Media Downloader)
# Claude Code Pro Max — Full Production Build
# Copy this ENTIRE prompt and paste into Claude Code

---

You are a world-class senior full-stack engineer and UI/UX designer. Your task is to build **AllDown** — a production-grade, stunning, fully functional All-in-One Social Media Video Downloader website from scratch. This is NOT a demo or prototype. Every feature must work in real production. No dummy data. No placeholder functions. Everything must be real and working.

---

## PHASE 0 — RESEARCH & SETUP (Do this FIRST before writing any code)

Before writing a single line of code, complete all of these steps in order:

### Step 0.1 — Read All Relevant Skills
Run these commands to load skill documentation:
```bash
cat /mnt/skills/public/frontend-design/SKILL.md
```
Study it fully. Apply ALL design guidelines from this skill throughout the entire project.

### Step 0.2 — Research Latest Versions
Run these commands to get the latest stable versions of all dependencies:
```bash
npm info next version
npm info yt-dlp-wrap version
python3 -m pip index versions yt-dlp 2>/dev/null | head -5
npm info tailwindcss version
npm info framer-motion version
npm info @radix-ui/react-icons version
```

### Step 0.3 — Check yt-dlp is Installed
```bash
which yt-dlp || pip install yt-dlp --break-system-packages
yt-dlp --version
```

### Step 0.4 — Create Project Structure
```bash
mkdir -p ~/alldown
cd ~/alldown
```

### Step 0.5 — Create Full Documentation Before Coding
Create these files BEFORE touching any source code:

**`ARCHITECTURE.md`** — Full system architecture, data flow, API design
**`PROJECT_PLAN.md`** — Phase-by-phase implementation plan
**`API_SPEC.md`** — Every API endpoint with request/response schemas
**`COMPONENT_MAP.md`** — Every UI component, its props, state, purpose

---

## PHASE 1 — BACKEND (FastAPI + yt-dlp)

### Tech Stack
- **Language:** Python 3.11+
- **Framework:** FastAPI with async support
- **Video Engine:** yt-dlp (handles 1000+ sites)
- **Task Queue:** asyncio + background tasks
- **CORS:** Configured for frontend domain
- **Rate Limiting:** slowapi
- **Caching:** In-memory LRU cache for metadata

### File Structure
```
backend/
├── main.py              # FastAPI app entry point
├── routers/
│   ├── download.py      # /api/download endpoints
│   ├── metadata.py      # /api/metadata endpoint
│   └── health.py        # /api/health endpoint
├── services/
│   ├── downloader.py    # yt-dlp wrapper service
│   ├── detector.py      # Platform URL detection
│   └── cache.py         # Metadata cache
├── models/
│   ├── request.py       # Pydantic request models
│   └── response.py      # Pydantic response models
├── middleware/
│   └── rate_limit.py    # Rate limiting
├── utils/
│   └── validators.py    # URL validation
├── requirements.txt
└── .env.example
```

### Platform URL Detector — `services/detector.py`
Write a robust URL detector that identifies these platforms from any URL format:
- **TikTok** — tiktok.com/*, vm.tiktok.com/*, vt.tiktok.com/*
- **Instagram** — instagram.com/reel/*, instagram.com/p/*, instagram.com/stories/*
- **YouTube** — youtube.com/watch?v=*, youtu.be/*, youtube.com/shorts/*
- **Twitter/X** — twitter.com/*/status/*, x.com/*/status/*
- **Facebook** — facebook.com/*/videos/*, fb.watch/*, facebook.com/reel/*
- **Pinterest** — pinterest.com/pin/*, pin.it/*
- **Snapchat** — snapchat.com/spotlight/*, story.snapchat.com/*
- **Reddit** — reddit.com/r/*/comments/*
- **LinkedIn** — linkedin.com/posts/*
- **Vimeo** — vimeo.com/*
- **Dailymotion** — dailymotion.com/video/*

Return: `{ platform: string, platformName: string, icon: string, color: string }`

### Downloader Service — `services/downloader.py`
```python
# Must implement:
async def get_metadata(url: str) -> VideoMetadata:
    # Use yt-dlp to extract: title, thumbnail, duration, 
    # available formats/qualities, uploader name, platform
    # Cache result for 5 minutes
    # Return structured VideoMetadata pydantic model
    pass

async def get_download_url(url: str, format: str, quality: str) -> DownloadResult:
    # Use yt-dlp to get direct download URL or stream
    # For TikTok: ensure no watermark (use --no-watermark flag)
    # For Instagram: handle auth if needed
    # Support formats: mp4, mp3, webm, m4a
    # Support qualities: best, 1080p, 720p, 480p, 360p, audio_only
    # Return direct download URL with proper filename
    pass
```

### API Endpoints — REQUIRED (All must be fully functional)

**POST /api/metadata**
```json
Request:  { "url": "https://www.tiktok.com/@user/video/123" }
Response: {
  "success": true,
  "platform": "tiktok",
  "platformName": "TikTok",
  "title": "Video title here",
  "thumbnail": "https://...",
  "duration": 45,
  "uploader": "@username",
  "formats": [
    { "id": "mp4_1080p", "label": "MP4 1080p", "ext": "mp4", "quality": "1080p", "filesize_approx": 15000000 },
    { "id": "mp4_720p", "label": "MP4 720p", "ext": "mp4", "quality": "720p", "filesize_approx": 8000000 },
    { "id": "mp3", "label": "MP3 Audio", "ext": "mp3", "quality": "audio", "filesize_approx": 2000000 }
  ]
}
```

**POST /api/download**
```json
Request:  { "url": "...", "format_id": "mp4_1080p" }
Response: {
  "success": true,
  "download_url": "https://...",
  "filename": "alldown_tiktok_video_title.mp4",
  "filesize": 15000000,
  "expires_in": 300
}
```

**GET /api/health**
```json
{ "status": "ok", "yt_dlp_version": "2025.x.x", "uptime": 3600 }
```

### Error Handling — Handle ALL these cases with proper HTTP codes + user-friendly messages:
- Invalid URL → 400 `"Please enter a valid social media URL"`
- Private/restricted content → 403 `"This content is private or restricted"`
- Content not found/deleted → 404 `"This content no longer exists"`
- Platform not supported → 422 `"This platform is not yet supported"`
- Rate limit exceeded → 429 `"Too many requests. Please wait a moment"`
- yt-dlp failure → 500 `"Could not process this link. Please try again"`
- Geo-restricted → 451 `"This content is not available in our server region"`

### requirements.txt
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
yt-dlp>=2025.1.1
python-multipart==0.0.9
slowapi==0.1.9
pydantic==2.7.0
python-dotenv==1.0.1
httpx==0.27.0
cachetools==5.3.3
```

---

## PHASE 2 — FRONTEND (Next.js 14 + Tailwind + Framer Motion)

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS v3
- **Animations:** Framer Motion
- **Icons:** Lucide React + React Icons (for platform icons)
- **HTTP:** Axios
- **State:** React hooks (no Redux needed)
- **Font:** Inter (Google Fonts)
- **Theme:** Dark mode ONLY

### Color System — Use EXACTLY these values
```css
--bg-primary: #080810        /* page background */
--bg-secondary: #0F0F1A      /* card background */
--bg-tertiary: #16162A       /* elevated surface */
--border: #1E1E35            /* borders */
--text-primary: #F0F0FF      /* headlines */
--text-secondary: #8888AA    /* body text */
--text-muted: #4444667       /* placeholder */
--brand: #7C3AED             /* primary purple */
--brand-light: #A855F7       /* hover state */
--brand-glow: rgba(124,58,237,0.3)  /* glow effect */
--success: #10B981
--error: #EF4444
--warning: #F59E0B
```

### Platform Colors (for badges and accents)
```js
const PLATFORM_COLORS = {
  tiktok:      { bg: '#010101', accent: '#FE2C55', secondary: '#25F4EE' },
  instagram:   { bg: '#833AB4', accent: '#FD1D1D', secondary: '#FCB045' },
  youtube:     { bg: '#FF0000', accent: '#FF0000', secondary: '#282828' },
  twitter:     { bg: '#000000', accent: '#1DA1F2', secondary: '#1DA1F2' },
  facebook:    { bg: '#1877F2', accent: '#1877F2', secondary: '#166FE5' },
  pinterest:   { bg: '#E60023', accent: '#E60023', secondary: '#AD081B' },
  snapchat:    { bg: '#FFFC00', accent: '#FFFC00', secondary: '#000000' },
  reddit:      { bg: '#FF4500', accent: '#FF4500', secondary: '#FF6534' },
  linkedin:    { bg: '#0A66C2', accent: '#0A66C2', secondary: '#004182' },
  vimeo:       { bg: '#1AB7EA', accent: '#1AB7EA', secondary: '#17A3D4' },
}
```

### File Structure
```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with fonts, meta
│   ├── page.tsx             # Homepage
│   ├── (platforms)/
│   │   ├── tiktok/page.tsx
│   │   ├── instagram/page.tsx
│   │   ├── youtube/page.tsx
│   │   ├── twitter/page.tsx
│   │   ├── facebook/page.tsx
│   │   └── pinterest/page.tsx
│   ├── api/                 # Next.js API routes (proxy to FastAPI)
│   │   ├── metadata/route.ts
│   │   └── download/route.ts
│   └── globals.css
├── components/
│   ├── hero/
│   │   ├── HeroSection.tsx      # Main hero with URL input
│   │   ├── UrlInput.tsx         # The big paste input
│   │   ├── PlatformDetector.tsx # Shows detected platform live
│   │   └── ParticleBackground.tsx # Animated background
│   ├── downloader/
│   │   ├── DownloaderTool.tsx   # Main tool container
│   │   ├── VideoPreview.tsx     # Thumbnail + metadata display
│   │   ├── FormatSelector.tsx   # Quality/format picker
│   │   ├── DownloadButton.tsx   # The main CTA button
│   │   └── ProgressState.tsx    # Loading/processing states
│   ├── ui/
│   │   ├── PlatformBadge.tsx    # Platform icon + name badge
│   │   ├── FormatCard.tsx       # Individual format option card
│   │   ├── Toast.tsx            # Notification toasts
│   │   └── Spinner.tsx          # Loading spinner
│   ├── sections/
│   │   ├── SupportedPlatforms.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Features.tsx
│   │   ├── FAQ.tsx
│   │   └── Footer.tsx
│   └── layout/
│       └── Navbar.tsx
├── lib/
│   ├── api.ts               # API calls to backend
│   ├── utils.ts             # Helper functions
│   └── constants.ts         # Platform data, app config
└── public/
    └── icons/               # Platform SVG icons
```

---

## PHASE 3 — UI/UX IMPLEMENTATION (CRITICAL — Read Every Word)

### Hero Section — This is EVERYTHING
The hero section must be jaw-dropping. Here is exactly what to build:

**Background:**
- Deep dark background `#080810`
- Animated mesh gradient — three purple/blue orbs slowly drifting (CSS animation, no JS needed)
- Subtle grid pattern overlay (CSS background-image with SVG)
- Small floating particles (use Framer Motion, ~20 particles, slow random movement)

**Headline:**
```
Download Anything.
From Anywhere.
```
- Font: Inter, 72px desktop / 40px mobile, weight 800
- "Anything" has purple gradient: `from-[#7C3AED] to-[#A855F7]`
- Animate in: fade up + slight scale, 0.8s ease, staggered per word

**Sub-headline:**
```
TikTok • Instagram • YouTube • Twitter • Facebook • Pinterest • and more
```
- Scrolling marquee on mobile
- Static on desktop, centered, muted color

**The URL Input Bar — Most Important Element:**
```tsx
// Must look like this concept:
<div className="relative group">
  {/* Animated glow ring on focus */}
  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 
                  rounded-2xl blur opacity-0 group-focus-within:opacity-75 
                  transition duration-500" />
  
  <div className="relative flex items-center bg-[#0F0F1A] rounded-2xl border 
                  border-[#1E1E35] focus-within:border-purple-500 p-2 gap-3">
    
    {/* Platform icon appears here when detected */}
    <PlatformDetector url={inputValue} />
    
    <input
      placeholder="Paste any social media link here..."
      className="flex-1 bg-transparent text-white text-lg outline-none px-2"
      onChange={handleUrlChange}
    />
    
    {/* Paste from clipboard button */}
    <button onClick={handlePaste}>
      <ClipboardIcon /> Paste
    </button>
    
    {/* Main download button */}
    <button className="bg-gradient-to-r from-purple-600 to-purple-500 
                       text-white px-8 py-3 rounded-xl font-semibold
                       hover:scale-105 transition-all">
      Download
    </button>
  </div>
</div>
```

**Platform Icons Strip below input:**
Show all supported platform logos in a horizontal row with subtle pulse animation. When a platform is detected from pasted URL, that platform's icon should "highlight" and scale up.

---

### Download Flow — State Machine (ALL states must be implemented)

**State 1: IDLE**
- Just the URL input, clean and minimal
- "Paste from clipboard" button
- Platform icons below

**State 2: DETECTING (0-500ms after paste)**
- Input shows platform icon animating in
- Small spinner inside input right side
- Text: "Detecting platform..."

**State 3: FETCHING_METADATA (500ms - 2s)**
- Full width progress bar appears below input (indeterminate)
- Platform badge animates in with platform color
- Text: "Fetching video info..."

**State 4: PREVIEW**
- Smooth height animation reveals the preview card
- Left: Video thumbnail with platform badge overlay
- Center: Title (2 lines max, truncated), uploader name, duration badge
- Right: Format selector cards

**Format Selector Cards:**
```
┌─────────────────────┐  ┌─────────────────────┐
│  🎬 MP4 • 1080p HD  │  │  🎬 MP4 • 720p       │
│  ~45 MB             │  │  ~22 MB              │
│  [RECOMMENDED] ✓    │  │                     │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐  
│  🎵 MP3 Audio       │  │  🎬 MP4 • 480p       │
│  ~3 MB              │  │  ~10 MB             │
└─────────────────────┘  └─────────────────────┘
```
Selected card has purple border glow effect.

**State 5: DOWNLOADING**
- Button transforms into progress bar
- Animated percentage counter
- "Your download will start automatically"

**State 6: SUCCESS**
- Green checkmark animation (Framer Motion spring)
- "Downloaded Successfully!" 
- "Download another video" button
- Share buttons (optional)

**State 7: ERROR**
- Red shake animation on input
- Human-readable error message in a toast
- Specific message per error type (private, not found, unsupported etc.)

---

### Sections Below the Hero

**"How It Works" — 3 Steps**
```
1. Paste Link          2. Choose Format       3. Download
   [URL icon]              [Format icon]          [Download icon]
   Copy any link           Pick quality           Save to device
   from any platform       and format             instantly
```
Horizontal on desktop, vertical on mobile. Animated number counter. Connected with a dotted line.

**"Supported Platforms" Grid**
12-platform grid, each with:
- Platform colored icon (large)
- Platform name
- Example content types ("Reels, Posts, Stories")
- Hover: card lifts with platform color glow

**"Features" Section — 6 Cards**
```
⚡ Lightning Fast       🚫 No Watermark      📱 Mobile Ready
   Under 5 seconds         TikTok videos        Works on any
   average speed           without logo         phone or browser

🎯 Any Platform        🆓 100% Free          🔒 No Sign Up
   10+ platforms           Always free          No account
   in one place            forever              ever needed
```

**FAQ Section (8 Questions, Accordion)**
With JSON-LD FAQ schema markup for Google rich snippets.

**Footer**
- Logo
- Links: About, Privacy Policy, Terms of Service, DMCA, Contact
- Platform quick links
- Copyright

---

## PHASE 4 — PLATFORM-SPECIFIC PAGES

Create a dedicated page for each major platform at `/tiktok`, `/instagram`, `/youtube`, `/twitter`, `/facebook`, `/pinterest`.

Each page must have:
- Platform-specific hero (use platform colors as accent)
- Same URL input tool (pre-configured for that platform)
- Platform-specific FAQ (5 questions)
- Platform-specific "How to download X videos" guide (500 words — good for SEO)
- Breadcrumb schema markup

Example `/tiktok` page title: `"TikTok Video Downloader — No Watermark, Free, HD | AllDown"`

---

## PHASE 5 — SEO & META

### Root Layout Meta (`app/layout.tsx`)
```tsx
export const metadata: Metadata = {
  title: 'AllDown — Download TikTok, Instagram, YouTube Videos Free',
  description: 'Free online video downloader for TikTok, Instagram, YouTube, Twitter, Facebook & more. No watermark, HD quality, no signup required. Download any social media video in seconds.',
  keywords: 'tiktok downloader, instagram video downloader, youtube downloader, social media downloader, video download online',
  openGraph: {
    title: 'AllDown — All-in-One Social Media Downloader',
    description: 'Download videos from 10+ platforms instantly. Free, fast, no signup.',
    images: ['/og-image.png'],  // Create a proper 1200x630 OG image
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AllDown — Download Any Social Media Video Free',
    description: 'TikTok, Instagram, YouTube, Twitter & more. No watermark. HD Quality.',
  },
}
```

### Structured Data
Add these JSON-LD schemas to the homepage:
- **WebApplication** schema
- **FAQPage** schema (all 8 FAQ items)
- **HowTo** schema (the 3-step process)

### Sitemap (`app/sitemap.ts`)
Auto-generated sitemap including all platform pages.

### Robots.txt
Allow all crawlers. Point to sitemap.

---

## PHASE 6 — ANIMATIONS (Framer Motion — Make it Stunning)

### Page Load Sequence
```
0ms:   Background gradients fade in
200ms: Navbar slides down
400ms: Hero headline animates up (word by word stagger)
600ms: Sub-headline fades in
800ms: URL input bar scales up from 95% with glow
1000ms: Platform icons fade in staggered left-to-right
1200ms: Scroll down arrow bounces
```

### Scroll Animations
- Features cards: fade up as they enter viewport
- Platform grid: staggered reveal
- How it works: draw-on animation for the connecting line
- FAQ items: smooth accordion expand/collapse

### Micro-interactions
- URL input focus: glow ring grows smoothly
- Format card hover: slight lift + border glow
- Download button hover: gradient shifts + subtle scale
- Platform icon hover in strip: scale 1.2 + color brighten
- Error state: horizontal shake animation
- Success state: checkmark draws itself + confetti burst (small, tasteful)

---

## PHASE 7 — PERFORMANCE & PRODUCTION

### Next.js Config (`next.config.js`)
```js
const nextConfig = {
  images: {
    domains: ['*'],  // For thumbnails from all platforms
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
```

### Environment Variables
```
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=https://alldown.app
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# backend/.env
ALLOWED_ORIGINS=http://localhost:3000,https://alldown.app
RATE_LIMIT_PER_MINUTE=20
CACHE_TTL_SECONDS=300
MAX_DOWNLOAD_SIZE_MB=500
```

### Rate Limiting Strategy
- Per IP: 20 metadata requests/minute
- Per IP: 10 download requests/minute  
- Return 429 with "retry-after" header
- Show user-friendly countdown in UI

---

## PHASE 8 — TESTING (Do NOT skip)

### Backend Tests
Write pytest tests for:
- URL detection for all 11 platforms (valid + invalid URLs)
- Metadata endpoint with real URLs from each platform
- Error handling for private/deleted content
- Rate limiting behavior
- Health endpoint

### Frontend Tests  
Manual testing checklist:
- [ ] TikTok URL → detects → fetches metadata → shows preview → downloads MP4 ✓
- [ ] Instagram Reel URL → full flow works ✓
- [ ] YouTube URL → MP4 + MP3 options ✓
- [ ] Twitter video URL → full flow ✓
- [ ] Facebook video URL → full flow ✓
- [ ] Invalid URL → shows error toast ✓
- [ ] Private content URL → shows appropriate message ✓
- [ ] Mobile (375px) → all elements fit, touch targets 44px+ ✓
- [ ] Slow network → loading states show correctly ✓
- [ ] Very long title → truncates gracefully ✓

---

## PHASE 9 — DEPLOYMENT CONFIG

### `railway.toml` (Backend)
```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/health"
restartPolicyType = "on_failure"
```

### `vercel.json` (Frontend)
```json
{
  "framework": "nextjs",
  "regions": ["sin1", "iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "index, follow" }
      ]
    }
  ]
}
```

---

## EXECUTION ORDER — Follow EXACTLY

1. ✅ Read `/mnt/skills/public/frontend-design/SKILL.md`
2. ✅ Research latest package versions
3. ✅ Create `ARCHITECTURE.md`, `PROJECT_PLAN.md`, `API_SPEC.md`
4. ✅ Build backend — `detector.py` first, then `downloader.py`, then routes
5. ✅ Test backend with real URLs from each platform using `curl` or pytest
6. ✅ Build frontend — globals.css first (CSS vars), then layout, then HeroSection, then DownloaderTool, then all other sections
7. ✅ Implement all 7 download flow states
8. ✅ Add all Framer Motion animations
9. ✅ Create all 6 platform-specific pages
10. ✅ Add SEO meta, JSON-LD schemas, sitemap
11. ✅ Run full test checklist
12. ✅ Create deployment configs

---

## QUALITY STANDARDS — Non-Negotiable

- **Zero dummy data** — everything works with real URLs
- **Zero placeholder functions** — every function has real implementation  
- **TypeScript strict mode** — no `any` types
- **Mobile-first** — design for 375px first, then scale up
- **Lighthouse score** — aim for 90+ Performance, 100 Accessibility, 100 SEO
- **Error states** — every possible error has a user-friendly UI state
- **Loading states** — no operation has zero loading feedback
- **Console** — zero errors, zero warnings in production build

---

## START COMMAND

Begin with Phase 0 immediately. Read the skill file first, then proceed phase by phase. Do not skip any phase. Do not write placeholder code. Build the real thing.

**The goal: A production website that someone can use RIGHT NOW to download a TikTok video, and it actually works.**
