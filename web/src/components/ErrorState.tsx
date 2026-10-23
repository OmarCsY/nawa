import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import { Button } from './Button'

interface ErrorStateProps {
  title?: ReactNode
  /** An Error, a message, or nothing. Technical details stay out of the headline. */
  error?: unknown
  onRetry?: () => void
  className?: string
}

function messageOf(error: unknown): string | null {
  if (!error) return null
  if (error instanceof Error) return /[\u0600-\u06ff]/.test(error.message) ? error.message : 'تعذّر تحميل البيانات. تحقق من الاتصال وحاول مرة أخرى.'
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return null
}

export function ErrorState({ title = 'تعذّر عرض هذا الجزء', error, onRetry, className }: ErrorStateProps) {
  const detail = messageOf(error)
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center rounded-card border border-risk-high/25 bg-risk-high-soft px-6 py-10 text-center',
        className,
      )}
    >
      <span aria-hidden className="grid size-10 place-items-center rounded-full bg-risk-high text-lg font-bold text-paper">
        !
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      {detail && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{detail}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          حاول مرة ثانية
        </Button>
      )}
    </div>
  )
}
