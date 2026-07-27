'use client'

import { m } from 'framer-motion'

import { STEPS } from '@/lib/constants'
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'

import { Reveal } from '../ui/Reveal'
import { Section } from '../ui/Section'

/**
 * Three steps.
 *
 * Numbered because this genuinely is a sequence — you cannot pick a format before pasting
 * a link. The connecting line draws left to right as the section enters, which is the
 * same information the numbers carry, stated once more in a form you can see at a glance.
 */
export function HowItWorks() {
  const reduced = usePrefersReducedMotion()

  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Three steps, about ten seconds"
      subtitle="No account, no app, no waiting room."
    >
      <div className="relative">
        {/* The line sits behind the markers and stops short of both ends. */}
        <div className="absolute left-0 right-0 top-6 hidden md:block" aria-hidden="true">
          <svg className="h-px w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
            <m.line
              x1="14"
              y1="0.5"
              x2="86"
              y2="0.5"
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduced ? 1 : 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '0px 0px -100px 0px' }}
              transition={{ duration: reduced ? 0 : 1.1, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 0.12}>
                <div className="flex flex-col items-start md:items-center md:text-center">
                  <span
                    className="metric grid h-12 w-12 shrink-0 place-items-center rounded-full border border-edge bg-bg-secondary text-base font-semibold text-content-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-content-primary">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
