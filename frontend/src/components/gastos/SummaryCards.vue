<template>
  <section class="summary-cards" id="summaryCards">
    <article class="card card-entrada">
      <span class="card-label">Entrada</span>
      <strong class="card-value">{{ fmtBRL(totais.entrada) }}</strong>
      <span v-if="delta.entrada !== null" :class="deltaClass(delta.entrada)" class="card-delta">
        {{ deltaLabel(delta.entrada) }}
      </span>
    </article>
    <article class="card card-saida">
      <span class="card-label">Saída total</span>
      <strong class="card-value">{{ fmtBRL(totais.saida) }}</strong>
      <span v-if="delta.saida !== null" :class="deltaClass(-delta.saida)" class="card-delta">
        {{ deltaLabel(delta.saida) }}
      </span>
    </article>
    <article class="card card-caixa">
      <span class="card-label">Caixa disponível</span>
      <span class="card-hint">Receitas em caixa − investido − despesas pagas</span>
      <strong class="card-value" :class="totais.caixa >= 0 ? 'valor-pos' : 'valor-neg'">
        {{ fmtBRL(totais.caixa) }}
      </strong>
      <span v-if="delta.caixa !== null" :class="deltaClass(delta.caixa)" class="card-delta">
        {{ deltaLabel(delta.caixa) }}
      </span>
    </article>
    <article class="card card-pendente">
      <span class="card-label">A pagar</span>
      <strong class="card-value">{{ fmtBRL(totais.saida_pendente) }}</strong>
    </article>
    <article class="card card-orcamento">
      <span class="card-label">Orçamento</span>
      <span class="card-hint">Entrada − saída total</span>
      <strong class="card-value" :class="totais.liquido >= 0 ? 'valor-pos' : 'valor-neg'">
        {{ fmtBRL(totais.liquido) }}
      </strong>
      <span v-if="delta.liquido !== null" :class="deltaClass(delta.liquido)" class="card-delta">
        {{ deltaLabel(delta.liquido) }}
      </span>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGastosStore } from '@/stores/gastos'
import { fmtBRL } from '@/utils/format'

const gastosStore = useGastosStore()
const totais = computed(() => gastosStore.totaisComputados)

// Dados do mês anterior a partir do chartData anual
const prevMes = computed(() => {
  const mensal = gastosStore.chartData?.mensal
  if (!mensal) return null
  const idx = gastosStore.mes - 2 // mês anterior (0-based)
  if (idx < 0) return null
  return mensal[idx] || null
})

const delta = computed(() => {
  const prev = prevMes.value
  if (!prev) return { entrada: null, saida: null, caixa: null, liquido: null }
  const cur = totais.value
  const caixa = cur.caixa - (prev.entrada - (prev.entrada_investida || 0) - (prev.saida_paga || prev.saida || 0))
  return {
    entrada: cur.entrada - (prev.entrada || 0),
    saida: cur.saida - (prev.saida || 0),
    caixa: cur.caixa - (prev.caixa != null ? prev.caixa : caixa),
    liquido: cur.liquido - (prev.liquido || 0),
  }
})

function deltaClass(val) {
  if (val > 0) return 'card-delta--pos'
  if (val < 0) return 'card-delta--neg'
  return 'card-delta--neutral'
}

function deltaLabel(val) {
  if (val === 0) return '= igual ao mês anterior'
  const sign = val > 0 ? '▲' : '▼'
  return `${sign} ${fmtBRL(Math.abs(val))} vs mês anterior`
}
</script>
