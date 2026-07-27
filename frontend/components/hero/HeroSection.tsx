'use client'

import { m } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { PLATFORMS } from '@/lib/constants'
import type { PlatformId } from '@/lib/types'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

import { DownloaderTool } from '../downloader/DownloaderTool'
import { ParticleBackground } from './ParticleBackground'

/**
 * The page-load sequence from the brief, expressed as one delay scale.
 *
 * Keeping every beat in a single object means the choreography can be read at a glance
 * and retimed in one place, rather than being scattered across a dozen `delay` props.
 */
const BEAT = {
  headline: 0.4,
  subhead: 0.6,
  tool: 0.8,
  scrollCue: 1.2,
} as const

export function HeroSection({
  titleLead,
  titleAccent,
  titleTail,
  subtitle,
  presetPlatform,
  showScrollCue = true,
  showPlatformList = true,
  children,
}: {
  titleLead: string
  titleAccent: string
  titleTail?: string
  subtitle?: string
  presetPlatform?: PlatformId
  /** The cue belongs on a page whose next section is worth scrolling to. */
  showScrollCue?: boolean
  /**
   * The roll-call of all twelve platforms. It earns its place on the homepage, where the
   * point is breadth. On a page dedicated to one platform it is just noise.
   */
  showPlatformList?: boolean
  /** Rendered directly under the tool, inside the hero's rhythm. */
  children?: ReactNode
}) {
  const reduced = usePrefersReducedMotion()

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.25 : 0.7, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden pt-28 sm:pt-36',
        // A platform page ends its hero at the facts strip, so it needs less air below.
        showPlatformList ? 'pb-10 sm:pb-24' : 'pb-10 sm:pb-14',
      )}
    >
      <ParticleBackground />

      <div className="container-page">
        <m.h1 {...rise(BEAT.headline)} className="text-center text-display">
          {titleLead}{' '}
          <span className="text-gradient-brand">{titleAccent}</span>
          {titleTail && (
            <>
              <br />
              {titleTail}
            </>
          )}
        </m.h1>

        <m.p
          {...rise(BEAT.subhead)}
          className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed sm:text-lg"
        >
          {subtitle ?? (
            <>
              Paste a link from any of twelve platforms and get the file. No watermark, no
              account, no limit.
            </>
          )}
        </m.p>

        {/* Platform names as a marquee on mobile, where twelve of them will not fit on one line. */}
        {showPlatformList && (
          <m.div {...rise(BEAT.subhead + 0.05)} className="mt-5">
            <div className="marquee-mask overflow-hidden sm:hidden">
              <div className="flex w-max animate-marquee gap-2.5 whitespace-nowrap">
                {[...PLATFORMS, ...PLATFORMS].map((platform, index) => (
                  <span key={`${platform.id}-${index}`} className="metric text-content-muted">
                    {platform.name}
                    <span className="ml-2.5 text-content-muted/40">•</span>
                  </span>
                ))}
              </div>
            </div>
            <p className="metric hidden text-center text-content-muted sm:block">
              {PLATFORMS.map((platform) => platform.name).join('  •  ')}
            </p>
          </m.div>
        )}

        <m.div {...rise(BEAT.tool)} className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <DownloaderTool presetPlatform={presetPlatform} />

          {/* Anything describing the tool sits with the tool, not in a band of its own. */}
          {children && <div className="mt-8">{children}</div>}
        </m.div>

        {showScrollCue && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduced ? 0 : BEAT.scrollCue, duration: 0.5 }}
            className="mt-14 hidden justify-center sm:flex"
          >
            <a
              href="#how-it-works"
              className="group inline-flex flex-col items-center gap-1.5 text-content-muted transition-colors hover:text-content-secondary"
            >
              <span className="eyebrow">How it works</span>
              <m.span
                animate={reduced ? {} : { y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </m.span>
            </a>
          </m.div>
        )}
      </div>
    </section>
  )
}
