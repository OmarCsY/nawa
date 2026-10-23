import { cx } from '../../lib/cx'
import type { LiveStatus } from '../../lib/supabase'

const LABEL: Record<LiveStatus, string> = {
  live: 'مباشر',
  connecting: 'جاري الاتصال…',
  offline: 'البث متوقف',
}

export function LiveIndicator({ status }: { status: LiveStatus }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm font-bold text-ink"
    >
      <span
        aria-hidden
        className={cx(
          'size-2.5 rounded-full',
          status === 'live' && 'bg-risk-high motion-safe:animate-halo',
          status === 'connecting' && 'bg-saffron motion-safe:animate-pulse',
          status === 'offline' && 'bg-muted',
        )}
      />
      {LABEL[status]}
    </span>
  )
}
