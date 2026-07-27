import { BACKEND_URL, forwardedHeaders, passthroughHeaders, upstreamUnavailable } from '@/lib/server/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Please enter a valid social media URL', detail: null },
      },
      { status: 400 },
    )
  }

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/metadata`, {
      method: 'POST',
      headers: forwardedHeaders(request),
      body: JSON.stringify(body),
      cache: 'no-store',
      // Extraction can legitimately take a while on a long YouTube video; the backend
      // enforces its own deadline, so this only guards against a hung connection.
      signal: AbortSignal.timeout(60_000),
    })

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: passthroughHeaders(upstream),
    })
  } catch (error) {
    return upstreamUnavailable(error)
  }
}
