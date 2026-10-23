import { Card } from '../../components'
import { formatDayMonth, formatHijriRange } from '../../lib/format'
import { countAr, type Nashra } from '../../lib/nashra'

const DAYS = { one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا' }
const MEMBERS = { one: 'فرد واحد', two: 'فردين', few: 'أفراد', many: 'فردًا' }

/** A low sun on the horizon: decoration only. */
function Sun() {
  return (
    <svg viewBox="0 0 200 200" className="pointer-events-none absolute -end-14 -top-14 size-52" aria-hidden>
      <circle cx="100" cy="100" r="98" fill="var(--color-saffron)" opacity="0.1" />
      <circle cx="100" cy="100" r="72" fill="var(--color-saffron)" opacity="0.16" />
      <circle cx="100" cy="100" r="46" fill="var(--color-saffron)" opacity="0.9" />
    </svg>
  )
}

export function HeroCard({ nashra }: { nashra: Nashra }) {
  const { household, days } = nashra
  const first = days[0]?.day ?? household.today
  const last = days[days.length - 1]?.day ?? household.today
  const high = days.filter((d) => d.level === 'high').length
  const mid = days.filter((d) => d.level === 'mid').length

  return (
    <Card tone="plum" padded={false} className="relative overflow-hidden px-6 pb-6 pt-7">
      <Sun />
      <div className="relative">
        <p className="flex items-center gap-2 text-sm font-medium text-saffron-soft">
          <span aria-hidden className="h-px w-6 bg-saffron" />
          نَوء · لصالح لتدوم
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">نشرة هدر بيتك</h1>

        <p className="numerals mt-4 text-lg font-medium">
          من {formatDayMonth(first)} إلى {formatDayMonth(last)}
        </p>
        <p className="numerals mt-1 text-sm text-sand/75">{formatHijriRange(first, last)}</p>

        <p className="mt-5 text-sm text-sand/90">
          أسرة من {countAr(household.size, MEMBERS)}
          <span aria-hidden className="mx-2 text-sand/40">·</span>
          {household.city}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
          {high > 0 && (
            <li className="inline-flex items-center gap-2 rounded-full bg-sand/12 px-3 py-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-risk-high ring-2 ring-sand/60" />
              {countAr(high, DAYS)} خطر مرتفع
            </li>
          )}
          {mid > 0 && (
            <li className="inline-flex items-center gap-2 rounded-full bg-sand/12 px-3 py-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-risk-mid" />
              {countAr(mid, DAYS)} خطر متوسط
            </li>
          )}
          {high + mid === 0 && (
            <li className="inline-flex items-center gap-2 rounded-full bg-sand/12 px-3 py-1.5">أسبوع هادئ على بيتكم</li>
          )}
        </ul>
      </div>
    </Card>
  )
}
