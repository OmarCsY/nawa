import { DEMO_HOUSEHOLD_ID, DEMO_START_DATE } from './demo'
import { engineRequest } from './engine'
import { env } from './env'
import { addDays, diffDays, RISK_LABEL, weekdayLong } from './format'
import type {
  AdvanceTimeResponse,
  BotReply,
  EventType,
  InboundResponse,
  LitadoomTool,
  ParsedEvent,
  PlanStep,
  RiskLevel,
} from './types'

/**
 * The ONLY place that knows the engine's wire format.
 *
 *   UI  ⇄  BotMessage / EngineTurn (this file)  ⇄  n8n webhooks (src/lib/engine.ts) or the mocks (src/mocks)
 *
 * When the real n8n response shape lands, change `toMessages` and the request bodies below; screens never import
 * the raw types. VITE_USE_MOCK=true answers from src/mocks instead of the network.
 */

/* ---------- normalized types: what the UI consumes ---------- */

export interface QuickButton {
  id: string
  label: string
}

export interface ItemRow {
  name: string
  grams: number
  reason: string
  qty: string | null
}

export interface ItemsPayload {
  rows: ItemRow[]
  total_g: number
  /** What the voice note said, when the engine reports it. */
  transcript: string | null
}

export interface EventPayload {
  type: EventType
  label: string
  starts_on: string // YYYY-MM-DD
  ends_on: string | null
  guests: number | null
}

export interface PlanPayload {
  id: string
  steps: Array<{ id: string; phase: PlanStep['phase']; text: string }>
  tools: Array<{ tool: LitadoomTool; label: string; url: string }>
}

export interface ResultPayload {
  actual_g: number
  previous_g: number
  /** How much less waste than last time, as a whole percent (62 = "أقل 62%"); never negative. */
  less_pct: number
  best_step: string | null
  transcript: string | null
}

export interface LinkPayload {
  url: string
  title: string
  description: string
  days: Array<{ date: string; level: RiskLevel }>
}

export interface VoicePayload {
  duration_s: number
  /** Object URL of the recording, for replay. Only on the user's own voice notes. */
  url: string | null
  /** 0–1 bar heights for the waveform. */
  waveform: number[]
}

export interface BotMessage {
  id: string
  from: 'user' | 'bot'
  kind: 'text' | 'voice' | 'items' | 'event' | 'plan' | 'result' | 'link'
  text?: string
  voice?: VoicePayload
  items?: ItemsPayload
  event?: EventPayload
  plan?: PlanPayload
  result?: ResultPayload
  buttons?: QuickButton[]
  link?: LinkPayload
  /** Local wall-clock time on the demo's date: `${demo date}T${hh:mm:ss}`, so day separators follow the demo clock. */
  at: string
}

export interface EngineTurn {
  replies: BotMessage[]
  /** The demo household's current date (YYYY-MM-DD). */
  today: string
  /** Workflows the engine fired on its own, e.g. ["WF-06"] (advance-time only). */
  triggered: string[]
}

/** A situation worth telling the person about (not a failure): shown as a toast. */
export class NoticeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NoticeError'
  }
}

/* ---------- Arabic labels ---------- */

const EVENT_LABEL: Record<EventType, string> = {
  gathering: 'عزيمة',
  travel: 'سفر',
  ramadan_iftar: 'فطور رمضان',
  eid: 'عيد',
  other: 'مناسبة',
}

const REASON_LABEL: Record<string, string> = {
  overcooked: 'طبخ زيادة',
  spoiled: 'يبس أو خرب',
  expired: 'انتهت الصلاحية',
  plate_leftover: 'بواقي صحون',
  forgotten: 'نسيان بالثلاجة',
  overbought: 'تسوق زيادة',
  other: 'أخرى',
}

const TOOL_LABEL: Record<LitadoomTool, string> = {
  quantity_calculator: 'افتح حاسبة الكميات في لتدوم',
  charity_request: 'اطلب جمعية من لتدوم',
  measure: 'سجّل القياس',
}

/* ---------- session (module-level, survives navigating between pages) ---------- */

let today = DEMO_START_DATE
let events: ParsedEvent[] = []
let seq = 0

const mocks = () => import('../mocks/engine')
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(seq += 1)}`
const pad = (n: number) => String(n).padStart(2, '0')

export const currentDay = () => today

/** `${demo date}T${local time}`: the demo clock decides the day, the real clock decides the time of day. */
function stamp(rawIso?: string): string {
  const d = rawIso ? new Date(rawIso) : new Date()
  return `${today}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Tool links are placeholders like «{رابط حاسبة الكميات}» until Litadoom gives us real ones. */
const toolUrl = (url: string) => (/^(https?:\/\/|\/)/.test(url) ? url : '#')

/** Drops a trailing «: {placeholder}» the engine leaves where a link will go. */
const withoutPlaceholders = (text: string) => text.replace(/\s*:?\s*\{[^}]*\}/g, '').trim()

/** Engines may report a ratio (-0.62) or a percent (-62); both become the whole percent 62. */
const lessPct = (change: number) => Math.round(Math.abs(change) <= 1 ? Math.abs(change) * 100 : Math.abs(change))

/* ---------- engine → UI ---------- */

function toMessages(r: BotReply): BotMessage[] {
  const base = { id: nextId('bot'), from: 'bot' as const, at: stamp(r.at) }

  switch (r.kind) {
    case 'text':
    case 'reminder':
      return [{ ...base, kind: 'text', text: withoutPlaceholders(r.text), buttons: r.buttons }]

    case 'measurement':
      return [
        {
          ...base,
          kind: 'items',
          items: {
            rows: r.items.map((i) => ({
              name: i.item_ar,
              grams: i.grams,
              reason: REASON_LABEL[i.reason] ?? REASON_LABEL.other,
              qty: i.qty_text || null,
            })),
            total_g: r.total_g,
            transcript: r.transcript ?? null,
          },
          buttons: r.buttons,
        },
      ]

    case 'event': {
      events = [...events.filter((e) => e.event_id !== r.event.event_id), r.event]
      return [
        {
          ...base,
          kind: 'event',
          event: {
            type: r.event.type,
            label: EVENT_LABEL[r.event.type],
            starts_on: r.event.starts_on,
            ends_on: r.event.ends_on,
            guests: r.event.guests,
          },
          buttons: r.buttons,
        },
      ]
    }

    case 'forecast': {
      const risky = r.forecast.days.filter((d) => d.level !== 'low')
      return [
        {
          ...base,
          kind: 'link',
          text: r.text,
          link: {
            url: r.nashra_url,
            title: 'نشرة هدر بيتك',
            description: risky.length
              ? risky.map((d) => `${weekdayLong(d.date)}: خطر ${RISK_LABEL[d.level]}`).join(' · ')
              : 'أسبوع هادئ، ما فيه أيام خطر',
            days: r.forecast.days.map((d) => ({ date: d.date, level: d.level })),
          },
          buttons: r.buttons,
        },
      ]
    }

    case 'plan':
      return [
        {
          ...base,
          kind: 'plan',
          text: r.text,
          plan: {
            id: r.plan.plan_id,
            steps: r.plan.steps.map((s) => ({ id: s.step_id, phase: s.phase, text: s.text_ar })),
            tools: r.plan.litadoom_tools.map((t) => ({ tool: t.tool, label: TOOL_LABEL[t.tool], url: toolUrl(t.url) })),
          },
          buttons: r.buttons,
        },
      ]

    case 'outcome':
      return [
        {
          ...base,
          kind: 'result',
          result: {
            actual_g: r.outcome.actual_g,
            previous_g: r.outcome.prev_similar_g,
            less_pct: lessPct(r.outcome.change_pct),
            best_step: r.outcome.best_step_ar,
            transcript: r.transcript ?? null,
          },
          buttons: r.buttons,
        },
      ]
  }
}

function toTurn(raw: InboundResponse, triggered: string[] = []): EngineTurn {
  if (raw.today) today = raw.today
  return { replies: raw.replies.flatMap(toMessages), today, triggered }
}

/* ---------- UI → engine ---------- */

/** POST /v1/channels/web/inbound with a typed message or a pressed quick-reply button. */
export async function sendText(text: string, buttonId?: string): Promise<EngineTurn> {
  if (env.useMock) return toTurn(await (await mocks()).mockSendMessage(text, buttonId))

  const body = JSON.stringify({
    household_id: DEMO_HOUSEHOLD_ID,
    type: buttonId ? 'button' : 'text',
    text,
    button_id: buttonId ?? null,
  })
  return toTurn(await engineRequest<InboundResponse>('/v1/channels/web/inbound', body, true))
}

/** The same endpoint with a voice note (multipart `audio`). */
export async function sendVoice(audio: Blob): Promise<EngineTurn> {
  if (env.useMock) return toTurn(await (await mocks()).mockSendMessage(audio))

  const ext = audio.type.includes('ogg') ? 'ogg' : audio.type.includes('mp4') ? 'm4a' : 'webm'
  const form = new FormData()
  form.append('household_id', DEMO_HOUSEHOLD_ID)
  form.append('type', 'audio')
  form.append('audio', audio, `voice.${ext}`)
  return toTurn(await engineRequest<InboundResponse>('/v1/channels/web/inbound', form, false))
}

/** POST /v1/demo/advance-time: jump the demo household's clock and run the schedulers now. */
export async function advanceDays(days: number): Promise<EngineTurn> {
  const raw = env.useMock
    ? await (await mocks()).mockAdvanceTime(days)
    : await engineRequest<AdvanceTimeResponse>(
        '/v1/demo/advance-time',
        JSON.stringify({ household_id: DEMO_HOUSEHOLD_ID, days }),
        true,
      )
  return toTurn(raw, raw.triggered)
}

/** Jump to the day after the household's event, whatever the clock says now. */
export async function advanceToAfterEvent(): Promise<EngineTurn> {
  // A gathering beats a trip when both are on the calendar: the story is about the gathering.
  const event = [...events].reverse().find((e) => e.type !== 'travel') ?? events[events.length - 1]
  if (!event) throw new NoticeError('اذكروا مناسبة أول، مثل: «الخميس عندنا عزيمة 14 نفر»')

  const days = diffDays(today, addDays(event.ends_on ?? event.starts_on, 1))
  if (days < 1) throw new NoticeError('مرّت المناسبة أصلًا. ارسلوا صوتية بالي انرمى منها.')
  return advanceDays(days)
}

/** Forget the demo conversation (mock mode resets the engine too; a live engine keeps its own state). */
export function resetEngine(): void {
  today = DEMO_START_DATE
  events = []
  if (env.useMock) void mocks().then((m) => m.mockReset())
}

/* ---------- messages the UI creates itself ---------- */

export function userText(text: string): BotMessage {
  return { id: nextId('me'), from: 'user', kind: 'text', text, at: stamp() }
}

export function userVoice(audio: Blob, durationSeconds: number): BotMessage {
  // a stable pseudo-random waveform per recording (the real amplitude never leaves the browser)
  let s = (audio.size + Math.round(durationSeconds * 1000)) % 2147483647 || 7
  const waveform = Array.from({ length: 30 }, () => {
    s = (s * 48271) % 2147483647
    return 0.25 + 0.75 * (s / 2147483647)
  })
  return {
    id: nextId('me'),
    from: 'user',
    kind: 'voice',
    voice: { duration_s: durationSeconds, url: URL.createObjectURL(audio), waveform },
    at: stamp(),
  }
}

export function welcomeMessages(): BotMessage[] {
  return [
    {
      id: nextId('bot'),
      from: 'bot',
      kind: 'text',
      text: 'حيّاكم الله 🌿 أنا نَوء من لتدوم، أنبّهكم قبل ما يرتفع الهدر في بيتكم.\nجرّبوا ترسلون صوتية بالي انرمى اليوم، أو تكتبون «الخميس عندنا عزيمة 14 نفر».',
      at: stamp(),
    },
  ]
}
