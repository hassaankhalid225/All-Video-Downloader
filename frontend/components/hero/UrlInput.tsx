'use client'

import { m } from 'framer-motion'
import { ArrowRight, ClipboardPaste, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import type { FlowState, Platform } from '@/lib/types'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { cn, readClipboard } from '@/lib/utils'

import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { PlatformDetector } from './PlatformDetector'

/**
 * The paste bar — the one element the whole product is built around.
 *
 * The signature: the glow ring, the caret, the platform chip and the CTA all read
 * `--accent`, which the flow hook rewrites to the detected platform's brand colour. Paste
 * a TikTok link and the tool turns TikTok red; paste a YouTube link and it turns YouTube
 * red. One assignment, no prop drilling.
 */
export function UrlInput({
  value,
  onChange,
  onSubmit,
  onClear,
  state,
  platform,
  errorNonce,
  placeholder,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string, options?: { immediate?: boolean }) => void
  onSubmit: () => void
  onClear: () => void
  state: FlowState
  platform: Platform | null
  errorNonce: number
  placeholder?: string
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const reduced = usePrefersReducedMotion()

  const isDetecting = state === 'DETECTING' || state === 'FETCHING_METADATA'
  const isBusy = state === 'FETCHING_METADATA' || state === 'DOWNLOADING'
  const isEmpty = !value.trim()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  async function handlePaste() {
    const result = await readClipboard()
    if (result.ok) {
      onChange(result.text, { immediate: true })
      inputRef.current?.focus()
      return
    }

    // Each failure needs a different instruction, so they cannot share a message.
    if (result.reason === 'empty') {
      toast.show('Your clipboard is empty. Copy a video link first', 'info')
    } else if (result.reason === 'denied') {
      toast.show('Allow clipboard access, or paste with Ctrl+V', 'info')
    } else {
      toast.show('This browser will not share the clipboard. Paste with Ctrl+V', 'info')
    }
    inputRef.current?.focus()
  }

  return (
    <m.div
      // Re-keying on the error count restarts the shake for a second failure in a row.
      key={errorNonce}
      className={cn('group relative', state === 'ERROR' && !reduced && 'animate-shake')}
    >
      {/* The glow ring. Invisible until focus, then blooms in the current accent. */}
      <div
        aria-hidden="true"
        className="absolute -inset-[3px] rounded-[1.15rem] opacity-0 blur-lg transition-opacity duration-500 group-focus-within:opacity-70"
        style={{
          background: 'linear-gradient(100deg, var(--accent) 0%, var(--accent-light) 100%)',
        }}
      />

      <div
        className={cn(
          'relative flex items-center gap-2 rounded-2xl border bg-bg-secondary p-2 transition-colors duration-300',
          state === 'ERROR' ? 'border-state-error' : 'border-edge focus-within:border-accent',
        )}
      >
        <PlatformDetector platform={platform} detecting={isDetecting} />

        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            // Extract on the paste itself rather than waiting out a debounce that exists
            // for typing. Ctrl+V is how nearly everyone uses this box.
            const pasted = event.clipboardData.getData('text')
            if (!pasted) return
            event.preventDefault()
            const input = event.currentTarget
            const next =
              value.slice(0, input.selectionStart ?? value.length) +
              pasted +
              value.slice(input.selectionEnd ?? value.length)
            onChange(next.trim(), { immediate: true })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
            if (event.key === 'Escape' && value) onClear()
          }}
          placeholder={placeholder ?? 'Paste any social media link here…'}
          aria-label="Video link"
          aria-invalid={state === 'ERROR'}
          className="min-w-0 flex-1 bg-transparent px-1 font-mono text-[0.9375rem] text-content-primary caret-accent outline-none sm:text-base"
        />

        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear link"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-content-muted transition-colors hover:bg-bg-tertiary hover:text-content-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {!value && (
          <button
            type="button"
            onClick={handlePaste}
            className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-content-secondary transition-colors hover:bg-bg-tertiary hover:text-content-primary sm:inline-flex"
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste
          </button>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={isEmpty || isBusy}
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-accent-fg transition-all duration-300 sm:px-6',
            // Only an empty field greys the button out. Fading it while the request is in
            // flight reads as "broken" rather than "working" — and that is precisely the
            // second or two the user spends looking at it.
            isEmpty && 'cursor-not-allowed opacity-40',
            isBusy && 'cursor-wait',
            !isBusy && !isEmpty && 'hover:brightness-110 active:scale-[0.98]',
          )}
          style={{
            background: 'linear-gradient(100deg, var(--accent-cta) 0%, var(--accent-cta-deep) 100%)',
          }}
        >
          <span className="hidden sm:inline">{isBusy ? 'Working…' : 'Get video'}</span>
          {isBusy ? (
            <Spinner className="h-4 w-4" label="Fetching video info" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile keeps the paste affordance below the bar, where it does not squeeze the field. */}
      {!value && (
        <button
          type="button"
          onClick={handlePaste}
          className="-ml-2 mt-1 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-content-secondary transition-colors hover:text-content-primary sm:hidden"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste from clipboard
        </button>
      )}
    </m.div>
  )
}
