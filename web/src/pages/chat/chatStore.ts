import { useSyncExternalStore } from 'react'
import {
  advanceDays,
  advanceToAfterEvent,
  currentDay,
  NoticeError,
  resetEngine,
  sendText,
  sendVoice,
  userText,
  userVoice,
  welcomeMessages,
  type BotMessage,
  type EngineTurn,
  type QuickButton,
} from '../../lib/engineAdapter'
import { formatDayLong } from '../../lib/format'

/**
 * The conversation lives here, outside React, so it survives leaving the page and coming back
 * (the mock engine keeps its own state too; the two must not drift apart).
 */

export interface ChatMessage extends BotMessage {
  /** Only for the user's own messages: one grey tick, two blue ticks once the bot has read it, or a failed send. */
  status?: 'sent' | 'read' | 'failed'
}

/** The last exchange with the engine: what the "behind the scenes" panel replays. */
export interface Turn {
  key: number
  trigger: 'voice' | 'text' | 'button' | 'time'
  /** What the user said (text or button label); empty for voice notes and time jumps. */
  said: string
  replies: BotMessage[]
  triggered: string[]
}

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

interface ChatState {
  messages: ChatMessage[]
  typing: boolean
  today: string
  turn: Turn | null
  toast: Toast | null
}

const initial = (): ChatState => ({ messages: welcomeMessages(), typing: false, today: currentDay(), turn: null, toast: null })

let state = initial()
let epoch = 0 // bumped on reset so answers to the old conversation are dropped
let turnKey = 0
let toastKey = 0
let queue: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()
const recordings = new Map<string, Blob>() // for retrying a failed voice note

function set(patch: Partial<ChatState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const patchMessage = (id: string, patch: Partial<ChatMessage>) =>
  set({ messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })

function toast(text: string, action?: Toast['action']) {
  set({ toast: { id: (toastKey += 1), text, action } })
}

/** Run one engine exchange: typing → answer → the bot's messages, one at a time like a person typing. */
async function exchange(
  request: () => Promise<EngineTurn>,
  meta: { trigger: Turn['trigger']; said: string; userMessageId?: string },
) {
  const mine = epoch
  set({ typing: true })
  try {
    const turn = await request()
    if (mine !== epoch) return
    if (meta.userMessageId) patchMessage(meta.userMessageId, { status: 'read' })
    set({
      today: turn.today,
      turn: { key: (turnKey += 1), trigger: meta.trigger, said: meta.said, replies: turn.replies, triggered: turn.triggered },
    })

    if (turn.replies.length === 0) {
      set({ typing: false })
      if (meta.trigger === 'time') toast(`تقدّم الوقت إلى ${formatDayLong(turn.today)}. ما وصلتكم رسالة جديدة.`)
      return
    }
    for (const [i, reply] of turn.replies.entries()) {
      const more = i < turn.replies.length - 1
      set({ messages: [...state.messages, reply], typing: more })
      if (more) await delay(750)
      if (mine !== epoch) return
    }
  } catch (error) {
    if (mine !== epoch) return
    set({ typing: false })
    if (error instanceof NoticeError) return toast(error.message)
    if (meta.userMessageId) patchMessage(meta.userMessageId, { status: 'failed' })
    toast(error instanceof Error ? error.message : 'تعذّر الوصول للمحرك. جرّب مرة ثانية.')
  }
}

const enqueue = (job: () => Promise<void>) => {
  queue = queue.then(job, job)
}

function deliver(message: ChatMessage, trigger: Turn['trigger'], said: string, request: () => Promise<EngineTurn>) {
  enqueue(() => exchange(request, { trigger, said, userMessageId: message.id }))
}

export const chat = {
  say(text: string) {
    const clean = text.trim()
    if (!clean) return
    const message: ChatMessage = { ...userText(clean), status: 'sent' }
    set({ messages: [...state.messages, message] })
    deliver(message, 'text', clean, () => sendText(clean))
  },

  press(button: QuickButton) {
    const message: ChatMessage = { ...userText(button.label), status: 'sent' }
    set({ messages: [...state.messages, message] })
    deliver(message, 'button', button.label, () => sendText(button.label, button.id))
  },

  sendVoice(audio: Blob, durationSeconds: number) {
    const message: ChatMessage = { ...userVoice(audio, durationSeconds), status: 'sent' }
    recordings.set(message.id, audio)
    set({ messages: [...state.messages, message] })
    deliver(message, 'voice', '', () => sendVoice(audio))
  },

  retry(id: string) {
    const message = state.messages.find((m) => m.id === id)
    if (!message || message.status !== 'failed') return
    patchMessage(id, { status: 'sent' })
    const audio = recordings.get(id)
    if (message.kind === 'voice' && audio) deliver(message, 'voice', '', () => sendVoice(audio))
    else if (message.text) deliver(message, 'text', message.text, () => sendText(message.text ?? ''))
  },

  advance(days: number) {
    enqueue(() => exchange(() => advanceDays(days), { trigger: 'time', said: '' }))
  },

  afterEvent() {
    enqueue(() => exchange(advanceToAfterEvent, { trigger: 'time', said: '' }))
  },

  reset() {
    epoch += 1
    for (const m of state.messages) if (m.voice?.url) URL.revokeObjectURL(m.voice.url)
    recordings.clear()
    queue = Promise.resolve()
    resetEngine()
    state = initial()
    set({})
  },

  toast,
  dismissToast(id: number) {
    if (state.toast?.id === id) set({ toast: null })
  },
}

export const useChat = () => useSyncExternalStore(subscribe, () => state)
