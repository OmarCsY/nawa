import { readView } from './supabase'
import type { LitadoomTool, RiskLevel } from './types'

/* Row shapes of the dashboard views (aggregates only — no household ids ever reach the browser). */

export type Cohort = 'nawa' | 'control'

export interface KpiRow {
  cohort: Cohort
  households: number
  measurements: number
  waste_reduction_pct: number // already in percent, e.g. 21.8
  adherence_pct: number | null // null for control (it gets no plans)
  remeasure_pct: number
}

export interface FunnelRow {
  stage_order: number
  stage_ar: string
  count: number
}

export interface CriticalWeekRow {
  week_start: string // Sunday, YYYY-MM-DD
  region: string
  avg_ratio: number
  top_driver: string | null
  level: RiskLevel
}

export interface LiveRow {
  id: number
  city: string
  item_ar: string
  grams: number
  reason_ar: string
  created_at: string
  source?: string // only on realtime rows from live_feed
}

export interface CohortTrendRow {
  week_start: string
  cohort: Cohort
  avg_event_kg: number
  events: number
}

export interface WasteRow {
  item_ar: string
  reason_ar: string
  grams: number
  entries: number
}

export interface ToolUsageRow {
  tool: LitadoomTool
  clicks: number
}

/* PostgREST returns numeric columns as numbers, but be defensive: a numeric(…) column can arrive as a string. */
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v))
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v))

export async function fetchKpis(): Promise<KpiRow[]> {
  const rows = await readView<KpiRow>('v_kpis')
  return rows.map((r) => ({
    ...r,
    households: num(r.households),
    measurements: num(r.measurements),
    waste_reduction_pct: num(r.waste_reduction_pct),
    adherence_pct: numOrNull(r.adherence_pct),
    remeasure_pct: num(r.remeasure_pct),
  }))
}

export async function fetchFunnel(): Promise<FunnelRow[]> {
  const rows = await readView<FunnelRow>('v_funnel', { order: { column: 'stage_order' } })
  return rows.map((r) => ({ ...r, count: num(r.count) }))
}

export async function fetchCriticalWeeks(): Promise<CriticalWeekRow[]> {
  const rows = await readView<CriticalWeekRow>('v_critical_weeks', { order: { column: 'week_start' } })
  return rows.map((r) => ({ ...r, avg_ratio: num(r.avg_ratio) }))
}

export const LIVE_LIMIT = 30

export async function fetchLive(): Promise<LiveRow[]> {
  const rows = await readView<LiveRow>('v_live', {
    order: { column: 'created_at', ascending: false },
    limit: LIVE_LIMIT,
  })
  return rows.map((r) => ({ ...r, grams: num(r.grams) }))
}

export async function fetchCohortTrend(): Promise<CohortTrendRow[]> {
  const rows = await readView<CohortTrendRow>('v_cohort_trend', { order: { column: 'week_start' } })
  return rows.map((r) => ({ ...r, avg_event_kg: num(r.avg_event_kg), events: num(r.events) }))
}

export async function fetchWasteByItem(): Promise<WasteRow[]> {
  const rows = await readView<WasteRow>('v_waste_by_item_reason')
  return rows.map((r) => ({ ...r, grams: num(r.grams), entries: num(r.entries) }))
}

export async function fetchToolUsage(): Promise<ToolUsageRow[]> {
  const rows = await readView<ToolUsageRow>('v_tool_usage')
  return rows.map((r) => ({ ...r, clicks: num(r.clicks) }))
}

/* Arabic labels */

export const DRIVER_AR: Record<string, string> = {
  gathering: 'عزائم',
  gathering_after: 'بواقي عزيمة',
  ramadan: 'رمضان',
  eid: 'العيد',
  post_shopping: 'بعد الراتب',
  heatwave: 'موجة حر',
  travel_before: 'قبل السفر',
  school_start: 'بداية الدراسة',
}

export const TOOL_AR: Record<LitadoomTool, string> = {
  quantity_calculator: 'حاسبة الكميات',
  charity_request: 'طلب جمعية',
  measure: 'أداة القياس',
}
