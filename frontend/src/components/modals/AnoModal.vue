<template>
  <!-- Modal: Criar novo ano -->
  <BaseModal ref="modalRef" size="sm">
    <form @submit.prevent="handleSubmit">
      <div class="modal-header">
        <h3>Novo ano</h3>
        <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
          <span class="material-icons" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="modal-body">
        <label>
          Ano
          <input v-model.number="anoInput" type="number" min="1900" max="2200" step="1" required placeholder="Ex.: 2027">
        </label>
        <small class="field-hint">Cria o ano para planejamento, mesmo sem lançamentos.</small>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Criar</button>
      </div>
    </form>
  </BaseModal>

  <!-- Modal: Excluir ano -->
  <BaseModal ref="excluirRef" size="sm">
    <form @submit.prevent="handleExcluir">
      <div class="modal-header">
        <h3>Excluir ano</h3>
        <button type="button" class="btn-icon" aria-label="Fechar" @click="closeExcluir">
          <span class="material-icons" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p class="confirm-text">Excluir o ano <strong>{{ anoParaExcluir }}</strong>?</p>
        <p v-if="impacto" class="confirm-warning">{{ impacto }}</p>
        <small class="field-hint">Esta ação não pode ser desfeita.</small>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="closeExcluir">Cancelar</button>
        <button type="submit" class="btn btn-danger-solid">Excluir</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'
import { api } from '@/services/api'

const gastosStore = useGastosStore()
const { toast } = useToast()

const modalRef = ref(null)
const excluirRef = ref(null)
const anoInput = ref(new Date().getFullYear() + 1)
const anoParaExcluir = ref(null)
const impacto = ref('')

function open() {
  const ultimoAno = gastosStore.ano
  anoInput.value = ultimoAno ? ultimoAno + 1 : new Date().getFullYear()
  modalRef.value?.open()
}

function close() {
  modalRef.value?.close()
}

async function openExcluir(ano) {
  anoParaExcluir.value = ano
  impacto.value = ''
  excluirRef.value?.open()
  try {
    const lancamentos = await api(`/api/lancamentos?ano=${ano}`)
    if (lancamentos.length > 0) {
      impacto.value = `Esta ação removerá ${lancamentos.length} lançamento(s) deste ano.`
    }
  } catch { /* silencioso */ }
}

function closeExcluir() {
  excluirRef.value?.close()
}

async function handleSubmit() {
  if (!Number.isFinite(anoInput.value)) { toast('Ano inválido', true); return }
  try {
    await gastosStore.criarAno(anoInput.value)
    close()
  } catch (err) {
    toast(err.message, true)
  }
}

async function handleExcluir() {
  if (!anoParaExcluir.value) return
  try {
    await gastosStore.excluirAno(anoParaExcluir.value)
    closeExcluir()
  } catch (err) {
    toast(err.message, true)
  }
}

defineExpose({ open, close, openExcluir, closeExcluir })
</script>
