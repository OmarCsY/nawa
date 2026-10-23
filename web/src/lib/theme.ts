/**
 * Bridge from the CSS tokens in src/index.css to JS consumers (ECharts, QR codes).
 * Values are read from the live stylesheet so there is still only one place to change a color.
 */

const TOKENS = [
  'plum',
  'plum-soft',
  'saffron',
  'saffron-soft',
  'sand',
  'paper',
  'ink',
  'muted',
  'line',
  'risk-low',
  'risk-mid',
  'risk-high',
] as const

export type Token = (typeof TOKENS)[number]

export function token(name: Token): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
}

/** Register with `echarts.registerTheme('nawa', echartsTheme())` before the first chart renders. */
export function echartsTheme() {
  const t = Object.fromEntries(TOKENS.map((n) => [n, token(n)])) as Record<Token, string>
  const axis = {
    axisLine: { lineStyle: { color: t.line } },
    axisTick: { show: false },
    axisLabel: { color: t.muted },
    splitLine: { lineStyle: { color: t.line, type: 'dashed' } },
  }
  return {
    color: [t.plum, t.saffron, t['risk-mid'], t['risk-high'], t.muted, t['risk-low']],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, color: t.ink },
    title: { textStyle: { color: t.ink, fontWeight: 500 }, subtextStyle: { color: t.muted } },
    legend: { textStyle: { color: t.muted } },
    tooltip: {
      backgroundColor: t.paper,
      borderColor: t.line,
      textStyle: { color: t.ink },
      extraCssText: 'border-radius:12px;box-shadow:0 12px 32px -18px rgb(94 39 80 / .35);direction:rtl;',
    },
    categoryAxis: axis,
    valueAxis: axis,
    visualMap: { inRange: { color: [t['risk-low'], t['risk-mid'], t['risk-high']] } },
  }
}
