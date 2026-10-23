import { RISK_LABEL } from '../lib/format'
import { cx } from '../lib/cx'
import type { RiskLevel } from '../lib/types'

interface RiskDotProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  /** Show the level name next to the dot. */
  withLabel?: boolean
  /** Soft halo on high-risk dots; off for dense views. */
  pulse?: boolean
  className?: string
}

const SIZES = { sm: 'size-2.5', md: 'size-4', lg: 'size-6' } as const

export const RISK_FILL: Record<RiskLevel, string> = {
  low: 'bg-risk-low ring-1 ring-inset ring-muted/25',
  mid: 'bg-risk-mid',
  high: 'bg-risk-high',
}

export function RiskDot({ level, size = 'md', withLabel = false, pulse = true, className }: RiskDotProps) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className={cx(
          'inline-block shrink-0 rounded-full transition-colors duration-700',
          SIZES[size],
          RISK_FILL[level],
          pulse && level === 'high' && 'motion-safe:animate-halo',
        )}
      />
      {withLabel ? (
        <span className="text-sm text-ink">{RISK_LABEL[level]}</span>
      ) : (
        <span className="sr-only">خطر {RISK_LABEL[level]}</span>
      )}
    </span>
  )
}

/** Compact legend for any risk visual. */
export function RiskLegend({ className }: { className?: string }) {
  return (
    <ul className={cx('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)}>
      {(['low', 'mid', 'high'] as const).map((level) => (
        <li key={level} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cx('size-2.5 rounded-full', RISK_FILL[level])} />
          {RISK_LABEL[level]}
        </li>
      ))}
    </ul>
  )
}
