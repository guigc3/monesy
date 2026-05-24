<template>
  <section class="summary-cards" id="summaryCards">
    <article class="card card-entrada">
      <span class="card-label">Entrada</span>
      <strong class="card-value">{{ fmtBRL(totais.entrada) }}</strong>
    </article>
    <article class="card card-saida">
      <span class="card-label">Saída total</span>
      <strong class="card-value">{{ fmtBRL(totais.saida) }}</strong>
    </article>
    <article class="card card-caixa">
      <span class="card-label">Caixa disponível</span>
      <span class="card-hint">Receitas em caixa − investido − despesas pagas</span>
      <strong class="card-value" :class="totais.caixa >= 0 ? 'valor-pos' : 'valor-neg'">
        {{ fmtBRL(totais.caixa) }}
      </strong>
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
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useGastosStore } from '@/stores/gastos'
import { fmtBRL } from '@/utils/format'

const gastosStore = useGastosStore()
const totais = computed(() => gastosStore.totaisComputados)
</script>
