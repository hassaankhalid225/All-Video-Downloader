import type { Platform, PlatformId } from './types'

export const SITE = {
  name: 'AllDown',
  tagline: 'Download anything. From anywhere.',
  description:
    'Free online video downloader for TikTok, Instagram, YouTube, X, Facebook and more. No watermark, HD quality, no signup required.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alldown.app',
  locale: 'en_US',
} as const

/**
 * Mirrors `backend/services/detector.py`. Both lists must be edited together —
 * `GET /api/platforms` is the runtime source of truth, this is the build-time copy
 * so the marketing pages can be fully static.
 */
export const PLATFORMS: Platform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#FE2C55',
    colorAlt: '#25F4EE',
    contentTypes: ['Videos', 'Photo posts'],
    hosts: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    blurb: 'Clean MP4s with no watermark, straight from the source.',
    placeholder: 'Paste a TikTok video link…',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    // Instagram's gradient runs purple → pink → orange. Ending on the orange makes the
    // CTA read as muddy amber rather than as Instagram, so the second stop is the purple.
    colorAlt: '#833AB4',
    contentTypes: ['Reels', 'Posts', 'Stories'],
    hosts: ['instagram.com'],
    blurb: 'Reels, feed videos and public Stories at full resolution.',
    placeholder: 'Paste an Instagram Reel or post link…',
    caveat: 'Private accounts cannot be downloaded.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    colorAlt: '#FF4E45',
    contentTypes: ['Videos', 'Shorts', 'Music'],
    hosts: ['youtube.com', 'youtu.be'],
    blurb: 'Up to 4K video, or pull the audio out as MP3.',
    placeholder: 'Paste a YouTube video or Shorts link…',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    color: '#1D9BF0',
    colorAlt: '#5BB8F5',
    contentTypes: ['Videos', 'GIFs'],
    hosts: ['x.com', 'twitter.com'],
    blurb: 'Videos and GIFs from any public post.',
    placeholder: 'Paste an X post link…',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    colorAlt: '#4293FF',
    contentTypes: ['Videos', 'Reels', 'Watch'],
    hosts: ['facebook.com', 'fb.watch'],
    blurb: 'Watch clips, Reels and page videos in HD.',
    placeholder: 'Paste a Facebook video link…',
    caveat: 'Public posts only.',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    color: '#E60023',
    colorAlt: '#FF3B58',
    contentTypes: ['Pins', 'Idea Pins'],
    hosts: ['pinterest.com', 'pin.it'],
    blurb: 'Video Pins and Idea Pins without the app.',
    placeholder: 'Paste a Pinterest Pin link…',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    color: '#FF4500',
    colorAlt: '#FF7A45',
    contentTypes: ['Videos', 'GIFs'],
    hosts: ['reddit.com', 'v.redd.it'],
    blurb: 'v.redd.it clips with the audio track merged back in.',
    placeholder: 'Paste a Reddit post link…',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    color: '#FFFC00',
    colorAlt: '#FFF67A',
    contentTypes: ['Spotlight', 'Public Stories'],
    hosts: ['snapchat.com'],
    blurb: 'Spotlight clips and public Stories.',
    placeholder: 'Paste a Snapchat Spotlight link…',
    caveat: 'Public content only.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    colorAlt: '#3B8DDB',
    contentTypes: ['Post videos'],
    hosts: ['linkedin.com'],
    blurb: 'Native videos from public posts.',
    placeholder: 'Paste a LinkedIn post link…',
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    color: '#1AB7EA',
    colorAlt: '#5FCFF3',
    contentTypes: ['Videos'],
    hosts: ['vimeo.com'],
    blurb: 'Public videos at the resolution they were uploaded.',
    placeholder: 'Paste a Vimeo link…',
  },
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    color: '#0EA5E9',
    colorAlt: '#54C4F5',
    contentTypes: ['Videos', 'Shorts'],
    hosts: ['dailymotion.com', 'dai.ly'],
    blurb: 'Full videos and shorts in one click.',
    placeholder: 'Paste a Dailymotion link…',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146FF',
    colorAlt: '#B18AFF',
    contentTypes: ['Clips', 'VODs'],
    hosts: ['twitch.tv', 'clips.twitch.tv'],
    blurb: 'Clips and past broadcasts before they expire.',
    placeholder: 'Paste a Twitch clip or VOD link…',
  },
]

export const PLATFORMS_BY_ID = Object.fromEntries(
  PLATFORMS.map((platform) => [platform.id, platform]),
) as Record<PlatformId, Platform>

/** Platforms that get their own landing page. */
export const FEATURED_PLATFORM_IDS: PlatformId[] = [
  'tiktok',
  'instagram',
  'youtube',
  'twitter',
  'facebook',
  'pinterest',
]

export const STEPS = [
  {
    title: 'Paste the link',
    body: 'Copy a link from any app and paste it in. We work out which platform it is as you type.',
  },
  {
    title: 'Pick a quality',
    body: 'Every available resolution, plus audio-only, with the file size for each one.',
  },
  {
    title: 'Save the file',
    body: 'The download starts in your browser. Nothing is stored on our servers afterwards.',
  },
] as const

export const FEATURES = [
  {
    icon: 'zap',
    title: 'Fast',
    body: 'Most links resolve in under three seconds. No queue, no waiting room.',
  },
  {
    icon: 'sparkles',
    title: 'No watermark',
    body: 'TikTok downloads use the clean source file, not the watermarked re-render.',
  },
  {
    icon: 'smartphone',
    title: 'Works on your phone',
    body: 'Same tool, same speed, on any browser. Nothing to install.',
  },
  {
    icon: 'layers',
    title: 'Twelve platforms',
    body: 'One box for TikTok, Instagram, YouTube, X, Facebook, Reddit and more.',
  },
  {
    icon: 'gift',
    title: 'Free',
    body: 'No limits, no trial, no card. The tool costs nothing to use.',
  },
  {
    icon: 'user-x',
    title: 'No account',
    body: 'Nothing to sign up for. We do not keep your links or your files.',
  },
] as const

export const FAQS = [
  {
    q: 'Is AllDown free to use?',
    a: 'Yes. There is no account, no limit on how many videos you download, and no paid tier. You will not be asked for a card.',
  },
  {
    q: 'Do TikTok downloads have a watermark?',
    a: 'No. TikTok serves two versions of every video — a clean one and a watermarked re-render. AllDown always picks the clean source file, so the logo and username overlay are not baked in.',
  },
  {
    q: 'What quality can I download?',
    a: 'Whatever the platform actually has. If a YouTube video was uploaded in 4K, 4K is offered. Every option shows its resolution and approximate file size before you commit, so nothing downloads at a quality you did not choose.',
  },
  {
    q: 'Can I download just the audio?',
    a: 'Yes. Every video with a soundtrack offers an MP3 at 192 kbps, and where the source already has an AAC track you can take it as an M4A with no re-encoding at all.',
  },
  {
    q: 'Can I download private or restricted content?',
    a: 'No. AllDown only reaches content that is publicly visible without logging in. A private Instagram account, a members-only YouTube video, or a friends-only Facebook post will return an error rather than a file.',
  },
  {
    q: 'Do you store the videos I download?',
    a: 'No. Files are streamed straight through to your browser. Anything that has to be converted on our side — an MP3, or a high-resolution video that needs its audio and video tracks merged — is written to a temporary file, sent, and deleted immediately.',
  },
  {
    q: 'Why did my link fail?',
    a: 'Usually one of four reasons: the post is private, it has been deleted, it is blocked in the region our servers run in, or the link points at a profile rather than a specific post. The error message tells you which one.',
  },
  {
    q: 'Is downloading videos legal?',
    a: 'It depends on what you download and what you do with it. Saving your own content, or content licensed for reuse, is generally fine. Republishing someone else’s work without permission is not. AllDown is a tool; complying with copyright and each platform’s terms is your responsibility.',
  },
] as const

export const LEGAL_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/dmca', label: 'DMCA' },
  { href: '/contact', label: 'Contact' },
] as const
