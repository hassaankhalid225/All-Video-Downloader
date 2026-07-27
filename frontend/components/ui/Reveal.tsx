'use client'

import { m } from 'framer-motion'
import type { ReactNode } from 'react'

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'

/**
 * Fade-and-rise as the element enters the viewport.
 *
 * `once` is deliberate: re-animating on every scroll-past is the kind of effect that
 * reads as decoration rather than intent, and it makes long pages feel restless.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduced = usePrefersReducedMotion()

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: reduced ? 0.2 : 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  )
}
