import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { JsonLd } from '@/components/ui/JsonLd'
import { breadcrumbSchema } from '@/lib/structured-data'

/**
 * Shared shell for the text-only pages: about, privacy, terms, DMCA, contact.
 *
 * Carries the same breadcrumb treatment as the platform pages, for the same two reasons:
 * every page below the root should say where it sits, and the `BreadcrumbList` markup has
 * to name the page using the exact string that is rendered.
 *
 * The breadcrumb replaces what used to be a category eyebrow. "Legal" over a heading that
 * already read "Privacy Policy" told the reader nothing the heading did not.
 *
 * Left-aligned rather than centred, unlike the hero — this column of prose is left-aligned,
 * and the breadcrumb belongs to it.
 */
export function ProsePage({
  title,
  label,
  path,
  updated,
  children,
}: {
  title: string
  /** Breadcrumb label for this page. Defaults to the title. */
  label?: string
  /** Route, used for the structured data only. */
  path: string
  updated?: string
  children: ReactNode
}) {
  const crumbLabel = label ?? title

  return (
    <article className="container-page py-28 sm:py-36">
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: crumbLabel, path },
          ]),
        ]}
      />

      <div className="mx-auto max-w-2xl">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="metric flex items-center gap-2 text-content-muted">
            <li>
              <Link href="/" className="rounded transition-colors hover:text-content-primary">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
            <li aria-current="page" className="text-content-secondary">
              {crumbLabel}
            </li>
          </ol>
        </nav>

        <h1 className="text-display-sm">{title}</h1>
        {updated && <p className="metric mt-4 text-content-muted">Last updated {updated}</p>}

        <div className="mt-10 space-y-6 text-[0.9375rem] leading-relaxed [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </article>
  )
}
