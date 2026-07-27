import type { Metadata } from 'next'
import Link from 'next/link'

import { HeroSection } from '@/components/hero/HeroSection'
import { FAQ } from '@/components/sections/FAQ'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { JsonLd } from '@/components/ui/JsonLd'
import { Reveal } from '@/components/ui/Reveal'
import { PLATFORMS_BY_ID, SITE } from '@/lib/constants'
import { getPlatformContent } from '@/lib/platform-content'
import { faqSchema, webApplicationSchema } from '@/lib/structured-data'
import type { PlatformId } from '@/lib/types'

/** Per-page metadata, derived from the same content record the page renders. */
export function platformMetadata(id: PlatformId): Metadata {
  const content = getPlatformContent(id)
  const platform = PLATFORMS_BY_ID[id]
  if (!content || !platform) return {}

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: `/${id}` },
    openGraph: {
      type: 'website',
      url: `${SITE.url}/${id}`,
      title: `${content.metaTitle} | ${SITE.name}`,
      description: content.metaDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.metaTitle,
      description: content.metaDescription,
    },
  }
}

/**
 * The shared template behind every platform landing page.
 *
 * Each route file stays a thin wrapper so its metadata is statically analysable, while
 * the layout itself is written once. The tool is preset to the platform, which tints the
 * whole page in that brand's colour from the first paint rather than waiting for a paste.
 */
export function PlatformPage({ id }: { id: PlatformId }) {
  const content = getPlatformContent(id)
  const platform = PLATFORMS_BY_ID[id]
  if (!content || !platform) return null

  return (
    <>
      {/* No BreadcrumbList here. The visible trail was removed, and breadcrumb markup is
          only valid when it describes a breadcrumb the reader can actually see. */}
      <JsonLd schemas={[webApplicationSchema(), faqSchema(content.faqs)]} />

      <HeroSection
        titleLead={content.titleLead}
        titleAccent={content.titleAccent}
        titleTail={content.titleTail}
        subtitle={content.subtitle}
        presetPlatform={id}
        // The cue points at "How it works", which on this page sits below the facts and a
        // 1,200-word guide. Pointing there would skip the content people came for.
        showScrollCue={false}
        // Listing all twelve platforms on the page dedicated to one of them is noise.
        showPlatformList={false}
      >
        <dl className="grid grid-cols-3 divide-x divide-edge overflow-hidden rounded-2xl border border-edge bg-bg-secondary">
          {content.facts.map((fact) => (
            <div key={fact.label} className="px-3 py-4 text-center sm:px-5">
              <dt className="eyebrow mb-1.5">{fact.label}</dt>
              <dd className="text-sm font-semibold text-content-primary">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </HeroSection>

      {/* Deliberately not wrapped in <Reveal>. This is the content the page exists for and
          the reason it ranks; it must never depend on JavaScript to become visible, and a
          fade-in on a thousand words of prose is animation for its own sake. */}
      <section className="pb-20 pt-4 sm:pb-24 sm:pt-8">
        <div className="container-page">
          <article className="mx-auto max-w-2xl">
            <h2 className="text-section">{content.guideTitle}</h2>
            <div className="mt-8 space-y-9">
              {content.guide.map((chunk) => (
                <section key={chunk.heading}>
                  <h3 className="text-base font-semibold text-content-primary">{chunk.heading}</h3>
                  <div className="mt-3 space-y-3.5">
                    {chunk.body.map((paragraph, index) => (
                      <p key={index} className="text-[0.9375rem] leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {platform.caveat && (
              <p className="mt-9 rounded-xl border border-edge bg-bg-secondary p-4 text-sm text-content-secondary">
                <span className="font-medium text-content-primary">Worth knowing: </span>
                {platform.caveat}
              </p>
            )}
          </article>
        </div>
      </section>

      <HowItWorks />
      <FAQ items={content.faqs} title={`${platform.name} downloader questions`} />
      <Features />

      <section className="pb-24">
        <div className="container-page">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-base font-semibold text-content-primary">Other platforms</h2>
              <ul className="mt-5 flex flex-wrap justify-center gap-2">
                {Object.values(PLATFORMS_BY_ID)
                  .filter((other) => other.id !== id && getPlatformContent(other.id))
                  .map((other) => (
                    <li key={other.id}>
                      <Link
                        href={`/${other.id}`}
                        className="inline-flex h-11 items-center rounded-lg border border-edge bg-bg-secondary px-4 text-sm text-content-secondary transition-colors hover:border-content-muted hover:text-content-primary"
                      >
                        {other.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
