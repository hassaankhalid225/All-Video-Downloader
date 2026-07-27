'use client'

import { m } from 'framer-motion'

import type { FlowState } from '@/lib/types'

const COPY: Partial<Record<FlowState, string>> = {
  DETECTING: 'Detecting platform…',
  FETCHING_METADATA: 'Fetching video info…',
}

/**
 * The indeterminate bar and status line between paste and preview.
 *
 * The bar is a shimmer rather than a filling bar because there is genuinely no progress
 * to report — extraction is one opaque call. A bar that creeps to 90% and waits is a lie
 * about what the system knows.
 */
export function ProgressState({ state }: { state: FlowState }) {
  const message = COPY[state]
  if (!message) return null

  return (
    <m.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-4"
    >
      <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className="absolute inset-y-0 w-1/3 animate-shimmer rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          }}
        />
      </div>
      <p className="metric mt-2.5 text-content-secondary" aria-live="polite">
        {message}
      </p>
    </m.div>
  )
}
