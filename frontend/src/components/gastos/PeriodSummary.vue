<template>
  <section class="panel period-summary-panel" aria-label="Resumo por período">
    <div class="panel-header">
      <div class="panel-header-title">
        <span class="panel-eyebrow">Filtro de período</span>
        <h2>Resumo acumulado</h2>
      </div>
    </div>

    <div class="period-controls">
      <label class="field-inline">
        De
        <select v-model.number="mesInicio">
          <option v-for="(nome, idx) in MESES" :key="idx + 1" :value="idx + 1">{{ nome }}</option>
        </select>
      </label>
      <label class="field-inline">
        Até
        <select v-model.number="mesFim">
          <option v-for="(nome, idx) in MESES" :key="idx + 1" :value="idx + 1">{{ nome }}</option>
        </select>
      </label>
    </div>

    <div v-if="!gastosStore.chartData" class="empty-state" style="padding:24px">
      Carregando…
    </div>
    <div v-else class="period-totals">
      <div class="period-total-item">
        <span class="period-total-label">Entrada</span>
        <strong class="period-total-value valor-pos">{{ fmtBRL(period.entrada) }}</strong>
      </div>
      <div class="period-total-item">
        <span class="period-total-label">Saída</span>
        <strong class="period-total-value valor-neg">{{ fmtBRL(period.saida) }}</strong>
      </div>
      <div class="period-total-item">
        <span class="period-total-label">Saldo</span>
        <strong class="period-total-value" :class="period.liquido >= 0 ? 'valor-pos' : 'valor-neg'">
          {{ fmtBRL(period.liquido) }}
        </strong>
      </div>
      <div class="period-total-item">
        <span class="period-total-label">Meses</span>
        <strong class="period-total-value">{{ rangeLabel }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGastosStore } from '@/stores/gastos'
import { fmtBRL } from '@/utils/format'

const gastosStore = useGastosStore()

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const mesInicio = ref(1)
const mesFim = ref(new Date().getMonth() + 1)

const period = computed(() => {
  const mensal = gastosStore.chartData?.mensal || []
  const start = Math.min(mesInicio.value, mesFim.value)
  const end = Math.max(mesInicio.value, mesFim.value)
  const slice = mensal.filter((m) => m.mes >= start && m.mes <= end)
  const entrada = slice.reduce((s, m) => s + (m.entrada || 0), 0)
  const saida = slice.reduce((s, m) => s + (m.saida || 0), 0)
  return { entrada, saida, liquido: entrada - saida }
})

const rangeLabel = computed(() => {
  const start = Math.min(mesInicio.value, mesFim.value)
  const end = Math.max(mesInicio.value, mesFim.value)
  if (start === end) return MESES_ABREV[start - 1]
  return `${MESES_ABREV[start - 1]} – ${MESES_ABREV[end - 1]}`
})
</script>
