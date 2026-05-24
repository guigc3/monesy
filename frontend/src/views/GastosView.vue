<template>
  <main class="container view-gastos">
    <MonthTabs />
    <SummaryCards />

    <div class="mes-actions">
      <button type="button" class="btn btn-ghost" @click="limparMes">
        <span class="material-icons mi-inline" aria-hidden="true">delete_outline</span>
        Limpar mês
      </button>
    </div>

    <AnnualChart />

    <div class="grid-main">
      <LancamentosPanel
        tipo="receita"
        @add="openModalTipo"
        @edit="openEdit"
        @delete="deletar"
        @historico="openHistorico"
      />
      <LancamentosPanel
        tipo="despesa"
        @add="openModalTipo"
        @edit="openEdit"
        @delete="deletar"
        @historico="openHistorico"
      />
    </div>

    <!-- Modais -->
    <LancamentoModal ref="lancamentoModal" />
    <AnoModal ref="anoModal" />
    <HistoricoModal ref="historicoModal" />
    <LixeiraModal ref="lixeiraModal" />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MonthTabs from '@/components/gastos/MonthTabs.vue'
import SummaryCards from '@/components/gastos/SummaryCards.vue'
import AnnualChart from '@/components/gastos/AnnualChart.vue'
import LancamentosPanel from '@/components/gastos/LancamentosPanel.vue'
import LancamentoModal from '@/components/modals/LancamentoModal.vue'
import AnoModal from '@/components/modals/AnoModal.vue'
import HistoricoModal from '@/components/modals/HistoricoModal.vue'
import LixeiraModal from '@/components/modals/LixeiraModal.vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const lancamentoModal = ref(null)
const anoModal = ref(null)
const historicoModal = ref(null)
const lixeiraModal = ref(null)

// Expõe para AppHeader via provide/inject ou eventos do router
defineExpose({
  openModalNovo: () => lancamentoModal.value?.open('despesa'),
  openModalAno: () => anoModal.value?.open(),
  openModalExcluirAno: () => anoModal.value?.openExcluir(gastosStore.ano),
  openLixeira: () => lixeiraModal.value?.open(),
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

async function openHistorico(id) {
  historicoModal.value?.open(() => gastosStore.loadHistorico(id))
}

async function limparMes() {
  const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const mesNome = MESES_NOMES[gastosStore.mes - 1] || `Mês ${gastosStore.mes}`
  if (!confirm(`Mover todos os lançamentos de ${mesNome} ${gastosStore.ano} para a lixeira? Esta ação pode ser desfeita pela lixeira.`)) return
  try {
    await gastosStore.limparMes()
  } catch (err) {
    toast(err.message, true)
  }
}
</script>
