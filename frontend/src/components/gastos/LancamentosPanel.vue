<template>
  <section class="panel">
    <div class="panel-header">
      <div class="panel-header-title">
        <span class="panel-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <span
          v-if="tipo === 'receita' && totalInvestido > 0"
          class="secao-invest-badge receitas-invest-total"
          aria-live="polite"
          v-html="investidoHtml"
        ></span>
        <span
          v-if="tipo === 'despesa' && totalPago > 0"
          class="secao-pago-badge despesas-pago-total"
          aria-live="polite"
          v-html="pagoHtml"
        ></span>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        @click="emit('add', tipo)"
      >Adicionar</button>
    </div>

    <div v-if="!secoes.length" class="empty-state">{{ emptyMsg }}</div>
    <template v-else>
      <SecaoBlock
        v-for="secao in secoes"
        :key="secao.secao"
        :secao="secao"
        :tipo="tipo"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @historico="emit('historico', $event)"
        @duplicate="emit('duplicate', $event)"
      />
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SecaoBlock from './SecaoBlock.vue'
import { useGastosStore } from '@/stores/gastos'
import { fmtBRL } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const props = defineProps({
  tipo: { type: String, required: true }, // 'receita' | 'despesa'
})

const emit = defineEmits(['add', 'edit', 'delete', 'historico', 'duplicate'])

const gastosStore = useGastosStore()

const isReceita = computed(() => props.tipo === 'receita')
const secoes = computed(() =>
  isReceita.value ? gastosStore.receitasSecoes : gastosStore.despesasSecoes
)

const eyebrow = computed(() => isReceita.value ? 'Entradas' : 'Saídas')
const title = computed(() => isReceita.value ? 'Receitas' : 'Despesas')
const emptyMsg = computed(() =>
  isReceita.value ? 'Nenhuma receita neste mês' : 'Nenhuma despesa neste mês'
)

const totalInvestido = computed(() => gastosStore.totalInvestidoReceitas)
const totalPago = computed(() => gastosStore.totalPagoDespesas)

const investidoHtml = computed(() =>
  `${mi(MI.trendingUp, 'mi-badge')} ${fmtBRL(totalInvestido.value)} investido`
)

const pagoHtml = computed(() =>
  `${mi(MI.checkCircle, 'mi-badge')} ${fmtBRL(totalPago.value)} pago`
)
</script>
