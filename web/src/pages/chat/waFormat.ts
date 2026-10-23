/** Time of day for a bubble: "10:42 م". `at` is a naive local timestamp (see BotMessage.at). */
export const clock = (at: string) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(at))

/** Voice note length: "0:07". */
export const mmss = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
