import type { BotMessage } from '../../lib/engineAdapter'
import { formatNumber, weekdayLong } from '../../lib/format'
import { countAr } from '../../lib/nashra'
import type { Turn } from './chatStore'

/**
 * What the engine did for one exchange, rebuilt from the normalized messages (never the raw wire format),
 * so the "behind the scenes" panel keeps working whichever engine answers (docs/nawa_idea.md §7–8).
 */

export interface PipelineStep {
  title: string
  detail: string
  /** False when this stage had nothing to do for this message: it is shown dimmed. */
  applies: boolean
}

const ITEMS = { one: 'صنف', two: 'صنفان', few: 'أصناف', many: 'صنفًا' }
const kg = (grams: number) => `${formatNumber(grams / 1000, 2)} كجم`

const find = <K extends BotMessage['kind']>(turn: Turn, kind: K) => turn.replies.find((r) => r.kind === kind)

export function buildPipeline(turn: Turn): PipelineStep[] {
  const items = find(turn, 'items')?.items
  const event = find(turn, 'event')?.event
  const plan = find(turn, 'plan')
  const result = find(turn, 'result')?.result
  const link = find(turn, 'link')?.link

  // ① voice → text
  const transcript = items?.transcript ?? result?.transcript ?? null
  const speech: PipelineStep =
    turn.trigger === 'voice'
      ? { title: 'تحويل الصوت لنص', detail: transcript ? `«${transcript}»` : 'تحويل الصوتية لنص عربي', applies: true }
      : {
          title: 'تحويل الصوت لنص',
          detail: turn.trigger === 'time' ? 'مجدول من المحرك، بدون رسالة من الأسرة' : 'الرسالة نصية، ما تحتاج تحويل',
          applies: false,
        }

  // ② understanding
  let understand: PipelineStep
  if (items) {
    const reasons = [...new Set(items.rows.map((r) => r.reason))].join(' · ')
    understand = {
      title: 'استخراج الأصناف والكميات والأسباب',
      detail: `${countAr(items.rows.length, ITEMS)} · ${kg(items.total_g)} · ${reasons}`,
      applies: true,
    }
  } else if (result) {
    understand = {
      title: 'استخراج الأصناف والكميات والأسباب',
      detail: `هدر العزيمة ${kg(result.actual_g)} من الأصناف المذكورة`,
      applies: true,
    }
  } else if (event) {
    const guests = event.guests !== null ? ` · ${event.guests} شخص` : ''
    understand = {
      title: 'فهم المناسبة: النوع والتاريخ والعدد',
      detail: `${event.label} · ${weekdayLong(event.starts_on)}${guests}`,
      applies: true,
    }
  } else if (turn.trigger === 'time') {
    understand = { title: 'فهم الرسالة', detail: 'ما فيه رسالة جديدة من الأسرة', applies: false }
  } else {
    understand = {
      title: 'فهم المقصود من الرسالة',
      detail: turn.said ? `«${turn.said}»` : 'طلب من الأسرة',
      applies: true,
    }
  }

  // ③ forecast
  let forecast: PipelineStep
  if (event) {
    forecast = { title: 'تحديث توقع الأسبوع', detail: event.status === 'confirmed' ? 'تُحتسب المناسبة المؤكدة في توقع الأسبوع' : 'ننتظر التأكيد قبل احتساب المناسبة', applies: event.status === 'confirmed' }
  } else if (link) {
    forecast = { title: 'تحديث توقع الأسبوع', detail: link.description, applies: true }
  } else if (plan) {
    forecast = { title: 'تحديث توقع الأسبوع', detail: (plan.text ?? '').split('.')[0] || 'يوم الذروة اقترب', applies: true }
  } else if (result) {
    forecast = {
      title: 'تحديث توقع الأسبوع',
      detail: result.change_pct === null || result.previous_g === null ? 'لا توجد مقارنة سابقة كافية.' : `التغير ${formatNumber(result.change_pct, 1)}% مقابل ${kg(result.previous_g)}`,
      applies: true,
    }
  } else if (items) {
    forecast = { title: 'تحديث توقع الأسبوع', detail: items.status === 'confirmed' ? 'تُضاف القراءة المؤكدة لمعدل هدر بيتكم' : 'ننتظر التأكيد قبل احتساب القراءة', applies: items.status === 'confirmed' }
  } else {
    forecast = { title: 'تحديث توقع الأسبوع', detail: 'ما تغيّر شي في توقع الأسبوع', applies: false }
  }

  // ④ plan library
  let library: PipelineStep
  if (plan?.plan) {
    library = {
      title: 'اختيار الخطة من مكتبة لتدوم',
      detail: `${countAr(plan.plan.steps.length, { one: 'خطوة', two: 'خطوتان', few: 'خطوات', many: 'خطوة' })} من المكتبة، مع ${
        plan.plan.tools.length ? 'أداة لتدوم' : 'نصائح جاهزة'
      }`,
      applies: true,
    }
  } else if (event) {
    library = { title: 'اختيار الخطة من مكتبة لتدوم', detail: 'تُرسل الخطة قبل الذروة بيومين، الساعة 8:30 م', applies: true }
  } else if (result?.best_step) {
    library = { title: 'اختيار الخطة من مكتبة لتدوم', detail: `أفضل خطوة نفعتكم: ${result.best_step}`, applies: true }
  } else {
    library = { title: 'اختيار الخطة من مكتبة لتدوم', detail: 'ما يلزم خطة لهذه الرسالة', applies: false }
  }

  // ⑤ database
  let save: PipelineStep
  if (items) save = { title: 'الحفظ في قاعدة البيانات', detail: items.status === 'confirmed' ? 'حُفظ القياس بأصنافه وأسبابه' : 'مسودة؛ ننتظر التأكيد قبل الحفظ', applies: true }
  else if (result) save = { title: 'الحفظ في قاعدة البيانات', detail: 'حُفظت النتيجة، وظهرت في البث الحي على لوحة لتدوم', applies: true }
  else if (event) save = { title: 'الحفظ في قاعدة البيانات', detail: event.status === 'confirmed' ? 'حُفظت المناسبة وتاريخها' : 'مسودة؛ ننتظر تأكيد المناسبة', applies: true }
  else if (plan) save = { title: 'الحفظ في قاعدة البيانات', detail: 'حُفظت الخطة المرسلة لمتابعة تطبيقها', applies: true }
  else save = { title: 'الحفظ في قاعدة البيانات', detail: 'ما فيه شي جديد للحفظ', applies: false }

  return [speech, understand, forecast, library, save]
}
