import { Num } from '../../components'
import { formatNumber } from '../../lib/format'
import type { NashraOutcome } from '../../lib/nashra'

/** Scattered confetti: decoration only. Plain spans, so the dots stay round at any card width. */
const BITS = [
  { x: 8, y: 22, c: 'plum', d: 8 },
  { x: 22, y: 8, c: 'saffron', d: 6 },
  { x: 38, y: 26, c: 'risk-mid', d: 7 },
  { x: 62, y: 10, c: 'plum', d: 6 },
  { x: 78, y: 24, c: 'saffron', d: 8 },
  { x: 92, y: 9, c: 'risk-mid', d: 6 },
] as const

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-10" aria-hidden>
      {BITS.map((b) => (
        <span
          key={b.x}
          className="absolute rounded-full opacity-70"
          style={{ left: `${b.x}%`, top: b.y, width: b.d, height: b.d, background: `var(--color-${b.c})` }}
        />
      ))}
    </div>
  )
}

/** The result card: celebratory when waste fell, calm and honest when it didn't. */
export function OutcomeCard({ outcome }: { outcome: NashraOutcome }) {
  if (outcome.change_pct === null || outcome.prev_similar_g === null) return <section className="rounded-card border border-line bg-paper p-6 text-center" aria-label="نتيجة آخر مناسبة"><h2>نتيجة آخر مناسبة</h2><p>{formatNumber(outcome.actual_g / 1000)} كجم</p><p>لا يوجد قياس سابق صالح للمقارنة.</p></section>
  const less = outcome.change_pct < 0
  const kg = (g: number) => formatNumber(g / 1000)
  const pct = formatNumber(Math.abs(outcome.change_pct), 0)

  if (!less) {
    return (
      <section className="rounded-card border border-line bg-paper p-6 text-center shadow-card" aria-label="نتيجة آخر مناسبة">
        <p className="text-xs font-medium text-saffron">نتيجة آخر مناسبة</p>
        <p className="mt-2 text-lg font-bold text-ink">
          <Num>{kg(outcome.actual_g)}</Num> كجم مقابل <Num>{kg(outcome.prev_similar_g)}</Num> كجم
        </p>
        <p className="mt-1 text-sm text-muted">المرة الجاية فرصة نرجّعها أقل، وخطتكم فوق تساعد.</p>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden rounded-card border border-saffron/40 bg-saffron-soft px-6 pb-6 pt-9 text-center shadow-card"
      aria-label="نتيجة آخر مناسبة"
    >
      <Confetti />
      <p className="text-xs font-medium text-plum">أحسنتم! نتيجة آخر مناسبة</p>
      <p className="mt-2 text-5xl font-bold leading-tight text-plum">
        أقل <Num>{pct}%</Num>
      </p>
      <p className="mt-2 text-base text-ink">
        <Num className="font-bold">{kg(outcome.actual_g)}</Num> كجم بدل <Num>{kg(outcome.prev_similar_g)}</Num> كجم
      </p>
    </section>
  )
}
