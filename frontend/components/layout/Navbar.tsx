'use client'

import { m } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { FEATURED_PLATFORM_IDS, PLATFORMS_BY_ID } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

import { PlatformIcon } from '../ui/PlatformIcon'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A fixed sheet over a scrollable body scrolls the body behind it on iOS.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <m.header
      initial={{ y: reduced ? 0 : -72 }}
      animate={{ y: 0 }}
      transition={{ duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled ? 'border-b border-edge bg-bg-primary/85 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between" aria-label="Main">
        <Link
          href="/"
          className="group -ml-1 inline-flex h-11 items-center gap-2.5 rounded-lg px-1"
          onClick={() => setMenuOpen(false)}
        >
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

        <div className="hidden items-center gap-1 md:flex">
          {FEATURED_PLATFORM_IDS.map((id) => {
            const platform = PLATFORMS_BY_ID[id]
            return (
              <Link
                key={id}
                href={`/${id}`}
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-content-secondary transition-colors hover:bg-bg-tertiary hover:text-content-primary"
              >
                <PlatformIcon id={id} className="h-3.5 w-3.5" />
                {platform.name}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/#faq"
            className="hidden h-11 items-center rounded-lg px-3 text-sm text-content-secondary transition-colors hover:text-content-primary sm:inline-flex"
          >
            FAQ
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid h-10 w-10 place-items-center rounded-lg text-content-secondary transition-colors hover:bg-bg-tertiary hover:text-content-primary md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-edge bg-bg-primary/98 backdrop-blur-xl md:hidden"
        >
          <div className="container-page grid grid-cols-2 gap-1.5 py-4">
            {FEATURED_PLATFORM_IDS.map((id) => (
              <Link
                key={id}
                href={`/${id}`}
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm text-content-secondary transition-colors hover:bg-bg-tertiary hover:text-content-primary"
              >
                <PlatformIcon id={id} className="h-4 w-4" />
                {PLATFORMS_BY_ID[id].name}
              </Link>
            ))}
            <Link
              href="/#faq"
              onClick={() => setMenuOpen(false)}
              className="col-span-2 rounded-lg px-3 py-3 text-sm text-content-secondary transition-colors hover:bg-bg-tertiary hover:text-content-primary"
            >
              FAQ
            </Link>
          </div>
        </m.div>
      )}
    </m.header>
  )
}
