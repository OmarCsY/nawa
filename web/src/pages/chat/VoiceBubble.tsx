import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import type { VoicePayload } from '../../lib/engineAdapter'
import { PauseIcon, PlayIcon } from './icons'
import { mmss } from './waFormat'

/** The user's own voice note: play button, waveform that fills as it plays, length. */
export function VoiceNote({ voice }: { voice: VoicePayload }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0–1

  useEffect(() => () => audio.current?.pause(), [])

  function toggle() {
    if (!voice.url) return
    if (!audio.current) {
      const el = new Audio(voice.url)
      el.ontimeupdate = () => setProgress(el.duration ? el.currentTime / el.duration : 0)
      el.onended = () => {
        setPlaying(false)
        setProgress(0)
      }
      el.onerror = () => setPlaying(false)
      audio.current = el
    }
    if (playing) {
      audio.current.pause()
      setPlaying(false)
    } else {
      audio.current.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    }
  }

  const lit = Math.round(progress * voice.waveform.length)

  return (
    <div className="flex items-center gap-2.5 py-1" dir="rtl">
      <button
        type="button"
        onClick={toggle}
        disabled={!voice.url}
        aria-label={playing ? 'إيقاف الصوتية' : 'تشغيل الصوتية'}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-wa-header text-white disabled:opacity-60"
      >
        {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-7 items-center gap-[2px]" aria-hidden>
          {voice.waveform.map((h, i) => (
            <span
              key={i}
              className={cx('w-[3px] shrink-0 rounded-full', i < lit ? 'bg-wa-header' : 'bg-wa-meta/45')}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          ))}
        </div>
        <p className="numerals mt-0.5 text-[11px] text-wa-meta">{mmss(voice.duration_s)}</p>
      </div>
    </div>
  )
}
