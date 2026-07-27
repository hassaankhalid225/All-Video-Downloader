import { PLATFORMS_BY_ID } from '@/lib/constants'
import type { PlatformId } from '@/lib/types'
import { cn, ensureReadable, rgba } from '@/lib/utils'

import { PlatformIcon } from './PlatformIcon'

/**
 * Icon plus name, tinted with the platform's own brand colour.
 *
 * The colour is passed through `ensureReadable` because several brand colours — Snapchat
 * yellow at one end, Twitch purple at the other — do not carry enough contrast against
 * `#080810` on their own.
 */
export function PlatformBadge({
  id,
  withName = true,
  size = 'md',
  className,
}: {
  id: PlatformId
  withName?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const platform = PLATFORMS_BY_ID[id]
  if (!platform) return null

  const color = ensureReadable(platform.color)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium backdrop-blur-sm',
        size === 'sm' ? 'px-2 py-0.5 text-[0.6875rem]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        color,
        borderColor: rgba(color, 0.3),
        backgroundColor: rgba(color, 0.12),
      }}
    >
      <PlatformIcon id={id} className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {withName && platform.name}
    </span>
  )
}
