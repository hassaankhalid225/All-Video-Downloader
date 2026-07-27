import type { ApiErrorBody, DownloadResult, HealthStatus, VideoMetadata } from './types'

/**
 * Calls go to our own origin, never to the backend directly. The proxy route handlers in
 * `app/api/*` forward them. That keeps the backend host out of the client bundle and lets
 * the API URL change without a frontend redeploy.
 *
 * Native `fetch` rather than a client, deliberately: it is the only thing that streams
 * properly inside a route handler, and shipping an HTTP library to the browser for two
 * POSTs works against the performance budget.
 */

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly detail: string | null
  /** Present on 429 so the UI can count down instead of guessing. */
  readonly retryAfter: number | null

  constructor(
    message: string,
    options: { code: string; status: number; detail?: string | null; retryAfter?: number | null },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
    this.detail = options.detail ?? null
    this.retryAfter = options.retryAfter ?? null
  }

  /** True when retrying the same URL could plausibly succeed. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status === 502 || this.status === 504
  }
}

const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again'

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (error) {
    // An aborted request is a deliberate cancellation, not a failure to report.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(NETWORK_ERROR, { code: 'NETWORK_ERROR', status: 0 })
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // A non-JSON body means the proxy or a gateway answered, not the API.
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null
    const retryAfterHeader = response.headers.get('retry-after')
    throw new ApiError(errorBody?.error?.message ?? 'Something went wrong. Please try again', {
      code: errorBody?.error?.code ?? 'UNKNOWN',
      status: response.status,
      detail: errorBody?.error?.detail ?? null,
      retryAfter: retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) || null : null,
    })
  }

  return body as T
}

export function fetchMetadata(url: string, signal?: AbortSignal): Promise<VideoMetadata> {
  return request<VideoMetadata>('/api/metadata', {
    method: 'POST',
    body: JSON.stringify({ url }),
    signal,
  })
}

export function requestDownload(
  url: string,
  formatId: string,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  return request<DownloadResult>('/api/download', {
    method: 'POST',
    body: JSON.stringify({ url, format_id: formatId }),
    signal,
  })
}

export function checkHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return request<HealthStatus>('/api/health', { method: 'GET', signal })
}

/**
 * Hand the file to the browser.
 *
 * A hidden anchor with `download` rather than `window.open`: it keeps the current page
 * alive (so the success state can render), avoids the popup blocker, and lets the
 * `Content-Disposition` filename win.
 */
export function triggerBrowserDownload(downloadUrl: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
