import type { ForecastDay, MeasuredItem, Outcome, Plan } from '../lib/types'

/*
 * Demo fixtures. The forecast days for 29 & 31 Oct and the plan are copied verbatim
 * from docs/nawa_idea.md §8.2; the measurement items and the 62% result from §4.
 */

export { DEMO_HOUSEHOLD_ID, DEMO_START_DATE } from '../lib/demo'
export const DEMO_EVENT_DATE = '2026-10-29' // الخميس
export const MODEL_VERSION = 'risk-v1'

/** A quiet week: the baseline before the household mentions anything. */
export const BASELINE_WEEK: ForecastDay[] = [
  { date: '2026-10-25', expected_kg: 0.7 },
  { date: '2026-10-26', expected_kg: 0.8 },
  { date: '2026-10-27', expected_kg: 0.7 },
  { date: '2026-10-28', expected_kg: 0.8 },
  { date: '2026-10-29', expected_kg: 0.8 },
  { date: '2026-10-30', expected_kg: 0.7 },
  { date: '2026-10-31', expected_kg: 0.8 },
].map((d) => ({
  ...d,
  level: 'low' as const,
  drivers: [],
  reason_ar: 'يوم عادي على معدل بيتكم',
  items_at_risk: [],
}))

export const GATHERING_DAY: ForecastDay = {
  date: '2026-10-29',
  level: 'high',
  expected_kg: 2.1,
  drivers: ['gathering'],
  reason_ar: 'عزيمة 14 شخص. آخر 3 عزائم = 58% من هدر شهركم',
  items_at_risk: ['رز مطبوخ', 'خبز'],
}

/** The day after a gathering keeps a ×1.5 multiplier (§8.3). */
export const GATHERING_NEXT_DAY: ForecastDay = {
  date: '2026-10-30',
  level: 'mid',
  expected_kg: 1.1,
  drivers: ['gathering'],
  reason_ar: 'بواقي العزيمة: اليوم الثاني يرفع الهدر',
  items_at_risk: ['رز مطبوخ', 'لحوم'],
}

export const TRAVEL_DAY: ForecastDay = {
  date: '2026-10-31',
  level: 'high',
  expected_kg: 1.4,
  drivers: ['travel_before'],
  reason_ar: 'سفر 4 أيام: الحليب والخبز والورقيات بتخرب',
  items_at_risk: ['حليب', 'خبز', 'خضار ورقية'],
}

export const GATHERING_PLAN: Plan = {
  plan_id: 'pl_301',
  send_at: '2026-10-27T20:30:00+03:00',
  steps: [
    { step_id: 'G-PRE-02', phase: 'before', text_ar: 'الأربعاء: فضّوا رف بالثلاجة وجهّزوا علب للبواقي' },
    { step_id: 'G-DUR-01', phase: 'during', text_ar: 'بعد العشاء: الباقي يدخل الثلاجة بسرعة، والرز يتقسّم ويتجمّد' },
    { step_id: 'G-AFT-03', phase: 'after', text_ar: 'الجمعة: غداكم من بواقي العزيمة بدل طبخ جديد' },
  ],
  litadoom_tools: [{ tool: 'quantity_calculator', url: '{رابط حاسبة الكميات}' }],
  source: 'plan_library_v1',
}

export const VOICE_ITEMS: MeasuredItem[] = [
  { item_ar: 'رز مطبوخ', category: 'grains_cooked', qty_text: 'نص قدر', grams: 600, reason: 'overcooked', confidence: 0.8 },
  { item_ar: 'خبز', category: 'bakery', qty_text: 'ربطة إلا ربع', grams: 300, reason: 'spoiled', confidence: 0.75 },
  { item_ar: 'خس', category: 'vegetables_leafy', qty_text: 'حبة', grams: 150, reason: 'forgotten', confidence: 0.7 },
]

/** Post-gathering measurement: 0.9 kg against 2.4 kg last time → 62% less (§4 step 6). */
export const GATHERING_OUTCOME: Outcome = {
  plan_id: 'pl_301',
  actual_g: 900,
  prev_similar_g: 2400,
  change_pct: -0.62,
  best_step_ar: 'علب البواقي',
  charity_url: '{رابط طلب جمعية}',
}

/** What the "voice note" says in the demo, as the transcription step would return it. */
export const VOICE_TRANSCRIPT_ITEMS = 'رمينا اليوم نص قدر رز، وربطة خبز إلا ربع، وخسة خربت بالثلاجة'
export const VOICE_TRANSCRIPT_OUTCOME = 'الحمدلله ما انرمى إلا شوية: نص صحن رز وشوية لحم وشوية خبز يابس'

export const REASON_AR: Record<MeasuredItem['reason'], string> = {
  overcooked: 'طبخ زيادة',
  spoiled: 'يبس أو خرب',
  expired: 'انتهت الصلاحية',
  plate_leftover: 'بواقي صحون',
  forgotten: 'نسيان بالثلاجة',
  overbought: 'تسوق زيادة',
  other: 'أخرى',
}
