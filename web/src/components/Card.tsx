import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

type Tone = 'default' | 'plum' | 'alert'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'section' | 'article' | 'aside' | 'div'
  eyebrow?: ReactNode
  title?: ReactNode
  /** Rendered at the inline-end of the header (a link, a filter, a badge). */
  action?: ReactNode
  tone?: Tone
  padded?: boolean
}

const TONES: Record<Tone, string> = {
  default: 'bg-paper border-line text-ink',
  plum: 'bg-plum border-plum text-sand',
  alert: 'bg-risk-high-soft border-risk-high/25 text-ink',
}

export function Card({
  as: Tag = 'section',
  eyebrow,
  title,
  action,
  tone = 'default',
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = eyebrow || title || action
  return (
    <Tag
      className={cx('rounded-card border shadow-card', TONES[tone], padded && 'p-5 sm:p-6', className)}
      {...rest}
    >
      {hasHeader && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className={cx('text-xs font-medium', tone === 'plum' ? 'text-saffron-soft' : 'text-saffron')}>
                {eyebrow}
              </p>
            )}
            {title && <h2 className="mt-1 text-lg font-bold leading-snug">{title}</h2>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}
