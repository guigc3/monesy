<template>
  <BaseModal ref="modalRef" @close="reset">
    <form @submit.prevent="handleSubmit">
      <div class="modal-header">
        <h3>{{ editId ? 'Editar assinatura' : 'Nova assinatura' }}</h3>
        <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
          <span class="material-icons" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="modal-body">
        <label>
          Descrição
          <input v-model="form.descricao" type="text" maxlength="120" required placeholder="Ex.: Netflix, Spotify, iCloud">
        </label>
        <div class="form-row-2">
          <label>
            Data de início
            <input v-model="form.data_inicio" type="date" required>
          </label>
          <label>
            Data fim
            <input v-model="form.data_fim" type="date">
            <small class="field-hint">Opcional — deixe vazio se ainda ativa</small>
          </label>
        </div>
        <label>
          Valor mensal (R$)
          <input v-model.number="form.valor_mensal" type="number" min="0.01" step="0.01" required>
        </label>
        <label>
          Cartão de crédito
          <input
            v-model="form.cartao"
            type="text"
            maxlength="80"
            required
            placeholder="Ex.: Nubank, Itaú"
            list="cartoesAssinaturaList"
          >
          <datalist id="cartoesAssinaturaList">
            <option v-for="c in assinaturasStore.cartoes" :key="c" :value="c"></option>
          </datalist>
        </label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useAssinaturasStore } from '@/stores/assinaturas'
import { useToast } from '@/composables/useToast'

const assinaturasStore = useAssinaturasStore()
const { toast } = useToast()

const modalRef = ref(null)
const editId = ref(null)

const form = ref({
  descricao: '',
  data_inicio: '',
  data_fim: '',
  valor_mensal: '',
  cartao: '',
})

function open(id = null) {
  editId.value = id
  if (id) {
    const item = assinaturasStore.getById(id)
    if (!item) { toast('Assinatura não encontrada', true); return }
    form.value = {
      descricao: item.descricao || '',
      data_inicio: (item.data_inicio || '').slice(0, 10),
      data_fim: item.data_fim ? String(item.data_fim).slice(0, 10) : '',
      valor_mensal: item.valor_mensal,
      cartao: item.cartao || '',
    }
  } else {
    form.value = {
      descricao: '',
      data_inicio: new Date().toISOString().slice(0, 10),
      data_fim: '',
      valor_mensal: '',
      cartao: '',
    }
  }
  modalRef.value?.open()
}

function close() {
  modalRef.value?.close()
}

function reset() {
  editId.value = null
}

async function handleSubmit() {
  const payload = {
    descricao: form.value.descricao.trim(),
    data_inicio: form.value.data_inicio,
    data_fim: form.value.data_fim || null,
    valor_mensal: Number(form.value.valor_mensal),
    cartao: form.value.cartao.trim(),
  }
  try {
    await assinaturasStore.save(payload, editId.value)
    close()
  } catch (err) {
    toast(err.message, true)
  }
}

defineExpose({ open, close })
</script>
