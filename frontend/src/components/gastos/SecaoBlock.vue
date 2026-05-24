<template>
  <div class="secao-block" :data-secao="secao.secao">
    <div class="secao-title">
      <span class="secao-title-left">
        {{ secao.secao }}
        <button
          type="button"
          class="meta-edit-btn"
          :title="meta > 0 ? `Meta: ${fmtBRL(meta)} — clique para alterar` : 'Definir meta mensal'"
          :aria-label="meta > 0 ? `Editar meta de ${secao.secao}` : `Definir meta para ${secao.secao}`"
          @click="editarMeta"
        >
          <span class="material-icons" aria-hidden="true">flag</span>
        </button>
      </span>
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
    <div v-if="meta > 0" class="secao-meta">
      <div class="secao-meta-info">
        <span class="secao-meta-label">
          Meta: <strong>{{ fmtBRL(meta) }}</strong>
        </span>
        <span class="secao-meta-perc" :class="metaClass">{{ percentual.toFixed(0) }}%</span>
      </div>
      <div class="secao-meta-bar" :aria-label="`${percentual.toFixed(0)}% da meta`">
        <span
          class="secao-meta-bar-fill"
          :class="metaClass"
          :style="{ width: Math.min(percentual, 100) + '%' }"
        ></span>
      </div>
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
          @duplicate="emit('duplicate', $event)"
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
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  secao: { type: Object, required: true },
  tipo: { type: String, required: true },
})

const emit = defineEmits(['edit', 'delete', 'historico', 'duplicate'])

const gastosStore = useGastosStore()
const { toast } = useToast()

const totalPago = computed(() =>
  props.secao.itens.filter((i) => i.pago).reduce((s, i) => s + i.valor, 0)
)

const totalInvest = computed(() =>
  props.secao.itens.filter((i) => i.investido).reduce((s, i) => s + i.valor, 0)
)

const meta = computed(() => gastosStore.metaPara(props.tipo, props.secao.secao))

const percentual = computed(() => {
  if (!meta.value) return 0
  return (props.secao.total / meta.value) * 100
})

const metaClass = computed(() => {
  if (props.tipo === 'receita') {
    if (percentual.value >= 100) return 'meta-ok'
    if (percentual.value >= 80) return 'meta-warn'
    return 'meta-neutro'
  }
  if (percentual.value >= 100) return 'meta-estouro'
  if (percentual.value >= 80) return 'meta-warn'
  return 'meta-ok'
})

async function editarMeta() {
  const sufixoTipo = props.tipo === 'receita' ? 'recebida' : 'gasta'
  const promptMsg = meta.value > 0
    ? `Meta mensal de ${props.secao.secao} (R$ ${sufixoTipo}). Deixe vazio para remover.\nAtual: ${fmtBRL(meta.value)}`
    : `Defina a meta mensal de ${props.secao.secao} (R$ ${sufixoTipo}):`
  const atual = meta.value > 0 ? String(meta.value).replace('.', ',') : ''
  const entrada = window.prompt(promptMsg, atual)
  if (entrada === null) return
  const limpo = entrada.trim().replace(/\./g, '').replace(',', '.')
  if (limpo === '') {
    try {
      await gastosStore.setMeta(props.tipo, props.secao.secao, null)
    } catch (err) {
      toast(err.message, true)
    }
    return
  }
  const num = Number(limpo)
  if (!Number.isFinite(num) || num < 0) {
    toast('Valor inválido', true)
    return
  }
  try {
    await gastosStore.setMeta(props.tipo, props.secao.secao, num)
  } catch (err) {
    toast(err.message, true)
  }
}

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
