<template>
  <BaseModal ref="modalRef" size="lg" @close="reset">
    <div class="modal-header">
      <div>
        <h3><span class="material-icons mi-inline" aria-hidden="true">delete_outline</span> Lixeira</h3>
        <p class="modal-subtitle">Lançamentos excluídos — restaure ou remova permanentemente</p>
      </div>
      <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
    <div class="modal-body" style="min-height:120px;padding:0">
      <div v-if="loading" class="empty-state" style="padding:32px">Carregando…</div>
      <div v-else-if="error" class="empty-state" style="padding:32px;color:var(--red)">{{ error }}</div>
      <div v-else-if="!items.length" class="empty-state" style="padding:40px">Lixeira vazia</div>
      <div v-else class="table-wrap">
        <table class="responsive-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th class="col-valor">Valor</th>
              <th>Período</th>
              <th>Excluído em</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="lixeira-row">
              <td data-label="Tipo">
                <span v-if="item.tipo === 'receita'" class="badge-receita">Receita</span>
                <span v-else class="badge-despesa">Despesa</span>
              </td>
              <td data-label="Descrição">
                <strong>{{ item.descricao }}</strong>
                <br><small>{{ item.secao || '' }}</small>
              </td>
              <td class="col-valor" data-label="Valor">{{ fmtBRL(item.valor) }}</td>
              <td data-label="Período">
                <small>{{ item.mes_nome ? `${item.mes_nome}/${item.ano}` : item.ano }}</small>
              </td>
              <td data-label="Excluído">
                <small class="text-muted">{{ fmtTs(item.excluido_em) }}</small>
              </td>
              <td class="col-acoes" data-label="Ações">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  title="Restaurar"
                  @click="restaurar(item.id)"
                  v-html="miRestore"
                ></button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  title="Excluir permanentemente"
                  @click="deletarPermanente(item.id)"
                  v-html="miDelete"
                ></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button
        type="button"
        class="btn btn-danger"
        :disabled="!items.length"
        @click="esvaziar"
      >Esvaziar lixeira</button>
      <button type="button" class="btn btn-secondary" @click="close">Fechar</button>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'
import { fmtBRL, fmtTs } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const gastosStore = useGastosStore()
const { toast } = useToast()

const modalRef = ref(null)
const loading = ref(false)
const error = ref('')
const items = ref([])

const miRestore = `${mi(MI.restore, 'mi-inline')} Restaurar`
const miDelete  = mi(MI.delete, 'mi-btn')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await gastosStore.loadLixeira()
    items.value = data.lixeira || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function open() {
  modalRef.value?.open()
  await load()
}

function close() {
  modalRef.value?.close()
}

function reset() {
  items.value = []
  error.value = ''
}

async function restaurar(id) {
  try {
    await gastosStore.restaurarLancamento(id)
    await load()
  } catch (err) {
    toast(err.message, true)
  }
}

async function deletarPermanente(id) {
  if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return
  try {
    await gastosStore.deletarPermanente(id)
    await load()
  } catch (err) {
    toast(err.message, true)
  }
}

async function esvaziar() {
  if (!confirm('Esvaziar a lixeira? Todos os lançamentos serão excluídos permanentemente.')) return
  try {
    await gastosStore.esvaziarLixeira()
    await load()
  } catch (err) {
    toast(err.message, true)
  }
}

defineExpose({ open, close })
</script>
