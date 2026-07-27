'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { PLATFORMS_BY_ID } from '@/lib/constants'
import type { PlatformId } from '@/lib/types'
import { useDownloadFlow } from '@/lib/use-download-flow'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'

import { PlatformStrip } from '../hero/PlatformStrip'
import { UrlInput } from '../hero/UrlInput'
import { useToast } from '../ui/Toast'
import { DownloadButton } from './DownloadButton'
import { FormatSelector } from './FormatSelector'
import { ProgressState } from './ProgressState'
import { SuccessState } from './SuccessState'
import { VideoPreview } from './VideoPreview'

/**
 * The one interactive island on the page.
 *
 * Everything else on the homepage is a Server Component, so this is the entirety of the
 * interactive JavaScript budget. It owns the seven-state machine and renders the sub-tree
 * for whichever state is current.
 */
export function DownloaderTool({
  presetPlatform,
  showStrip = true,
}: {
  presetPlatform?: PlatformId
  showStrip?: boolean
}) {
  const flow = useDownloadFlow(presetPlatform)
  const toast = useToast()
  const reduced = usePrefersReducedMotion()
  const lastErrorNonce = useRef(0)

  // Errors surface twice on purpose: the input shakes (immediate, local) and a toast
  // explains (persistent, readable). The shake alone does not say what went wrong.
  useEffect(() => {
    if (flow.error && flow.errorNonce !== lastErrorNonce.current) {
      lastErrorNonce.current = flow.errorNonce
      const suffix =
        flow.error.code === 'RATE_LIMITED' && flow.error.retryAfter
          ? ` Try again in ${flow.error.retryAfter}s.`
          : ''
      toast.show(`${flow.error.message}.${suffix}`, 'error')
    }
  }, [flow.error, flow.errorNonce, toast])

  // A toast outlives the state it described: paste a bad link, then a good one, and the
  // old failure is still on screen next to a working preview. Clear it on recovery.
  useEffect(() => {
    if (flow.state === 'PREVIEW' || flow.state === 'SUCCESS') toast.clear()
  }, [flow.state, toast])

  const preset = presetPlatform ? PLATFORMS_BY_ID[presetPlatform] : null
  const showPreview = flow.state === 'PREVIEW' || flow.state === 'DOWNLOADING'

  return (
    <div className="w-full">
      <UrlInput
        value={flow.url}
        onChange={flow.setUrl}
        onSubmit={flow.submit}
        onClear={flow.reset}
        state={flow.state}
        platform={flow.platform}
        errorNonce={flow.errorNonce}
        placeholder={preset?.placeholder}
      />

      <AnimatePresence mode="wait">
        {(flow.state === 'DETECTING' || flow.state === 'FETCHING_METADATA') && (
          <ProgressState key="progress" state={flow.state} />
        )}
      </AnimatePresence>

      {/* One live region for the whole flow, so state changes are announced once. */}
      <p className="sr-only" role="status" aria-live="polite">
        {flow.state === 'FETCHING_METADATA' && 'Fetching video information'}
        {flow.state === 'PREVIEW' && `Ready to download: ${flow.metadata?.title ?? ''}`}
        {flow.state === 'DOWNLOADING' && 'Download in progress'}
        {flow.state === 'SUCCESS' && 'Download complete'}
      </p>

      <AnimatePresence initial={false} mode="wait">
        {showPreview && flow.metadata && (
          <m.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="surface mt-5 p-4 sm:p-5">
              <VideoPreview metadata={flow.metadata} />

              <div className="mt-5 border-t border-edge pt-5">
                <FormatSelector
                  formats={flow.formats}
                  selectedId={flow.selectedFormat?.id ?? null}
                  onSelect={flow.selectFormat}
                />
              </div>

              <div className="mt-5">
                <DownloadButton
                  state={flow.state}
                  progress={flow.progress}
                  preparing={flow.preparing}
                  format={flow.selectedFormat}
                  onClick={flow.download}
                />
              </div>
            </div>
          </m.div>
        )}

        {flow.state === 'SUCCESS' && (
          <m.div
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="surface mt-5 p-4 sm:p-5">
              <SuccessState filename={flow.filename} onReset={flow.reset} />
            </div>
          </m.div>
        )}

        {flow.state === 'ERROR' && flow.error && (
          <m.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-state-error/40 bg-state-error/[0.07] p-4"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-state-error" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content-primary">{flow.error.message}</p>
                <p className="metric mt-1 text-content-muted">{flow.error.code}</p>
              </div>
              <button
                type="button"
                onClick={flow.submit}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-edge px-4 text-xs font-medium text-content-primary transition-colors hover:bg-bg-tertiary"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Retry
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {showStrip && (
        <div className="mt-8">
          <PlatformStrip active={flow.platform?.id ?? null} />
        </div>
      )}
    </div>
  )
}
