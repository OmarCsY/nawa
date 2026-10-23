import { useMemo } from 'react'
import { Card, EmptyState, ErrorState, LoadingSkeleton, Num } from '../../components'
import type { WasteRow } from '../../lib/dashboard'
import { formatKg, formatPercent } from '../../lib/format'

interface ItemTotal {
  item: string
  grams: number
  topReason: string
  topReasonShare: number
}

const TOP_N = 6

/** v_waste_by_item_reason is item × reason; roll it up per item and keep each item's main reason. */
function rollUp(rows: WasteRow[]): { items: ItemTotal[]; total: number } {
  const byItem = new Map<string, { grams: number; reasons: Map<string, number> }>()
  for (const r of rows) {
    const entry = byItem.get(r.item_ar) ?? { grams: 0, reasons: new Map() }
    entry.grams += r.grams
    entry.reasons.set(r.reason_ar, (entry.reasons.get(r.reason_ar) ?? 0) + r.grams)
    byItem.set(r.item_ar, entry)
  }
  const total = [...byItem.values()].reduce((sum, e) => sum + e.grams, 0)
  const items = [...byItem.entries()]
    .map(([item, e]) => {
      const [topReason, topGrams] = [...e.reasons.entries()].sort((a, b) => b[1] - a[1])[0]
      return { item, grams: e.grams, topReason, topReasonShare: e.grams ? topGrams / e.grams : 0 }
    })
    .sort((a, b) => b.grams - a.grams)
    .slice(0, TOP_N)
  return { items, total }
}

interface WasteByItemPanelProps {
  data?: WasteRow[]
  error: unknown
  loading: boolean
  reload: () => void
  className?: string
}

export function WasteByItemPanel({ data, error, loading, reload, className }: WasteByItemPanelProps) {
  const { items, total } = useMemo(() => rollUp(data ?? []), [data])
  const max = items[0]?.grams || 1

  return (
    <Card eyebrow="الهدر حسب الصنف" title="أكثر ما ينهدر في البيوت" className={className}>
      {loading ? (
        <LoadingSkeleton variant="text" count={6} />
      ) : error ? (
        <ErrorState title="تعذّر تحميل الهدر حسب الصنف" error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState className="border-none py-8" title="لا توجد قياسات بعد" />
      ) : (
        <ol className="space-y-4">
          {items.map((it) => (
            <li
              key={it.item}
              title={`${it.item}: ${formatKg(it.grams)} · ${formatPercent(total ? it.grams / total : 0)} من كل الهدر`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-medium text-ink">{it.item}</p>
                <p className="numerals flex items-baseline gap-2 text-sm text-ink">
                  <span className="font-bold">{formatKg(it.grams)}</span>
                  <Num className="text-xs text-muted">{formatPercent(total ? it.grams / total : 0)}</Num>
                </p>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-plum-soft">
                <div className="h-full rounded-full bg-plum" style={{ width: `${(it.grams / max) * 100}%` }} />
              </div>
              <p className="numerals mt-1 text-xs text-muted">
                أغلبه: {it.topReason} · <Num>{formatPercent(it.topReasonShare)}</Num>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
