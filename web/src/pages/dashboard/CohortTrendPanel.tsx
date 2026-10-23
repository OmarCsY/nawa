import { useMemo } from 'react'
import { Card, EmptyState, ErrorState, LoadingSkeleton, Num } from '../../components'
import { Chart } from '../../components/Chart'
import type { CohortTrendRow } from '../../lib/dashboard'
import { formatDayMonth, formatGregorian, formatHijri, formatNumber, formatPercent } from '../../lib/format'
import { token } from '../../lib/theme'

/** Weeks where either cohort had fewer events are too noisy to compare. */
const MIN_EVENTS = 20

interface WeekPair {
  week: string
  nawa: CohortTrendRow
  control: CohortTrendRow
}

function pairWeeks(rows: CohortTrendRow[]): WeekPair[] {
  const byWeek = new Map<string, Partial<Record<'nawa' | 'control', CohortTrendRow>>>()
  for (const r of rows) byWeek.set(r.week_start, { ...byWeek.get(r.week_start), [r.cohort]: r })
  return [...byWeek.entries()]
    .filter(([, c]) => c.nawa && c.control && c.nawa.events >= MIN_EVENTS && c.control.events >= MIN_EVENTS)
    .map(([week, c]) => ({ week, nawa: c.nawa!, control: c.control! }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

/** Event-weighted mean kg per gathering, so busy weeks count for more than quiet ones. */
function weightedMean(rows: CohortTrendRow[]): number {
  const events = rows.reduce((s, r) => s + r.events, 0)
  return events ? rows.reduce((s, r) => s + r.avg_event_kg * r.events, 0) / events : 0
}

function buildOption(pairs: WeekPair[]) {
  const t = { plum: token('plum'), muted: token('muted'), paper: token('paper'), ink: token('ink'), line: token('line') }
  const point = (color: string) => ({ color, borderColor: t.paper, borderWidth: 2 })
  const endLabel = { show: true, formatter: '{a}', color: t.ink, fontSize: 13, fontWeight: 500, distance: 10 }

  return {
    animationDuration: 900,
    grid: { top: 28, bottom: 8, left: 96, right: 8 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: t.line, width: 1.5 } },
      formatter: (params: { dataIndex: number; marker: string; seriesName: string; value: number }[]) => {
        const pair = pairs[params[0].dataIndex]
        const events = (name: string) => (name === 'أسر نَوء' ? pair.nawa.events : pair.control.events)
        const lines = params
          .map(
            (p) =>
              `<div>${p.marker}${p.seriesName}: <b>${formatNumber(p.value, 2)} كجم</b> <span style="color:${t.muted}">(${events(p.seriesName)} مناسبة)</span></div>`,
          )
          .join('')
        return `<div style="line-height:1.8"><div style="font-weight:700">أسبوع ${formatGregorian(pair.week)}</div>
          <div style="color:${t.muted};font-size:12px;margin-bottom:2px">${formatHijri(pair.week)}</div>${lines}</div>`
      },
    },
    xAxis: {
      type: 'category',
      data: pairs.map((p) => p.week),
      inverse: true,
      axisTick: { show: false },
      axisLabel: { formatter: (w: string) => formatDayMonth(w), fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      min: 0,
      name: 'كجم لكل مناسبة',
      nameTextStyle: { color: t.muted, fontSize: 12, align: 'right' },
      axisLabel: { formatter: (v: number) => formatNumber(v), fontSize: 12 },
    },
    series: [
      {
        name: 'المجموعة الضابطة',
        type: 'line',
        data: pairs.map((p) => p.control.avg_event_kg),
        symbol: 'circle',
        symbolSize: 9,
        lineStyle: { width: 2.5, type: 'dashed', color: t.muted },
        itemStyle: point(t.muted),
        endLabel: { ...endLabel, color: t.muted },
        emphasis: { focus: 'series' },
      },
      {
        name: 'أسر نَوء',
        type: 'line',
        data: pairs.map((p) => p.nawa.avg_event_kg),
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 3, color: t.plum },
        itemStyle: point(t.plum),
        endLabel: { ...endLabel, color: t.plum, fontWeight: 700 },
        emphasis: { focus: 'series' },
      },
    ],
  }
}

interface CohortTrendPanelProps {
  data?: CohortTrendRow[]
  error: unknown
  loading: boolean
  reload: () => void
  className?: string
}

export function CohortTrendPanel({ data, error, loading, reload, className }: CohortTrendPanelProps) {
  const pairs = useMemo(() => pairWeeks(data ?? []), [data])
  const option = useMemo(() => buildOption(pairs), [pairs])
  const nawaMean = weightedMean(pairs.map((p) => p.nawa))
  const controlMean = weightedMean(pairs.map((p) => p.control))
  const lessBy = controlMean ? 1 - nawaMean / controlMean : 0

  return (
    <Card eyebrow="هدر المناسبة الواحدة، أسبوعًا بأسبوع" title="نَوء مقابل المجموعة الضابطة" className={className}>
      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : error ? (
        <ErrorState title="تعذّر تحميل المقارنة" error={error} onRetry={reload} />
      ) : pairs.length < 2 ? (
        <EmptyState
          className="border-none py-8"
          title="لا تكفي الأسابيع للمقارنة بعد"
          description={`نعرض فقط الأسابيع التي فيها ${MIN_EVENTS} مناسبة أو أكثر في المجموعتين.`}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="flex items-baseline gap-3">
              <Num className="text-5xl font-light leading-none text-plum">{formatPercent(lessBy)}</Num>
              <span className="text-sm leading-snug text-muted">
                أقل هدرًا في المناسبة
                <br />
                عند أسر نَوء
              </span>
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink" aria-label="مفتاح الرسم">
              <li className="flex items-center gap-2">
                <span aria-hidden className="h-[3px] w-6 rounded-full bg-plum" />
                أسر نَوء <span className="numerals text-muted">({formatNumber(nawaMean)} كجم)</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="w-6 border-t-[2.5px] border-dashed border-muted" />
                المجموعة الضابطة <span className="numerals text-muted">({formatNumber(controlMean)} كجم)</span>
              </li>
            </ul>
          </div>
          <Chart
            option={option}
            height={300}
            className="mt-4"
            label={`متوسط هدر المناسبة: أسر نَوء ${formatNumber(nawaMean)} كجم مقابل ${formatNumber(controlMean)} كجم للمجموعة الضابطة`}
          />
          <p className="numerals mt-2 text-xs text-muted">
            {pairs.length} أسابيع فيها {MIN_EVENTS} مناسبة أو أكثر في المجموعتين. الأسابيع الأصغر مستبعدة لأنها ضجيج.
          </p>
        </>
      )}
    </Card>
  )
}
