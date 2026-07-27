import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { FEATURED_PLATFORM_IDS, PLATFORMS } from '@/lib/constants'
import { ensureReadable, rgba } from '@/lib/utils'

import { PlatformIcon } from '../ui/PlatformIcon'
import { Reveal } from '../ui/Reveal'
import { Section } from '../ui/Section'

/**
 * The twelve-platform grid.
 *
 * A Server Component. Hover used to be React state, which forced the whole grid — and its
 * share of the animation runtime — into the client bundle to do something CSS already
 * does. Each card now publishes its brand colour as a custom property and `group-hover`
 * spends it, so nothing here hydrates.
 *
 * Cards for platforms with a dedicated page are links; the rest are plain cards rather
 * than links that go nowhere.
 */
export function SupportedPlatforms() {
  return (
    <Section
      id="platforms"
      eyebrow="Supported platforms"
      title="Twelve platforms, one box"
      subtitle="Paste a link from any of these. We work out the rest."
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PLATFORMS.map((platform, index) => {
          const color = ensureReadable(platform.color)
          const hasPage = FEATURED_PLATFORM_IDS.includes(platform.id)

          const style = {
            '--card-accent': color,
            '--card-tint': rgba(color, 0.16),
            '--card-edge': rgba(color, 0.35),
            '--card-glow': rgba(color, 0.55),
          } as React.CSSProperties

          const className =
            'group block h-full rounded-2xl border border-edge bg-bg-secondary p-4 transition-all duration-300 ' +
            'hover:-translate-y-1 hover:border-[color:var(--card-edge)] ' +
            'hover:shadow-[0_16px_40px_-20px_var(--card-glow)] ' +
            'focus-within:border-[color:var(--card-edge)]'

          const inner = (
            <>
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-bg-tertiary text-content-secondary transition-colors duration-300 group-hover:bg-[color:var(--card-tint)] group-hover:text-[color:var(--card-accent)]">
                  <PlatformIcon id={platform.id} className="h-5 w-5" />
                </span>
                {hasPage && (
                  <ArrowUpRight
                    className="h-4 w-4 text-content-muted transition-colors group-hover:text-content-secondary"
                    aria-hidden="true"
                  />
                )}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-content-primary">{platform.name}</h3>
              <p className="metric mt-1 text-content-muted">{platform.contentTypes.join(' · ')}</p>
              <p className="mt-2.5 text-[0.8125rem] leading-snug text-content-secondary">
                {platform.blurb}
              </p>
            </>
          )

          return (
            <li key={platform.id}>
              <Reveal delay={Math.min(index, 8) * 0.04}>
                {hasPage ? (
                  <Link href={`/${platform.id}`} style={style} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div style={style} className={className}>
                    {inner}
                  </div>
                )}
              </Reveal>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
