'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Link2 } from 'lucide-react'

import type { Platform } from '@/lib/types'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'

import { PlatformIcon } from '../ui/PlatformIcon'
import { Spinner } from '../ui/Spinner'

/**
 * The chip at the left edge of the input.
 *
 * Three states share one slot so the input's layout never shifts: a neutral link glyph,
 * a spinner while the server is being asked, and the detected platform's mark.
 */
export function PlatformDetector({
  platform,
  detecting,
}: {
  platform: Platform | null
  detecting: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const key = detecting ? 'detecting' : (platform?.id ?? 'idle')

  const spring = reduced
    ? { duration: 0.15 }
    : { type: 'spring' as const, stiffness: 420, damping: 26 }

  return (
    <div
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-tertiary"
      style={platform ? { backgroundColor: 'var(--accent-soft)' } : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={key}
          initial={{ opacity: 0, scale: reduced ? 1 : 0.5, rotate: reduced ? 0 : -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
          transition={spring}
          className="absolute grid place-items-center"
        >
          {detecting ? (
            <Spinner className="h-4 w-4 text-accent" label="Detecting platform" />
          ) : platform ? (
            <PlatformIcon id={platform.id} className="h-[1.15rem] w-[1.15rem] text-accent" />
          ) : (
            <Link2 className="h-[1.15rem] w-[1.15rem] text-content-muted" aria-hidden="true" />
          )}
        </m.span>
      </AnimatePresence>
    </div>
  )
}
