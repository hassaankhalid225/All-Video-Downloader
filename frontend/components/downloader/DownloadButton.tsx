'use client'

import { m } from 'framer-motion'
import { Download } from 'lucide-react'

import type { FlowState, FormatOption } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Spinner } from '../ui/Spinner'

/**
 * The commit action, which becomes the progress readout during the transfer.
 *
 * Progress is only shown when it is real. When the browser's own download manager owns
 * the transfer we cannot measure it, so the button says what is happening instead of
 * animating a number it invented.
 */
export function DownloadButton({
  state,
  progress,
  preparing,
  format,
  onClick,
}: {
  state: FlowState
  progress: number | null
  preparing: boolean
  format: FormatOption | null
  onClick: () => void
}) {
  const isDownloading = state === 'DOWNLOADING'

  if (isDownloading) {
    const label = preparing
      ? format?.needsMux
        ? 'Preparing your file…'
        : 'Starting download…'
      : progress !== null
        ? `Downloading… ${progress}%`
        : 'Download in progress…'

    return (
      <div className="w-full" aria-live="polite">
        <div className="relative h-12 w-full overflow-hidden rounded-xl border border-edge bg-bg-tertiary">
          {progress !== null ? (
            <m.div
              className="absolute inset-y-0 left-0"
              style={{ background: 'linear-gradient(100deg, var(--accent), var(--accent-light))' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          ) : (
            <div
              className="absolute inset-y-0 w-1/3 animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
              }}
            />
          )}

          <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-content-primary mix-blend-difference">
            {label}
          </span>
        </div>

        <p className="metric mt-2 text-center text-content-muted">
          {preparing && format?.needsMux
            ? 'Audio and video are being merged on our server'
            : 'Your download will start automatically'}
        </p>
      </div>
    )
  }

  const disabled = !format || state === 'FETCHING_METADATA'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-accent-fg transition-all duration-300',
        'disabled:cursor-not-allowed disabled:opacity-40',
        !disabled && 'hover:brightness-110 active:scale-[0.99]',
      )}
      style={{
        background: 'linear-gradient(100deg, var(--accent-cta) 0%, var(--accent-cta-deep) 100%)',
        boxShadow: disabled ? undefined : '0 8px 32px -12px var(--accent-glow)',
      }}
    >
      {state === 'FETCHING_METADATA' ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      {format ? `Download ${format.label}` : 'Download'}
    </button>
  )
}
