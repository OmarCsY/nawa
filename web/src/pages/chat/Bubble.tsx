import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import type { ChatMessage } from './chatStore'
import { Ticks } from './icons'
import { clock } from './waFormat'

interface BubbleProps {
  mine: boolean
  /** First bubble of a run from the same sender: gets the speech-bubble tail. */
  tail: boolean
  at: string
  status?: ChatMessage['status']
  /** Cards and voice notes need a fixed, roomier width. */
  wide?: boolean
  onRetry?: () => void
  children: ReactNode
}

/*
 * Own messages sit at the inline-end (the left edge in this RTL layout), the bot's at the inline-start,
 * mirroring WhatsApp's Arabic UI. The tail is drawn with physical sides on purpose: it points at the screen edge.
 */
function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      viewBox="0 0 8 11"
      aria-hidden
      className={cx('absolute top-0 h-[11px] w-2', mine ? '-left-[7px] fill-wa-out' : '-right-[7px] fill-wa-in')}
    >
      <path d={mine ? 'M8 0H0l8 11z' : 'M0 0h8L0 11z'} />
    </svg>
  )
}

export function Bubble({ mine, tail, at, status, wide, onRetry, children }: BubbleProps) {
  const failed = status === 'failed'
  return (
    <div className={cx('flex motion-safe:animate-pop', mine ? 'justify-end' : 'justify-start', tail ? 'mt-2' : 'mt-0.5')}>
      <div
        className={cx(
          'relative min-w-14 rounded-lg px-2.5 pb-1 pt-1.5 text-wa-ink shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]',
          mine ? 'bg-wa-out' : 'bg-wa-in',
          tail && (mine ? 'rounded-tl-none' : 'rounded-tr-none'),
          wide ? 'w-[min(88%,19.5rem)]' : 'max-w-[85%]',
        )}
      >
        {tail && <Tail mine={mine} />}
        {children}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] leading-none text-wa-meta">
          <span className="numerals">{clock(at)}</span>
          {mine &&
            (failed ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-risk-high px-1.5 py-0.5 text-[10px] font-bold text-paper"
              >
                لم تُرسل، أعد المحاولة
              </button>
            ) : (
              <Ticks read={status === 'read'} />
            ))}
        </div>
      </div>
    </div>
  )
}

/** Three dots while the bot is "typing". */
export function TypingBubble() {
  return (
    <div className="mt-2 flex justify-start motion-safe:animate-pop" role="status" aria-label="نَوء يكتب">
      <div className="relative flex h-9 items-center gap-1 rounded-lg rounded-tr-none bg-wa-in px-3.5 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        <Tail mine={false} />
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-wa-meta motion-safe:animate-dot"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Quick-reply buttons under a bot message; greyed once the person has answered. */
export function QuickReplies({
  buttons,
  disabled,
  onPress,
}: {
  buttons: Array<{ id: string; label: string }>
  disabled: boolean
  onPress: (button: { id: string; label: string }) => void
}) {
  return (
    <div className="mt-1 flex w-[min(88%,19.5rem)] flex-wrap gap-1">
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          disabled={disabled}
          onClick={() => onPress(b)}
          className="min-h-10 min-w-0 flex-1 basis-[30%] rounded-lg bg-wa-in px-2 py-2 text-center text-[14px] font-medium text-wa-header shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] transition active:bg-wa-bar disabled:text-wa-meta disabled:opacity-60"
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
