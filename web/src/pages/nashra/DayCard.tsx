import { Card, Num } from '../../components'
import { DRIVER_AR } from '../../lib/dashboard'
import { cx } from '../../lib/cx'
import { formatDayLong, formatNumber } from '../../lib/format'
import { countAr, type NashraDay, type NashraStep, type PlanPhase } from '../../lib/nashra'
import type { LitadoomTool } from '../../lib/types'

const STEPS = { one: 'خطوة واحدة', two: 'خطوتين', few: 'خطوات', many: 'خطوة' }
const PHASES: Array<{ id: PlanPhase; label: string }> = [
  { id: 'before', label: 'قبل' },
  { id: 'during', label: 'أثناء' },
  { id: 'after', label: 'بعد' },
]

/* TODO: replace "#" with the Litadoom deep links once the tool URLs exist. */
const TOOL_ACTION: Record<LitadoomTool, { label: string; href: string }> = {
  quantity_calculator: { label: 'افتح حاسبة الكميات في لتدوم', href: '#' },
  charity_request: { label: 'اطلب جمعية من لتدوم', href: '#' },
  measure: { label: 'سجّل القياس', href: '#' },
}

export const dayAnchor = (day: string) => `day-${day}`

/** Percentages are isolated like everywhere else (<Num>), and "= 56%" never splits across lines. */
function Reason({ text }: { text: string }) {
  const parts = text.replace(/\s=\s(?=\d)/g, ' =\u00A0').split(/(\d+(?:\.\d+)?%)/)
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <Num key={i}>{part}</Num> : part))}
    </>
  )
}

function Step({ step }: { step: NashraStep }) {
  const action = step.litadoom_tool ? TOOL_ACTION[step.litadoom_tool] : null
  return (
    <li className="rounded-2xl border border-line/70 bg-paper px-4 py-3.5">
      <p className="text-[15px] leading-relaxed text-ink">{step.text_ar}</p>
      {action && (
        <a
          href={action.href}
          onClick={(e) => action.href === '#' && e.preventDefault()}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-saffron px-4 text-sm font-bold text-ink transition hover:brightness-95 active:brightness-90"
        >
          {action.label}
          <span aria-hidden>←</span>
        </a>
      )}
    </li>
  )
}

function Plan({ steps }: { steps: NashraStep[] }) {
  return (
    <div className="mt-5 border-t border-line/70 pt-5">
      <h3 className="text-base font-bold text-ink">خطتكم في {countAr(steps.length, STEPS)}</h3>
      <div className="mt-4 space-y-4">
        {PHASES.map(({ id, label }) => {
          const inPhase = steps.filter((s) => s.phase === id)
          if (inPhase.length === 0) return null
          return (
            <section key={id} aria-label={label}>
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-plum">
                <span aria-hidden className="size-1.5 rounded-full bg-plum" />
                {label}
              </p>
              <ul className="space-y-2.5">
                {inPhase.map((s) => (
                  <Step key={s.step_id} step={s} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

interface DayCardProps {
  day: NashraDay
  highlighted: boolean
}

/** One card per mid/high day: why it is risky, what is exposed, and the plan. */
export function DayCard({ day, highlighted }: DayCardProps) {
  const high = day.level === 'high'
  const reason = day.reason_ar ?? (day.top_driver && DRIVER_AR[day.top_driver]) ?? 'يوم يحتاج انتباه'

  return (
    <Card
      as="article"
      id={dayAnchor(day.day)}
      tabIndex={-1}
      tone={high ? 'alert' : 'default'}
      padded={false}
      aria-label={formatDayLong(day.day)}
      className={cx(
        'relative scroll-mt-36 overflow-hidden p-5 outline-none transition-shadow duration-500 sm:scroll-mt-24',
        !high && 'border-risk-mid/50',
        highlighted && 'ring-2 ring-plum/50 ring-offset-2 ring-offset-sand',
      )}
    >
      <span aria-hidden className={cx('absolute inset-y-0 start-0 w-1.5', high ? 'bg-risk-high' : 'bg-risk-mid')} />

      <div className="flex items-center justify-between gap-3">
        <p className="numerals text-sm font-medium text-muted">{formatDayLong(day.day)}</p>
        <span
          className={cx(
            'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold',
            high ? 'bg-risk-high text-paper' : 'bg-risk-mid/25 text-ink ring-1 ring-inset ring-risk-mid/60',
          )}
        >
          {high ? 'خطر مرتفع' : 'خطر متوسط'}
        </span>
      </div>

      <p className="numerals mt-3 text-xl font-bold leading-snug text-ink">
        <Reason text={reason} />
      </p>

      {day.items_at_risk.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted">الأصناف المعرّضة</p>
          <ul className="flex flex-wrap gap-2">
            {day.items_at_risk.map((item) => (
              <li key={item} className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-paper/80 px-4 py-3">
        <p className="text-sm font-bold text-ink">
          الهدر المتوقع: <Num>{formatNumber(day.expected_kg)}</Num> كجم
        </p>
        {day.ratio > 1 && (
          <p className="text-xs text-muted">
            <Num>{formatNumber(day.ratio)}</Num> ضعف المعتاد
          </p>
        )}
      </div>

      {day.plan && <Plan steps={day.plan} />}
    </Card>
  )
}
