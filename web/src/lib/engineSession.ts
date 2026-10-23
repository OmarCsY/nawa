export interface EngineSession { id: string; token: string }
export interface SessionState { session: EngineSession | null; today: string; stage: string | null; isDemo: boolean }
const KEY = 'nawa.engine.session.v2'
const empty = (): SessionState => ({ session: null, today: '2026-10-25', stage: null, isDemo: true })
function restore(): SessionState {
  try { const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (raw?.session?.id && raw?.session?.token && typeof raw.today === 'string') return raw } catch { /* Storage may be disabled. */ }
  return empty()
}
let state = restore()
export const getSessionState = () => state
export function saveSessionState(update: Partial<SessionState>) {
  state = { ...state, ...update }
  try { sessionStorage.setItem(KEY, JSON.stringify(state)) } catch { /* In-memory fallback. */ }
  window.dispatchEvent(new Event('nawa:session'))
}
export function clearEngineSession() { state = empty(); try { sessionStorage.removeItem(KEY) } catch { /* In-memory fallback. */ }; window.dispatchEvent(new Event('nawa:session')) }
export const newRequestId = () => crypto.randomUUID()
export const newClientNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('')
