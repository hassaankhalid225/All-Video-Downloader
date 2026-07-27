/**
 * Shared plumbing for the `app/api/*` proxy route handlers.
 *
 * Server-side only. `API_URL` is read without the `NEXT_PUBLIC_` prefix precisely so the
 * backend origin never reaches the client bundle.
 */

export const BACKEND_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(
  /\/$/,
  '',
)

/**
 * Per-IP rate limiting lives on the backend, so the real client address has to survive
 * the hop. Vercel terminates TLS and rewrites the socket peer; without forwarding these
 * every visitor would share one bucket.
 */
export function forwardedHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor
  if (realIp) headers['x-real-ip'] = realIp
  return headers
}

export function upstreamUnavailable(detail: unknown): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: 'BACKEND_UNAVAILABLE',
        message: 'The download service is not responding. Please try again in a moment',
        detail: process.env.NODE_ENV === 'development' ? String(detail) : null,
      },
    },
    { status: 503 },
  )
}

/** Rate-limit headers are the only ones the client reads off a JSON response. */
export function passthroughHeaders(upstream: Response): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  for (const name of ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}
