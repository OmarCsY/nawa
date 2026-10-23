import { Fragment, useEffect, useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingSkeleton, Num } from '../../components'
import type { FunnelRow } from '../../lib/dashboard'
import { formatNumber, formatPercent } from '../../lib/format'

interface FunnelPanelProps {
  data?: FunnelRow[]
  error: unknown
  loading: boolean
  reload: () => void
  className?: string
}

/** One decimal: 265 of 266 is 99.6%, not a misleading 100%. */
const conversion = (from: FunnelRow, to: FunnelRow) => from.count ? formatPercent(to.count / from.count, 1) : '—'

/** Bars start at zero width and grow once mounted. */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return mounted
}

function Bars({ stages }: { stages: FunnelRow[] }) {
  const grown = useMounted()
  const top = stages[0].count || 1

  return (
    <ol className="space-y-1">
      {stages.map((stage, i) => {
        const prev = stages[i - 1]
        return (
          <Fragment key={stage.stage_order}>
            {prev && (
              <li aria-hidden className="flex items-center gap-2 ps-3 text-xs text-muted">
                <span className="h-5 w-px bg-line" />
                <span>
                  ↓ <Num className="font-medium text-ink">{conversion(prev, stage)}</Num> عبرت للمرحلة التالية
                </span>
              </li>
            )}
            <li>
              <div className="flex items-baseline justify-between gap-4">
                <p className="flex items-baseline gap-2.5 text-base font-medium text-ink">
                  <span className="numerals grid size-6 shrink-0 place-items-center self-center rounded-full bg-plum-soft text-xs font-bold text-plum">
                    {stage.stage_order}
                  </span>
                  {stage.stage_ar}
                </p>
                <p className="numerals text-3xl font-light leading-none text-plum">{formatNumber(stage.count)}</p>
              </div>
              <div className="mt-2.5 h-3.5 overflow-hidden rounded-full bg-plum-soft">
                <div
                  className="h-full rounded-full bg-plum transition-[width] duration-1000 ease-out"
                  style={{ width: grown ? `${(stage.count / top) * 100}%` : '0%', transitionDelay: `${i * 120}ms` }}
                />
              </div>
              <span className="sr-only">
                {prev ? `${conversion(prev, stage)} من المرحلة السابقة` : ''}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

export function FunnelPanel({ data, error, loading, reload, className }: FunnelPanelProps) {
  const stages = data ?? []
  const first = stages[0]?.count ?? 0
  const last = stages[stages.length - 1]?.count ?? 0

  return (
    <Card
      eyebrow="قمع الدورة"
      title="دورة نَوء: المناسبة ← الخطة ← التطبيق ← إعادة القياس"
      className={className}
      action={
        stages.length > 1 &&
        first > 0 && (
          <p className="text-end">
            <Num className="block text-2xl font-bold leading-none text-saffron">{formatPercent(last / first)}</Num>
            <span className="text-xs text-muted">أكملت الدورة كاملة</span>
          </p>
        )
      }
    >
      {loading ? (
        <LoadingSkeleton variant="text" count={6} />
      ) : error ? (
        <ErrorState title="تعذّر تحميل قمع الدورة" error={error} onRetry={reload} />
      ) : stages.length === 0 ? (
        <EmptyState className="border-none py-8" title="لا توجد مراحل بعد" />
      ) : (
        <Bars stages={stages} />
      )}
    </Card>
  )
}
