import { PLATFORMS_BY_ID } from './constants'
import type { Platform, PlatformId } from './types'

/**
 * Client-side platform detection.
 *
 * This exists purely so the badge appears the instant someone pastes, before any network
 * round trip. The server stays the authority — if these two ever disagree, the server's
 * answer is the one that ends up in the preview.
 *
 * Mirrors `backend/services/detector.py`.
 */

interface Rule {
  id: PlatformId
  hosts: string[]
  /** Empty means any path on a matching host qualifies. */
  paths: RegExp[]
  /** Hosts that exist only to redirect: any non-empty path is content. */
  shorteners?: string[]
}

const RULES: Rule[] = [
  {
    id: 'tiktok',
    hosts: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'],
    shorteners: ['vm.tiktok.com', 'vt.tiktok.com'],
    paths: [/^\/@[^/]+\/(video|photo)\/\d+/i, /^\/v\/\d+/i, /^\/t\/\w+/i],
  },
  {
    id: 'instagram',
    hosts: ['instagram.com', 'instagr.am'],
    shorteners: ['instagr.am'],
    paths: [
      /^\/(p|reel|reels|tv)\/[\w-]+/i,
      /^\/stories\/[^/]+\/\d+/i,
      /^\/share\/(reel|p)\/[\w-]+/i,
      /^\/[\w.]+\/(p|reel|reels|tv)\/[\w-]+/i,
    ],
  },
  {
    id: 'youtube',
    hosts: ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'],
    shorteners: ['youtu.be'],
    paths: [/^\/watch/i, /^\/shorts\/[\w-]+/i, /^\/live\/[\w-]+/i, /^\/embed\/[\w-]+/i, /^\/v\/[\w-]+/i],
  },
  {
    id: 'twitter',
    hosts: ['twitter.com', 'x.com', 'mobile.twitter.com', 'fxtwitter.com', 'vxtwitter.com', 't.co'],
    shorteners: ['t.co'],
    paths: [/^\/[^/]+\/status\/\d+/i, /^\/i\/(status|web\/status)\/\d+/i, /^\/i\/spaces\/\w+/i],
  },
  {
    id: 'facebook',
    hosts: ['facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'fb.com'],
    shorteners: ['fb.watch', 'fb.com'],
    paths: [
      /^\/[^/]+\/videos\//i,
      /^\/(reel|watch|video)/i,
      /^\/share\/(v|r)\/[\w-]+/i,
      /^\/story\.php/i,
      /^\/permalink\.php/i,
    ],
  },
  {
    id: 'pinterest',
    hosts: ['pinterest.com', 'pin.it', 'pinterest.co.uk', 'pinterest.ca', 'pinterest.fr', 'pinterest.de'],
    shorteners: ['pin.it'],
    paths: [/^\/pin\/[\w-]+/i],
  },
  {
    id: 'reddit',
    hosts: ['reddit.com', 'old.reddit.com', 'np.reddit.com', 'redd.it', 'v.redd.it'],
    shorteners: ['redd.it', 'v.redd.it'],
    paths: [/^\/r\/[^/]+\/comments\/\w+/i, /^\/r\/[^/]+\/s\/\w+/i],
  },
  {
    id: 'snapchat',
    hosts: ['snapchat.com', 'story.snapchat.com', 't.snapchat.com'],
    shorteners: ['t.snapchat.com'],
    paths: [/^\/spotlight\/\w+/i, /^\/p\/[\w-]+/i, /^\/add\/[^/]+/i, /^\/[^/]+\/\d+/i],
  },
  {
    id: 'linkedin',
    hosts: ['linkedin.com', 'lnkd.in'],
    shorteners: ['lnkd.in'],
    paths: [/^\/posts\/[\w-]+/i, /^\/feed\/update\//i, /^\/video\//i],
  },
  {
    id: 'vimeo',
    hosts: ['vimeo.com', 'player.vimeo.com'],
    paths: [/^\/\d+/i, /^\/channels\/[^/]+\/\d+/i, /^\/groups\/[^/]+\/videos\/\d+/i, /^\/video\/\d+/i],
  },
  {
    id: 'dailymotion',
    hosts: ['dailymotion.com', 'dai.ly', 'geo.dailymotion.com'],
    shorteners: ['dai.ly'],
    paths: [/^\/video\/\w+/i, /^\/embed\/video\/\w+/i],
  },
  {
    id: 'twitch',
    hosts: ['twitch.tv', 'm.twitch.tv', 'clips.twitch.tv'],
    shorteners: ['clips.twitch.tv'],
    paths: [/^\/videos\/\d+/i, /^\/[^/]+\/clip\/[\w-]+/i],
  },
]

function parse(raw: string): URL | null {
  const trimmed = raw.trim().replace(/^[<"'`]+|[>"'`]+$/g, '')
  if (!trimmed) return null

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

/** The platform a URL points at, or `null` when nothing matches. */
export function detectPlatform(raw: string): Platform | null {
  const url = parse(raw)
  if (!url) return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  const path = url.pathname || '/'

  for (const rule of RULES) {
    const matchesHost = rule.hosts.some((h) => host === h || host.endsWith(`.${h}`))
    if (!matchesHost) continue

    if (rule.shorteners?.some((s) => host === s || host.endsWith(`.${s}`))) {
      return path.replace(/\//g, '') ? PLATFORMS_BY_ID[rule.id] : null
    }

    if (rule.paths.length === 0 || rule.paths.some((p) => p.test(path))) {
      return PLATFORMS_BY_ID[rule.id]
    }

    // A known host with an unrecognised path — a profile, a login screen, the homepage.
    return null
  }

  return null
}

/** Whether the value is worth sending to the server at all. */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.includes('://')) return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(trimmed)
  return /^[\w-]+(\.[\w-]+)+(\/|$)/i.test(trimmed)
}
