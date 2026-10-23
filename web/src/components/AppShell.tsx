import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router-dom'
import { cx } from '../lib/cx'
import { formatDayLong, formatHijri, toIsoDate } from '../lib/format'
import { isActive, NAV } from '../lib/nav'
import { usePageMeta, type PageMeta } from '../lib/pageMeta'
import { LoadingSkeleton } from './LoadingSkeleton'
import { Wordmark } from './Wordmark'

function NavItem({ to, label, end, active }: { to: string; label: string; end: boolean; active: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200',
        'after:absolute after:inset-x-3 after:-bottom-4 after:h-0.5 after:rounded-full after:transition-colors',
        active ? 'text-plum after:bg-saffron' : 'text-muted after:bg-transparent hover:bg-plum-soft hover:text-ink',
      )}
    >
      {label}
    </NavLink>
  )
}

/** Phones: a button that opens a full-width sheet of big, thumb-sized links. */
function MobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  // navigating anywhere closes it
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
        className="grid size-11 place-items-center rounded-full text-plum transition-colors hover:bg-plum-soft"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <>
          {/* tapping the page behind the sheet closes it */}
          <button
            type="button"
            aria-label="إغلاق القائمة"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-20 cursor-default bg-ink/25 motion-safe:animate-rise"
          />
          <nav
            id="mobile-nav"
            aria-label="التنقل الرئيسي"
            className="absolute inset-x-0 top-full z-30 border-b border-line bg-paper px-3 pb-3 pt-2 shadow-[0_24px_40px_-24px_rgb(35_26_20/0.45)] motion-safe:animate-rise"
          >
            <ul>
              {NAV.map((item) => {
                const active = isActive(item, pathname)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      aria-current={active ? 'page' : undefined}
                      className={cx(
                        'flex min-h-12 items-center justify-between rounded-2xl px-4 text-base transition-colors',
                        active ? 'bg-plum-soft font-bold text-plum' : 'text-ink hover:bg-sand',
                      )}
                    >
                      {item.label}
                      {active && <span aria-hidden className="size-2 rounded-full bg-saffron" />}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const today = toIsoDate(new Date())
  const meta = useMatches()
    .map((m) => m.handle as PageMeta | undefined)
    .reverse()
    .find((h) => h?.title)
  usePageMeta(meta)

  /* the chat is a full-screen app on phones (no site chrome) and a demo stage elsewhere (no real-date masthead) */
  const isChat = pathname === '/'

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-plum focus:px-4 focus:py-2 focus:text-sand"
      >
        تخطَّ إلى المحتوى
      </a>

      <header className={cx('sticky top-0 z-30 border-b border-line bg-sand/90 backdrop-blur-md', isChat && 'max-md:hidden')}>
        <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-x-6 px-4 sm:px-6">
          <Link to="/" className="flex h-16 items-center gap-4" aria-label="نَوء: الصفحة الرئيسية">
            <Wordmark compact />
            <span className="hidden border-s border-line ps-4 text-xs leading-snug text-muted lg:block">
              نشرة مواسم الهدر
              <br />
              مع لتدوم
            </span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="ms-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} end={item.end} active={isActive(item, pathname)} />
            ))}
          </nav>

          <div className="ms-auto md:hidden">
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </header>

      {/* masthead: the bulletin's date line */}
      <div className={cx('border-b border-line/70', isChat && 'hidden')}>
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6">
          <p className="numerals text-xs text-muted">
            <span className="text-ink">{formatDayLong(today)}</span>
            <span aria-hidden className="mx-2 text-line">|</span>
            {formatHijri(today)}
          </p>
        </div>
      </div>

      <main
        id="main"
        className={cx(
          'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12',
          isChat && 'max-md:max-w-none max-md:p-0 md:py-6',
        )}
      >
        <Suspense fallback={<LoadingSkeleton variant="card" />}>
          <div key={pathname} className="motion-safe:animate-rise">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className={cx('border-t border-line', isChat && 'max-md:hidden')}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6">
          <p>نَوء · محرك توقيت ذكي يشغّل أدوات لتدوم</p>
          <p>فريق إنجاز · هاكاثون الفقد والهدر الغذائي 2026</p>
        </div>
      </footer>
    </div>
  )
}
