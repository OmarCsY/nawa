import type { ReactNode } from 'react'
import { Card, ErrorState, KpiNumber, LoadingSkeleton, Num } from '../../components'
import { cx } from '../../lib/cx'
import { TOOL_AR, type KpiRow, type ToolUsageRow } from '../../lib/dashboard'
import { formatNumber, formatSigned } from '../../lib/format'

function ControlLine({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p className={cx('flex items-start gap-2 border-t pt-3', inverse ? 'border-sand/20' : 'border-line')}>
      <span
        aria-hidden
        className={cx('mt-2 h-0.5 w-3 shrink-0 rounded-full', inverse ? 'bg-sand/60' : 'bg-muted')}
      />
      <span>{children}</span>
    </p>
  )
}

const pct = (v: number) => `${formatNumber(v)}%`

interface KpiSectionProps {
  kpis: { data?: KpiRow[]; error: unknown; loading: boolean; reload: () => void }
  tools: { data?: ToolUsageRow[]; error: unknown; loading: boolean; reload: () => void }
}

export function KpiSection({ kpis, tools }: KpiSectionProps) {
  if (kpis.loading) return <LoadingSkeleton variant="kpi" count={3} label="جاري تحميل المؤشرات" />
  if (kpis.error) return <ErrorState title="تعذّر تحميل المؤشرات" error={kpis.error} onRetry={kpis.reload} />

  const nawa = kpis.data?.find((r) => r.cohort === 'nawa')
  const control = kpis.data?.find((r) => r.cohort === 'control')
  if (!nawa) return <ErrorState title="لا توجد مؤشرات لمجموعة نَوء بعد" onRetry={kpis.reload} />

  const totalClicks = tools.data?.reduce((sum, t) => sum + t.clicks, 0) ?? 0

  return (
    <section aria-label="مؤشرات التحدي" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card tone="plum" className="flex flex-col justify-between gap-6">
          <KpiNumber
            inverse
            size="xl"
            label="انخفاض الهدر بين القياس الأول واللاحق"
            value={nawa.waste_reduction_pct}
            decimals={1}
            unit="%"
            hint="نسبة موجبة تعني انخفاضًا، والسالبة تعني زيادة. الشرطة تعني عدم كفاية المقارنة."
          />
          {control && (
            <ControlLine inverse>
              مقابل <Num className="font-bold">{control.waste_reduction_pct === null ? '—' : `${formatSigned(control.waste_reduction_pct)}%`}</Num> في المجموعة الضابطة
            </ControlLine>
          )}
        </Card>

        <Card className="flex flex-col justify-between gap-6">
          <KpiNumber
            size="xl"
            label="نسبة تطبيق التوصيات"
            value={nawa.adherence_pct}
            decimals={1}
            unit="%"
          />
          <ControlLine>
            {control?.adherence_pct == null ? (
              'المجموعة الضابطة لا تصلها خطط، تذكير بالقياس فقط'
            ) : (
              <>
                مقابل <Num className="font-bold text-ink">{pct(control.adherence_pct)}</Num> في المجموعة الضابطة
              </>
            )}
          </ControlLine>
        </Card>

        <Card className="flex flex-col justify-between gap-6">
          <KpiNumber size="xl" label="معدل إعادة القياس" value={nawa.remeasure_pct} decimals={1} unit="%" />
          {control && (
            <ControlLine>
              مقابل <Num className="font-bold text-ink">{control.remeasure_pct === null ? '—' : pct(control.remeasure_pct)}</Num> في المجموعة الضابطة
            </ControlLine>
          )}
        </Card>
      </div>

      {/* slim secondary stats */}
      <div className="grid grid-cols-1 rounded-card border border-line bg-paper/60 sm:grid-cols-3">
        <Stat
          label="الأسر المشاركة"
          value={nawa.households + (control?.households ?? 0)}
          detail={control && `${formatNumber(nawa.households)} نَوء · ${formatNumber(control.households)} ضابطة`}
        />
        <Stat
          label="القياسات"
          value={nawa.measurements + (control?.measurements ?? 0)}
          detail={control && `${formatNumber(nawa.measurements)} نَوء · ${formatNumber(control.measurements)} ضابطة`}
        />
        <Stat
          label="نقرات أدوات لتدوم"
          value={tools.error ? null : totalClicks}
          loading={tools.loading}
          detail={
            tools.error
              ? 'تعذّر التحميل'
              : tools.data
                  ?.slice()
                  .sort((a, b) => b.clicks - a.clicks)
                  .map((t) => `${TOOL_AR[t.tool] ?? t.tool} ${formatNumber(t.clicks)}`)
                  .join(' · ')
          }
        />
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  detail,
  loading = false,
}: {
  label: string
  value: number | null
  detail?: ReactNode
  loading?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-line px-5 py-4 max-sm:not-first:border-t sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:not-first:border-s sm:px-6">
      <p className="text-sm text-muted">{label}</p>
      <div className="text-end sm:text-start">
        <p className="numerals text-2xl font-medium text-ink sm:text-3xl">
          {loading ? <span className="text-line">—</span> : value === null ? '—' : formatNumber(value)}
        </p>
        {detail && <p className="numerals mt-0.5 text-xs text-muted">{detail}</p>}
      </div>
    </div>
  )
}
