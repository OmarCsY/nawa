import { Link } from 'react-router-dom'
import { SHOWCASE_HOUSEHOLD_ID } from '../lib/demo'

/** The seven-day strip with one day gone missing: the page that wandered off. */
function MissingDay() {
  const dots = ['low', 'low', 'mid', null, 'high', 'low', 'low'] as const
  const fill = { low: 'var(--color-risk-low)', mid: 'var(--color-risk-mid)', high: 'var(--color-risk-high)' }
  return (
    <svg viewBox="0 0 336 84" className="mx-auto h-20 w-full max-w-xs" aria-hidden>
      <line x1="8" y1="58" x2="328" y2="58" stroke="var(--color-line)" strokeWidth="1.5" />
      <path d="M146 22c14-16 30-16 44 0" fill="none" stroke="var(--color-saffron)" strokeWidth="3" strokeLinecap="round" />
      {dots.map((d, i) => {
        const cx = 24 + i * 48
        return d ? (
          <circle key={i} cx={cx} cy="58" r="14" fill={fill[d]} stroke="var(--color-paper)" strokeWidth="4" />
        ) : (
          <circle key={i} cx={cx} cy="58" r="13" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeDasharray="4 4" />
        )
      })}
    </svg>
  )
}

const LINKS = [
  { to: '/dashboard', label: 'لوحة لتدوم' },
  { to: `/n/${SHOWCASE_HOUSEHOLD_ID}`, label: 'مثال نشرة أسرة' },
  { to: '/docs', label: 'بوابة ال API' },
]

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center rounded-card border border-line bg-paper px-6 py-12 text-center shadow-card sm:px-10 sm:py-16">
      <MissingDay />
      <p className="numerals mt-8 text-sm font-bold tracking-widest text-saffron">404</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">ما لقينا هالصفحة</h1>
      <p className="mt-3 max-w-sm text-base leading-relaxed text-muted">
        يمكن الرابط قديم أو فيه خطأ بسيط. الجو صافي والطريق لبيتك مفتوح، ارجعوا للمحادثة وجرّبوا نَوء.
      </p>

      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-plum px-6 text-sm font-medium text-sand transition-colors hover:bg-plum/90"
      >
        ارجع للمحادثة
      </Link>

      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-plum underline decoration-saffron decoration-2 underline-offset-4">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
