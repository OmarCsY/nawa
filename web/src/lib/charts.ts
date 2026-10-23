import * as echarts from 'echarts/core'
import { HeatmapChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { echartsTheme } from './theme'

/* Tree-shaken ECharts: only what the dashboard draws. Colors come from the CSS tokens via theme.ts. */
echarts.use([HeatmapChart, LineChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

export const THEME = 'nawa'
let registered = false

export function ensureTheme(): void {
  if (registered) return
  echarts.registerTheme(THEME, echartsTheme())
  registered = true
}

export { echarts }

/** Escape DB-sourced text before it goes into an HTML tooltip. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
