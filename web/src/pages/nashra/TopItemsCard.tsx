import { Card, EmptyState, Num } from '../../components'
import { formatKg, formatNumber } from '../../lib/format'
import type { NashraItem } from '../../lib/nashra'

export function TopItemsCard({ items }: { items: NashraItem[] }) {
  const max = Math.max(...items.map((i) => i.share), 1)

  return (
    <Card eyebrow="آخر 30 يومًا" title="أكثر ما ينهدر عندكم">
      {items.length === 0 ? (
        <EmptyState className="border-none py-6" title="لا توجد قياسات بعد" description="أرسلوا أول قياس لنوء وتظهر هنا أكثر الأصناف هدرًا." />
      ) : (
        <ol className="space-y-4">
          {items.map((it, i) => (
            <li key={it.item_ar}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-medium text-ink">{it.item_ar}</p>
                <p className="numerals flex items-baseline gap-2 text-sm">
                  <span className="font-bold text-ink">{formatKg(it.grams)}</span>
                  <Num className="text-xs text-muted">{formatNumber(it.share, 0)}%</Num>
                </p>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-plum-soft" aria-hidden>
                <div
                  className={i === 0 ? 'h-full rounded-full bg-plum' : 'h-full rounded-full bg-plum/55'}
                  style={{ width: `${(it.share / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
