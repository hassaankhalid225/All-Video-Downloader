import { BACKEND_URL, forwardedHeaders, upstreamUnavailable } from '@/lib/server/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Streams the media through from the backend.
 *
 * Unlike the JSON routes this one must not buffer: a 300 MB video read into memory
 * before being forwarded would blow the function's heap and delay the first byte until
 * the whole transfer finished. `upstream.body` is piped straight to the client instead.
 */
export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url)
  const token = incoming.searchParams.get('t')
  const signature = incoming.searchParams.get('s')

  if (!token || !signature) {
    return Response.json(
      {
        success: false,
        error: {
          code: 'BAD_TOKEN',
          message: 'This download link is malformed. Start the download again',
          detail: null,
        },
      },
      { status: 400 },
    )
  }

  const target = new URL('/api/file', BACKEND_URL)
  target.searchParams.set('t', token)
  target.searchParams.set('s', signature)

  const headers = forwardedHeaders(request)
  delete headers['Content-Type']
  // Forward Range so the browser can resume an interrupted download.
  const range = request.headers.get('range')
  if (range) headers['range'] = range

  let upstream: Response
  try {
    upstream = await fetch(target, { method: 'GET', headers, cache: 'no-store' })
  } catch (error) {
    return upstreamUnavailable(error)
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const outgoing = new Headers()
  for (const name of [
    'content-type',
    'content-length',
    'content-disposition',
    'content-range',
    'accept-ranges',
  ]) {
    const value = upstream.headers.get(name)
    if (value) outgoing.set(name, value)
  }
  outgoing.set('cache-control', 'private, no-store')
  outgoing.set('x-content-type-options', 'nosniff')

  return new Response(upstream.body, { status: upstream.status, headers: outgoing })
}
