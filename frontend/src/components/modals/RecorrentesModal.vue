<template>
  <BaseModal ref="modalRef" size="lg">
    <div class="modal-header">
      <div>
        <h3>Lançamentos recorrentes</h3>
        <p class="modal-subtitle">Templates mensais — gere automaticamente os lançamentos do mês atual.</p>
      </div>
      <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>

    <div class="modal-body">
      <div v-if="!showForm" class="recorrentes-actions">
        <button type="button" class="btn btn-primary btn-sm" @click="novo">
          <span class="material-icons mi-inline" aria-hidden="true">add</span>
          Novo template
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="loadingGerar || recorrentesAtivos === 0"
          @click="gerar"
        >
          <span class="material-icons mi-inline" aria-hidden="true">auto_awesome</span>
          {{ loadingGerar ? 'Gerando…' : `Gerar para ${mesAtualNome}` }}
        </button>
      </div>

      <form v-if="showForm" class="recorrente-form" @submit.prevent="salvar">
        <div class="form-row-2">
          <label>
            Tipo
            <select v-model="form.tipo" @change="form.secao = secoesDisponiveis[0] || ''">
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </label>
          <label>
            Valor (R$)
            <input v-model.number="form.valor" type="number" min="0.01" step="0.01" required>
          </label>
        </div>
        <label>
          Descrição
          <input v-model="form.descricao" type="text" maxlength="120" required placeholder="Ex.: Aluguel, Salário">
        </label>
        <label>
          Seção
          <select v-model="form.secao">
            <option v-for="s in secoesDisponiveis" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label>
          Observação
          <input v-model="form.observacao" type="text" maxlength="200" placeholder="Opcional">
        </label>
        <label class="recorrente-ativo">
          <input v-model="form.ativo" type="checkbox">
          <span>Ativo (será incluído nas gerações mensais)</span>
        </label>
        <div class="recorrente-form-actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="cancelarForm">Cancelar</button>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="loadingSalvar">
            {{ loadingSalvar ? 'Salvando…' : (editId ? 'Atualizar' : 'Criar') }}
          </button>
        </div>
      </form>

      <p v-if="!recorrentesStore.lista.length && !showForm" class="empty-state">
        Nenhum template ainda. Cadastre seus lançamentos fixos para gerar todo mês com um clique.
      </p>

      <ul v-else-if="!showForm" class="recorrentes-list">
        <li
          v-for="rec in recorrentesStore.lista"
          :key="rec.id"
          class="recorrente-item"
          :class="{ inativo: !rec.ativo }"
        >
          <div class="recorrente-item-main">
            <span class="recorrente-tipo" :class="`tipo-${rec.tipo}`">{{ rec.tipo === 'receita' ? 'Receita' : 'Despesa' }}</span>
            <div class="recorrente-info">
              <strong>{{ rec.descricao }}</strong>
              <small>{{ rec.secao }} · {{ fmtBRL(rec.valor) }}</small>
            </div>
          </div>
          <div class="recorrente-actions">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :title="rec.ativo ? 'Desativar' : 'Ativar'"
              @click="toggleAtivo(rec)"
            >
              <span class="material-icons mi-btn" aria-hidden="true">
                {{ rec.ativo ? 'toggle_on' : 'toggle_off' }}
              </span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" title="Editar" @click="editar(rec)">
              <span class="material-icons mi-btn" aria-hidden="true">edit</span>
            </button>
            <button type="button" class="btn btn-danger btn-sm" title="Remover" @click="remover(rec)">
              <span class="material-icons mi-btn" aria-hidden="true">delete_outline</span>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useRecorrentesStore } from '@/stores/recorrentes'
import { useToast } from '@/composables/useToast'
import { fmtBRL } from '@/utils/format'
import { CK, cacheDelete } from '@/services/api'

const gastosStore = useGastosStore()
const recorrentesStore = useRecorrentesStore()
const { toast } = useToast()

const modalRef = ref(null)
const showForm = ref(false)
const editId = ref(null)
const loadingSalvar = ref(false)
const loadingGerar = ref(false)

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const mesAtualNome = computed(() => MESES[gastosStore.mes - 1] || `Mês ${gastosStore.mes}`)

const recorrentesAtivos = computed(
  () => recorrentesStore.lista.filter((r) => r.ativo).length
)

const form = ref(_blankForm())
const secoesDisponiveis = computed(() =>
  gastosStore.secoes[form.value.tipo] || []
)

function _blankForm() {
  return {
    tipo: 'despesa',
    descricao: '',
    secao: '',
    valor: '',
    observacao: '',
    ativo: true,
  }
}

async function open() {
  showForm.value = false
  editId.value = null
  modalRef.value?.open()
  if (!recorrentesStore.loaded) {
    await recorrentesStore.load()
  }
}

function close() {
  modalRef.value?.close()
}

function novo() {
  editId.value = null
  form.value = _blankForm()
  form.value.secao = secoesDisponiveis.value[0] || ''
  showForm.value = true
}

function editar(rec) {
  editId.value = rec.id
  form.value = {
    tipo: rec.tipo,
    descricao: rec.descricao || '',
    secao: rec.secao || '',
    valor: rec.valor || '',
    observacao: rec.observacao || '',
    ativo: rec.ativo !== false,
  }
  showForm.value = true
}

function cancelarForm() {
  showForm.value = false
  editId.value = null
}

async function salvar() {
  loadingSalvar.value = true
  try {
    await recorrentesStore.save(
      {
        tipo: form.value.tipo,
        descricao: form.value.descricao.trim(),
        secao: form.value.secao || (form.value.tipo === 'receita' ? 'Receitas' : 'Geral'),
        valor: Number(form.value.valor),
        observacao: form.value.observacao.trim(),
        ativo: form.value.ativo,
      },
      editId.value,
    )
    showForm.value = false
    editId.value = null
  } catch (err) {
    toast(err.message, true)
  } finally {
    loadingSalvar.value = false
  }
}

async function toggleAtivo(rec) {
  try {
    await recorrentesStore.toggleAtivo(rec)
  } catch (err) {
    toast(err.message, true)
  }
}

async function remover(rec) {
  if (!confirm(`Remover o template "${rec.descricao}"?`)) return
  try {
    await recorrentesStore.remove(rec.id)
  } catch (err) {
    toast(err.message, true)
  }
}

async function gerar() {
  loadingGerar.value = true
  try {
    const res = await recorrentesStore.gerar(gastosStore.ano, gastosStore.mes)
    const criados = res.criados || 0
    const pulados = res.pulados || 0
    if (criados === 0 && pulados === 0) {
      toast('Nenhum template ativo para gerar', true)
    } else {
      const parts = [`${criados} criado${criados !== 1 ? 's' : ''}`]
      if (pulados) parts.push(`${pulados} já existia${pulados !== 1 ? 'm' : ''}`)
      toast(parts.join(' · '))
    }
    cacheDelete(CK.mes(gastosStore.ano, gastosStore.mes))
    cacheDelete(CK.chart(gastosStore.ano))
    cacheDelete(CK.anos)
    await Promise.all([
      gastosStore.loadAnos(),
      gastosStore.loadMes(),
      gastosStore.loadChart(),
    ])
  } catch (err) {
    toast(err.message, true)
  } finally {
    loadingGerar.value = false
  }
}

defineExpose({ open, close })
</script>

<style scoped>
.recorrentes-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.recorrente-form {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

[data-theme="dark"] .recorrente-form {
  background: var(--surface-2);
  border-color: var(--border);
}

.recorrente-ativo {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  cursor: pointer;
}
.recorrente-ativo input {
  accent-color: var(--petrol-deep);
}

.recorrente-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.recorrentes-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recorrente-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition: opacity 0.15s, border-color 0.15s;
}
.recorrente-item.inativo {
  opacity: 0.55;
}

[data-theme="dark"] .recorrente-item {
  background: var(--surface);
  border-color: var(--border);
}

.recorrente-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.recorrente-tipo {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.recorrente-tipo.tipo-receita {
  background: var(--primary-soft);
  color: var(--petrol-deep);
}
.recorrente-tipo.tipo-despesa {
  background: var(--red-soft);
  color: var(--red);
}

.recorrente-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.recorrente-info strong {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recorrente-info small {
  font-size: 12px;
  color: var(--text-muted);
}

.recorrente-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
