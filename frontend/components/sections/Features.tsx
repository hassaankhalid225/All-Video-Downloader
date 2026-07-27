import { Gift, Layers, Smartphone, Sparkles, UserX, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

import { FEATURES } from '@/lib/constants'

import { Reveal } from '../ui/Reveal'
import { Section } from '../ui/Section'

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  zap: Zap,
  sparkles: Sparkles,
  smartphone: Smartphone,
  layers: Layers,
  gift: Gift,
  'user-x': UserX,
}

export function Features() {
  return (
    <Section
      eyebrow="Why AllDown"
      title="What you actually get"
      subtitle="No feature list padding. These are the six things that make a difference."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = ICONS[feature.icon] ?? Zap
          return (
            <li key={feature.title}>
              <Reveal delay={Math.min(index, 5) * 0.06}>
                <div className="h-full rounded-2xl border border-edge bg-bg-secondary p-5 transition-colors duration-300 hover:border-content-muted/40">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-bg-tertiary text-brand-light">
                    <Icon className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-content-primary">{feature.title}</h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed">{feature.body}</p>
                </div>
              </Reveal>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
