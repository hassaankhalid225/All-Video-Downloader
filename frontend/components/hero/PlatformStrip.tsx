'use client'

import { m } from 'framer-motion'

import { PLATFORMS } from '@/lib/constants'
import type { PlatformId } from '@/lib/types'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { cn, ensureReadable } from '@/lib/utils'

import { PlatformIcon } from '../ui/PlatformIcon'

/**
 * The logo row under the input.
 *
 * When a platform is detected its mark lifts and takes on its own colour while the rest
 * recede — so the strip doubles as confirmation that the paste was understood, without
 * needing a second status line.
 */
export function PlatformStrip({ active }: { active: PlatformId | null }) {
  const reduced = usePrefersReducedMotion()

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-7">
      {PLATFORMS.map((platform, index) => {
        const isActive = active === platform.id
        const dimmed = active !== null && !isActive

        return (
          <m.li
            key={platform.id}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              // Beat seven of the load sequence, staggered left to right.
              delay: reduced ? 0 : 1 + index * 0.035,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <m.span
              title={platform.name}
              animate={{
                scale: isActive && !reduced ? 1.25 : 1,
                opacity: dimmed ? 0.28 : isActive ? 1 : 0.55,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className={cn('block transition-colors duration-300')}
              style={{ color: isActive ? ensureReadable(platform.color) : 'var(--text-secondary)' }}
            >
              <PlatformIcon id={platform.id} className="h-5 w-5 sm:h-[1.375rem] sm:w-[1.375rem]" />
              <span className="sr-only">{platform.name}</span>
            </m.span>
          </m.li>
        )
      })}
    </ul>
  )
}
