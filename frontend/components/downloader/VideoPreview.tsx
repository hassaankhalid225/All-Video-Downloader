'use client'

import { Eye, Heart, Play, Radio } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { PLATFORMS_BY_ID } from '@/lib/constants'
import type { PlatformId, VideoMetadata } from '@/lib/types'
import { formatCount } from '@/lib/utils'

import { PlatformBadge } from '../ui/PlatformBadge'

/** Thumbnail, title, uploader and the numbers — everything needed to confirm the right link. */
export function VideoPreview({ metadata }: { metadata: VideoMetadata }) {
  const [imageFailed, setImageFailed] = useState(false)
  const platformId = (PLATFORMS_BY_ID[metadata.platform as PlatformId] ? metadata.platform : null) as
    | PlatformId
    | null

  const views = formatCount(metadata.viewCount)
  const likes = formatCount(metadata.likeCount)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-edge bg-bg-tertiary sm:w-56">
        {metadata.thumbnail && !imageFailed ? (
          <Image
            src={metadata.thumbnail}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 224px"
            className="object-cover"
            onError={() => setImageFailed(true)}
            // Routed through Next's optimizer on purpose. TikTok and Instagram CDNs
            // reject hot-linked requests from a browser, so loading the URL directly
            // gives a blank frame. Fetching it server-side sidesteps that, and the
            // fallback below covers the cases where it still fails.
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-content-muted">
            <Play className="h-7 w-7" aria-hidden="true" />
          </div>
        )}

        {platformId && (
          <div className="absolute bottom-2 left-2">
            <PlatformBadge id={platformId} size="sm" />
          </div>
        )}

        {metadata.durationLabel && (
          <span className="metric absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-white backdrop-blur-sm">
            {metadata.durationLabel}
          </span>
        )}

        {metadata.isLive && (
          <span className="metric absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-state-error px-1.5 py-0.5 uppercase text-white">
            <Radio className="h-3 w-3" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="clamp-2 text-[0.9375rem] font-semibold leading-snug text-content-primary sm:text-base">
          {metadata.title}
        </h3>

        {metadata.uploader && (
          <p className="mt-1.5 truncate text-sm text-content-secondary">{metadata.uploader}</p>
        )}

        {(views || likes) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-content-muted">
            {views && (
              <span className="metric inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {views} views
              </span>
            )}
            {likes && (
              <span className="metric inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                {likes}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
