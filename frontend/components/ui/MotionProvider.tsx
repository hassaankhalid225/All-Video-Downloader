'use client'

import { domAnimation, LazyMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Loads only the animation features this site actually uses.
 *
 * The full `motion` component pulls in drag, pan and layout projection — none of which
 * appear anywhere here — and ships them on first load. `domAnimation` covers animations,
 * variants, exit transitions, viewport triggers and hover/tap/focus gestures, which is
 * the entire vocabulary of this design.
 *
 * `strict` is deliberate: it throws if any component still imports `motion` instead of
 * `m`, which would silently reintroduce the full bundle. A loud failure in development
 * beats a quiet regression in the bundle size.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
