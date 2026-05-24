<template>
  <tr
    class="row-lancamento"
    :class="rowClass"
    :data-id="item.id"
  >
    <!-- Checkbox pago / investido -->
    <td class="col-check">
      <input
        v-if="tipo === 'despesa'"
        type="checkbox"
        class="check-pago"
        :checked="item.pago"
        :aria-label="item.pago ? 'Desmarcar como pago' : 'Marcar como pago'"
        @change="onTogglePago"
      >
      <input
        v-else-if="tipo === 'receita'"
        type="checkbox"
        class="check-investido"
        :checked="item.investido"
        :aria-label="item.investido ? 'Desmarcar investimento' : 'Marcar como investimento (reserva)'"
        @change="onToggleInvestido"
      >
    </td>

    <!-- Descrição -->
    <td data-label="Descrição">
      <span
        v-if="item.pago"
        class="pago-emoji"
        v-html="miCheck"
      ></span>
      <span
        v-else-if="item.investido"
        class="invest-emoji"
        v-html="miTrend"
      ></span>
      {{ item.descricao }}
      <template v-if="item.observacao">
        <br><small>{{ item.observacao }}</small>
      </template>
      <template v-if="ultimaAlteracao">
        <br><small class="lanc-ultima-alteracao">Última alteração: {{ ultimaAlteracao }}</small>
      </template>
      <template v-if="tags.length">
        <br>
        <div class="tag-list">
          <span v-for="tag in tags" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>
      </template>
    </td>

    <!-- Valor -->
    <td
      class="col-valor"
      :class="tipo === 'receita' ? 'valor-pos' : 'valor-neg'"
      data-label="Valor"
    >{{ fmtBRL(item.valor) }}</td>

    <!-- Ações -->
    <td class="col-acoes" data-label="Ações">
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        title="Histórico"
        aria-label="Histórico"
        @click="emit('historico', item.id)"
        v-html="miHistory"
      ></button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        title="Editar"
        aria-label="Editar"
        @click="emit('edit', item)"
        v-html="miEdit"
      ></button>
      <button
        type="button"
        class="btn btn-danger btn-sm"
        title="Excluir"
        aria-label="Excluir"
        @click="emit('delete', item.id)"
        v-html="miDelete"
      ></button>
    </td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'
import { fmtBRL, fmtTs, normalizeTagsList } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const props = defineProps({
  item: { type: Object, required: true },
  tipo: { type: String, required: true }, // 'receita' | 'despesa'
})

const emit = defineEmits(['edit', 'delete', 'historico'])

const gastosStore = useGastosStore()
const { toast } = useToast()

// Ícones pré-compilados
const miCheck   = mi(MI.checkCircle, 'mi-row')
const miTrend   = mi(MI.trendingUp,  'mi-row')
const miHistory = mi(MI.history, 'mi-btn')
const miEdit    = mi(MI.edit,    'mi-btn')
const miDelete  = mi(MI.delete,  'mi-btn')

const rowClass = computed(() => {
  if (props.tipo === 'despesa' && props.item.pago) return 'row-pago'
  if (props.tipo === 'receita' && props.item.investido) return 'row-investido'
  return ''
})

const tags = computed(() => normalizeTagsList(props.item.tags))

const ultimaAlteracao = computed(() => {
  const ts = props.item.ultima_alteracao || props.item.criado_em
  return fmtTs(ts)
})

async function onTogglePago(e) {
  const pago = e.target.checked
  try {
    await gastosStore.togglePago(props.item.id, pago)
  } catch (err) {
    toast(err.message, true)
    e.target.checked = !pago
  }
}

async function onToggleInvestido(e) {
  const investido = e.target.checked
  try {
    await gastosStore.toggleInvestido(props.item.id, investido)
  } catch (err) {
    toast(err.message, true)
    e.target.checked = !investido
  }
}
</script>
