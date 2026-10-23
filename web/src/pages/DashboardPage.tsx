import { Link } from 'react-router-dom'
import { DemoBadge, PageHeader } from '../components'
import { SHOWCASE_HOUSEHOLD_ID } from '../lib/demo'
import {
  fetchCohortTrend,
  fetchCriticalWeeks,
  fetchFunnel,
  fetchKpis,
  fetchToolUsage,
  fetchWasteByItem,
} from '../lib/dashboard'
import { useAsync } from '../lib/useAsync'
import { CohortTrendPanel } from './dashboard/CohortTrendPanel'
import { CriticalWeeksPanel } from './dashboard/CriticalWeeksPanel'
import { FunnelPanel } from './dashboard/FunnelPanel'
import { KpiSection } from './dashboard/KpiSection'
import { LiveFeedPanel } from './dashboard/LiveFeedPanel'
import { LiveIndicator } from './dashboard/LiveIndicator'
import { useLiveFeed } from './dashboard/useLiveFeed'
import { WasteByItemPanel } from './dashboard/WasteByItemPanel'

/** Litadoom's dashboard: aggregates only, read from v_* views; the live feed also listens on Realtime. */
export function DashboardPage() {
  // Each section loads (and fails) on its own, so one slow view never blanks the whole screen.
  const kpis = useAsync(fetchKpis)
  const tools = useAsync(fetchToolUsage)
  const funnel = useAsync(fetchFunnel)
  const weeks = useAsync(fetchCriticalWeeks)
  const trend = useAsync(fetchCohortTrend)
  const waste = useAsync(fetchWasteByItem)
  const live = useLiveFeed()

  return (
    <div className="space-y-8">
      <PageHeader
        title="لوحة لتدوم"
        lead="مدعومة بمحرك نَوء · أرقام مجمّعة فقط، بلا أي بيانات لأسرة بعينها"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/n/${SHOWCASE_HOUSEHOLD_ID}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-plum transition-colors hover:border-plum/40 hover:bg-plum-soft"
            >
              مثال نشرة أسرة
              <span aria-hidden>←</span>
            </Link>
            <LiveIndicator status={live.status} />
            <DemoBadge />
          </div>
        }
      />

      <KpiSection kpis={kpis} tools={tools} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <FunnelPanel {...funnel} className="lg:col-span-3" />
        <LiveFeedPanel
          rows={live.rows}
          fresh={live.fresh}
          loading={live.loading}
          error={live.error}
          onRetry={live.reload}
          className="lg:col-span-2"
        />
      </div>

      <CriticalWeeksPanel {...weeks} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <CohortTrendPanel {...trend} className="lg:col-span-3" />
        <WasteByItemPanel {...waste} className="lg:col-span-2" />
      </div>
    </div>
  )
}
