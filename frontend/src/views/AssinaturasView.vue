<template>
  <main class="container view-assinaturas">
    <!-- Summary cards -->
    <section class="summary-cards assinaturas-summary">
      <article class="card card-orcamento">
        <span class="card-label">Total mensal (ativas)</span>
        <span class="card-hint">Assinaturas sem data fim ou com fim futuro</span>
        <strong class="card-value">{{ fmtBRL(assinaturasStore.totalMensalAtivas) }}</strong>
      </article>
      <article class="card card-saida">
        <span class="card-label">Cadastradas</span>
        <strong class="card-value">{{ assinaturasStore.lista.length }}</strong>
      </article>
      <article class="card card-pendente">
        <span class="card-label">Ativas</span>
        <strong class="card-value">{{ ativas }}</strong>
      </article>
    </section>

    <!-- Painel principal -->
    <section class="panel">
      <div class="panel-header">
        <div class="panel-header-title">
          <span class="panel-eyebrow">Recorrentes</span>
          <h2>Assinaturas e recorrentes no cartão</h2>
          <span class="chart-subtitle">Controle independente do lançamento mensal</span>
        </div>
        <label class="field-inline assinaturas-filter">
          Cartão
          <select v-model="assinaturasStore.filtroCartao" @change="filtrar">
            <option value="">Todos</option>
            <option v-for="c in assinaturasStore.cartoes" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
      </div>

      <div class="table-wrap">
        <div v-if="loading" class="empty-state" style="padding:40px">Carregando…</div>
        <div v-else-if="error" class="empty-state" style="padding:40px;color:var(--red)">{{ error }}</div>
        <div v-else-if="!assinaturasStore.lista.length" class="empty-state" style="padding:40px">
          Nenhuma assinatura cadastrada. Clique em <strong>+ Nova assinatura</strong>.
        </div>
        <table v-else class="responsive-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Cartão</th>
              <th class="col-valor">Valor/mês</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Última alteração</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in assinaturasStore.lista"
              :key="item.id"
              class="assinatura-row"
              :class="{ 'assinaturas-row-inativa': !item.ativa }"
            >
              <td data-label="Descrição">
                <strong>{{ item.descricao }}</strong><br>
                <span v-if="item.ativa" class="badge-ativa">Ativa</span>
                <span v-else class="badge-encerrada">Encerrada</span>
              </td>
              <td data-label="Cartão">{{ item.cartao || '—' }}</td>
              <td class="col-valor" data-label="Valor/mês">{{ fmtBRL(item.valor_mensal) }}</td>
              <td data-label="Início"><small>{{ fmtDataBr(item.data_inicio) }}</small></td>
              <td data-label="Fim"><small>{{ fmtDataBr(item.data_fim) }}</small></td>
              <td data-label="Alteração"><small class="text-muted">{{ fmtTs(item.ultima_alteracao) }}</small></td>
              <td class="col-acoes" data-label="Ações">
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  title="Histórico"
                  @click="openHistorico(item.id)"
                  v-html="miHistory"
                ></button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  title="Editar"
                  @click="assinaturaModal?.open(item.id)"
                  v-html="miEdit"
                ></button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  title="Excluir"
                  @click="deletar(item.id, item.descricao)"
                  v-html="miDelete"
                ></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AssinaturaModal ref="assinaturaModal" />
    <HistoricoModal ref="historicoModal" />
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AssinaturaModal from '@/components/modals/AssinaturaModal.vue'
import HistoricoModal from '@/components/modals/HistoricoModal.vue'
import { useAssinaturasStore } from '@/stores/assinaturas'
import { useToast } from '@/composables/useToast'
import { fmtBRL, fmtDataBr, fmtTs } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const assinaturasStore = useAssinaturasStore()
const { toast } = useToast()

const assinaturaModal = ref(null)
const historicoModal = ref(null)
const loading = ref(false)
const error = ref('')

const miHistory = mi(MI.history, 'mi-btn')
const miEdit    = mi(MI.edit, 'mi-btn')
const miDelete  = mi(MI.delete, 'mi-btn')

const ativas = computed(() => assinaturasStore.lista.filter((a) => a.ativa).length)

// Expõe para AppHeader
defineExpose({
  openNovaAssinatura: () => assinaturaModal.value?.open(),
})

async function load() {
  if (assinaturasStore.loaded) return
  loading.value = true
  error.value = ''
  try {
    await assinaturasStore.load()
  } catch (err) {
    error.value = err.message
    toast(err.message, true)
  } finally {
    loading.value = false
  }
}

async function filtrar() {
  try {
    await assinaturasStore.loadLista()
  } catch (err) {
    toast(err.message, true)
  }
}

async function deletar(id, nome) {
  if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
  try {
    await assinaturasStore.remove(id)
  } catch (err) {
    toast(err.message, true)
  }
}

async function openHistorico(id) {
  historicoModal.value?.open(() => assinaturasStore.loadHistorico(id))
}

onMounted(load)
</script>
