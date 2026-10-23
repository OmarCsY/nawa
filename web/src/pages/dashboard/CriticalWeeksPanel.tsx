import { useMemo, useState } from 'react'
import { Card, EmptyState, ErrorState, LoadingSkeleton, Num, RiskLegend } from '../../components'
import { Chart } from '../../components/Chart'
import { escapeHtml } from '../../lib/charts'
import { cx } from '../../lib/cx'
import { DRIVER_AR, type CriticalWeekRow } from '../../lib/dashboard'
import { formatGregorian, formatHijri, formatNumber, hijriMonth, RISK_LABEL } from '../../lib/format'
import { token } from '../../lib/theme'
import type { RiskLevel } from '../../lib/types'

const LEVEL_INDEX: Record<RiskLevel, number> = { low: 0, mid: 1, high: 2 }
const driverAr = (d: string | null) => (d ? (DRIVER_AR[d] ?? d) : 'بلا محفّز بارز')

interface Grid {
  weeks: string[]
  regions: string[]
  /** Hijri month label per week index, only where the month changes. */
  monthLabels: Map<number, string>
  drivers: string[]
}

function buildGrid(rows: CriticalWeekRow[]): Grid {
  const weeks = [...new Set(rows.map((r) => r.week_start))].sort()

  // Hottest regions on top: order by mean ratio across the year.
  const sums = new Map<string, { total: number; n: number }>()
  for (const r of rows) {
    const s = sums.get(r.region) ?? { total: 0, n: 0 }
    s.total += r.avg_ratio
    s.n += 1
    sums.set(r.region, s)
  }
  const regions = [...sums.entries()].sort((a, b) => b[1].total / b[1].n - a[1].total / a[1].n).map(([region]) => region)

  const monthLabels = new Map<number, string>()
  weeks.forEach((w, i) => {
    const month = hijriMonth(w)
    if (i === 0 || month !== hijriMonth(weeks[i - 1])) monthLabels.set(i, month)
  })
  // Labels extend from their boundary into their own month; a short partial first month has no room.
  const boundaries = [...monthLabels.keys()]
  if (boundaries.length > 1 && boundaries[1] < 4) monthLabels.delete(0)

  const highByDriver = new Map<string, number>()
  for (const r of rows) {
    if (r.top_driver && r.level === 'high') highByDriver.set(r.top_driver, (highByDriver.get(r.top_driver) ?? 0) + 1)
  }
  const drivers = [...new Set(rows.map((r) => r.top_driver).filter((d): d is string => Boolean(d)))].sort(
    (a, b) => (highByDriver.get(b) ?? 0) - (highByDriver.get(a) ?? 0),
  )

  return { weeks, regions, monthLabels, drivers }
}

interface Peak {
  driver: string
  week: string
  highRegions: number
  meanRatio: number
}

/** For each driver: the week where it puts the most regions at high risk — i.e. when to launch that campaign. */
function findPeaks(rows: CriticalWeekRow[]): Peak[] {
  const acc = new Map<string, { high: number; ratio: number; n: number }>()
  for (const r of rows) {
    if (!r.top_driver) continue
    const key = `${r.top_driver}|${r.week_start}`
    const a = acc.get(key) ?? { high: 0, ratio: 0, n: 0 }
    if (r.level === 'high') a.high += 1
    a.ratio += r.avg_ratio
    a.n += 1
    acc.set(key, a)
  }
  const best = new Map<string, Peak>()
  for (const [key, a] of acc) {
    const [driver, week] = key.split('|')
    const peak = { driver, week, highRegions: a.high, meanRatio: a.ratio / a.n }
    const current = best.get(driver)
    if (!current || peak.highRegions > current.highRegions || (peak.highRegions === current.highRegions && peak.meanRatio > current.meanRatio)) {
      best.set(driver, peak)
    }
  }
  return [...best.values()].sort((a, b) => b.highRegions - a.highRegions || b.meanRatio - a.meanRatio).slice(0, 4)
}

function buildOption(rows: CriticalWeekRow[], grid: Grid, filter: string) {
  const t = {
    low: token('risk-low'),
    mid: token('risk-mid'),
    high: token('risk-high'),
    paper: token('paper'),
    ink: token('ink'),
    muted: token('muted'),
  }
  const weekIndex = new Map(grid.weeks.map((w, i) => [w, i]))
  const regionIndex = new Map(grid.regions.map((r, i) => [r, i]))

  const data = rows.map((r) => ({
    value: [weekIndex.get(r.week_start), regionIndex.get(r.region), LEVEL_INDEX[r.level]],
    row: r,
    itemStyle: filter !== 'all' && r.top_driver !== filter ? { opacity: 0.14 } : undefined,
  }))

  return {
    animationDuration: 600,
    grid: { top: 4, bottom: 28, left: 4, right: 4 },
    tooltip: {
      trigger: 'item',
      formatter: (p: { data: { row: CriticalWeekRow } }) => {
        const r = p.data.row
        const dot = `<span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${t[r.level]};margin-inline-end:6px"></span>`
        return `<div style="min-width:220px;line-height:1.7">
          <div style="font-weight:700;font-size:14px">${escapeHtml(r.region)}</div>
          <div style="color:${t.muted};font-size:12px">${formatHijri(r.week_start)} · ${formatGregorian(r.week_start)}</div>
          <div style="margin-top:4px">${dot}خطر ${RISK_LABEL[r.level]} · متوسط النسبة <b>×${formatNumber(r.avg_ratio, 2)}</b></div>
          <div>المحفّز الأبرز: <b>${escapeHtml(driverAr(r.top_driver))}</b></div>
        </div>`
      },
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 2,
      pieces: [
        { value: 0, color: t.low },
        { value: 1, color: t.mid },
        { value: 2, color: t.high },
      ],
    },
    xAxis: {
      type: 'category',
      data: grid.weeks,
      inverse: true, // time runs right-to-left, like the page
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: {
        show: true,
        interval: (i: number) => grid.monthLabels.has(i),
        length: 5,
        lineStyle: { color: t.muted },
      },
      axisLabel: {
        interval: 0,
        color: t.ink,
        fontSize: 12,
        // Time runs right-to-left, so a month fills the cells to the left of its first week:
        // right-align the label on that week so the text sits over its own month.
        align: 'right',
        hideOverlap: true, // a long name ("جمادى الآخرة") over a short month yields to its neighbour
        formatter: (_: string, i: number) => grid.monthLabels.get(i) ?? '',
      },
    },
    yAxis: {
      type: 'category',
      data: grid.regions,
      inverse: true,
      position: 'right',
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.ink, fontSize: 13, margin: 12 },
    },
    series: [
      {
        type: 'heatmap',
        data,
        itemStyle: { borderColor: t.paper, borderWidth: 2, borderRadius: 3 },
        emphasis: { itemStyle: { borderColor: t.ink, borderWidth: 1.5 } },
        progressive: 0,
      },
    ],
  }
}

interface CriticalWeeksPanelProps {
  data?: CriticalWeekRow[]
  error: unknown
  loading: boolean
  reload: () => void
}

export function CriticalWeeksPanel({ data, error, loading, reload }: CriticalWeeksPanelProps) {
  const [filter, setFilter] = useState('all')
  const rows = useMemo(() => data ?? [], [data])
  const grid = useMemo(() => buildGrid(rows), [rows])
  const peaks = useMemo(() => findPeaks(rows), [rows])
  const option = useMemo(() => buildOption(rows, grid, filter), [rows, grid, filter])

  return (
    <Card
      eyebrow="متى تطلق لتدوم حملتها، وفي أي منطقة"
      title="خريطة الأسابيع الحرجة"
      action={<RiskLegend className="hidden sm:flex" />}
    >
      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : error ? (
        <ErrorState title="تعذّر تحميل خريطة الأسابيع الحرجة" error={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState className="border-none py-8" title="لا توجد توقعات للأسابيع بعد" />
      ) : (
        <>
          <div role="group" aria-label="تصفية حسب المحفّز" className="mb-4 flex flex-wrap gap-2">
            {['all', ...grid.drivers].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={filter === d}
                onClick={() => setFilter(d)}
                className={cx(
                  'rounded-full border px-3.5 py-1 text-sm transition-colors',
                  filter === d
                    ? 'border-plum bg-plum text-sand'
                    : 'border-line bg-paper text-muted hover:border-plum/40 hover:text-ink',
                )}
              >
                {d === 'all' ? 'كل المحفّزات' : driverAr(d)}
              </button>
            ))}
          </div>

          <div className="-mx-2 overflow-x-auto px-2">
            <Chart
              option={option}
              height={grid.regions.length * 30 + 36}
              className="min-w-[52rem]"
              label={`خريطة حرارية لمستوى خطر الهدر: ${grid.weeks.length} أسبوعًا × ${grid.regions.length} منطقة`}
            />
          </div>
          <RiskLegend className="mt-3 sm:hidden" />

          {peaks.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-sm font-medium text-muted">ذروة كل محفّز: الأسبوع الأنسب لإطلاق حملته</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {peaks.map((p) => (
                  <li key={p.driver} className="rounded-2xl border border-line bg-sand/50 px-4 py-3">
                    <p className="font-bold text-ink">{driverAr(p.driver)}</p>
                    <p className="numerals mt-1 text-sm text-ink">{formatHijri(p.week)}</p>
                    <p className="numerals text-xs text-muted">أسبوع {formatGregorian(p.week)}</p>
                    <p className="numerals mt-2 text-xs text-muted">
                      {p.highRegions > 0 ? (
                        <>
                          خطر مرتفع في <b className="text-risk-high">{p.highRegions}</b> من {grid.regions.length} منطقة
                        </>
                      ) : (
                        <>
                          متوسط النسبة <Num>×{formatNumber(p.meanRatio, 2)}</Num>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
