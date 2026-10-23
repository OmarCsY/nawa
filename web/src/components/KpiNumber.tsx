import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNumber } from '../lib/format'
import { cx } from '../lib/cx'

interface Delta {
  /** Signed change as a ratio, e.g. -0.31 for 31% less. */
  value: number
  /** Which direction is good news. For waste, down is good. */
  goodWhen: 'up' | 'down'
  caption?: string
}

interface KpiNumberProps {
  label: ReactNode
  value: number
  unit?: string
  decimals?: number
  delta?: Delta
  hint?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  /** Light text for use on a plum card. */
  inverse?: boolean
  className?: string
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ease the numeral up from zero (then between values), unless the viewer prefers reduced motion. */
function useCountUp(target: number, durationMs = 900): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0))
  const from = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(target)
      return
    }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(origin + (target - origin) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return shown
}

export function KpiNumber({
  label,
  value,
  unit,
  decimals = 0,
  delta,
  hint,
  size = 'lg',
  inverse = false,
  className,
}: KpiNumberProps) {
  const shown = useCountUp(value)
  const good = delta && (delta.goodWhen === 'down' ? delta.value < 0 : delta.value > 0)

  return (
    <div className={cx('flex flex-col', className)}>
      <p className={cx('text-sm font-medium leading-snug', inverse ? 'text-sand/75' : 'text-muted')}>{label}</p>

      {/* "21.8%" reads left-to-right; an Arabic unit like "كجم" keeps the page's direction */}
      <p
        dir={unit === '%' ? 'ltr' : undefined}
        className={cx('mt-3 flex items-baseline gap-1 self-start', inverse ? 'text-sand' : 'text-plum')}
      >
        <span
          className={cx(
            'numerals font-light leading-none tracking-tight',
            size === 'xl' ? 'text-6xl lg:text-7xl' : size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-4xl',
          )}
        >
          <span className="sr-only">{formatNumber(value, decimals)}</span>
          <span aria-hidden>{formatNumber(shown, decimals)}</span>
        </span>
        {unit && <span className={cx('text-2xl font-light', inverse ? 'text-sand/70' : 'text-muted')}>{unit}</span>}
      </p>

      {delta && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cx(
              'numerals inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
              good ? 'bg-plum-soft text-plum' : 'bg-risk-high-soft text-risk-high',
            )}
          >
            <span aria-hidden>{delta.value < 0 ? '▾' : '▴'}</span>
            {formatNumber(Math.abs(delta.value) * 100, 0)}%
          </span>
          {delta.caption && <span className="text-muted">{delta.caption}</span>}
        </p>
      )}

      {hint && (
        <div className={cx('mt-3 text-sm leading-relaxed', inverse ? 'text-sand/80' : 'text-muted')}>{hint}</div>
      )}
    </div>
  )
}
