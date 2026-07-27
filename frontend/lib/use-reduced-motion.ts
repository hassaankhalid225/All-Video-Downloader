'use client'

import { useEffect, useState } from 'react'

/**
 * Whether the visitor has asked for less motion.
 *
 * Starts `false` rather than reading the query during render: the server has no matchMedia,
 * and a mismatch between the server's guess and the client's reality causes a hydration
 * error. The first effect corrects it before anything animates.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}
