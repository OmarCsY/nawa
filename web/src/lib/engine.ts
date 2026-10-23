import { env } from './env'

/**
 * Transport to the Nawa engine (n8n webhooks, docs/nawa_idea.md §8.2): URL, timeout, errors. Nothing else.
 * What goes into a request and what comes back is mapped in src/lib/engineAdapter.ts, the only caller.
 */

export class EngineError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'EngineError'
    this.status = status
  }
}

const TIMEOUT_MS = 25_000

export async function engineRequest<T>(path: string, body: BodyInit, json: boolean): Promise<T> {
  if (!env.engineUrl) throw new EngineError('VITE_ENGINE_URL غير مضبوط في ملف .env')

  let res: Response
  try {
    res = await fetch(`${env.engineUrl}${path}`, {
      method: 'POST',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
    throw new EngineError(timedOut ? 'المحرك تأخر في الرد. جرّب مرة ثانية.' : 'تعذّر الوصول للمحرك. تأكد من الاتصال.')
  }

  if (!res.ok) throw new EngineError(`المحرك رجّع خطأ (${res.status}).`, res.status)

  try {
    return (await res.json()) as T
  } catch {
    throw new EngineError('رد المحرك غير مفهوم.', res.status)
  }
}
