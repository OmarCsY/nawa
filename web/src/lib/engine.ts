import { env } from './env'
export class EngineError extends Error {
  constructor(message: string, readonly status: number | null = null, readonly code = 'NETWORK_ERROR', readonly retryable = true) { super(message); this.name = 'EngineError' }
}
export async function engineRequest<T>(path: string, body: BodyInit, json: boolean): Promise<T> {
  if (!env.engineUrl) throw new EngineError('تعذّر تشغيل المحادثة. إعداد الاتصال غير متاح.', null, 'CONFIG_ERROR', false)
  let res: Response
  try { res = await fetch(`${env.engineUrl}${path}`, { method: 'POST', headers: json ? { 'Content-Type': 'application/json' } : undefined, body, signal: AbortSignal.timeout(150_000) }) }
  catch (error) { throw new EngineError(error instanceof DOMException && error.name === 'TimeoutError' ? 'تأخر الرد. أعد المحاولة لنفس الرسالة؛ لن يتكرر الحفظ.' : 'تعذّر الاتصال. تحقق من الشبكة وأعد المحاولة لنفس الرسالة.') }
  let result: { error?: { code?: string; message_ar?: string; retryable?: boolean } }
  try { result = await res.json() } catch { throw new EngineError('تعذّر قراءة الرد. أعد المحاولة لنفس الرسالة.', res.status) }
  if (!res.ok || result.error) throw new EngineError(result.error?.message_ar || 'تعذّر إكمال العملية. حاول مرة أخرى.', res.status, result.error?.code || 'ENGINE_ERROR', result.error?.retryable ?? res.status >= 500)
  return result as T
}
