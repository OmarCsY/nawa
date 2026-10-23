import { useEffect } from 'react'
import { chat, type Toast } from './chatStore'

/** One short message at a time, over the phone: mic problems, "mention an event first", time jumps with no reply. */
export function ToastHost({ toast }: { toast: Toast | null }) {
  const id = toast?.id
  const hasAction = Boolean(toast?.action)

  useEffect(() => {
    if (id === undefined) return
    const timer = window.setTimeout(() => chat.dismissToast(id), hasAction ? 9000 : 5000)
    return () => window.clearTimeout(timer)
  }, [id, hasAction])

  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status">
      <div
        key={toast.id}
        className="pointer-events-auto flex max-w-[22rem] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm leading-relaxed text-sand shadow-[0_12px_32px_-12px_rgb(35_26_20/0.6)] motion-safe:animate-pop"
      >
        <p>{toast.text}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              chat.dismissToast(toast.id)
              toast.action?.run()
            }}
            className="shrink-0 rounded-full bg-saffron px-3 py-1.5 text-xs font-bold text-ink"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
