// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useRecorder } from '../src/pages/chat/useRecorder'
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })
it('handles microphone denial without creating or sending audio', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) } })
  vi.stubGlobal('MediaRecorder', class {})
  const onProblem = vi.fn(), onDone = vi.fn()
  const { result } = renderHook(() => useRecorder({ onDone, onProblem }))
  await act(async () => result.current.start(false))
  expect(onProblem).toHaveBeenCalledWith('denied')
  expect(result.current.phase).toBe('idle')
  expect(onDone).not.toHaveBeenCalled()
})
it('detects Safari AAC, previews before sending, stops tracks and revokes URLs', async () => {
  vi.useFakeTimers()
  const stopTrack = vi.fn(), onDone = vi.fn(), onProblem = vi.fn(), revoke = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) } })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:synthetic') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
  class FakeRecorder {
    static isTypeSupported(type: string) { return type === 'audio/mp4' }
    mimeType = 'audio/mp4'; state = 'inactive'
    ondataavailable?: (event: { data: Blob }) => void
    onstop?: () => void
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['synthetic AAC'], { type: this.mimeType }) }); this.onstop?.() }, 0) }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  const { result } = renderHook(() => useRecorder({ onDone, onProblem }))
  await act(async () => result.current.start(false))
  act(() => vi.advanceTimersByTime(1500))
  act(() => result.current.send())
  act(() => vi.advanceTimersByTime(1))
  expect(result.current.phase).toBe('preview')
  expect(onDone).not.toHaveBeenCalled()
  expect(stopTrack).toHaveBeenCalledOnce()
  act(() => result.current.send())
  expect(onDone).toHaveBeenCalledOnce()
  expect(onDone.mock.calls[0][0].type).toBe('audio/mp4')
  expect(revoke).toHaveBeenCalledWith('blob:synthetic')
  expect(result.current.phase).toBe('idle')
})
