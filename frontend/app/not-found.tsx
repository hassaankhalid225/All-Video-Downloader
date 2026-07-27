import Link from 'next/link'

import { FEATURED_PLATFORM_IDS, PLATFORMS_BY_ID } from '@/lib/constants'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-display-sm">This page does not exist</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed">
        If you were looking for a downloader, the tool on the homepage handles every supported
        platform.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl px-6 text-sm font-semibold text-white transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(100deg, var(--brand), var(--brand-light))' }}
      >
        Go to the downloader
      </Link>

      <ul className="mt-10 flex flex-wrap justify-center gap-2">
        {FEATURED_PLATFORM_IDS.map((id) => (
          <li key={id}>
            <Link
              href={`/${id}`}
              className="inline-flex h-11 items-center rounded-lg border border-edge bg-bg-secondary px-4 text-sm text-content-secondary transition-colors hover:border-content-muted hover:text-content-primary"
            >
              {PLATFORMS_BY_ID[id].name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
