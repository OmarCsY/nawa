// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { clearEngineSession, getSessionState, saveSessionState } from '../src/lib/engineSession'
import { prepareAdvance, prepareText, prepareVoice, toTurn, type Envelope } from '../src/lib/engineAdapter'
import { EngineError } from '../src/lib/engine'
const envelope = (extra = {}): Envelope => ({ request_id: 'test', session: { id: 'demo-session', token: 'synthetic-token' }, household_id: 'demo-household', stage: 'ready', effective_today: '2026-10-25', is_demo: true, reply_ar: 'رد', buttons: [], card: null, messages: [], ...extra })
const success = (body = envelope()) => ({ ok: true, status: 200, json: async () => body })
beforeEach(() => { sessionStorage.clear(); clearEngineSession() })
afterEach(() => vi.unstubAllGlobals())
describe('shared engine contract', () => {
  it('reuses exact request ID and bootstrap nonce after a lost response', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(success())
    vi.stubGlobal('fetch', fetchMock)
    const retry = prepareText('مرحبا')
    await expect(retry()).rejects.toBeInstanceOf(EngineError)
    await retry()
    const first = JSON.parse(fetchMock.mock.calls[0][1].body)
    const again = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(again).toEqual(first)
    expect(first.client_nonce).toMatch(/^[a-f0-9]{64}$/)
    expect(first).not.toHaveProperty('household_id')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/channels\/web\/inbound$/)
    expect(getSessionState().session?.id).toBe('demo-session')
  })
  it('sends authorized action target and version, not its display label', async () => {
    saveSessionState({ session: { id: 's', token: 't' } })
    const fetchMock = vi.fn().mockResolvedValue(success()); vi.stubGlobal('fetch', fetchMock)
    await prepareText('أي تسمية', { id: 'confirm_event', label: 'صح', target_id: 'draft-7', version: 2 })()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ type: 'action', action: { id: 'confirm_event', target_id: 'draft-7', version: 2 }, session: { id: 's', token: 't' } })
    expect(fetchMock.mock.calls[0][0]).not.toContain('token')
  })
  it.each([-62.5, -0.5, 12.5, 0, null])('preserves percentage direction and null: %s', change_pct => {
    const turn = toTurn(envelope({ card: { type: 'outcome', status: 'saved', data: { actual_g: 700, prev_similar_g: change_pct === null ? null : 1000, change_pct } } }))
    expect(turn.replies[0].result?.change_pct).toBe(change_pct)
  })
  it('renders ordered additional messages once', () => {
    const turn = toTurn(envelope({ reply_ar: 'الأصل', messages: [{ reply_ar: 'الأول' }, { reply_ar: 'الثاني' }] }))
    expect(turn.replies.map(r => r.text)).toEqual(['الأصل', 'الأول', 'الثاني'])
  })
  it('uses multipart audio and metadata with no manual boundary', async () => {
    saveSessionState({ session: { id: 's', token: 't' } })
    const fetchMock = vi.fn().mockResolvedValue(success()); vi.stubGlobal('fetch', fetchMock)
    await prepareVoice(new Blob(['synthetic'], { type: 'audio/mp4' }))()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/measurements\/voice$/)
    expect(options.headers).toBeUndefined()
    expect(options.body.get('audio').name).toBe('voice.m4a')
    expect(JSON.parse(options.body.get('metadata'))).toMatchObject({ type: 'voice', session: { id: 's', token: 't' } })
  })
  it('rejects oversized voice before fetch', () => expect(() => prepareVoice(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]))).toThrow('10'))
  it('does not advance a real family', () => { saveSessionState({ session: { id: 's', token: 't' }, isDemo: false }); expect(() => prepareAdvance(2)).toThrow('الديمو') })
  it('keeps advance-time retry idempotent', async () => {
    saveSessionState({ session: { id: 's', token: 't' }, isDemo: true })
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(success()); vi.stubGlobal('fetch', fetchMock)
    const retry = prepareAdvance(7); await expect(retry()).rejects.toThrow(); await retry()
    expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body)
  })
  it('uses the Arabic provider error, not stack traces', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { code: 'AUDIO_TRANSCRIPTION_FAILED', message_ar: 'تعذر تفريغ الصوت', retryable: true } }) }))
    await expect(prepareText('نص')()).rejects.toMatchObject({ message: 'تعذر تفريغ الصوت', code: 'AUDIO_TRANSCRIPTION_FAILED', retryable: true })
  })
})
