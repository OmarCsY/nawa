import { RiskDot } from '../../components'
import { cx } from '../../lib/cx'
import type { EventPayload, ItemsPayload, LinkPayload, PlanPayload, ResultPayload } from '../../lib/engineAdapter'
import { diffDays, formatDayLong, formatNumber } from '../../lib/format'
import { countAr } from '../../lib/nashra'
import { chat } from './chatStore'
import { ArrowIcon, CalendarIcon } from './icons'

/* Rich bubbles. Inside the phone the chrome is WhatsApp's; the cards carry Nawa's plum and saffron. */

const ITEMS = { one: 'صنفًا واحدًا', two: 'صنفين', few: 'أصناف', many: 'صنفًا' }
const STEPS = { one: 'خطوة واحدة', two: 'خطوتين', few: 'خطوات', many: 'خطوة' }
const DAYS = { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يومًا' }
const PHASE: Record<string, string> = { before: 'قبل', during: 'أثناء', after: 'بعد' }

const kg = (grams: number) => `${formatNumber(grams / 1000, 2)} كجم`

export function ItemsCard({ items }: { items: ItemsPayload }) {
  return (
    <>
      <div className="mt-0.5 overflow-hidden rounded-lg border border-wa-ink/10">
        <p className="bg-wa-bar px-3 py-2 text-[13px] font-bold">{items.status === 'confirmed' ? 'قياس محفوظ' : 'مسودة للمراجعة'} · {countAr(items.rows.length, ITEMS)}</p>
        <ul>
          {items.rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 border-t border-wa-ink/10 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{r.name}</p>
                <p className="text-[12px] text-wa-meta">{r.reason}</p>
              </div>
              <p className="numerals shrink-0 text-[14px] font-bold">{formatNumber(r.grams, 0)} جم</p>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between gap-3 border-t border-wa-ink/10 bg-wa-bar px-3 py-2 text-[13px]">
          <span className="text-wa-meta">المجموع</span>
          <span className="numerals font-bold">{kg(items.total_g)}</span>
        </p>
      </div>
      <p className="mt-1.5 text-[14.5px]">{items.estimated ? 'الوزن تقريبي من قاموس الوحدات. ' : ''}{items.status === 'confirmed' ? 'تم تأكيد القياس وحفظه.' : 'راجع الأصناف قبل التأكيد.'}</p>
    </>
  )
}

export function EventCard({ event }: { event: EventPayload }) {
  const nights = event.ends_on ? diffDays(event.starts_on, event.ends_on) : 0
  return (
    <>
      <div className="mt-0.5 flex items-center gap-3 rounded-lg border border-wa-ink/10 bg-wa-bar p-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-plum-soft text-plum">
          <CalendarIcon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold">{event.label}</p>
          <p className="numerals text-[13.5px]">{formatDayLong(event.starts_on)}</p>
          <p className="numerals mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-wa-meta">
            {event.guests !== null && <span>{event.guests} شخص</span>}
            {nights > 0 && <span>{countAr(nights, DAYS)}</span>}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[14.5px]">{event.status === 'confirmed' ? 'المناسبة مؤكدة ومحفوظة.' : 'مسودة مناسبة؛ لم تُحفظ بعد.'}</p>
    </>
  )
}

export function PlanCard({ plan, lead }: { plan: PlanPayload; lead?: string }) {
  return (
    <>
      {lead && <p className="mb-1.5 text-[14.5px]">{lead}</p>}
      <div className="overflow-hidden rounded-lg border border-wa-ink/10">
        <p className="bg-wa-bar px-3 py-2 text-[13px] font-bold">خطتكم في {countAr(plan.steps.length, STEPS)}</p>
        <ol>
          {plan.steps.map((s) => (
            <li key={s.id} className="flex gap-2.5 border-t border-wa-ink/10 px-3 py-2.5">
              <span
                className={cx(
                  'mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                  s.phase === 'before' && 'bg-plum-soft text-plum',
                  s.phase === 'during' && 'bg-saffron-soft text-ink',
                  s.phase === 'after' && 'bg-risk-low/70 text-ink',
                )}
              >
                {PHASE[s.phase]}
              </span>
              <p className="text-[14px] leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
        {plan.tools.map((t) => (
          <a
            key={t.tool}
            href={t.url}
            target={t.url === '#' ? undefined : '_blank'}
            rel="noopener noreferrer"
            // TODO: the Litadoom deep links arrive with the real engine; until then say so instead of jumping to the top.
            onClick={(e) => {
              if (t.url !== '#') return
              e.preventDefault()
              chat.toast('رابط أدوات لتدوم يُفعَّل مع ربط التطبيق، وهذا عرض توضيحي.')
            }}
            className="flex min-h-11 items-center justify-center gap-2 border-t border-wa-ink/10 bg-saffron px-3 py-2.5 text-[14px] font-bold text-ink transition hover:brightness-95 active:brightness-90"
          >
            {t.label}
            <ArrowIcon className="size-4" />
          </a>
        ))}
      </div>
    </>
  )
}

export function ResultCard({ result }: { result: ResultPayload }) {
  return (
    <div className="relative mt-0.5 overflow-hidden rounded-lg border border-saffron/40 bg-saffron-soft px-3 py-4 text-center">
      <span aria-hidden className="absolute -start-6 -top-6 size-20 rounded-full bg-saffron/15" />
      <span aria-hidden className="absolute -bottom-8 -end-5 size-24 rounded-full bg-plum/10" />
      <p className="relative text-[13px] font-medium text-plum">نتيجة قياس المناسبة</p>
      <p className="numerals relative mt-1 text-[2.6rem] font-bold leading-tight text-plum">{kg(result.actual_g)}</p>
      <p className="numerals relative mt-1.5 flex items-center justify-center gap-x-2 text-[13px] whitespace-nowrap">
        {result.change_pct === null || result.previous_g === null ? <span className="whitespace-normal">لا يوجد قياس سابق صالح للمقارنة.</span> : <>
          <span>القياس السابق {kg(result.previous_g)}</span>
          <span className="rounded-full bg-plum px-2.5 py-0.5 font-bold text-sand">
            {result.change_pct < 0 ? 'أقل' : result.change_pct > 0 ? 'أكثر' : 'دون تغيير'} <bdi dir="ltr">{formatNumber(Math.abs(result.change_pct), 1)}%</bdi>
          </span>
        </>}
      </p>
    </div>
  )
}

/** Link preview of the household's bulletin page: the seven days as dots, then where it goes. */
export function LinkCard({ link, lead }: { link: LinkPayload; lead?: string }) {
  const where = `${window.location.host}${link.url}`
  return (
    <>
      {lead && <p className="mb-1.5 text-[14.5px]">{lead}</p>}
      <a
        href={link.url}
        target={link.url === '/n/session' ? '_self' : '_blank'}
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-wa-ink/10 bg-wa-bar transition active:brightness-95"
      >
        <span className="flex items-center justify-center gap-3 bg-sand px-3 py-4" aria-hidden>
          {link.days.map((d) => (
            <RiskDot key={d.date} level={d.level} size={d.level === 'low' ? 'md' : 'lg'} pulse={false} />
          ))}
        </span>
        <span className="block px-3 py-2">
          <span className="block text-[14px] font-bold text-wa-ink">{link.title}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-wa-meta">{link.description}</span>
          <span dir="ltr" className="mt-1 block truncate text-start text-[11.5px] text-wa-meta/80">
            {where}
          </span>
        </span>
      </a>
    </>
  )
}
