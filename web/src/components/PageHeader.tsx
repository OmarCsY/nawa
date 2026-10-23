import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  /** Rendered at the inline-end on wide screens, below on narrow ones. */
  aside?: ReactNode
  className?: string
}

/** Editorial page opener: a saffron kicker, a confident headline, a quiet lead. */
export function PageHeader({ eyebrow, title, lead, aside, className }: PageHeaderProps) {
  return (
    <header className={cx('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-2 text-sm font-medium text-saffron">
            <span aria-hidden className="h-px w-6 bg-saffron" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
        {lead && <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{lead}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  )
}
