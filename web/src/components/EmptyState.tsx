import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

interface EmptyStateProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

/** A calm week: three pale dots on the horizon. */
function CalmIcon() {
  return (
    <svg viewBox="0 0 96 40" className="h-10 w-24" aria-hidden>
      <line x1="4" y1="24" x2="92" y2="24" stroke="var(--color-line)" strokeWidth="1.5" />
      {[24, 48, 72].map((cx) => (
        <circle key={cx} cx={cx} cy="24" r="7" fill="var(--color-risk-low)" stroke="var(--color-paper)" strokeWidth="3" />
      ))}
      <path d="M38 10c6-6 14-6 20 0" fill="none" stroke="var(--color-saffron)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-card border border-dashed border-line px-6 py-12 text-center',
        className,
      )}
    >
      {icon ?? <CalmIcon />}
      <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
