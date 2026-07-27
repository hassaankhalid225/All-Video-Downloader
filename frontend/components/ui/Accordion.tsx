'use client'

import { AnimatePresence, m } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

export interface AccordionItem {
  q: string
  a: string
}

export function Accordion({ items, className }: { items: readonly AccordionItem[]; className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const baseId = useId()
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const reduced = usePrefersReducedMotion()

  /** Arrow keys move between headers, matching the WAI-ARIA accordion pattern. */
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const lastIndex = items.length - 1
    let target: number | null = null

    if (event.key === 'ArrowDown') target = index === lastIndex ? 0 : index + 1
    else if (event.key === 'ArrowUp') target = index === 0 ? lastIndex : index - 1
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = lastIndex

    if (target !== null) {
      event.preventDefault()
      buttonsRef.current[target]?.focus()
    }
  }

  return (
    <div className={cn('divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-bg-secondary', className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const headerId = `${baseId}-h-${index}`
        const panelId = `${baseId}-p-${index}`

        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={headerId}
                ref={(node) => {
                  buttonsRef.current[index] = node
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className="flex w-full items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-bg-tertiary/50 sm:px-6"
              >
                <span className="flex-1 text-[0.9375rem] font-medium leading-snug text-content-primary sm:text-base">
                  {item.q}
                </span>
                <m.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-0.5 shrink-0 text-content-muted"
                  aria-hidden="true"
                >
                  <Plus className="h-4 w-4" />
                </m.span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed sm:px-6 sm:pb-6">{item.a}</p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
