<template>
  <section class="panel chart-panel">
    <div class="panel-header chart-header">
      <div class="chart-title">
        <span class="panel-eyebrow">Relatório</span>
        <h2>Visão anual</h2>
        <span class="chart-subtitle" :class="{ negative: (totaisAno.liquido || 0) < 0 }" v-html="subtitleHtml"></span>
      </div>
      <div class="chart-highlights" v-html="highlightsHtml"></div>
    </div>
    <div class="chart-wrap">
      <canvas ref="canvasRef"></canvas>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useGastosStore } from '@/stores/gastos'
import { useTheme } from '@/composables/useTheme'
import { fmtBRL, fmtCompactBRL, escapeHtml } from '@/utils/format'

Chart.register(...registerables)

const gastosStore = useGastosStore()
const { darkMode } = useTheme()

const canvasRef = ref(null)
let chartInstance = null

const mensal = computed(() => gastosStore.chartData?.mensal || [])
const totaisAno = computed(() => gastosStore.chartData?.totais_ano || { entrada: 0, saida: 0, liquido: 0 })

const subtitleHtml = computed(() => {
  const t = totaisAno.value
  return (
    `<span class="dot dot-green"></span> ${fmtBRL(t.entrada)}` +
    ` <span class="sep">·</span> ` +
    `<span class="dot dot-red"></span> ${fmtBRL(t.saida)}` +
    ` <span class="sep">·</span> ` +
    `<span class="dot dot-mustard"></span> <strong>${fmtBRL(t.liquido)}</strong>`
  )
})

const highlightsHtml = computed(() => {
  const comDados = mensal.value.filter((m) => m.entrada || m.saida)
  if (!comDados.length) return ''
  const melhor = comDados.reduce((a, b) => (a.liquido >= b.liquido ? a : b))
  const pior = comDados.reduce((a, b) => (a.liquido <= b.liquido ? a : b))
  const mediaSaida = comDados.reduce((s, m) => s + m.saida, 0) / comDados.length
  return `
    <div class="highlight">
      <span class="highlight-label">Melhor mês</span>
      <span class="highlight-value valor-pos">${escapeHtml(melhor.mes_nome.slice(0, 3))} · ${fmtCompactBRL(melhor.liquido)}</span>
    </div>
    <div class="highlight">
      <span class="highlight-label">Pior mês</span>
      <span class="highlight-value valor-neg">${escapeHtml(pior.mes_nome.slice(0, 3))} · ${fmtCompactBRL(pior.liquido)}</span>
    </div>
    <div class="highlight">
      <span class="highlight-label">Saída média</span>
      <span class="highlight-value">${fmtCompactBRL(mediaSaida)}</span>
    </div>`
})

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function makeGradient(ctx, area, c1, c2) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  return g
}

const hoverGuidePlugin = {
  id: 'hoverGuide',
  defaults: { currentMonth: null, liquidoLabels: null },
  afterDraw(chart, _args, options) {
    const { ctx, tooltip, chartArea, scales } = chart
    if (!chartArea) return

    const currentMonth = options?.currentMonth
    if (currentMonth && currentMonth >= 1 && currentMonth <= 12) {
      const x = scales.x.getPixelForValue(currentMonth - 1)
      const barWidth = (chartArea.right - chartArea.left) / 12
      ctx.save()
      ctx.fillStyle = 'rgba(212, 155, 59, 0.06)'
      ctx.fillRect(x - barWidth / 2, chartArea.top, barWidth, chartArea.bottom - chartArea.top)
      ctx.restore()
    }

    const liquidoLabels = options?.liquidoLabels
    if (Array.isArray(liquidoLabels) && liquidoLabels.length) {
      ctx.save()
      ctx.font = "500 10.5px 'JetBrains Mono', monospace"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      liquidoLabels.forEach((valor, i) => {
        if (valor === 0) return
        const x = scales.x.getPixelForValue(i)
        const y = chartArea.top - 8
        const label = fmtCompactBRL(valor)
        const w = ctx.measureText(label).width + 10
        const h = 16
        const bg = valor >= 0 ? 'rgba(0, 172, 193, 0.12)' : 'rgba(220, 38, 38, 0.12)'
        const border = valor >= 0 ? 'rgba(0, 172, 193, 0.45)' : 'rgba(220, 38, 38, 0.45)'
        const color = valor >= 0 ? cssVar('--petrol-deep') : cssVar('--red')
        const r = 6
        ctx.beginPath()
        ctx.moveTo(x - w / 2 + r, y - h / 2)
        ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, r)
        ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, r)
        ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, r)
        ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, r)
        ctx.closePath()
        ctx.fillStyle = bg
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = border
        ctx.stroke()
        ctx.fillStyle = color
        ctx.fillText(label, x, y)
      })
      ctx.restore()
    }

    if (tooltip && tooltip.opacity > 0 && tooltip.dataPoints?.length) {
      const x = tooltip.dataPoints[0].element.x
      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(212, 155, 59, 0.5)'
      ctx.stroke()
      ctx.restore()
    }
  },
}

function buildChart() {
  if (chartInstance) chartInstance.destroy()
  if (!canvasRef.value || !mensal.value.length) return

  const dark = darkMode.value
  const labels = mensal.value.map((m) => m.mes_nome.slice(0, 3))
  const liquido = mensal.value.map((m) => m.liquido)
  const entrada = mensal.value.map((m) => m.entrada)
  const saida = mensal.value.map((m) => m.saida)

  const isCurrentYear = gastosStore.ano === new Date().getFullYear()
  const currentMonth = isCurrentYear ? new Date().getMonth() + 1 : null

  const gridColor = dark ? cssVar('--border-soft') : 'rgba(221,224,229,0.8)'
  const tickColor = cssVar('--text-muted')
  const legendColor = cssVar('--text-secondary')
  const petrol = cssVar('--petrol')
  const red = cssVar('--red')
  const gold = cssVar('--gold')
  const pointBorder = cssVar('--surface-2')
  const cream = cssVar('--cream')
  const monoFont = cssVar('--font-mono')
  const displayFont = cssVar('--font-sans')

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Entrada',
          data: entrada,
          borderColor: petrol,
          backgroundColor: (ctx) => {
            const { chart } = ctx
            if (!chart.chartArea) return 'rgba(0, 172, 193, 0.15)'
            return makeGradient(chart.ctx, chart.chartArea, 'rgba(0, 172, 193, 0.28)', 'rgba(0, 172, 193, 0.02)')
          },
          borderWidth: 2, tension: 0.4, fill: true,
          pointRadius: 0, pointHoverRadius: 6,
          pointHoverBackgroundColor: petrol,
          pointHoverBorderColor: pointBorder, pointHoverBorderWidth: 2,
          order: 3,
        },
        {
          label: 'Saída',
          data: saida,
          borderColor: red,
          backgroundColor: (ctx) => {
            const { chart } = ctx
            if (!chart.chartArea) return 'rgba(220, 38, 38, 0.12)'
            return makeGradient(chart.ctx, chart.chartArea, 'rgba(220, 38, 38, 0.22)', 'rgba(220, 38, 38, 0.02)')
          },
          borderWidth: 2, tension: 0.4, fill: true,
          pointRadius: 0, pointHoverRadius: 6,
          pointHoverBackgroundColor: red,
          pointHoverBorderColor: pointBorder, pointHoverBorderWidth: 2,
          order: 2,
        },
        {
          label: 'Líquido',
          data: liquido,
          borderColor: gold,
          backgroundColor: 'transparent',
          borderWidth: 3, tension: 0.4, fill: false,
          pointBackgroundColor: gold, pointBorderColor: pointBorder,
          pointBorderWidth: 2,
          pointRadius: (ctx) => (ctx.parsed?.y ?? 0) === 0 ? 0 : 3.5,
          pointHoverRadius: 7,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 28, right: 12, left: 4, bottom: 4 } },
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        hoverGuide: { currentMonth, liquidoLabels: liquido },
        legend: {
          position: 'bottom', align: 'end',
          labels: {
            usePointStyle: true, pointStyle: 'circle',
            boxWidth: 8, boxHeight: 8, padding: 18,
            font: { size: 12, weight: '600', family: displayFont },
            color: legendColor,
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(22, 25, 31, 0.96)',
          titleColor: gold,
          titleFont: { weight: '700', size: 13, family: displayFont },
          titleMarginBottom: 8,
          bodyColor: cream,
          bodyFont: { size: 12, family: monoFont },
          bodySpacing: 6,
          padding: { x: 14, y: 12 },
          cornerRadius: 10,
          displayColors: true, boxPadding: 6,
          borderColor: 'rgba(212, 175, 55, 0.28)', borderWidth: 1,
          caretSize: 6,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (c) => `  ${c.dataset.label}: ${fmtBRL(c.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11, weight: '600', family: displayFont }, padding: 6 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor, drawTicks: false, lineWidth: 1 },
          ticks: {
            color: tickColor, font: { size: 10, family: monoFont },
            padding: 10, maxTicksLimit: 6,
            callback: (v) => fmtCompactBRL(v),
          },
          border: { display: false },
        },
      },
    },
    plugins: [hoverGuidePlugin],
  })
}

watch([mensal, darkMode], buildChart, { deep: true })
onMounted(buildChart)
onUnmounted(() => { if (chartInstance) chartInstance.destroy() })
</script>
