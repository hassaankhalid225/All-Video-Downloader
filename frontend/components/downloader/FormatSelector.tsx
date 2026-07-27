'use client'

import { useEffect, useRef } from 'react'

import type { FormatOption } from '@/lib/types'

import { FormatCard } from './FormatCard'

/**
 * The quality grid, implemented as a real radio group.
 *
 * That matters for keyboard use: one tab stop for the whole set, arrow keys to move
 * between options, and the selection announced as such — the behaviour anyone using a
 * screen reader already expects from a set of mutually exclusive choices.
 */
export function FormatSelector({
  formats,
  selectedId,
  onSelect,
}: {
  formats: FormatOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    buttonsRef.current = buttonsRef.current.slice(0, formats.length)
  }, [formats.length])

  const selectedIndex = Math.max(
    0,
    formats.findIndex((format) => format.id === selectedId),
  )

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = formats.length - 1
    let target: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = index === 0 ? last : index - 1
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = last

    if (target === null) return
    event.preventDefault()
    const next = formats[target]
    if (!next) return
    onSelect(next.id)
    buttonsRef.current[target]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Download quality" className="grid gap-2.5 sm:grid-cols-2">
      {formats.map((format, index) => (
        <FormatCard
          key={format.id}
          ref={(node) => {
            buttonsRef.current[index] = node
          }}
          format={format}
          selected={format.id === selectedId}
          onSelect={() => onSelect(format.id)}
          // Roving tabindex: the group is one stop, arrows move within it.
          tabIndex={index === selectedIndex ? 0 : -1}
          onKeyDown={(event) => onKeyDown(event, index)}
        />
      ))}
    </div>
  )
}
