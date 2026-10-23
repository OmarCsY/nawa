import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, DemoBadge, EmptyState, ErrorState, LoadingSkeleton, RiskStrip } from '../components'
import { formatDayLong, formatNumber } from '../lib/format'
import { loadNashra, type Nashra } from '../lib/nashra'
import { useAsync } from '../lib/useAsync'
import { DayCard, dayAnchor } from './nashra/DayCard'
import { HeroCard } from './nashra/HeroCard'
import { OutcomeCard } from './nashra/OutcomeCard'
import { TopItemsCard } from './nashra/TopItemsCard'

/** Mobile-first column: it opens from a WhatsApp link, and stays a centred phone-width column on desktop. */
const COLUMN = 'mx-auto w-full max-w-[30rem] space-y-5'

function NashraSkeleton() {
  return (
    <div className={COLUMN}>
      <div className="h-56 rounded-card bg-plum/10" aria-hidden />
      <LoadingSkeleton variant="strip" label="جاري تحميل نشرتكم" className="rounded-card border border-line bg-paper px-2 py-4" />
      <LoadingSkeleton variant="card" />
    </div>
  )
}

function Footer() {
  return (
    <footer className="flex flex-col items-center gap-3 pb-2 pt-3 text-center text-xs text-muted">
      <p>مدعومة بمحرك نَوء لصالح لتدوم</p>
      <DemoBadge />
    </footer>
  )
}

function NashraView({ nashra }: { nashra: Nashra }) {
  const { days, household } = nashra
  const [selected, setSelected] = useState<string>()
  const riskDays = days.filter((d) => d.level !== 'low')
  const selectedDay = days.find((d) => d.day === selected)

  function select(date: string) {
    setSelected(date)
    const card = document.getElementById(dayAnchor(date))
    if (!card) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    card.focus({ preventScroll: true })
  }

  return (
    <div className={COLUMN}>
      <HeroCard nashra={nashra} />

      <Card padded={false} className="px-2 pb-4 pt-4" aria-label="أيام الأسبوع">
        <div className="mb-2 flex items-baseline justify-between gap-3 px-3">
          <h2 className="text-sm font-bold text-ink">الأيام السبعة</h2>
          {riskDays.length > 0 && <p className="text-xs text-muted">اضغطوا على يوم لتفاصيله</p>}
        </div>
        <RiskStrip
          days={days.map((d) => ({ date: d.day, level: d.level }))}
          today={household.today}
          selected={selected}
          onSelect={select}
          showLegend
        />
        {selectedDay && selectedDay.level === 'low' && (
          <p className="numerals mx-3 mt-3 rounded-2xl bg-sand px-4 py-3 text-center text-sm text-muted">
            {formatDayLong(selectedDay.day)}: يوم عادي على معدل بيتكم، نحو {formatNumber(selectedDay.expected_kg)} كجم
          </p>
        )}
      </Card>

      {riskDays.length > 0 ? (
        <>
          <h2 className="px-1 pt-1 text-sm font-bold text-muted">أيام تحتاج انتباه</h2>
          {riskDays.map((d) => (
            <DayCard key={d.day} day={d} highlighted={selected === d.day} />
          ))}
        </>
      ) : (
        <EmptyState
          title="أسبوع هادئ"
          description="ما فيه أيام خطر هذا الأسبوع. لو جاتكم عزيمة أو سفر، أخبروا نَوء وتتحدث النشرة."
        />
      )}

      {nashra.last_outcome && <OutcomeCard outcome={nashra.last_outcome} />}

      <TopItemsCard items={nashra.top_items} />

      <Footer />
    </div>
  )
}

function NashraLoader({ id }: { id: string }) {
  const { data, error, loading, reload } = useAsync(() => loadNashra(id))

  if (loading) return <NashraSkeleton />
  if (error) {
    return (
      <div className={COLUMN}>
        <ErrorState title="تعذّر تحميل نشرتكم" error={error} onRetry={reload} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className={COLUMN}>
        <EmptyState
          title="ما لقينا نشرة بهذا الرابط"
          description="يمكن الرابط ناقص أو قديم. افتحوه من جديد من رسالة نَوء في واتساب."
          action={
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-full bg-plum px-5 text-sm font-medium text-sand transition-colors hover:bg-plum/90"
            >
              ابدؤوا محادثة مع نَوء
            </Link>
          }
        />
        <Footer />
      </div>
    )
  }
  return <NashraView nashra={data} />
}

export function NashraPage() {
  const { id = '' } = useParams()
  return <NashraLoader key={id} id={id} />
}
