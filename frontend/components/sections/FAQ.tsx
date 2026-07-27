import { FAQS } from '@/lib/constants'
import type { AccordionItem } from '../ui/Accordion'

import { Accordion } from '../ui/Accordion'
import { Reveal } from '../ui/Reveal'
import { Section } from '../ui/Section'

/**
 * The same `items` array feeds both the accordion and the FAQPage JSON-LD in
 * `app/page.tsx`, so the answers Google indexes can never drift from the ones on screen.
 */
export function FAQ({ items = FAQS, title = 'Questions people actually ask' }: {
  items?: readonly AccordionItem[]
  title?: string
}) {
  return (
    <Section id="faq" eyebrow="FAQ" title={title}>
      <Reveal>
        <Accordion items={items} className="mx-auto max-w-3xl" />
      </Reveal>
    </Section>
  )
}
