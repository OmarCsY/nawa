import { useSyncExternalStore } from 'react'
import { currentDay, NoticeError, prepareAdvance, prepareText, prepareVoice, resetEngine, userText, userVoice, welcomeMessages, type BotMessage, type EngineTurn, type QuickButton } from '../../lib/engineAdapter'
import { EngineError } from '../../lib/engine'
import { getSessionState } from '../../lib/engineSession'

export interface ChatMessage extends BotMessage { status?: 'sent' | 'read' | 'failed' }
export interface Turn { key: number; trigger: 'voice' | 'text' | 'button' | 'time'; said: string; replies: BotMessage[]; triggered: string[] }
export interface Toast { id: number; text: string; action?: { label: string; run: () => void } }
interface ChatState { messages: ChatMessage[]; typing: boolean; today: string; turn: Turn | null; toast: Toast | null; isDemo: boolean; stage: string | null }
const HISTORY = 'nawa.engine.history.v2'
function history(): ChatMessage[] {
  try { if (getSessionState().session) return JSON.parse(sessionStorage.getItem(HISTORY) || 'null') || welcomeMessages() } catch { /* In-memory fallback. */ }
  return welcomeMessages()
}
const initial = (): ChatState => ({ messages: history(), typing: false, today: currentDay(), turn: null, toast: null, isDemo: getSessionState().isDemo, stage: getSessionState().stage })
let state = initial(), epoch = 0, key = 0, initialized = Boolean(getSessionState().session)
const listeners = new Set<() => void>()
const retries = new Map<string, { request: () => Promise<EngineTurn>; trigger: Turn['trigger']; said: string }>()
const consumed = new Set<string>()
function set(patch: Partial<ChatState>) {
  state = { ...state, ...patch }
  if (patch.messages) try { sessionStorage.setItem(HISTORY, JSON.stringify(state.messages.slice(-150).map(m => m.voice ? { ...m, voice: { ...m.voice, url: null } } : m))) } catch { /* In-memory fallback. */ }
  listeners.forEach(l => l())
}
function toast(text: string, action?: Toast['action']) { set({ toast: { id: ++key, text, action } }) }
function patchMessage(id: string, status: ChatMessage['status']) { set({ messages: state.messages.map(m => m.id === id ? { ...m, status } : m) }) }
async function exchange(request: () => Promise<EngineTurn>, trigger: Turn['trigger'], said: string, id?: string) {
  const mine = epoch
  set({ typing: true })
  try {
    const turn = await request()
    if (mine !== epoch) return
    if (id) { patchMessage(id, 'read'); retries.delete(id) }
    set({ messages: [...state.messages, ...turn.replies], typing: false, today: turn.today, stage: turn.stage, isDemo: turn.isDemo, turn: { key: ++key, trigger, said, replies: turn.replies, triggered: turn.triggered } })
  } catch (error) {
    if (mine !== epoch) return
    set({ typing: false })
    const retryable = !(error instanceof EngineError) || error.retryable
    if (id) { patchMessage(id, retryable ? 'failed' : 'read'); if (!retryable) retries.delete(id) }
    const expired = error instanceof EngineError && (error.status === 401 || error.code === 'FORBIDDEN')
    toast(expired ? 'انتهت الجلسة أو لم يعد الإجراء متاحًا. ابدأ جلسة جديدة عند الحاجة.' : error instanceof Error ? error.message : 'تعذّر إكمال الطلب.',
      expired ? { label: 'جلسة جديدة', run: () => chat.reset() } : retryable ? { label: 'أعد المحاولة', run: () => { if (!state.typing) void exchange(request, trigger, said, id) } } : undefined)
  }
}
function deliver(message: ChatMessage, trigger: Turn['trigger'], said: string, request: () => Promise<EngineTurn>) {
  retries.set(message.id, { request, trigger, said })
  set({ messages: [...state.messages, message] })
  void exchange(request, trigger, said, message.id)
}
function canSend() {
  if (state.typing) return false
  if (state.messages.some(m => m.status === 'failed')) { toast('أعد محاولة الرسالة المتعذرة أولًا، أو ابدأ جلسة جديدة.'); return false }
  return true
}
export const chat = {
  initialize() { if (initialized) return; initialized = true; void exchange(prepareText('مرحبا'), 'text', '') },
  say(text: string) { const clean = text.trim(); if (!clean || !canSend()) return; deliver({ ...userText(clean), status: 'sent' }, 'text', clean, prepareText(clean)) },
  press(button: QuickButton) {
    const actionKey = `${button.id}:${button.target_id}:${button.version}`
    if (!canSend() || consumed.has(actionKey)) return
    if (!button.target_id || button.version == null) return toast('هذا الإجراء غير متاح. راجع آخر رد من نَوء.')
    consumed.add(actionKey)
    deliver({ ...userText(button.label), status: 'sent' }, 'button', button.label, prepareText(button.label, button))
  },
  sendVoice(audio: Blob, duration: number) {
    if (!canSend()) return
    try { const request = prepareVoice(audio); deliver({ ...userVoice(audio, duration), status: 'sent' }, 'voice', '', request) }
    catch (error) { toast(error instanceof Error ? error.message : 'تعذّر إرسال الصوت.') }
  },
  retry(id: string) { const item = retries.get(id); if (!item || state.typing) return; patchMessage(id, 'sent'); void exchange(item.request, item.trigger, item.said, id) },
  advance(days: number) { if (!canSend()) return; try { void exchange(prepareAdvance(days), 'time', '') } catch (error) { if (error instanceof NoticeError) toast(error.message) } },
  afterEvent() { chat.advance(7) },
  reset() {
    epoch++; for (const m of state.messages) if (m.voice?.url) URL.revokeObjectURL(m.voice.url)
    retries.clear(); consumed.clear(); resetEngine(); try { sessionStorage.removeItem(HISTORY) } catch { /* In-memory fallback. */ }
    initialized = false; state = initial(); set({}); chat.initialize()
  },
  toast,
  dismissToast(id: number) { if (state.toast?.id === id) set({ toast: null }) },
}
export const useChat = () => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)
