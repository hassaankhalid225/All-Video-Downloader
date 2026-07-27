import type { CSSProperties } from 'react'

import { seeded } from '@/lib/utils'

/**
 * Atmosphere for the hero: three drifting mesh orbs, a grid overlay, and a light dusting
 * of particles.
 *
 * All of it is CSS. There is no state, no effect and no animation runtime here, so this
 * is a Server Component and the layer costs the client nothing but markup. The particles
 * were previously twenty Framer Motion loops running for the lifetime of the page — the
 * same visual, permanently occupying the main thread.
 *
 * Reduced motion is handled in `globals.css`: the particles are removed and the orbs
 * freeze rather than disappearing, so the composition survives.
 */
export function ParticleBackground({ particleCount = 20 }: { particleCount?: number }) {
  // Seeded rather than random: this renders on the server, and a mismatch between the
  // server's values and the client's would be a hydration error.
  const particles = Array.from({ length: particleCount }, (_, index) => ({
    id: index,
    left: seeded(index * 3 + 1) * 100,
    top: seeded(index * 3 + 2) * 100,
    size: 1 + seeded(index * 3 + 3) * 2.2,
    duration: 16 + seeded(index * 5 + 7) * 20,
    delay: seeded(index * 7 + 11) * 12,
    drift: (seeded(index * 11 + 13) - 0.5) * 60,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Mesh orbs. Sized in vmax so the composition holds from 375px to ultrawide. */}
      <div
        className="gpu absolute -left-[15vmax] -top-[20vmax] h-[60vmax] w-[60vmax] rounded-full opacity-[0.32] blur-[90px] animate-drift-slow"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 68%)' }}
      />
      <div
        className="gpu absolute -right-[18vmax] top-[6vmax] h-[52vmax] w-[52vmax] rounded-full opacity-[0.26] blur-[90px] animate-drift-slower"
        style={{ background: 'radial-gradient(circle, #4338ca 0%, transparent 68%)' }}
      />
      <div
        className="gpu absolute left-[22vmax] top-[34vmax] h-[44vmax] w-[44vmax] rounded-full opacity-[0.2] blur-[100px] animate-drift-slowest"
        style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 68%)' }}
      />

      <div className="absolute inset-0 grid-overlay" />

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="particle absolute rounded-full bg-brand-light opacity-0"
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size,
              '--duration': `${particle.duration}s`,
              '--delay': `${particle.delay}s`,
              '--drift': `${particle.drift}px`,
            } as CSSProperties
          }
        />
      ))}

      {/* Settles the hero into the page below instead of ending on a hard edge. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg-primary" />
    </div>
  )
}
