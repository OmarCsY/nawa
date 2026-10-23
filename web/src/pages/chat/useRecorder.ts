import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderProblem = 'denied' | 'missing' | 'unsupported' | 'short' | 'large'

interface Options {
  onDone: (audio: Blob, seconds: number) => void
  onProblem: (problem: RecorderProblem) => void
}

export const MAX_SECONDS = 90
const MIN_SECONDS = 1
/** Past this, a press is a "hold to talk, release to send"; shorter is a tap that keeps recording. */
const HOLD_MS = 600

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMime(): string | undefined {
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
}

/**
 * Voice notes with MediaRecorder, WhatsApp style:
 *  - press and hold the mic, release to send (release far from the button to cancel);
 *  - or tap once to start, then send or cancel from the bar.
 * The permission prompt can outlast a tap, so "was the finger still down?" is decided when recording actually starts.
 */
export function useRecorder({ onDone, onProblem }: Options) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'preview'>('idle')
  const [preview, setPreview] = useState<{ audio: Blob; url: string; seconds: number } | null>(null)
  const previewRef = useRef<typeof preview>(null)
  const [seconds, setSeconds] = useState(0)
  const [holding, setHolding] = useState(false)

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const startedAt = useRef(0)
  const pressed = useRef(false)
  const holdMode = useRef(false)
  const aborted = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const callbacks = useRef({ onDone, onProblem })
  callbacks.current = { onDone, onProblem }

  const cleanup = useCallback(() => {
    window.clearInterval(timer.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    recorder.current = null
    holdMode.current = false
    setHolding(false)
    setSeconds(0)
    setPhase('idle')
  }, [])

  const finish = useCallback(
    (send: boolean) => {
      const rec = recorder.current
      if (!rec || rec.state === 'inactive') return cleanup()
      const elapsed = (Date.now() - startedAt.current) / 1000
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
      rec.onstop = () => {
        const audio = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        if (!send) return
        if (elapsed < MIN_SECONDS || audio.size === 0) callbacks.current.onProblem('short')
        else if (audio.size > 10 * 1024 * 1024) callbacks.current.onProblem('large')
        else { const item = { audio, url: URL.createObjectURL(audio), seconds: elapsed }; previewRef.current = item; setPreview(item); setPhase('preview') }
      }
      // chunks recorded so far are flushed by stop(); detach the stream right away so the mic light goes off
      rec.stop()
      cleanup()
    },
    [cleanup],
  )

  /** Called on pointer-down (`isPressed` true) or on a plain click (false). */
  const start = useCallback(
    async (isPressed: boolean) => {
      if (phaseRef.current !== 'idle') return
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        return callbacks.current.onProblem('unsupported')
      }
      pressed.current = isPressed
      aborted.current = false
      setPhase('starting')

      let media: MediaStream
      try {
        media = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (error) {
        setPhase('idle')
        const name = error instanceof DOMException ? error.name : ''
        return callbacks.current.onProblem(
          name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'missing'
            : name === 'NotAllowedError' || name === 'SecurityError'
              ? 'denied'
              : 'unsupported',
        )
      }
      if (aborted.current) return media.getTracks().forEach((t) => t.stop())

      try {
        const mime = pickMime()
        const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)
        recorder.current = rec
        stream.current = media
        rec.start()
      } catch {
        media.getTracks().forEach((t) => t.stop())
        setPhase('idle')
        return callbacks.current.onProblem('unsupported')
      }

      startedAt.current = Date.now()
      holdMode.current = pressed.current
      setHolding(pressed.current)
      setSeconds(0)
      setPhase('recording')
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt.current) / 1000)
        setSeconds(s)
        if (s >= MAX_SECONDS) finish(true)
      }, 250)
    },
    [finish],
  )

  /** Pointer released. `cancel` when it was let go far from the button. */
  const release = useCallback(
    (cancel: boolean) => {
      pressed.current = false
      if (phaseRef.current !== 'recording' || !holdMode.current) return
      holdMode.current = false
      setHolding(false)
      if (cancel) return finish(false)
      if (Date.now() - startedAt.current >= HOLD_MS) finish(true)
      // a short tap: keep recording, the bar has send / cancel
    },
    [finish],
  )

  const cancel = useCallback(() => {
    aborted.current = true
    if (previewRef.current) { URL.revokeObjectURL(previewRef.current.url); previewRef.current = null; setPreview(null) }
    if (phaseRef.current === 'recording') finish(false)
    else cleanup()
  }, [cleanup, finish])

  const send = useCallback(() => {
    if (previewRef.current) { const item = previewRef.current; callbacks.current.onDone(item.audio, item.seconds); URL.revokeObjectURL(item.url); previewRef.current = null; setPreview(null); cleanup() }
    else finish(true)
  }, [finish, cleanup])

  useEffect(
    () => () => {
      aborted.current = true
      window.clearInterval(timer.current)
      stream.current?.getTracks().forEach((t) => t.stop())
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url)
    },
    [],
  )

  return { phase, seconds, holding, start, release, cancel, send, preview }
}
