import type { SVGProps } from 'react'

/* Material-style glyphs, drawn on a 24px grid. Decorative: always aria-hidden. */
function Icon({ d, ...props }: SVGProps<SVGSVGElement> & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d={d} />
    </svg>
  )
}

type P = SVGProps<SVGSVGElement>

export const MicIcon = (p: P) => (
  <Icon d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" {...p} />
)
/** Points right; mirror it (`-scale-x-100`) in RTL. */
export const SendIcon = (p: P) => <Icon d="M2 21l21-9L2 3v7l15 2-15 2z" {...p} />
export const TrashIcon = (p: P) => (
  <Icon d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" {...p} />
)
export const PlayIcon = (p: P) => <Icon d="M8 5v14l11-7z" {...p} />
export const PauseIcon = (p: P) => <Icon d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" {...p} />
export const DotsIcon = (p: P) => (
  <Icon d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" {...p} />
)
export const PhoneIcon = (p: P) => (
  <Icon d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" {...p} />
)
/** Points right: "back" in a right-to-left layout. */
export const BackIcon = (p: P) => <Icon d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4z" {...p} />
export const CalendarIcon = (p: P) => (
  <Icon d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8v10H5V10h14z" {...p} />
)
export const ArrowIcon = (p: P) => <Icon d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" {...p} />

/** The business-account badge next to the bot's name. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="حساب موثّق" role="img">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M7 12.5l3.2 3.2L17 8.9" fill="none" stroke="var(--color-wa-header)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Message status: one grey tick sent, two blue ticks read (WhatsApp's own #53BDEB). */
export function Ticks({ read }: { read: boolean }) {
  const color = read ? 'var(--color-wa-tick)' : 'var(--color-wa-meta)'
  return (
    <svg viewBox="0 0 18 11" className="h-[11px] w-[16px] shrink-0" aria-label={read ? 'تمت القراءة' : 'تم الإرسال'} role="img">
      <g fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {read ? (
          <>
            <path d="M1.5 6l3 3L10 2.5" />
            <path d="M7 8.8l.5.4L13.5 2.5" />
          </>
        ) : (
          <path d="M3.5 6l3 3L12 2.5" />
        )}
      </g>
    </svg>
  )
}
