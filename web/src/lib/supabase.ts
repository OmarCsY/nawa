import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Read-only Supabase access. The publishable key may only:
 *   - select from views named v_*
 *   - subscribe to inserts on the live_feed table (Realtime)
 *   - call rpc fn_nashra
 * The raw client is intentionally not exported, so no screen can query a raw table.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

let client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (client) return client
  if (!env.supabaseUrl || !env.supabaseKey) {
    throw new ConfigError('VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY غير مضبوطين في ملف .env')
  }
  client = createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

export type ViewName = `v_${string}`

interface ReadOptions {
  columns?: string
  order?: { column: string; ascending?: boolean }
  limit?: number
}

/** Select rows from an aggregated view. */
export async function readView<Row = Record<string, unknown>>(view: ViewName, options: ReadOptions = {}): Promise<Row[]> {
  let query = db().from(view).select(options.columns ?? '*')
  if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
  if (options.limit) query = query.limit(options.limit)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Row[]
}

export type LiveStatus = 'connecting' | 'live' | 'offline'

/** Realtime inserts on live_feed. Returns an unsubscribe function. */
export function subscribeLiveFeed<Row = Record<string, unknown>>(
  onInsert: (row: Row) => void,
  onStatus?: (status: LiveStatus) => void,
): () => void {
  onStatus?.('connecting')
  const channel: RealtimeChannel = db()
    .channel('live_feed_inserts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_feed' }, (payload) =>
      onInsert(payload.new as Row),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('live')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus?.('offline')
    })
  return () => {
    void db().removeChannel(channel)
  }
}

/** A household's bulletin (nashra) via rpc fn_nashra. Args are passed through as named params. */
export async function fetchNashra<Result = unknown>(args: Record<string, unknown>): Promise<Result> {
  const { data, error } = await db().rpc('fn_nashra', args)
  if (error) throw error
  return data as Result
}
