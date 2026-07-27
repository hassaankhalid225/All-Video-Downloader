'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { checkHealth } from '@/lib/api'
import { LEGAL_LINKS, PLATFORMS, SITE } from '@/lib/constants'
import type { HealthStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The status dot is not decoration.
 *
 * Extraction depends on yt-dlp keeping up with platform changes, so "is the engine
 * running and how old is it" is genuinely useful to anyone whose download just failed.
 */
function ServiceStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function poll() {
      try {
        setHealth(await checkHealth(controller.signal))
        setFailed(false)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), 60_000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  const isUp = !failed && health?.status === 'ok'
  const label = failed
    ? 'Service unreachable'
    : health
      ? health.status === 'ok'
        ? `Operational · engine ${health.yt_dlp_version ?? 'unknown'}`
        : 'Degraded'
      : 'Checking…'

  return (
    <span className="metric inline-flex items-center gap-2 text-content-muted">
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          failed ? 'bg-state-error' : isUp ? 'bg-state-success' : 'bg-state-warning',
        )}
      />
      {label}
    </span>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-edge bg-bg-secondary/40">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex min-h-[2.75rem] items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg font-mono text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
                aria-hidden="true"
              >
                A
              </span>
              <span className="text-[0.9375rem] font-semibold tracking-tight text-content-primary">
                AllDown
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{SITE.description}</p>
            <div className="mt-5">
              <ServiceStatus />
            </div>
          </div>

          <nav aria-labelledby="footer-platforms">
            <h2 id="footer-platforms" className="eyebrow mb-4">
              Platforms
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-1">
              {PLATFORMS.slice(0, 6).map((platform) => (
                <li key={platform.id}>
                  <Link
                    href={`/${platform.id}`}
                    className="inline-flex min-h-[2.75rem] items-center text-sm text-content-secondary transition-colors hover:text-content-primary"
                  >
                    {platform.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="eyebrow mb-4">
              Site
            </h2>
            <ul className="grid grid-cols-2 md:grid-cols-1">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[2.75rem] items-center text-sm text-content-secondary transition-colors hover:text-content-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="metric text-content-muted">© {year} AllDown</p>
          <p className="max-w-xl text-[0.8125rem] leading-relaxed text-content-muted">
            AllDown is not affiliated with any platform listed here. Download only content you own
            or have permission to use.
          </p>
        </div>
      </div>
    </footer>
  )
}
