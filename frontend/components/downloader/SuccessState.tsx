'use client'

import { m } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { seeded } from '@/lib/utils'

const BURST_COUNT = 12

/**
 * The end of the flow: a check that draws itself, one restrained burst, and the way back.
 *
 * The burst is twelve particles for roughly half a second. Confetti here would be the
 * kind of celebration that outlasts the thing it is celebrating.
 */
export function SuccessState({ filename, onReset }: { filename: string | null; onReset: () => void }) {
  const reduced = usePrefersReducedMotion()

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center py-4 text-center"
    >
      <div className="relative mb-5">
        {!reduced &&
          Array.from({ length: BURST_COUNT }, (_, index) => {
            const angle = (index / BURST_COUNT) * Math.PI * 2
            const distance = 34 + seeded(index) * 18
            return (
              <m.span
                key={index}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-state-success"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  scale: 0.3,
                }}
                transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
              />
            )
          })}

        <m.div
          initial={{ scale: reduced ? 1 : 0.6 }}
          animate={{ scale: 1 }}
          transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 18 }}
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.14)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
            <m.path
              d="M5 12.5 10 17.5 19 7"
              stroke="var(--success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.12, ease: 'easeOut' }}
            />
          </svg>
        </m.div>
      </div>

      <h3 className="text-lg font-semibold text-content-primary">Downloaded</h3>
      {filename && (
        <p className="metric mt-1.5 max-w-full truncate px-4 text-content-secondary" title={filename}>
          {filename}
        </p>
      )}
      <p className="mt-2 text-sm text-content-secondary">
        Check your downloads folder. We kept no copy.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-edge bg-bg-tertiary px-5 text-sm font-medium text-content-primary transition-colors hover:border-content-muted hover:bg-bg-tertiary/70"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Download another
      </button>
    </m.div>
  )
}
