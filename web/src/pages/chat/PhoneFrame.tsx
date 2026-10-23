import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NAV } from '../../lib/nav'
import { BackIcon, DotsIcon, PhoneIcon, VerifiedBadge } from './icons'

/** Full-screen on a phone; on desktop it becomes a phone on the table (warm ink bezel, no cold greys). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'flex min-h-0 flex-1 flex-col overflow-hidden bg-wa-bg ' +
        'md:h-[clamp(34rem,calc(100dvh-17rem),50rem)] md:flex-none md:rounded-[2.75rem] md:border-[10px] md:border-ink ' +
        'md:shadow-[0_30px_60px_-24px_rgb(94_39_80/0.45),0_0_0_1px_rgb(35_26_20/0.4)]'
      }
    >
      {/* fake status bar, desktop only: a real phone already has its own */}
      <div className="relative hidden h-7 shrink-0 items-center justify-between bg-wa-header px-6 text-[11px] text-white md:flex" aria-hidden>
        <span className="numerals">9:41</span>
        <span className="absolute inset-x-0 top-1 mx-auto h-4 w-20 rounded-full bg-ink" />
        <span className="flex items-center gap-1">
          <span className="h-2 w-3.5 rounded-[2px] border border-white/80" />
        </span>
      </div>
      {children}
    </div>
  )
}

export function ChatHeader({ typing }: { typing: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-wa-header px-2 text-white">
      <span aria-hidden className="grid size-8 place-items-center">
        <BackIcon className="size-6" />
      </span>
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-xl font-bold leading-none text-plum"
      >
        ن
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="flex items-center gap-1.5 text-[17px] font-medium">
          نَوء
          <VerifiedBadge className="size-4 shrink-0 text-white" />
        </h1>
        <p className="truncate text-[12.5px] text-white/80" aria-live="polite">
          {typing ? 'يكتب…' : 'نشرة لتدوم لبيتك'}
        </p>
      </div>
      <span aria-hidden className="flex items-center gap-1 text-white">
        <PhoneIcon className="size-5" />
        <DotsIcon className="size-6 md:block max-md:hidden" />
      </span>
      <PhoneMenu />
    </header>
  )
}

/** Phones only: the chat has no site header, so the header's ⋮ opens the way to the other pages. */
function PhoneMenu() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="القائمة"
        className="grid size-10 place-items-center rounded-full text-white active:bg-white/15"
      >
        <DotsIcon className="size-6" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="إغلاق القائمة" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />
          <ul className="absolute left-0 top-11 z-40 w-48 rounded-lg bg-wa-in py-1 text-wa-ink shadow-[0_8px_24px_-6px_rgb(35_26_20/0.45)] motion-safe:animate-pop">
            {NAV.filter((n) => n.to !== '/').map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="block px-4 py-3 text-[15px] active:bg-wa-bar">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
