<template>
  <section
    v-if="gastosStore.tagFilter"
    class="panel tag-history-panel"
    aria-label="Evolução da tag no ano"
  >
    <div class="panel-header">
      <div class="panel-header-title">
        <span class="panel-eyebrow">Tag selecionada</span>
        <h2>
          Evolução de <strong>{{ gastosStore.tagFilter }}</strong> em {{ gastosStore.ano }}
        </h2>
      </div>
    </div>

    <div v-if="loading" class="empty-state" style="padding:24px">Carregando…</div>
    <div v-else-if="!hasData" class="empty-state" style="padding:24px">
      Sem lançamentos com esta tag em {{ gastosStore.ano }}.
    </div>
    <canvas v-else ref="canvasRef" style="max-height:220px" />
  </section>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import { useGastosStore } from '@/stores/gastos'
import { api } from '@/services/api'
import { fmtBRL } from '@/utils/format'

const gastosStore = useGastosStore()

const loading = ref(false)
const hasData = ref(false)
const canvasRef = ref(null)
let chart = null

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

async function load() {
  const tag = gastosStore.tagFilter
  const ano = gastosStore.ano
  if (!tag) return

  loading.value = true
  if (chart) { chart.destroy(); chart = null }
  hasData.value = false

  try {
    const lancs = await api(`/api/lancamentos?ano=${ano}&tag=${encodeURIComponent(tag)}`)
    // agrupa por mês e tipo
    const byMes = Array.from({ length: 12 }, () => ({ receita: 0, despesa: 0 }))
    for (const l of (lancs || [])) {
      const m = (l.mes || 1) - 1
      if (m >= 0 && m < 12) {
        byMes[m][l.tipo] = (byMes[m][l.tipo] || 0) + (l.valor || 0)
      }
    }

    const receitas = byMes.map((x) => x.receita)
    const despesas = byMes.map((x) => x.despesa)
    const anyData = receitas.some((v) => v > 0) || despesas.some((v) => v > 0)
    hasData.value = anyData

    if (anyData) {
      await nextTick()
      if (chart) chart.destroy()
      chart = new Chart(canvasRef.value, {
        type: 'bar',
        data: {
          labels: MESES_ABREV,
          datasets: [
            {
              label: 'Receita',
              data: receitas,
              backgroundColor: 'rgba(79,201,123,0.7)',
              borderRadius: 4,
            },
            {
              label: 'Despesa',
              data: despesas,
              backgroundColor: 'rgba(247,79,110,0.7)',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            y: {
              ticks: { callback: (v) => fmtBRL(v) },
              beginAtZero: true,
            },
          },
        },
      })
    }
  } catch (err) {
    console.warn('[TagHistoryPanel]', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => `${gastosStore.tagFilter}|${gastosStore.ano}`,
  load,
  { immediate: true }
)

onUnmounted(() => { if (chart) chart.destroy() })
</script>
