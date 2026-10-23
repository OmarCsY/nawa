import { DEMO_START_DATE } from './demo'
import { engineRequest } from './engine'
import { clearEngineSession, getSessionState, newClientNonce, newRequestId, saveSessionState } from './engineSession'
import { formatDayLong } from './format'
import type { EventType, LitadoomTool, PlanStep, RiskLevel } from './types'

export interface QuickButton { id: string; label: string; target_id?: string; version?: number }
export interface ItemRow { name: string; grams: number; reason: string; qty: string | null }
export interface ItemsPayload { rows: ItemRow[]; total_g: number; transcript: string | null; status?: string; estimated?: boolean }
export interface EventPayload { type: EventType; label: string; starts_on: string; ends_on: string | null; guests: number | null; status?: string }
export interface PlanPayload { id: string; steps: Array<{ id: string; phase: PlanStep['phase']; text: string }>; tools: Array<{ tool: LitadoomTool; label: string; url: string }> }
export interface ResultPayload { actual_g: number; previous_g: number | null; change_pct: number | null; less_pct: number | null; best_step: string | null; transcript: string | null }
export interface LinkPayload { url: string; title: string; description: string; days: Array<{ date: string; level: RiskLevel }> }
export interface VoicePayload { duration_s: number; url: string | null; waveform: number[] }
export interface BotMessage { id: string; from: 'user' | 'bot'; kind: 'text' | 'voice' | 'items' | 'event' | 'plan' | 'result' | 'link'; text?: string; voice?: VoicePayload; items?: ItemsPayload; event?: EventPayload; plan?: PlanPayload; result?: ResultPayload; buttons?: QuickButton[]; link?: LinkPayload; at: string }
export interface EngineTurn { replies: BotMessage[]; today: string; triggered: string[]; stage: string | null; isDemo: boolean }
export class NoticeError extends Error { constructor(message: string) { super(message); this.name = 'NoticeError' } }
type Data = Record<string, any>
export interface Envelope {
  request_id: string; session: { id: string; token: string } | null; household_id: string | null; stage: string | null; effective_today: string; is_demo: boolean; reply_ar: string; buttons: QuickButton[]
  card: { id?: string | number; type: string; status: string; data: Data } | null
  messages: Array<{ kind?: string; reply_ar?: string; card?: Envelope['card']; buttons?: QuickButton[]; data?: Data }>; data?: Data
}
const EVENT_LABEL: Record<EventType, string> = { gathering: 'عزيمة', travel: 'سفر', ramadan_iftar: 'فطور رمضان', eid: 'عيد', other: 'مناسبة' }
const REASON: Record<string, string> = { overcooked: 'طبخ زيادة', spoiled: 'خرب أو يبس', expired: 'انتهت الصلاحية', plate_leftover: 'بواقي صحون', forgotten: 'نسيان بالثلاجة', overbought: 'تسوق زيادة', other: 'أخرى' }
const TOOL: Record<string, string> = { quantity_calculator: 'حاسبة الكميات', charity_request: 'طلب جمعية', measure: 'أداة القياس' }
let seq = 0
export const currentDay = () => getSessionState().today || DEMO_START_DATE
const nextId = () => `message_${Date.now()}_${++seq}`
const stamp = () => `${currentDay()}T${new Date().toTimeString().slice(0, 8)}`
const numberOrNull = (n: unknown) => n === null || n === undefined || !Number.isFinite(Number(n)) ? null : Number(n)
function message(text: string, card: Envelope['card'], buttons: QuickButton[] = []): BotMessage[] {
  const base: BotMessage = { id: nextId(), from: 'bot', kind: 'text', text, buttons, at: stamp() }
  if (!card) return text || buttons.length ? [base] : []
  const d = card.data || {}
  if (card.type === 'measurement') return [{ ...base, kind: 'items', items: {
    rows: (d.items || []).map((i: Data) => ({ name: String(i.item_ar || 'صنف'), grams: Number(i.grams), reason: REASON[i.reason] || REASON.other, qty: i.qty_text || null })),
    total_g: Number(d.total_g ?? (d.items || []).reduce((n: number, i: Data) => n + Number(i.grams), 0)), transcript: d.transcript || null, status: card.status, estimated: Boolean(d.estimated),
  } }]
  if (card.type === 'event') { const type = d.type in EVENT_LABEL ? d.type as EventType : 'other'; return [{ ...base, kind: 'event', event: { type, label: EVENT_LABEL[type], starts_on: d.starts_on, ends_on: d.ends_on || null, guests: numberOrNull(d.guests), status: card.status } }] }
  if (card.type === 'plan') return [{ ...base, kind: 'plan', plan: {
    id: String(card.id ?? d.plan_id), steps: (d.steps || []).map((s: Data) => ({ id: s.step_id, phase: s.phase, text: s.text_ar })),
    tools: Object.entries(d.tools || {}).filter(([, url]) => typeof url === 'string' && /^https:\/\//.test(url as string)).map(([tool, url]) => ({ tool: tool as LitadoomTool, label: TOOL[tool] || 'الأداة', url: url as string })),
  } }]
  if (card.type === 'outcome') { const change = numberOrNull(d.change_pct); return [{ ...base, kind: 'result', result: { actual_g: Number(d.actual_g ?? 0), previous_g: numberOrNull(d.prev_similar_g), change_pct: change, less_pct: change === null ? null : -change, best_step: d.best_step_ar || null, transcript: null } }] }
  return [base]
}
export function toTurn(raw: Envelope): EngineTurn {
  saveSessionState({ session: raw.session || getSessionState().session, today: raw.effective_today || currentDay(), stage: raw.stage, isDemo: raw.is_demo })
  const replies = message(raw.reply_ar, raw.card, raw.buttons || [])
  for (const m of raw.messages || []) replies.push(...message(m.reply_ar || '', m.card || null, m.buttons || []))
  const days = raw.data?.days || raw.data?.forecast
  if (Array.isArray(days) && days.length && !raw.card) replies.push({ id: nextId(), from: 'bot', kind: 'link', at: stamp(), link: { url: '/n/session', title: 'نشرة أسرتكم التجريبية', description: 'الأيام السبعة وفق تاريخ أسرتكم. الرابط يعمل في هذه النافذة فقط.', days: days.map((d: Data) => ({ date: d.day || d.date, level: d.level })) } })
  window.dispatchEvent(new Event('nawa:data-changed'))
  return { replies, today: currentDay(), stage: raw.stage, isDemo: raw.is_demo, triggered: (raw.messages || []).map(m => m.kind || 'رسالة مستحقة') }
}
/** This closure captures the logical request once, including the same request_id on retry. */
export function prepareRequest(path: string, fields: Data, audio?: Blob): () => Promise<EngineTurn> {
  const session = getSessionState().session
  const payload = JSON.stringify({ request_id: newRequestId(), session, ...(!session ? { client_nonce: newClientNonce() } : {}), ...fields })
  return async () => {
    let body: BodyInit = payload
    if (audio) { const form = new FormData(); form.append('metadata', payload); form.append('audio', audio, `voice.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : 'webm'}`); body = form }
    return toTurn(await engineRequest<Envelope>(path, body, !audio))
  }
}
export const prepareText = (text: string, action?: QuickButton) => prepareRequest('/channels/web/inbound', action ? { type: 'action', action: { id: action.id, target_id: action.target_id, version: action.version } } : { type: 'text', text })
export const prepareVoice = (audio: Blob) => { if (audio.size > 10 * 1024 * 1024) throw new NoticeError('الحد الأقصى للصوت 10 ميجابايت.'); return prepareRequest('/measurements/voice', { type: 'voice' }, audio) }
export const prepareAdvance = (days: number) => {
  if (!getSessionState().session || !getSessionState().isDemo) throw new NoticeError('تقديم الوقت متاح بعد بدء جلسة الديمو فقط.')
  if (![2, 7].includes(days)) throw new NoticeError('اختر تقديم يومين أو أسبوع.')
  return prepareRequest('/demo/advance-time', { days })
}
export const sendText = (text: string, action?: QuickButton) => prepareText(text, action)()
export const sendVoice = (audio: Blob) => prepareVoice(audio)()
export const advanceDays = (days: number) => prepareAdvance(days)()
export const advanceToAfterEvent = () => advanceDays(7)
export const resetEngine = () => clearEngineSession()
export const userText = (text: string): BotMessage => ({ id: nextId(), from: 'user', kind: 'text', text, at: stamp() })
export const userVoice = (audio: Blob, duration_s: number): BotMessage => ({ id: nextId(), from: 'user', kind: 'voice', voice: { duration_s, url: URL.createObjectURL(audio), waveform: Array.from({ length: 30 }, (_, i) => 0.3 + (i % 5) / 8) }, at: stamp() })
export const welcomeMessages = (): BotMessage[] => [{ id: nextId(), from: 'bot', kind: 'text', text: `نموذج نَوء التجريبي. نبدأ بموافقتكم، ثم عدد أفراد الأسرة والمدينة. تاريخ الديمو ${formatDayLong(currentDay())}.`, at: stamp() }]
