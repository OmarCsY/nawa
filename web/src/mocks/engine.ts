import { addDays, diffDays, formatDayLong, formatKg, weekdayIndex, weekdayLong } from '../lib/format'
import type {
  AdvanceTimeResponse,
  BotReply,
  EventType,
  Forecast,
  ForecastDay,
  InboundResponse,
  ParsedEvent,
} from '../lib/types'
import {
  BASELINE_WEEK,
  DEMO_EVENT_DATE,
  DEMO_HOUSEHOLD_ID,
  DEMO_START_DATE,
  GATHERING_DAY,
  GATHERING_NEXT_DAY,
  GATHERING_OUTCOME,
  GATHERING_PLAN,
  MODEL_VERSION,
  TRAVEL_DAY,
  VOICE_ITEMS,
  VOICE_TRANSCRIPT_ITEMS,
  VOICE_TRANSCRIPT_OUTCOME,
} from './fixtures'

/**
 * In-browser stand-in for the n8n engine (VITE_USE_MOCK=true).
 * Walks the single demo cycle from docs/nawa_idea.md §10.1:
 *   event → Thursday turns red → advance 2 days → plan → after the event → "طبقتوها؟" → voice → "أقل 62%".
 */

type Stage =
  | 'new'
  | 'ask_size'
  | 'ask_city'
  | 'ask_consent'
  | 'ready'
  | 'event_pending' // event card shown, waiting for "تمام"
  | 'event_confirmed'
  | 'plan_sent'
  | 'awaiting_adherence'
  | 'awaiting_outcome'
  | 'done'

interface MockState {
  today: string
  stage: Stage
  event: ParsedEvent | null
  travel: boolean
  /** Date of the event awaiting "تمام", so the confirmation names the right day. */
  pendingDate: string | null
  remindedOn: string | null
}

const initialState = (): MockState => ({
  today: DEMO_START_DATE,
  stage: 'new',
  event: null,
  travel: false,
  pendingDate: null,
  remindedOn: null,
})

let state = initialState()
let seq = 0

export const BUTTONS = {
  itemsOk: { id: 'items_ok', label: 'صح' },
  itemsEdit: { id: 'items_edit', label: 'عدّل' },
  eventOk: { id: 'event_ok', label: 'تمام' },
  eventEdit: { id: 'event_edit', label: 'عدّل' },
  consentYes: { id: 'consent_yes', label: 'موافق' },
  planYes: { id: 'plan_yes', label: 'بطبقها' },
  planLater: { id: 'plan_later', label: 'ذكّرني بكرة' },
  planNo: { id: 'plan_no', label: 'ما تناسبنا' },
  adhYes: { id: 'adh_yes', label: 'طبقتها' },
  adhPartial: { id: 'adh_partial', label: 'جزئيًا' },
  adhNo: { id: 'adh_no', label: 'لا' },
} as const

/* ---------- helpers ---------- */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** BotReply minus id/at, distributed over each variant so `kind` still narrows. */
type Draft<R> = R extends BotReply ? Omit<R, 'id' | 'at'> : never
type DraftReply = Draft<BotReply>

function reply(r: DraftReply): BotReply {
  seq += 1
  return { ...r, id: `mock_${seq}`, at: new Date().toISOString() } as BotReply
}

const respond = (replies: BotReply[]): InboundResponse => ({
  household_id: DEMO_HOUSEHOLD_ID,
  today: state.today,
  replies,
})

function toLatinDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
}

const WEEKDAYS: [RegExp, number][] = [
  [/الأحد|الاحد/, 0],
  [/الاثنين|الإثنين/, 1],
  [/الثلاثاء/, 2],
  [/الأربعاء|الاربعاء/, 3],
  [/الخميس/, 4],
  [/الجمعة|الجمعه/, 5],
  [/السبت/, 6],
]

/** Next date (after today) falling on the weekday named in the text; defaults to the demo Thursday. */
function resolveDate(text: string): string {
  if (/بكرة|بكره|غدا|غدًا/.test(text)) return addDays(state.today, 1)
  const match = WEEKDAYS.find(([re]) => re.test(text))
  if (!match) return DEMO_EVENT_DATE
  const ahead = (match[1] - weekdayIndex(state.today) + 7) % 7 || 7
  return addDays(state.today, ahead)
}

const EVENT_LABEL: Record<EventType, string> = {
  gathering: 'عزيمة',
  travel: 'سفر',
  ramadan_iftar: 'فطور رمضان',
  eid: 'عيد',
  other: 'مناسبة',
}

function buildForecast(): Forecast {
  const overrides = new Map<string, ForecastDay>()
  if (state.event?.type === 'gathering') {
    const guests = state.event.guests ?? 14
    const day = state.event.starts_on
    overrides.set(day, {
      ...GATHERING_DAY,
      date: day,
      reason_ar: GATHERING_DAY.reason_ar.replace('14', String(guests)),
    })
    overrides.set(addDays(day, 1), { ...GATHERING_NEXT_DAY, date: addDays(day, 1) })
  }
  if (state.travel) overrides.set(TRAVEL_DAY.date, TRAVEL_DAY)

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(DEMO_START_DATE, i)
    const base = BASELINE_WEEK[i]
    return overrides.get(date) ?? { ...base, date }
  })
  return { household_id: DEMO_HOUSEHOLD_ID, days, model_version: MODEL_VERSION }
}

function forecastReply(lead: string): BotReply {
  return reply({
    kind: 'forecast',
    text: lead,
    forecast: buildForecast(),
    nashra_url: `/n/${DEMO_HOUSEHOLD_ID}`,
  })
}

/* ---------- intents ---------- */

function handleEvent(text: string): BotReply[] {
  const isTravel = /سفر|مسافر|نسافر/.test(text)
  const type: EventType = isTravel ? 'travel' : /عيد/.test(text) ? 'eid' : 'gathering'
  const guestsMatch = toLatinDigits(text).match(/(\d{1,3})\s*(نفر|شخص|ضيف|أشخاص|اشخاص)?/)
  const guests = !isTravel && guestsMatch ? Number(guestsMatch[1]) : null
  const daysMatch = isTravel ? toLatinDigits(text).match(/(\d{1,2})\s*(أيام|ايام|يوم)/) : null

  if (isTravel) {
    state.travel = true
    const starts = TRAVEL_DAY.date
    state.pendingDate = starts
    const length = daysMatch ? Number(daysMatch[1]) : 4
    return [
      reply({
        kind: 'event',
        text: `سجّلت: سفر · ${formatDayLong(starts)} · ${length} أيام`,
        event: { event_id: 'ev_78', type, starts_on: starts, ends_on: addDays(starts, length), guests: null },
        buttons: [BUTTONS.eventOk, BUTTONS.eventEdit],
      }),
    ]
  }

  const starts = resolveDate(text)
  state.event = { event_id: 'ev_77', type, starts_on: starts, ends_on: null, guests: guests ?? 14 }
  state.stage = 'event_pending'
  state.pendingDate = starts
  const parts = [EVENT_LABEL[type], formatDayLong(starts), guests ? `${guests} شخص` : null].filter(Boolean)
  return [
    reply({
      kind: 'event',
      text: `سجّلت: ${parts.join(' · ')}`,
      event: state.event,
      buttons: [BUTTONS.eventOk, BUTTONS.eventEdit],
    }),
  ]
}

function handleMeasurement(transcript?: string): BotReply[] {
  if (state.stage === 'awaiting_outcome') {
    state.stage = 'done'
    const o = GATHERING_OUTCOME
    return [
      reply({
        kind: 'outcome',
        text: `هدر العزيمة ${formatKg(o.actual_g)}، عزيمتكم الماضية ${formatKg(o.prev_similar_g)}: أقل ${Math.round(-o.change_pct * 100)}%`,
        outcome: o,
        transcript: transcript ?? VOICE_TRANSCRIPT_OUTCOME,
      }),
      reply({
        kind: 'text',
        text: `أكثر خطوة نفعت معكم: ${o.best_step_ar}. بنقدّمها أول في عزائمكم الجاية.`,
      }),
      reply({
        kind: 'text',
        text: `وإذا عندكم أكل سليم ما انقدّم للضيوف، اطلبوا جمعية من تطبيق لتدوم: ${o.charity_url}`,
      }),
    ]
  }

  const total = VOICE_ITEMS.reduce((sum, i) => sum + i.grams, 0)
  return [
    reply({
      kind: 'measurement',
      text: 'سجّلت 3 أصناف: رز مطبوخ 600 جم (طبخ زيادة)، خبز 300 جم (يبس)، خس 150 جم (خرب بالثلاجة). صح؟',
      items: VOICE_ITEMS,
      total_g: total,
      transcript: transcript ?? VOICE_TRANSCRIPT_ITEMS,
      buttons: [BUTTONS.itemsOk, BUTTONS.itemsEdit],
    }),
  ]
}

function handleButton(buttonId: string): BotReply[] | null {
  switch (buttonId) {
    case BUTTONS.consentYes.id:
      state.stage = 'ready'
      return [
        reply({
          kind: 'text',
          text: 'تم، وصلتكم نشرة بيتكم. بنرسل لكم بحد أقصى رسالتين بالأسبوع، وكلمة «إيقاف» توقف كل شي.\nجرّب: «الخميس عندنا عزيمة 14 نفر» أو ارسل صوتية بالي انرمى اليوم.',
        }),
      ]
    case BUTTONS.itemsOk.id:
      return [reply({ kind: 'text', text: 'تمام، حفظتها في سجل لتدوم. شكرًا لكم 🌿' })]
    case BUTTONS.itemsEdit.id:
      return [reply({ kind: 'text', text: 'أبشر. اكتب الصنف والكمية الصح، مثل: «الرز كان صحن مو نص قدر».' })]
    case BUTTONS.eventOk.id:
      if (state.stage === 'event_pending') state.stage = 'event_confirmed'
      return [
        forecastReply(
          `تمام. حدّثت نشرة أسبوعكم، و${weekdayLong(state.pendingDate ?? DEMO_EVENT_DATE)} صار خطره مرتفع. بنرسل لكم الخطة قبلها بيومين.`,
        ),
      ]
    case BUTTONS.eventEdit.id:
      return [reply({ kind: 'text', text: 'وش اللي تبي تعدله: اليوم ولا عدد الضيوف؟' })]
    case BUTTONS.planYes.id:
      return [reply({ kind: 'text', text: 'كفو! بذكّركم يوم العزيمة بالخطوة الأهم.' })]
    case BUTTONS.planLater.id:
      return [reply({ kind: 'text', text: 'أبشر، بذكّركم بكرة الساعة 8:30 مساءً.' })]
    case BUTTONS.planNo.id:
      return [reply({ kind: 'text', text: 'ولا يهمك. وش اللي ما ناسبكم؟ بنتعلم منه للمرة الجاية.' })]
    case BUTTONS.adhYes.id:
    case BUTTONS.adhPartial.id:
    case BUTTONS.adhNo.id:
      state.stage = 'awaiting_outcome'
      return [
        reply({
          kind: 'text',
          text: 'شكرًا لكم. ارسلوا صوتية قصيرة بالي انرمى من العزيمة، وأقارنها لكم بعزيمتكم الماضية.',
        }),
      ]
    default:
      return null
  }
}

function handleOnboarding(text: string): BotReply[] | null {
  const digits = toLatinDigits(text).match(/\d{1,2}/)
  switch (state.stage) {
    case 'new':
      state.stage = 'ask_size'
      return [reply({ kind: 'text', text: 'مرحبًا بك في نشرة لتدوم لبيتك. كم عددكم في البيت؟' })]
    case 'ask_size':
      if (!digits) return [reply({ kind: 'text', text: 'اكتب العدد بالأرقام لو سمحت، مثل: 6' })]
      state.stage = 'ask_city'
      return [reply({ kind: 'text', text: 'حياكم الله. وفي أي مدينة؟' })]
    case 'ask_city':
      state.stage = 'ask_consent'
      return [
        reply({
          kind: 'text',
          text: 'آخر شي: توافقون نرسل لكم نشرة الهدر وخطة قبل مواسمكم على واتساب؟ ما نحفظ أسماء ولا موقع.',
          buttons: [BUTTONS.consentYes],
        }),
      ]
    default:
      return null
  }
}

function route(text: string, buttonId?: string): BotReply[] {
  const t = text.trim()

  if (buttonId) {
    const handled = handleButton(buttonId)
    if (handled) return handled
  }
  if (/إيقاف|ايقاف/.test(t)) {
    return [reply({ kind: 'text', text: 'تم إيقاف كل الرسائل. وإذا تبون نحذف بياناتكم اكتبوا «احذف».' })]
  }
  if (/مساعدة|مساعده/.test(t)) {
    return [
      reply({
        kind: 'text',
        text: 'الأوامر:\n• صوتية أو «رمينا…»: تسجيل الهدر\n• «عندنا عزيمة…» أو «مسافرين…»: تسجيل مناسبة\n• «نشرة»: نشرة أسبوعكم\n• «إيقاف»: إيقاف الرسائل',
      }),
    ]
  }
  if (/نشرة|نشره/.test(t)) return [forecastReply('هذي نشرة أسبوعكم:')]
  if (/عزيم|ضيوف|نفر|مناسبة|سفر|مسافر|نسافر|عيد/.test(t)) return handleEvent(t)
  if (/رمينا|رميت|انرمى|كبّينا|كبينا|زاد عندنا|خرب/.test(t)) return handleMeasurement(t)

  return (
    handleOnboarding(t) ?? [
      reply({
        kind: 'text',
        text: 'ما فهمت عليك تمام. جرّب: «الخميس عندنا عزيمة 14 نفر»، أو ارسل صوتية بالي انرمى، أو اكتب «مساعدة».',
      }),
    ]
  )
}

/* ---------- public mock API (same shape as src/lib/engine.ts) ---------- */

export async function mockSendMessage(input: string | Blob, buttonId?: string): Promise<InboundResponse> {
  if (input instanceof Blob) {
    await delay(1600) // transcription + extraction
    return respond(handleMeasurement())
  }
  await delay(650)
  return respond(route(input, buttonId))
}

export async function mockAdvanceTime(days: number): Promise<AdvanceTimeResponse> {
  await delay(700)
  state.today = addDays(state.today, days)
  const triggered = ['WF-05']
  const replies: BotReply[] = []
  const event = state.event
  const confirmed = state.stage === 'event_confirmed' || state.stage === 'event_pending'

  if (event && confirmed && diffDays(state.today, event.starts_on) <= 2 && diffDays(state.today, event.starts_on) >= 0) {
    state.stage = 'plan_sent'
    triggered.push('WF-06')
    replies.push(
      reply({
        kind: 'plan',
        text: `${weekdayLong(event.starts_on)} خطره مرتفع. 3 خطوات تكفي:`,
        plan: { ...GATHERING_PLAN, send_at: `${addDays(event.starts_on, -2)}T20:30:00+03:00` },
        buttons: [BUTTONS.planYes, BUTTONS.planLater, BUTTONS.planNo],
      }),
    )
  } else if (event && state.stage === 'plan_sent' && state.today === event.starts_on && state.remindedOn !== state.today) {
    state.remindedOn = state.today
    triggered.push('WF-07')
    replies.push(reply({ kind: 'reminder', text: 'تذكير: جهزوا علب البواقي قبل العشاء' }))
  } else if (event && (state.stage === 'plan_sent' || confirmed) && diffDays(event.starts_on, state.today) >= 1) {
    state.stage = 'awaiting_adherence'
    triggered.push('WF-08')
    replies.push(
      reply({
        kind: 'text',
        text: 'كيف كانت العزيمة؟ طبقتوا الخطة؟',
        buttons: [BUTTONS.adhYes, BUTTONS.adhPartial, BUTTONS.adhNo],
      }),
    )
  }

  return { ...respond(replies), triggered }
}

export function mockForecast(): Forecast {
  return buildForecast()
}

export function mockReset(): void {
  state = initialState()
}
