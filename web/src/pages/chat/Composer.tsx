import { useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { cx } from '../../lib/cx'
import { env } from '../../lib/env'
import { chat } from './chatStore'
import { MicIcon, SendIcon, TrashIcon } from './icons'
import { useRecorder, type RecorderProblem } from './useRecorder'
import { mmss } from './waFormat'

const SUGGESTIONS = ['رمينا نص قدر رز وربطة خبز', 'الخميس عندنا عزيمة 14 نفر', 'نشرة']

/** Released this far from the mic (px) means "slid away to cancel". */
const CANCEL_DISTANCE = 110

const PROBLEMS: Record<RecorderProblem, string> = {
  denied: 'المايك مقفول على المتصفح. فعّلوا الإذن من إعدادات الموقع، أو اكتبوا رسالتكم.',
  missing: 'ما لقينا مايك على الجهاز. اكتبوا رسالتكم وأنا بخدمتكم.',
  unsupported: 'المتصفح هذا ما يدعم التسجيل الصوتي. اكتبوا رسالتكم وأنا بخدمتكم.',
  short: 'الصوتية قصيرة مرة. اضغطوا على المايك وكمّلوا كلامكم أكثر.',
  large: 'الملف أكبر من الحد المسموح: 10 ميجابايت.',
}

/** A silent stand-in for a voice note, for demo browsers with no microphone (mock engine only). */
const demoVoice = () => chat.sendVoice(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }), 6)

function onProblem(problem: RecorderProblem) {
  const fallback = env.useMock && problem !== 'short'
  chat.toast(PROBLEMS[problem], fallback ? { label: 'جرّب صوتية تجريبية', run: demoVoice } : undefined)
}

function RecordingBar({ seconds, holding, onCancel }: { seconds: number; holding: boolean; onCancel: () => void }) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-wa-in px-3 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
      <button
        type="button"
        onClick={onCancel}
        aria-label="إلغاء التسجيل"
        className="grid size-8 shrink-0 place-items-center rounded-full text-wa-meta active:bg-wa-bar"
      >
        <TrashIcon className="size-5" />
      </button>
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-risk-high motion-safe:animate-rec" />
      <span className="numerals w-10 shrink-0 text-[15px] text-wa-ink" role="timer">
        {mmss(seconds)}
      </span>
      <span aria-hidden className="flex h-5 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="h-full w-[3px] shrink-0 origin-center rounded-full bg-wa-meta/50 motion-safe:animate-bar"
            style={{ animationDelay: `${(i * 97) % 900}ms` }}
          />
        ))}
      </span>
      <span className="hidden shrink-0 text-[12px] text-wa-meta min-[400px]:block">
        {holding ? 'اتركوا للإرسال' : 'سجّلوا ثم أرسلوا'}
      </span>
    </div>
  )
}

export function Composer({ busy }: { busy: boolean }) {
  const [text, setText] = useState('')
  const lastMicRelease = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const rec = useRecorder({ onDone: chat.sendVoice, onProblem })
  const recording = rec.phase !== 'idle'
  const hasText = text.trim().length > 0

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!hasText || busy) return
    chat.say(text)
    setText('')
    input.current?.focus()
  }

  // Mic: pointer events drive hold-to-talk; the click that follows a mic press must not also "send".
  const micDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    void rec.start(true)
  }
  const micUp = (e: PointerEvent<HTMLButtonElement>) => {
    lastMicRelease.current = Date.now()
    const r = e.currentTarget.getBoundingClientRect()
    const far = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > CANCEL_DISTANCE
    rec.release(far)
  }

  const showMic = !hasText && rec.phase !== 'preview' && !(rec.phase === 'recording' && !rec.holding)

  return (
    <div className="shrink-0 bg-wa-bg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {!recording && (
        <ul
          aria-label="رسائل جاهزة"
          className="flex gap-2 overflow-x-auto px-3 pb-2 pt-1 [scrollbar-width:none]"
        >
          {SUGGESTIONS.map((s) => (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => chat.say(s)}
                disabled={busy}
                className="rounded-full border border-wa-ink/10 bg-wa-in px-3.5 py-1.5 text-[13px] text-wa-header shadow-[0_1px_0.5px_rgb(11_20_26/0.1)] transition active:bg-wa-bar disabled:opacity-60"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 px-2">
        {rec.preview ? <div className="min-w-0 flex-1 rounded-xl bg-wa-in p-2"><p className="text-xs">راجع التسجيل قبل الإرسال</p><audio controls src={rec.preview.url} className="h-9 w-full" /><button type="button" onClick={rec.cancel} className="text-xs">إلغاء التسجيل</button></div> : recording ? (
          <RecordingBar seconds={rec.seconds} holding={rec.holding} onCancel={rec.cancel} />
        ) : (
          <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-wa-in px-4 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
            <input
              ref={input}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              dir="auto"
              enterKeyHint="send"
              autoComplete="off"
              aria-label="اكتب رسالة"
              placeholder="اكتب رسالة"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-wa-ink outline-none placeholder:text-wa-meta"
            />
          </div>
        )}

        {showMic ? (
          <button
            type="button"
            onPointerDown={micDown}
            onPointerUp={micUp}
            onPointerCancel={() => rec.release(false)}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              // keyboard / assistive tech: a plain click starts a tap-mode recording
              if (Date.now() - lastMicRelease.current > 500 && !recording) void rec.start(false)
            }}
            aria-label="سجّل صوتية"
            disabled={busy}
            className={cx(
              'grid size-11 shrink-0 touch-none select-none place-items-center rounded-full bg-wa-accent text-white shadow-[0_1px_1px_rgb(11_20_26/0.2)] transition-transform',
              rec.holding && 'scale-125',
            )}
          >
            <MicIcon className="size-6" />
          </button>
        ) : (
          <button
            type={recording ? 'button' : 'submit'}
            onClick={() => {
              // the tail end of the press that switched the mic into "send" must not fire it
              if (recording && Date.now() - lastMicRelease.current > 500) rec.send()
            }}
            aria-label="إرسال"
            disabled={busy}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-wa-accent text-white shadow-[0_1px_1px_rgb(11_20_26/0.2)]"
          >
            <SendIcon className="size-5 -scale-x-100" />
          </button>
        )}
      </form>
      {!recording && <label className="mx-4 mt-1 block w-fit cursor-pointer text-[11px] text-wa-meta">أو ارفع ملفًا صوتيًا · حتى 90 ثانية و10 ميجابايت<input className="sr-only" type="file" accept="audio/*,.mp4,.m4a,.ogg,.webm" aria-label="رفع ملف صوتي" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) chat.sendVoice(f, 0); e.target.value = '' }} /></label>}
    </div>
  )
}
