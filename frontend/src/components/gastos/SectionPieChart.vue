<template>
  <section class="panel section-pie-panel" aria-label="Distribuição por seção">
    <div class="panel-header">
      <div class="panel-header-title">
        <span class="panel-eyebrow">Visão mensal</span>
        <h2>Distribuição por seção</h2>
      </div>
      <div class="pie-tipo-toggle">
        <button
          type="button"
          class="btn btn-sm"
          :class="tipo === 'despesa' ? 'btn-primary' : 'btn-ghost'"
          @click="tipo = 'despesa'"
        >Despesas</button>
        <button
          type="button"
          class="btn btn-sm"
          :class="tipo === 'receita' ? 'btn-primary' : 'btn-ghost'"
          @click="tipo = 'receita'"
        >Receitas</button>
      </div>
    </div>

    <div v-if="!hasData" class="empty-state" style="padding:32px">
      Nenhum lançamento neste mês.
    </div>

    <div v-else class="pie-chart-wrap">
      <canvas ref="canvasRef" />
      <div class="pie-legend">
        <div
          v-for="(item, i) in legendItems"
          :key="item.label"
          class="pie-legend-row"
        >
          <span class="pie-legend-dot" :style="{ background: COLORS[i % COLORS.length] }" />
          <span class="pie-legend-label">{{ item.label }}</span>
          <span class="pie-legend-pct">{{ item.pct }}%</span>
          <span class="pie-legend-val">{{ fmtBRL(item.val) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import { useGastosStore } from '@/stores/gastos'
import { fmtBRL } from '@/utils/format'

const gastosStore = useGastosStore()

const tipo = ref('despesa')
const canvasRef = ref(null)
let chart = null

const COLORS = [
  '#4f8ef7', '#f7934f', '#4fc97b', '#f74f6e', '#a34ff7',
  '#f7d44f', '#4ff7f0', '#f74fb8', '#7bf74f', '#f7784f',
]

const secoes = computed(() =>
  tipo.value === 'despesa'
    ? gastosStore.despesasSecoesRaw
    : gastosStore.receitasSecoesRaw
)

const hasData = computed(() =>
  secoes.value.some((s) => (s.total || 0) > 0)
)

const legendItems = computed(() => {
  const total = secoes.value.reduce((s, x) => s + (x.total || 0), 0)
  return secoes.value
    .filter((s) => (s.total || 0) > 0)
    .map((s) => ({
      label: s.secao,
      val: s.total,
      pct: total > 0 ? Math.round((s.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.val - a.val)
})

function buildChart() {
  if (!canvasRef.value) return
  if (chart) { chart.destroy(); chart = null }
  if (!hasData.value) return

  const labels = legendItems.value.map((x) => x.label)
  const vals = legendItems.value.map((x) => x.val)
  const colors = labels.map((_, i) => COLORS[i % COLORS.length])

  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed
              const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((val / total) * 100) : 0
              return ` ${fmtBRL(val)} (${pct}%)`
            },
          },
        },
      },
    },
  })
}

watch([secoes, tipo], async () => {
  await nextTick()
  buildChart()
}, { deep: true })

onMounted(() => buildChart())
onUnmounted(() => { if (chart) chart.destroy() })
</script>
