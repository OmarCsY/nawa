import { Button } from '../../components'
import { formatDayLong } from '../../lib/format'
import { chat } from './chatStore'
import { CalendarIcon } from './icons'

/** Above the phone, in Nawa's colors on purpose: these are the presenter's controls, not part of WhatsApp. */
export function DemoControls({ today, busy }: { today: string; busy: boolean }) {
  return (
    <div className="shrink-0 border-b border-line bg-sand px-3 py-2.5 md:mb-4 md:rounded-2xl md:border md:bg-paper md:shadow-card">
      <p className="numerals flex items-center justify-center gap-2 text-xs text-muted">
        <CalendarIcon className="size-4 text-saffron" />
        اليوم في العرض: <span className="font-bold text-ink">{formatDayLong(today)}</span>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Button size="sm" className="px-2" disabled={busy} onClick={() => chat.advance(2)}>
          قدّم يومين
        </Button>
        <Button size="sm" variant="secondary" className="px-2" disabled={busy} onClick={chat.afterEvent}>
          قدّم أسبوعًا
        </Button>
        <Button size="sm" variant="ghost" className="px-2" disabled={busy} onClick={chat.reset}>
          ابدأ من جديد
        </Button>
      </div>
    </div>
  )
}
