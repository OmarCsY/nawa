import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => void
}

/** Run an async loader on mount (and on reload). Late results from a superseded run are dropped. */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const refresh = () => setAttempt(n => n + 1)
    window.addEventListener('nawa:data-changed', refresh)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 30_000)
    return () => { window.removeEventListener('nawa:data-changed', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    load().then(
      (result) => {
        if (!current) return
        setData(result)
        setLoading(false)
      },
      (err: unknown) => {
        if (!current) return
        setError(err)
        setLoading(false)
      },
    )
    return () => {
      current = false
    }
    // `load` is expected to be a stable module-level function; `attempt` drives reloads.
  }, [attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { data, error, loading, reload }
}
