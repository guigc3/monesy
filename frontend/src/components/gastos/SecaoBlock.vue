<template>
  <div class="secao-block" :data-secao="secao.secao">
    <div class="secao-title">
      <span>{{ secao.secao }}</span>
      <span class="secao-title-right">
        <span
          v-if="tipo === 'despesa' && totalPago > 0"
          class="secao-pago-badge"
          v-html="pagoBadgeHtml"
        ></span>
        <span
          v-if="tipo === 'receita' && totalInvest > 0"
          class="secao-invest-badge"
          v-html="investBadgeHtml"
        ></span>
        <span>{{ fmtBRL(secao.total) }}</span>
      </span>
    </div>
    <table class="responsive-table">
      <thead>
        <tr>
          <th class="col-check" v-html="thCheckHtml"></th>
          <th>Descrição</th>
          <th class="col-valor">Valor</th>
          <th class="col-acoes">Ações</th>
        </tr>
      </thead>
      <tbody>
        <LancamentoRow
          v-for="item in secao.itens"
          :key="item.id"
          :item="item"
          :tipo="tipo"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @historico="emit('historico', $event)"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LancamentoRow from './LancamentoRow.vue'
import { fmtBRL } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const props = defineProps({
  secao: { type: Object, required: true },
  tipo: { type: String, required: true },
})

const emit = defineEmits(['edit', 'delete', 'historico'])

const totalPago = computed(() =>
  props.secao.itens.filter((i) => i.pago).reduce((s, i) => s + i.valor, 0)
)

const totalInvest = computed(() =>
  props.secao.itens.filter((i) => i.investido).reduce((s, i) => s + i.valor, 0)
)

const thCheckHtml = computed(() => {
  if (props.tipo === 'despesa') return mi(MI.check, 'mi-th')
  if (props.tipo === 'receita') return mi(MI.trendingUp, 'mi-th')
  return ''
})

const pagoBadgeHtml = computed(() =>
  `${mi(MI.checkCircle, 'mi-badge')} ${fmtBRL(totalPago.value)} pago`
)

const investBadgeHtml = computed(() =>
  `${mi(MI.trendingUp, 'mi-badge')} ${fmtBRL(totalInvest.value)} investido`
)
</script>
