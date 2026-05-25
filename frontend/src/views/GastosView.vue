<template>
  <main class="container view-gastos">
    <MonthTabs />

    <div class="mes-actions">
      <button
        type="button"
        class="btn btn-ghost"
        title="Escolher mês e ano de origem para copiar lançamentos"
        @click="copiarMesModal?.open()"
      >
        <span class="material-icons mi-inline" aria-hidden="true">content_copy</span>
        Copiar de outro mês
      </button>
      <button type="button" class="btn btn-ghost" @click="limparMes">
        <span class="material-icons mi-inline" aria-hidden="true">delete_outline</span>
        Limpar mês
      </button>
    </div>

    <TagFilter />
    <TagHistoryPanel />

    <div class="grid-main">
      <LancamentosPanel
        tipo="receita"
        @add="openModalTipo"
        @edit="openEdit"
        @delete="deletar"
        @historico="openHistorico"
        @duplicate="duplicar"
      />
      <LancamentosPanel
        tipo="despesa"
        @add="openModalTipo"
        @edit="openEdit"
        @delete="deletar"
        @historico="openHistorico"
        @duplicate="duplicar"
      />
    </div>

    <MonthNote />

    <!-- Modais -->
    <LancamentoModal ref="lancamentoModal" />
    <AnoModal ref="anoModal" />
    <HistoricoModal ref="historicoModal" />
    <LixeiraModal ref="lixeiraModal" />
    <ExportModal ref="exportModal" />
    <RecorrentesModal ref="recorrentesModal" />
    <CopiarMesModal ref="copiarMesModal" />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import MonthTabs from '@/components/gastos/MonthTabs.vue'
import LancamentosPanel from '@/components/gastos/LancamentosPanel.vue'
import TagFilter from '@/components/gastos/TagFilter.vue'
import TagHistoryPanel from '@/components/gastos/TagHistoryPanel.vue'
import MonthNote from '@/components/gastos/MonthNote.vue'
import LancamentoModal from '@/components/modals/LancamentoModal.vue'
import AnoModal from '@/components/modals/AnoModal.vue'
import HistoricoModal from '@/components/modals/HistoricoModal.vue'
import LixeiraModal from '@/components/modals/LixeiraModal.vue'
import ExportModal from '@/components/modals/ExportModal.vue'
import RecorrentesModal from '@/components/modals/RecorrentesModal.vue'
import CopiarMesModal from '@/components/modals/CopiarMesModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const lancamentoModal = ref(null)
const anoModal = ref(null)
const historicoModal = ref(null)
const lixeiraModal = ref(null)
const exportModal = ref(null)
const recorrentesModal = ref(null)
const copiarMesModal = ref(null)

// Expõe para AppHeader via provide/inject ou eventos do router
defineExpose({
  openModalNovo: () => lancamentoModal.value?.open('despesa'),
  openModalAno: () => anoModal.value?.open(),
  openModalExcluirAno: () => anoModal.value?.openExcluir(gastosStore.ano),
  openLixeira: () => lixeiraModal.value?.open(),
  openExport: () => exportModal.value?.open(),
  openRecorrentes: () => recorrentesModal.value?.open(),
})

function openModalTipo(tipo) {
  lancamentoModal.value?.open(tipo)
}

function openEdit(item) {
  lancamentoModal.value?.open(item.tipo || 'despesa', item)
}

async function deletar(id) {
  if (!confirm('Excluir este lançamento?')) return
  try {
    await gastosStore.deleteLancamento(id)
  } catch (err) {
    toast(err.message, true)
  }
}

async function duplicar(id) {
  try {
    await gastosStore.duplicarLancamento(id)
  } catch (err) {
    toast(err.message, true)
  }
}

async function openHistorico(id) {
  historicoModal.value?.open(() => gastosStore.loadHistorico(id))
}

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

async function limparMes() {
  const mesNome = MESES_NOMES[gastosStore.mes - 1] || `Mês ${gastosStore.mes}`
  if (!confirm(`Mover todos os lançamentos de ${mesNome} ${gastosStore.ano} para a lixeira? Esta ação pode ser desfeita pela lixeira.`)) return
  try {
    await gastosStore.limparMes()
  } catch (err) {
    toast(err.message, true)
  }
}
</script>
