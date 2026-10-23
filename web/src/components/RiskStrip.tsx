import { dayOfMonth, formatDayLong, formatNumber, RISK_LABEL, weekdayShort } from '../lib/format'
import { cx } from '../lib/cx'
import type { RiskLevel } from '../lib/types'
import { RiskDot, RiskLegend } from './RiskDot'

export interface StripDay {
  date: string // YYYY-MM-DD
  level: RiskLevel
  expected_kg?: number
}

interface RiskStripProps {
  days: StripDay[] // 7 days, earliest first (renders right-to-left)
  today?: string
  selected?: string
  onSelect?: (date: string) => void
  showLegend?: boolean
  className?: string
}

/** The Nawa signature: seven days as a weather-bulletin row of risk dots (§15.1). */
export function RiskStrip({ days, today, selected, onSelect, showLegend = false, className }: RiskStripProps) {
  const interactive = Boolean(onSelect)

  return (
    <div className={className}>
      <ol className="grid grid-cols-7" aria-label="مستوى الخطر لأيام الأسبوع">
        {days.map((day) => {
          const isToday = day.date === today
          const isSelected = day.date === selected
          const label = `${formatDayLong(day.date)}: خطر ${RISK_LABEL[day.level]}`

          const body = (
            <>
              <span className={cx('text-xs', isToday ? 'font-bold text-plum' : 'text-muted')}>
                {isToday ? 'اليوم' : weekdayShort(day.date)}
              </span>
              <span className="numerals text-lg font-medium leading-none text-ink sm:text-xl">{dayOfMonth(day.date)}</span>
              {/* the "horizon" the dots sit on; cells touch, so the segments read as one line */}
              <span className="relative mt-2 flex w-full justify-center">
                <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
                <span className="relative grid size-8 place-items-center rounded-full bg-paper">
                  <RiskDot level={day.level} size={day.level === 'low' ? 'md' : 'lg'} />
                </span>
              </span>
              {day.expected_kg !== undefined && (
                <span className="numerals mt-1 text-[11px] text-muted">{formatNumber(day.expected_kg)} كجم</span>
              )}
            </>
          )

          const cell = cx(
            'flex w-full flex-col items-center gap-1.5 rounded-2xl py-3 transition-colors duration-500',
            day.level === 'high' && 'bg-risk-high-soft',
            isSelected && 'outline-2 outline-plum',
            interactive && 'cursor-pointer hover:bg-plum-soft',
          )

          return (
            <li key={day.date} className="min-w-0">
              {interactive ? (
                <button
                  type="button"
                  className={cell}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => onSelect?.(day.date)}
                >
                  {body}
                </button>
              ) : (
                <div className={cell} title={label}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {showLegend && <RiskLegend className="mt-4 justify-center" />}
    </div>
  )
}
