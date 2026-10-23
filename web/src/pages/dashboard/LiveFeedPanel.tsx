import { useEffect, useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingSkeleton } from '../../components'
import { cx } from '../../lib/cx'
import type { LiveRow } from '../../lib/dashboard'
import { formatAgo, formatGrams } from '../../lib/format'

const SOURCE_AR: Record<string, string> = {
  voice: 'صوتية',
  text: 'نص',
  litadoom_tool: 'أداة لتدوم',
}

/** Re-render every second so relative times stay honest. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function FeedRow({ row, isFresh, now }: { row: LiveRow; isFresh: boolean; now: number }) {
  return (
    <li className={cx('grid', isFresh && 'motion-safe:animate-expand')}>
      <div className="min-h-0 overflow-hidden">
        <div
          className={cx(
            'flex items-center gap-3 rounded-xl px-3 py-3',
            isFresh && 'motion-safe:animate-arrive',
          )}
        >
          <span aria-hidden className={cx('size-2 shrink-0 rounded-full', isFresh ? 'bg-saffron' : 'bg-line')} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-snug text-ink">
              <span className="font-bold">{row.city || (row.is_demo ? 'قياس تجريبي' : 'قياس مجهّل')}</span>
              <span className="mx-1.5 text-muted">·</span>
              {row.item_ar}
              <span className="mx-1.5 text-muted">·</span>
              <span className="numerals font-medium text-plum">{formatGrams(row.grams)}</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {row.reason_ar}
              {row.source && SOURCE_AR[row.source] && <span> · {SOURCE_AR[row.source]}</span>}
            </p>
          </div>
          <time dateTime={row.created_at} className="numerals shrink-0 whitespace-nowrap text-xs text-muted">
            {formatAgo(row.created_at, now)}
          </time>
        </div>
      </div>
    </li>
  )
}

interface LiveFeedPanelProps {
  rows: LiveRow[]
  fresh: ReadonlySet<number>
  loading: boolean
  error: unknown
  onRetry: () => void
  className?: string
}

export function LiveFeedPanel({ rows, fresh, loading, error, onRetry, className }: LiveFeedPanelProps) {
  const now = useNow()

  return (
    <Card
      eyebrow="آخر القياسات المجهّلة"
      title="البث الحي"
      action={
        rows.length > 0 && (
          <span className="numerals text-xs text-muted">آخر {rows.length} قياس</span>
        )
      }
      className={cx('flex flex-col', className)}
    >
      {loading ? (
        <LoadingSkeleton variant="text" count={8} />
      ) : error && rows.length === 0 ? (
        <ErrorState title="تعذّر تحميل البث الحي" error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          className="border-none py-8"
          title="بانتظار أول قياس"
          description="كل قياس يصل للمحرك يظهر هنا لحظة وصوله: المدينة والصنف والسبب فقط."
        />
      ) : (
        <div className="relative -mx-3 min-h-0 flex-1 overflow-hidden">
          <ul aria-live="polite" aria-label="آخر القياسات" className="max-h-[30rem] divide-y divide-line/60 overflow-hidden">
            {rows.map((row) => (
              <FeedRow key={row.id} row={row} isFresh={fresh.has(row.id)} now={now} />
            ))}
          </ul>
          {/* fade the list out at the bottom instead of a hard cut */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent to-paper" />
        </div>
      )}
    </Card>
  )
}
