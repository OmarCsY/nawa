import { useEffect, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import { echarts, ensureTheme, THEME } from '../lib/charts'
import { LoadingSkeleton } from './LoadingSkeleton'

interface ChartProps {
  option: Record<string, unknown>
  height: number
  className?: string
  /** Accessible summary of what the chart shows. */
  label: string
}

/**
 * ECharts on canvas, themed with the Nawa tokens. Waits for the Arabic web font so canvas text
 * isn't measured with a fallback face (which would misplace labels).
 */
export function Chart({ option, height, className, label }: ChartProps) {
  const [fontsReady, setFontsReady] = useState(() => document.fonts.status === 'loaded')

  useEffect(() => {
    if (fontsReady) return
    let alive = true
    void document.fonts.ready.then(() => alive && setFontsReady(true))
    return () => {
      alive = false
    }
  }, [fontsReady])

  if (!fontsReady) return <LoadingSkeleton variant="card" className={className} />

  ensureTheme()
  return (
    <div role="img" aria-label={label} className={className}>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        theme={THEME}
        notMerge
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
