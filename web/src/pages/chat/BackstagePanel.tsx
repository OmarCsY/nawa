import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card } from '../../components'
import { cx } from '../../lib/cx'
import { DEMO_HOUSEHOLD_ID } from '../../lib/demo'
import { token } from '../../lib/theme'
import type { Turn } from './chatStore'
import { buildPipeline } from './pipeline'

const STEP_MS = 700

/** Lights the steps up one after another each time a new exchange arrives. Returns how many are done. */
function usePlayback(key: number | undefined, count: number) {
  const [done, setDone] = useState(count)
  useEffect(() => {
    if (key === undefined) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(count)
      return
    }
    let n = 0
    setDone(0)
    const id = window.setInterval(() => {
      n += 1
      setDone(n)
      if (n >= count) window.clearInterval(id)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [key, count])
  return done
}

const NUMBERS = ['١', '٢', '٣', '٤', '٥']

/** Percentages stay "62%" inside Arabic text instead of flipping to "%62". */
function Detail({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+(?:\.\d+)?%)/).map((part, i) => (i % 2 ? <bdi key={i} dir="ltr">{part}</bdi> : part))}
    </>
  )
}

function Pipeline({ turn, waiting }: { turn: Turn | null; waiting: boolean }) {
  const steps = useMemo(() => (turn ? buildPipeline(turn) : []), [turn])
  const done = usePlayback(turn?.key, steps.length || 5)

  const titles = ['تحويل الصوت لنص', 'استخراج الأصناف والكميات والأسباب', 'تحديث توقع الأسبوع', 'اختيار الخطة من مكتبة لتدوم', 'الحفظ في قاعدة البيانات']
  const shown = turn ? steps : titles.map((title) => ({ title, detail: '', applies: false }))

  return (
    <ol className="relative space-y-1">
      {shown.map((step, i) => {
        const lit = Boolean(turn) && !waiting && i < done
        const running = Boolean(turn) && !waiting && i === done
        const waitingFirst = waiting && i === 0
        return (
          <li key={step.title + i} className="relative flex gap-3.5 pb-3 last:pb-0">
            {i < shown.length - 1 && (
              <span
                aria-hidden
                className={cx('absolute start-[0.95rem] top-9 h-[calc(100%-1.75rem)] w-px', lit ? 'bg-plum/40' : 'bg-line')}
              />
            )}
            <span
              aria-hidden
              className={cx(
                'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition-colors duration-500',
                lit && step.applies && 'border-plum bg-plum text-sand',
                lit && !step.applies && 'border-line bg-sand text-muted',
                (running || waitingFirst) && 'border-saffron bg-saffron-soft text-ink motion-safe:animate-glow',
                !lit && !running && !waitingFirst && 'border-line bg-paper text-muted',
              )}
            >
              {NUMBERS[i]}
            </span>
            <div className={cx('min-w-0 flex-1 pt-1 transition-opacity duration-500', !lit && !running && 'opacity-50')}>
              <p className={cx('text-sm font-bold', lit && !step.applies ? 'text-muted' : 'text-ink')}>{step.title}</p>
              {lit && step.detail && (
                <p
                  className={cx(
                    'numerals mt-0.5 text-[13px] leading-relaxed motion-safe:animate-rise',
                    step.applies ? 'text-plum' : 'text-muted',
                  )}
                >
                  <Detail text={step.detail} />
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Desktop only: how the engine handled the last message, and how to open the demo on a phone. */
export function BackstagePanel({ turn, typing, className }: { turn: Turn | null; typing: boolean; className?: string }) {
  const status = typing
    ? 'المحرك يعالج الرسالة…'
    : !turn
      ? 'أرسلوا أي رسالة وشوفوا وش يصير داخل المحرك'
      : turn.trigger === 'voice'
        ? 'آخر رسالة: صوتية'
        : turn.trigger === 'time'
          ? `آخر حدث: تقديم الوقت${turn.triggered.length ? ` · شغّل ${turn.triggered.join('، ')}` : ''}`
          : `آخر رسالة: «${turn.said}»`

  return (
    <aside className={cx('space-y-6', className)} aria-label="وراء الكواليس">
      <Card eyebrow="وراء الكواليس" title="وش يصير لآخر رسالة داخل المحرك؟">
        <p className="mb-5 flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={cx('size-2 shrink-0 rounded-full', typing ? 'bg-saffron motion-safe:animate-glow' : 'bg-plum')} />
          <span className="numerals min-w-0 truncate">{status}</span>
        </p>
        <Pipeline turn={turn} waiting={typing} />
      </Card>

      <Card tone="plum">
        <div className="flex items-center gap-5">
          <div className="shrink-0 rounded-2xl bg-paper p-2.5">
            <QRCodeSVG
              value={window.location.href}
              size={104}
              level="M"
              fgColor={token('plum')}
              bgColor={token('paper')}
              title="رمز QR لفتح نَوء من الجوال"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">جرّبوه من جوالكم</h2>
            <p className="mt-1 text-sm leading-relaxed text-sand/80">امسحوا الرمز وكلّموا نَوء كأنه واتساب، بنفس المحرك.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-medium">
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full bg-sand px-4 text-plum transition-colors hover:bg-paper"
          >
            لوحة لتدوم
          </a>
          <a
            href={`/n/${DEMO_HOUSEHOLD_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-sand/40 px-4 text-sand transition-colors hover:bg-sand/10"
          >
            نشرة بيتكم
          </a>
        </div>
      </Card>
    </aside>
  )
}
