/** Contracts shared with the backend. Kept in sync with `models/response.py`. */

export type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'
  | 'linkedin'
  | 'vimeo'
  | 'dailymotion'
  | 'twitch'

export interface Platform {
  id: PlatformId
  name: string
  /** Brand accent. Assigned to `--accent` when this platform is detected. */
  color: string
  /** Second colour, used only in the platform-page hero gradient. */
  colorAlt: string
  /** What people call the thing they are downloading. */
  contentTypes: string[]
  hosts: string[]
  /** Shown on the platform page and in the supported-platforms grid. */
  blurb: string
  /** Placeholder for the URL input when this platform is preset. */
  placeholder: string
  /** Set when the platform has real limits worth stating up front. */
  caveat?: string
}

export type FormatKind = 'video' | 'audio'

export interface FormatOption {
  id: string
  label: string
  ext: string
  quality: string
  height: number | null
  fps: number | null
  kind: FormatKind
  filesize_approx: number | null
  filesizeLabel: string | null
  recommended: boolean
  needsMux: boolean
  note: string | null
  /** Pre-signed by the metadata call, so downloading is one request instead of two. */
  downloadUrl: string | null
  filename: string | null
}

export interface VideoMetadata {
  success: true
  platform: string
  platformName: string
  platformColor: string
  title: string
  thumbnail: string | null
  duration: number | null
  durationLabel: string | null
  uploader: string | null
  uploaderUrl: string | null
  viewCount: number | null
  likeCount: number | null
  webpageUrl: string | null
  isLive: boolean
  formats: FormatOption[]
}

export interface DownloadResult {
  success: true
  download_url: string
  filename: string
  filesize: number | null
  mime_type: string
  expires_in: number
  needs_render: boolean
}

export interface HealthStatus {
  status: 'ok' | 'degraded'
  yt_dlp_version: string | null
  ffmpeg: boolean
  uptime: number
  cache_entries: number
  version: string
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    detail: string | null
  }
}

/** The seven states from the brief's download flow. */
export type FlowState =
  | 'IDLE'
  | 'DETECTING'
  | 'FETCHING_METADATA'
  | 'PREVIEW'
  | 'DOWNLOADING'
  | 'SUCCESS'
  | 'ERROR'
