import type { RiskLevel } from './types'

/*
 * Arabic text with Western digits — matches the copy in docs/nawa_idea.md ("0.9 كجم", "62%").
 * Dates are plain YYYY-MM-DD strings handled in UTC so they never drift across time zones.
 */

const LOCALE = 'ar-SA-u-nu-latn'
const GREGORY = 'ar-SA-u-ca-gregory-nu-latn'
const HIJRI = 'ar-SA-u-ca-islamic-umalqura-nu-latn'

function utc(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number): string {
  const d = utc(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return toIsoDate(d)
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((utc(toIso).getTime() - utc(fromIso).getTime()) / 86_400_000)
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayIndex(isoDate: string): number {
  return utc(isoDate).getUTCDay()
}

function part(isoDate: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(utc(isoDate))
}

export const weekdayLong = (d: string) => part(d, GREGORY, { weekday: 'long' })
export const weekdayShort = (d: string) => part(d, GREGORY, { weekday: 'short' })
export const dayOfMonth = (d: string) => part(d, GREGORY, { day: 'numeric' })

/** "29 أكتوبر" */
export function formatDayMonth(isoDate: string): string {
  return `${dayOfMonth(isoDate)} ${part(isoDate, GREGORY, { month: 'long' })}`
}

/** "الخميس 29 أكتوبر" */
export function formatDayLong(isoDate: string): string {
  return `${weekdayLong(isoDate)} ${formatDayMonth(isoDate)}`
}

/** "7 ربيع الآخر 1448 هـ" */
export function formatHijri(isoDate: string): string {
  return part(isoDate, HIJRI, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "7 – 14 ربيع الآخر 1448 هـ" — the shared month and year are written once when both ends agree. */
export function formatHijriRange(fromIso: string, toIso: string): string {
  const fmt = new Intl.DateTimeFormat(HIJRI, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
  const pick = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find((p) => p.type === type)?.value
  const a = fmt.formatToParts(utc(fromIso))
  const b = fmt.formatToParts(utc(toIso))
  const sameMonth = pick(a, 'month') === pick(b, 'month') && pick(a, 'year') === pick(b, 'year')
  return sameMonth ? `${pick(a, 'day')} – ${formatHijri(toIso)}` : `${formatHijri(fromIso)} – ${formatHijri(toIso)}`
}

/** Hijri month name, e.g. "رمضان" — used to label week axes. */
export function hijriMonth(isoDate: string): string {
  return part(isoDate, 'ar-SA-u-ca-islamic-umalqura', { month: 'long' })
}

/** "28 فبراير 2027" */
export function formatGregorian(isoDate: string): string {
  return part(isoDate, GREGORY, { day: 'numeric', month: 'long', year: 'numeric' })
}

/* Arabic locales may wrap numbers in invisible direction marks; layout handles direction instead (see <Num>). */
const BIDI_MARKS = /[\u200e\u200f\u061c]/g

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value).replace(BIDI_MARKS, '')
}

/** Signed number with a true minus sign ("−2.3"); render it inside <Num> so the sign stays put. */
export function formatSigned(value: number, maximumFractionDigits = 1): string {
  const abs = formatNumber(Math.abs(value), maximumFractionDigits)
  if (abs === '0') return abs
  return value < 0 ? `−${abs}` : `+${abs}`
}

/** Compact Arabic relative time: "الآن", "قبل 12 ث", "قبل 3 د", "قبل 2 س", "قبل 4 ي". */
export function formatAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return 'الآن'
  if (seconds < 60) return `قبل ${seconds} ث`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `قبل ${minutes} د`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `قبل ${hours} س`
  return `قبل ${Math.floor(hours / 24)} ي`
}

export function formatKg(grams: number): string {
  const kg = grams / 1000
  return `${formatNumber(kg, kg >= 100 ? 0 : 1)} كجم`
}

export function formatGrams(grams: number): string {
  return grams >= 1000 ? formatKg(grams) : `${formatNumber(grams, 0)} جم`
}

export function formatPercent(ratio: number, maximumFractionDigits = 0): string {
  return `${formatNumber(ratio * 100, maximumFractionDigits)}%`
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'منخفض',
  mid: 'متوسط',
  high: 'مرتفع',
}
