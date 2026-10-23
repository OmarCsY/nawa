import { fetchNashra } from './supabase'
import type { LitadoomTool, RiskLevel } from './types'

/** Shape of rpc fn_nashra (docs/nawa_idea.md §10.3), normalised so the page never handles strings-for-numbers. */

export type PlanPhase = 'before' | 'during' | 'after'

export interface NashraStep {
  step_id: string
  phase: PlanPhase
  text_ar: string
  litadoom_tool: LitadoomTool | null
}

export interface NashraDay {
  day: string // YYYY-MM-DD
  level: RiskLevel
  expected_kg: number
  ratio: number
  drivers: string[]
  top_driver: string | null
  reason_ar: string | null
  items_at_risk: string[]
  plan: NashraStep[] | null
}

export interface NashraItem {
  item_ar: string
  grams: number
  /** Whole percent of the household's waste (47 = 47%), not a 0–1 ratio. */
  share: number
}

export interface NashraOutcome {
  actual_g: number
  prev_similar_g: number
  /** Percent; negative = less waste than the previous similar event. */
  change_pct: number
}

export interface Nashra {
  household: { id: string; size: number; city: string; today: string }
  days: NashraDay[]
  top_items: NashraItem[]
  last_outcome: NashraOutcome | null
}

type Raw<T> = { [K in keyof T]?: unknown }

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v))

/** Resolves to `null` when the id doesn't exist (the RPC answers with `household: null`). */
export async function loadNashra(id: string): Promise<Nashra | null> {
  const raw = await fetchNashra<{
    household: Nashra['household'] | null
    days?: Array<Raw<NashraDay>>
    top_items?: Array<Raw<NashraItem>>
    last_outcome?: Raw<NashraOutcome> | null
  } | null>({ p_household: id })
  if (!raw?.household) return null

  const days = (raw.days ?? [])
    .map((d) => ({
      day: String(d.day),
      level: d.level as RiskLevel,
      expected_kg: num(d.expected_kg),
      ratio: num(d.ratio),
      drivers: (d.drivers as string[] | null) ?? [],
      top_driver: (d.top_driver as string | null) ?? null,
      reason_ar: (d.reason_ar as string | null) ?? null,
      items_at_risk: (d.items_at_risk as string[] | null) ?? [],
      plan: (d.plan as NashraStep[] | null)?.length ? (d.plan as NashraStep[]) : null,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const out = raw.last_outcome
  return {
    household: { ...raw.household, size: num(raw.household.size) },
    days,
    top_items: (raw.top_items ?? []).map((i) => ({
      item_ar: String(i.item_ar),
      grams: num(i.grams),
      share: num(i.share),
    })),
    last_outcome: out
      ? { actual_g: num(out.actual_g), prev_similar_g: num(out.prev_similar_g), change_pct: num(out.change_pct) }
      : null,
  }
}

/* Arabic counted nouns: 1 and 2 have their own forms, 3–10 take the plural, 11+ the singular accusative. */
export function countAr(n: number, forms: { one: string; two: string; few: string; many: string }): string {
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  return n <= 10 ? `${n} ${forms.few}` : `${n} ${forms.many}`
}
