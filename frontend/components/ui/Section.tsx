import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Reveal } from './Reveal'

/**
 * One rhythm for every marketing section, so vertical spacing is decided once instead of
 * per-section. Headings are h2 throughout — the page has exactly one h1, in the hero.
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  align = 'center',
}: {
  id?: string
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  className?: string
  align?: 'center' | 'left'
}) {
  return (
    <section id={id} className={cn('py-20 sm:py-28', className)}>
      <div className="container-page">
        <Reveal>
          <header className={cn('mb-12 sm:mb-16', align === 'center' && 'mx-auto max-w-2xl text-center')}>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h2 className="text-section">{title}</h2>
            {subtitle && <p className="mt-4 text-base leading-relaxed sm:text-lg">{subtitle}</p>}
          </header>
        </Reveal>
        {children}
      </div>
    </section>
  )
}
