'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { ApiError, fetchMetadata, requestDownload, triggerBrowserDownload } from './api'
import { PLATFORMS_BY_ID } from './constants'
import { detectPlatform, looksLikeUrl } from './detect'
import type {
  DownloadResult,
  FlowState,
  FormatOption,
  Platform,
  PlatformId,
  VideoMetadata,
} from './types'
import { ctaSurface, ensureReadable, rgba } from './utils'

/**
 * How long to wait after the last keystroke before extracting.
 *
 * Only typing is debounced. A paste arrives complete, so waiting on it is 400ms of
 * nothing — and pasting is how essentially everyone uses this. See `setUrl`.
 */
const DEBOUNCE_MS = 250

/**
 * Above this we hand off to the browser's own download manager instead of streaming
 * through JavaScript. Streaming gives a real progress bar but holds the file in memory,
 * which is fine for a 6 MB TikTok and not fine for a 400 MB YouTube video.
 */
const STREAM_TO_MEMORY_LIMIT = 180 * 1024 * 1024

interface State {
  state: FlowState
  url: string
  platform: Platform | null
  metadata: VideoMetadata | null
  selectedFormatId: string | null
  error: { message: string; code: string; retryAfter: number | null } | null
  /** 0–100 while streaming; null when the browser owns the transfer. */
  progress: number | null
  /** True between the download request and the first byte — the server is rendering. */
  preparing: boolean
  /** The name the file will be saved under; shown in the success state. */
  filename: string | null
  /** Bumped on every error so the shake animation re-fires on a repeat failure. */
  errorNonce: number
}

type Action =
  | { type: 'SET_URL'; url: string; platform: Platform | null }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; metadata: VideoMetadata }
  | { type: 'SELECT_FORMAT'; formatId: string }
  | { type: 'DOWNLOAD_START' }
  | { type: 'DOWNLOAD_AUTHORISED'; filename: string }
  | { type: 'DOWNLOAD_FIRST_BYTE' }
  | { type: 'DOWNLOAD_PROGRESS'; progress: number }
  | { type: 'DOWNLOAD_SUCCESS' }
  | { type: 'FAIL'; message: string; code: string; retryAfter: number | null }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET' }

const INITIAL: State = {
  state: 'IDLE',
  url: '',
  platform: null,
  metadata: null,
  selectedFormatId: null,
  error: null,
  progress: null,
  preparing: false,
  filename: null,
  errorNonce: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_URL': {
      // Any edit invalidates whatever was on screen, including a finished download.
      if (!action.url.trim()) return { ...INITIAL, errorNonce: state.errorNonce }
      return {
        ...state,
        url: action.url,
        platform: action.platform,
        metadata: null,
        selectedFormatId: null,
        error: null,
        progress: null,
        preparing: false,
        state: 'DETECTING',
      }
    }

    case 'FETCH_START':
      return { ...state, state: 'FETCHING_METADATA', error: null }

    case 'FETCH_SUCCESS': {
      const recommended =
        action.metadata.formats.find((format) => format.recommended) ?? action.metadata.formats[0]
      return {
        ...state,
        state: 'PREVIEW',
        metadata: action.metadata,
        selectedFormatId: recommended?.id ?? null,
        error: null,
      }
    }

    case 'SELECT_FORMAT':
      return { ...state, selectedFormatId: action.formatId }

    case 'DOWNLOAD_START':
      return {
        ...state,
        state: 'DOWNLOADING',
        progress: null,
        preparing: true,
        filename: null,
        error: null,
      }

    case 'DOWNLOAD_AUTHORISED':
      return { ...state, filename: action.filename }

    case 'DOWNLOAD_FIRST_BYTE':
      return { ...state, preparing: false }

    case 'DOWNLOAD_PROGRESS':
      return { ...state, progress: action.progress, preparing: false }

    case 'DOWNLOAD_SUCCESS':
      return { ...state, state: 'SUCCESS', progress: 100, preparing: false }

    case 'FAIL':
      return {
        ...state,
        state: 'ERROR',
        preparing: false,
        progress: null,
        errorNonce: state.errorNonce + 1,
        error: { message: action.message, code: action.code, retryAfter: action.retryAfter },
      }

    case 'DISMISS_ERROR':
      // Returning to PREVIEW rather than IDLE keeps a failed download's context on screen.
      return { ...state, error: null, state: state.metadata ? 'PREVIEW' : 'IDLE' }

    case 'RESET':
      return { ...INITIAL, errorNonce: state.errorNonce }

    default:
      return state
  }
}

export interface DownloadFlow {
  state: FlowState
  url: string
  platform: Platform | null
  metadata: VideoMetadata | null
  formats: FormatOption[]
  selectedFormat: FormatOption | null
  error: State['error']
  errorNonce: number
  progress: number | null
  preparing: boolean
  filename: string | null
  isBusy: boolean
  setUrl: (value: string, options?: { immediate?: boolean }) => void
  submit: () => void
  selectFormat: (formatId: string) => void
  download: () => void
  reset: () => void
  dismissError: () => void
}

export function useDownloadFlow(presetPlatform?: PlatformId): DownloadFlow {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  const requestRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Guards against a stale extraction landing after a newer one. */
  const generationRef = useRef(0)

  const abortInFlight = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = null
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [])

  useEffect(() => abortInFlight, [abortInFlight])

  const runFetch = useCallback(
    async (url: string, generation: number) => {
      const controller = new AbortController()
      requestRef.current = controller
      dispatch({ type: 'FETCH_START' })

      try {
        const metadata = await fetchMetadata(url, controller.signal)
        if (generation !== generationRef.current) return
        dispatch({ type: 'FETCH_SUCCESS', metadata })
      } catch (error) {
        if (generation !== generationRef.current) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        const apiError = error as ApiError
        dispatch({
          type: 'FAIL',
          message: apiError.message ?? 'Could not process this link. Please try again',
          code: apiError.code ?? 'UNKNOWN',
          retryAfter: apiError.retryAfter ?? null,
        })
      }
    },
    [],
  )

  const setUrl = useCallback(
    (value: string, options?: { immediate?: boolean }) => {
      abortInFlight()
      generationRef.current += 1
      const generation = generationRef.current

      const platform = detectPlatform(value)
      dispatch({ type: 'SET_URL', url: value, platform })

      if (!value.trim() || !looksLikeUrl(value)) return

      // A paste is already a complete URL — there is no next keystroke to wait for, and
      // the debounce would just be dead time on the interaction people actually use.
      // Same for a recognised platform link: if we know what it is, start extracting.
      if (options?.immediate || platform !== null) {
        void runFetch(value.trim(), generation)
        return
      }

      debounceRef.current = setTimeout(() => {
        void runFetch(value.trim(), generation)
      }, DEBOUNCE_MS)
    },
    [abortInFlight, runFetch],
  )

  /** Enter or the CTA — skip the debounce. */
  const submit = useCallback(() => {
    if (!state.url.trim()) return
    abortInFlight()
    generationRef.current += 1
    void runFetch(state.url.trim(), generationRef.current)
  }, [abortInFlight, runFetch, state.url])

  const selectFormat = useCallback((formatId: string) => {
    dispatch({ type: 'SELECT_FORMAT', formatId })
  }, [])

  const download = useCallback(() => {
    const formatId = state.selectedFormatId
    if (!formatId || !state.url) return

    abortInFlight()
    generationRef.current += 1
    const generation = generationRef.current
    const controller = new AbortController()
    requestRef.current = controller

    dispatch({ type: 'DOWNLOAD_START' })

    const preSigned = state.metadata?.formats.find((format) => format.id === formatId)

    void (async () => {
      try {
        // The metadata response already carries a signed URL for every format, so the
        // usual path skips /api/download entirely — one fewer round trip on the click
        // that matters. Fall back when the token is missing or has aged out.
        const result: DownloadResult =
          preSigned?.downloadUrl && preSigned.filename
            ? {
                success: true,
                download_url: preSigned.downloadUrl,
                filename: preSigned.filename,
                filesize: preSigned.filesize_approx,
                mime_type: preSigned.kind === 'audio' ? 'audio/mpeg' : 'video/mp4',
                expires_in: 300,
                needs_render: preSigned.needsMux,
              }
            : await requestDownload(state.url.trim(), formatId, controller.signal)

        if (generation !== generationRef.current) return
        dispatch({ type: 'DOWNLOAD_AUTHORISED', filename: result.filename })

        const knownSize = result.filesize ?? 0
        const canStream = knownSize > 0 && knownSize <= STREAM_TO_MEMORY_LIMIT

        if (!canStream) {
          // Unknown or very large: let the browser's download manager own it. We cannot
          // report real progress here, so the UI shows an indeterminate state instead of
          // inventing a number.
          triggerBrowserDownload(result.download_url, result.filename)
          dispatch({ type: 'DOWNLOAD_FIRST_BYTE' })
          // The transfer continues in the browser; the flow's job is done.
          setTimeout(() => {
            if (generation === generationRef.current) dispatch({ type: 'DOWNLOAD_SUCCESS' })
          }, 1200)
          return
        }

        let response = await fetch(result.download_url, { signal: controller.signal })

        // 400/410 means the pre-signed token was malformed or expired — the one failure
        // mode of the fast path. Re-authorise properly and retry once.
        if ((response.status === 410 || response.status === 400) && preSigned?.downloadUrl) {
          const reissued = await requestDownload(state.url.trim(), formatId, controller.signal)
          if (generation !== generationRef.current) return
          response = await fetch(reissued.download_url, { signal: controller.signal })
        }

        if (!response.ok || !response.body) {
          throw new ApiError('The download could not be started. Please try again', {
            code: 'DOWNLOAD_FAILED',
            status: response.status,
          })
        }

        const total = Number(response.headers.get('content-length')) || knownSize
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0
        let sawFirstByte = false

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value) continue

          if (!sawFirstByte) {
            sawFirstByte = true
            dispatch({ type: 'DOWNLOAD_FIRST_BYTE' })
          }

          chunks.push(value)
          received += value.length
          if (generation !== generationRef.current) return
          if (total > 0) {
            dispatch({
              type: 'DOWNLOAD_PROGRESS',
              progress: Math.min(99, Math.round((received / total) * 100)),
            })
          }
        }

        if (generation !== generationRef.current) return

        const blob = new Blob(chunks as BlobPart[], { type: result.mime_type })
        const objectUrl = URL.createObjectURL(blob)
        triggerBrowserDownload(objectUrl, result.filename)
        // Revoking immediately can cancel the save in Safari; one frame is enough.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)

        dispatch({ type: 'DOWNLOAD_SUCCESS' })
      } catch (error) {
        if (generation !== generationRef.current) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        const apiError = error as ApiError
        dispatch({
          type: 'FAIL',
          message: apiError.message ?? 'The download could not be completed. Please try again',
          code: apiError.code ?? 'DOWNLOAD_FAILED',
          retryAfter: apiError.retryAfter ?? null,
        })
      }
    })()
  }, [abortInFlight, state.metadata, state.selectedFormatId, state.url])

  const reset = useCallback(() => {
    abortInFlight()
    generationRef.current += 1
    dispatch({ type: 'RESET' })
  }, [abortInFlight])

  const dismissError = useCallback(() => dispatch({ type: 'DISMISS_ERROR' }), [])

  /**
   * The signature: repaint the whole tool in the detected platform's colour.
   *
   * Writing to `--accent` on the document element rather than passing a prop means one
   * assignment re-tints the input ring, the caret, the format cards and the CTA at once.
   */
  const activePlatform = state.platform ?? (presetPlatform ? PLATFORMS_BY_ID[presetPlatform] : null)

  useEffect(() => {
    const root = document.documentElement
    if (!activePlatform) {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-light')
      root.style.removeProperty('--accent-glow')
      root.style.removeProperty('--accent-soft')
      root.style.removeProperty('--accent-fg')
      root.style.removeProperty('--accent-cta')
      root.style.removeProperty('--accent-cta-deep')
      return
    }

    // Snapchat yellow and Twitch purple sit at opposite ends of the luminance range;
    // without this the darker brands vanish against #080810.
    const accent = ensureReadable(activePlatform.color)
    const accentLight = ensureReadable(activePlatform.colorAlt, 0.4)

    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-light', accentLight)
    root.style.setProperty('--accent-glow', rgba(accent, 0.32))
    root.style.setProperty('--accent-soft', rgba(accent, 0.12))

    // Solid controls get their own single-hue pair. A brand colour picked for a logo is
    // rarely legible under 14px label text, so the fill is deepened (or the label
    // flipped) until the whole button clears 4.5:1. `accentLight` deliberately does not
    // feed this — a two-hue gradient cannot carry one legible label colour.
    const cta = ctaSurface(accent)
    root.style.setProperty('--accent-cta', cta.fill)
    root.style.setProperty('--accent-cta-deep', cta.fillDeep)
    root.style.setProperty('--accent-fg', cta.fg)
  }, [activePlatform])

  // Memoised so the identity is stable across renders — otherwise every render would
  // produce a new array and invalidate the lookup below.
  const formats = useMemo(() => state.metadata?.formats ?? [], [state.metadata])
  const selectedFormat = useMemo(
    () => formats.find((format) => format.id === state.selectedFormatId) ?? null,
    [formats, state.selectedFormatId],
  )

  return {
    state: state.state,
    url: state.url,
    platform: activePlatform,
    metadata: state.metadata,
    formats,
    selectedFormat,
    error: state.error,
    errorNonce: state.errorNonce,
    progress: state.progress,
    preparing: state.preparing,
    filename: state.filename,
    isBusy: state.state === 'FETCHING_METADATA' || state.state === 'DOWNLOADING',
    setUrl,
    submit,
    selectFormat,
    download,
    reset,
    dismissError,
  }
}
