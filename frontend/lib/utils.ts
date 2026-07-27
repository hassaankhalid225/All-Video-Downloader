/** Small helpers shared across components. No dependencies by design. */

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function formatBytes(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const scaled = bytes / 1024 ** index
  const precision = index === 0 || scaled >= 100 ? 0 : 1
  return `${scaled.toFixed(precision)} ${units[index]}`
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

/** Compact counts: 1204553 → "1.2M". */
export function formatCount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || value < 0) return null
  if (value < 1000) return String(value)
  const units: Array<[number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ]
  for (const [threshold, suffix] of units) {
    if (value >= threshold) {
      const scaled = value / threshold
      return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`
    }
  }
  return String(value)
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/**
 * Read the clipboard, or explain why we cannot.
 *
 * The API is unavailable on insecure origins and in Firefox without a user gesture, so
 * the caller needs to distinguish "empty clipboard" from "not allowed" to write the
 * right message.
 */
export async function readClipboard(): Promise<
  { ok: true; text: string } | { ok: false; reason: 'unsupported' | 'denied' | 'empty' }
> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    return { ok: false, reason: 'unsupported' }
  }
  try {
    const text = (await navigator.clipboard.readText()).trim()
    return text ? { ok: true, text } : { ok: false, reason: 'empty' }
  } catch {
    return { ok: false, reason: 'denied' }
  }
}

/** `#7C3AED` → `124 58 237`, so a hex token can drive an rgba() with a runtime alpha. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalised = hex.replace('#', '')
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((c) => c + c)
          .join('')
      : normalised
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  }
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Nudge a colour toward white until it is legible on the dark background.
 *
 * Snapchat's yellow and Twitch's purple sit at opposite ends of the luminance range, and
 * a token system that treats them identically will fail one of them.
 */
export function ensureReadable(hex: string, minLuminance = 0.32): string {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (luminance >= minLuminance) return hex
  const factor = minLuminance / Math.max(luminance, 0.01)
  const clamp = (v: number) => Math.min(255, Math.round(v * factor))
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const INK = '#0B0B14'
const PAPER = '#FFFFFF'

/** WCAG relative luminance. Note the sRGB linearisation — a plain average is not this. */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function darken(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

/** One label colour that works across every fill it will sit on. */
export function bestForeground(fills: string[]): string {
  const worst = (fg: string) => Math.min(...fills.map((fill) => contrastRatio(fg, fill)))
  return worst(PAPER) >= worst(INK) ? PAPER : INK
}

/**
 * The two gradient stops and the label colour for a solid button in a brand colour,
 * guaranteed at `minRatio` or better across the whole button.
 *
 * Brand colours are chosen for logos on white, not for 14px labels on a filled control:
 * white on YouTube red is 4.0:1 and white on Dailymotion blue is 2.8:1. Both fail.
 *
 * **The gradient is single-hue by necessity.** An earlier version ran from the brand
 * colour to its secondary — TikTok red to cyan — and no single label colour can clear
 * 4.5:1 across a span that wide. The second stop is now the same hue, deepened, so both
 * ends have comparable luminance and the label is legible everywhere on the button. The
 * secondary brand colour still drives the ambient glow, where contrast is not at stake.
 *
 * Two strategies by where the colour sits:
 *
 * - **Light brands** (Snapchat yellow) keep their fill and take dark text — which is what
 *   Snapchat itself does. Darkening the yellow would only destroy it.
 * - **Everything else** keeps white text, and the fill is deepened by the smallest amount
 *   that passes. The hue survives and the button still reads as the brand.
 */
export function ctaSurface(
  hex: string,
  minRatio = 4.5,
): { fill: string; fillDeep: string; fg: string } {
  const whiteWorks = contrastRatio(hex, PAPER) >= minRatio
  const inkWorks = contrastRatio(hex, INK) >= minRatio

  let fill = hex
  let fg = PAPER

  if (whiteWorks || inkWorks) {
    // The brand colour survives untouched. Most vivid brands — TikTok red, YouTube red,
    // Reddit orange — fail against white but pass comfortably against near-black, so
    // flipping the label keeps the colour exact where dimming it would not.
    fg = whiteWorks ? PAPER : INK
  } else {
    // Neither label works: deepen by the smallest step that lets white through. Only
    // colours sitting in the awkward middle band (Instagram pink, Facebook blue) land here.
    for (let step = 0; step < 40 && contrastRatio(fill, PAPER) < minRatio; step += 1) {
      fill = darken(hex, 0.98 ** (step + 1))
    }
  }

  // A subtle single-hue gradient. Deepening helps a white label and hurts a dark one, so
  // the dark-label case gets a much shallower ramp.
  let fillDeep = darken(fill, fg === INK ? 0.96 : 0.88)
  if (contrastRatio(fillDeep, fg) < minRatio) {
    // Rather than trade legibility for a gradient, drop the gradient.
    fillDeep = fill
  }

  return { fill, fillDeep, fg }
}

/** Stable pseudo-random in [0,1) from an integer seed — particles must not jump on re-render. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
