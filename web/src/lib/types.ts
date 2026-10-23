/**
 * Engine contract types. Field names mirror docs/nawa_idea.md §8.2 (forecast, plan),
 * §8.6 (voice extraction) and §11 (enums), so mock and live responses are interchangeable.
 */

export type RiskLevel = 'low' | 'mid' | 'high'

export type Driver =
  | 'gathering'
  | 'ramadan'
  | 'eid'
  | 'travel_before'
  | 'post_shopping'
  | 'heatwave'
  | 'school_start'

export type EventType = 'gathering' | 'travel' | 'ramadan_iftar' | 'eid' | 'other'

export type WasteReason =
  | 'overcooked'
  | 'spoiled'
  | 'expired'
  | 'plate_leftover'
  | 'forgotten'
  | 'overbought'
  | 'other'

export type LitadoomTool = 'quantity_calculator' | 'charity_request' | 'measure'

/* ---- §8.2 GET /v1/households/{id}/forecast ---- */

export interface ForecastDay {
  date: string // YYYY-MM-DD
  level: RiskLevel
  expected_kg: number
  drivers: Driver[]
  reason_ar: string
  items_at_risk: string[]
}

export interface Forecast {
  household_id: string
  days: ForecastDay[]
  model_version: string
}

/* ---- §8.2 POST /v1/plans/generate ---- */

export interface PlanStep {
  step_id: string
  phase: 'before' | 'during' | 'after'
  text_ar: string
}

export interface Plan {
  plan_id: string
  send_at: string // ISO with +03:00
  steps: PlanStep[]
  litadoom_tools: { tool: LitadoomTool; url: string }[]
  source: string
}

/* ---- §8.6 voice / text measurement extraction ---- */

export interface MeasuredItem {
  item_ar: string
  category: string
  qty_text: string
  grams: number
  reason: WasteReason
  confidence: number
}

/* ---- §8.7 event parsing ---- */

export interface ParsedEvent {
  event_id: string
  type: EventType
  starts_on: string
  ends_on: string | null
  guests: number | null
}

/* ---- §4 step 6 / §9.1 result card ---- */

export interface Outcome {
  plan_id: string
  actual_g: number
  prev_similar_g: number
  change_pct: number // negative = less waste
  best_step_ar: string | null
  charity_url: string | null
}

/* ---- Bot replies (POST /v1/channels/web/inbound, POST /v1/demo/advance-time) ---- */

export interface QuickReply {
  id: string
  label: string
}

interface ReplyBase {
  id: string
  at: string // ISO timestamp
  text: string
  buttons?: QuickReply[] // WhatsApp allows 3 max (§9.2)
}

export type BotReply =
  | (ReplyBase & { kind: 'text' })
  | (ReplyBase & { kind: 'measurement'; items: MeasuredItem[]; total_g: number; transcript?: string })
  | (ReplyBase & { kind: 'event'; event: ParsedEvent })
  | (ReplyBase & { kind: 'forecast'; forecast: Forecast; nashra_url: string })
  | (ReplyBase & { kind: 'plan'; plan: Plan })
  | (ReplyBase & { kind: 'reminder' })
  | (ReplyBase & { kind: 'outcome'; outcome: Outcome; transcript?: string })

export interface InboundResponse {
  household_id: string
  today: string // engine's notion of "today" (moves with advance-time)
  replies: BotReply[]
}

export interface AdvanceTimeResponse extends InboundResponse {
  triggered: string[] // workflows fired, e.g. ["WF-05", "WF-06"]
}
