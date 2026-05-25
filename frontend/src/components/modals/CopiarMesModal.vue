<template>
  <BaseModal ref="modal" title="Copiar lançamentos de outro mês">
    <form class="form-stack" @submit.prevent="confirmar">
      <p class="form-hint">
        Selecione o mês de origem. Os lançamentos serão copiados para
        <strong>{{ MESES[gastosStore.mes - 1] }}/{{ gastosStore.ano }}</strong>.
      </p>

      <label class="field-inline">
        Ano de origem
        <select v-model.number="origemAno">
          <option v-for="a in gastosStore.anos" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>

      <label class="field-inline">
        Mês de origem
        <select v-model.number="origemMes">
          <option v-for="(nome, idx) in MESES" :key="idx + 1" :value="idx + 1">{{ nome }}</option>
        </select>
      </label>

      <fieldset class="field-group">
        <legend>Tipos a copiar</legend>
        <label class="field-checkbox">
          <input type="checkbox" v-model="tipos" value="receita"> Receitas
        </label>
        <label class="field-checkbox">
          <input type="checkbox" v-model="tipos" value="despesa"> Despesas
        </label>
      </fieldset>

      <p v-if="origemIgualDestino" class="form-warn">
        Origem e destino são o mesmo mês/ano.
      </p>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" @click="close">Cancelar</button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading || origemIgualDestino || tipos.length === 0"
        >
          {{ loading ? 'Copiando…' : 'Copiar' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const modal = ref(null)
const origemAno = ref(new Date().getFullYear())
const origemMes = ref(1)
const tipos = ref(['receita', 'despesa'])
const loading = ref(false)

const origemIgualDestino = computed(
  () => origemAno.value === gastosStore.ano && origemMes.value === gastosStore.mes
)

function open() {
  // pré-seleciona mês anterior por padrão
  const d = new Date(gastosStore.ano, gastosStore.mes - 2, 1)
  origemAno.value = d.getFullYear()
  origemMes.value = d.getMonth() + 1
  tipos.value = ['receita', 'despesa']
  modal.value?.open()
}

function close() {
  modal.value?.close()
}

async function confirmar() {
  if (origemIgualDestino.value || tipos.value.length === 0) return
  loading.value = true
  try {
    await gastosStore.copiarMes(tipos.value, { ano: origemAno.value, mes: origemMes.value })
    close()
  } catch (err) {
    toast(err.message, true)
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>
