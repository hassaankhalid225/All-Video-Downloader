'use client'

import { Check, Film, Music } from 'lucide-react'
import { forwardRef } from 'react'

import type { FormatOption } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * One quality option.
 *
 * The label is in Inter and the numbers are in mono — the split that runs through the
 * whole product. Selected state uses `--accent`, so the card set re-tints with the
 * detected platform.
 */
export const FormatCard = forwardRef<
  HTMLButtonElement,
  {
    format: FormatOption
    selected: boolean
    onSelect: () => void
    tabIndex: number
    onKeyDown: (event: React.KeyboardEvent) => void
  }
>(function FormatCard({ format, selected, onSelect, tabIndex, onKeyDown }, ref) {
  const Icon = format.kind === 'audio' ? Music : Film

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200',
        selected
          ? 'border-accent bg-accent-soft'
          : 'border-edge bg-bg-tertiary/40 hover:border-content-muted hover:bg-bg-tertiary',
      )}
      style={selected ? { boxShadow: '0 0 0 1px var(--accent), 0 0 24px -8px var(--accent-glow)' } : undefined}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 transition-colors',
          selected ? 'text-accent' : 'text-content-muted group-hover:text-content-secondary',
        )}
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-content-primary">{format.label}</span>
          {format.recommended && (
            <span className="eyebrow shrink-0 text-accent">Best</span>
          )}
        </span>

        <span className="metric mt-1 block text-content-secondary">
          {format.filesizeLabel ?? 'Size unknown'}
          {format.fps && format.fps >= 50 ? ` · ${format.fps}fps` : ''}
        </span>

        {format.note && (
          <span className="mt-1.5 block text-[0.6875rem] leading-snug text-content-muted">
            {format.note}
          </span>
        )}
      </span>

      <span
        className={cn(
          'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all',
          selected ? 'border-accent bg-[var(--accent-cta)]' : 'border-content-muted',
        )}
        aria-hidden="true"
      >
        {selected && <Check className="h-2.5 w-2.5 text-accent-fg" strokeWidth={3.5} />}
      </span>
    </button>
  )
})
