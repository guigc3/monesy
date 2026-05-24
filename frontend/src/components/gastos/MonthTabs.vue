<template>
  <nav class="month-tabs" aria-label="Meses">
    <div
      v-for="(nome, idx) in MESES"
      :key="idx"
      class="month-tab-cell"
      :class="{ revisado: gastosStore.mesesRevisados.has(idx + 1) }"
    >
      <button
        type="button"
        class="month-tab"
        :class="{ active: gastosStore.mes === idx + 1 }"
        @click="selectMes(idx + 1)"
      >{{ nome }}</button>
      <label
        class="month-revisado-label"
        :title="gastosStore.mesesRevisados.has(idx + 1) ? 'Desmarcar mês como revisado' : 'Marcar mês como revisado'"
      >
        <input
          type="checkbox"
          class="month-revisado-cb"
          :checked="gastosStore.mesesRevisados.has(idx + 1)"
          :aria-label="`Mês ${nome} revisado`"
          @click.stop
          @change="toggleRevisado(idx + 1, $event.target.checked)"
        >
      </label>
    </div>
  </nav>
</template>

<script setup>
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

async function selectMes(mesNum) {
  gastosStore.mes = mesNum
  try {
    await gastosStore.loadMes()
  } catch (err) {
    toast(err.message, true)
  }
}

async function toggleRevisado(mesNum, checked) {
  try {
    await gastosStore.toggleMesRevisado(mesNum, checked)
  } catch (err) {
    toast(err.message, true)
  }
}
</script>
