'use client'

import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

import { usePrefersReducedMotion } from '@/lib/use-reduced-motion'

type ToastTone = 'error' | 'success' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
  /** Drop everything on screen — used when the state a toast described no longer holds. */
  clear: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS = 6000

const TONE_STYLES: Record<ToastTone, { icon: typeof AlertCircle; color: string }> = {
  error: { icon: AlertCircle, color: 'var(--error)' },
  success: { icon: CheckCircle2, color: 'var(--success)' },
  info: { icon: Info, color: 'var(--accent)' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const reduced = usePrefersReducedMotion()

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++
      // Replace rather than stack: two errors about the same paste is noise, and a tall
      // stack covers the tool it is describing.
      setToasts([{ id, tone, message }])
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const clear = useCallback(() => setToasts([]), [])

  const api = useMemo(() => ({ show, dismiss, clear }), [show, dismiss, clear])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, color } = TONE_STYLES[toast.tone]
            return (
              <m.div
                key={toast.id}
                // No `layout` prop: layout projection is not in the `domAnimation` bundle,
                // and it was never needed — `show` replaces rather than stacks, so there is
                // only ever one toast to reposition.
                initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-edge bg-bg-tertiary/95 p-3.5 shadow-card backdrop-blur-xl"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
                <p className="flex-1 text-sm leading-snug text-content-primary">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="-m-1 rounded p-1 text-content-muted transition-colors hover:text-content-primary"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
