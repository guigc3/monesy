<template>
  <BaseModal ref="modalRef" size="sm">
    <form @submit.prevent="handleSubmit">
      <div class="modal-header">
        <h3>Exportar lançamentos</h3>
        <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
          <span class="material-icons" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="modal-body">
        <fieldset class="export-fieldset">
          <legend>Período</legend>
          <label class="export-radio">
            <input v-model="escopo" type="radio" value="mes">
            <span>Apenas {{ mesNome }} ({{ gastosStore.ano }})</span>
          </label>
          <label class="export-radio">
            <input v-model="escopo" type="radio" value="ano">
            <span>Ano inteiro ({{ gastosStore.ano }})</span>
          </label>
        </fieldset>
        <fieldset class="export-fieldset">
          <legend>Formato</legend>
          <label class="export-radio">
            <input v-model="formato" type="radio" value="xlsx">
            <span>Excel (.xlsx)</span>
          </label>
          <label class="export-radio">
            <input v-model="formato" type="radio" value="csv">
            <span>CSV (separado por ;)</span>
          </label>
        </fieldset>
        <p v-if="gastosStore.tagFilter" class="field-hint">
          Filtro ativo: tag <strong>{{ gastosStore.tagFilter }}</strong>.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Gerando...' : 'Baixar' }}
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

const modalRef = ref(null)
const escopo = ref('mes')
const formato = ref('xlsx')
const loading = ref(false)

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const mesNome = computed(() => MESES[gastosStore.mes - 1] || `Mês ${gastosStore.mes}`)

function open() {
  escopo.value = 'mes'
  formato.value = 'xlsx'
  modalRef.value?.open()
}

function close() {
  modalRef.value?.close()
}

async function handleSubmit() {
  loading.value = true
  try {
    await gastosStore.exportar({ escopo: escopo.value, formato: formato.value })
    close()
  } catch (err) {
    toast(err.message, true)
  } finally {
    loading.value = false
  }
}

defineExpose({ open, close })
</script>

<style scoped>
.export-fieldset {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 12px 12px;
  margin: 0 0 14px;
}
.export-fieldset legend {
  padding: 0 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.export-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
  cursor: pointer;
}
.export-radio input { accent-color: var(--petrol-deep); }
</style>
