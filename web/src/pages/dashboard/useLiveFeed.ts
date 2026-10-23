import { useEffect, useState } from 'react'
import { fetchLive, LIVE_LIMIT, type LiveRow } from '../../lib/dashboard'
import { subscribeLiveFeed, type LiveStatus } from '../../lib/supabase'
import { useAsync } from '../../lib/useAsync'

function merge(current: LiveRow[], incoming: LiveRow[]): LiveRow[] {
  const byId = new Map<number, LiveRow>()
  for (const row of [...incoming, ...current]) if (!byId.has(row.id)) byId.set(row.id, row)
  return [...byId.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, LIVE_LIMIT)
}

/**
 * Latest 30 rows from v_live, plus Realtime inserts on live_feed prepended as they land.
 * `fresh` holds ids that arrived over Realtime, so only those animate in.
 */
export function useLiveFeed() {
  const initial = useAsync(fetchLive)
  const [rows, setRows] = useState<LiveRow[]>([])
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set())
  const [status, setStatus] = useState<LiveStatus>('connecting')

  // Merge rather than replace: a realtime row may land before the initial fetch resolves.
  useEffect(() => {
    if (initial.data) setRows((prev) => merge(prev, initial.data!))
  }, [initial.data])

  useEffect(() => {
    let unsubscribe = () => {}
    try {
      unsubscribe = subscribeLiveFeed<LiveRow>((row) => {
        const clean = { ...row, grams: Number(row.grams) }
        setRows((prev) => merge(prev, [clean]))
        setFresh((prev) => new Set(prev).add(clean.id))
      }, setStatus)
    } catch {
      setStatus('offline') // missing Supabase config; the panel shows the fetch error
    }
    return unsubscribe
  }, [])

  return { rows, fresh, status, loading: initial.loading && rows.length === 0, error: initial.error, reload: initial.reload }
}
