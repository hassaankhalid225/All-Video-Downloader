import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AllDown — All-in-One Social Media Downloader'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Generated rather than checked in, so the card can never fall out of sync with the
 * product name or palette. Uses the system font stack — loading a webfont here would add
 * a network round trip to every social crawler's request for no visual gain at this size.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 88px',
          background: '#080810',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -220,
            left: -160,
            width: 760,
            height: 760,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(124,58,237,0.55) 0%, rgba(124,58,237,0) 68%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -280,
            right: -140,
            width: 700,
            height: 700,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(168,85,247,0.42) 0%, rgba(168,85,247,0) 68%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            A
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: '#F0F0FF' }}>AllDown</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            color: '#F0F0FF',
          }}
        >
          <span>Download anything.</span>
          <span style={{ color: '#A855F7' }}>From anywhere.</span>
        </div>

        <div style={{ marginTop: 36, fontSize: 27, color: '#8888AA', display: 'flex' }}>
          TikTok · Instagram · YouTube · X · Facebook · Reddit · and six more
        </div>

        <div
          style={{
            marginTop: 44,
            display: 'flex',
            gap: 12,
            fontSize: 21,
            color: '#8888AA',
          }}
        >
          {['No watermark', 'HD quality', 'No signup'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid #1E1E35',
                background: '#0F0F1A',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
