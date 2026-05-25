<template>
  <main class="container view-visao-geral">
    <MonthTabs />
    <SummaryCards />
    <div class="visao-geral-grid">
      <SectionPieChart />
      <PeriodSummary />
    </div>
    <ConsolidatedPanel />
    <AnnualChart />

    <!-- AnoModal necessário porque o header emite openModalAno quando isVisaoGeral -->
    <AnoModal ref="anoModal" />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import MonthTabs from '@/components/gastos/MonthTabs.vue'
import SummaryCards from '@/components/gastos/SummaryCards.vue'
import SectionPieChart from '@/components/gastos/SectionPieChart.vue'
import PeriodSummary from '@/components/gastos/PeriodSummary.vue'
import ConsolidatedPanel from '@/components/gastos/ConsolidatedPanel.vue'
import AnnualChart from '@/components/gastos/AnnualChart.vue'
import AnoModal from '@/components/modals/AnoModal.vue'
import { useGastosStore } from '@/stores/gastos'

const gastosStore = useGastosStore()
const anoModal = ref(null)

// Exposto para AppHeader via App.vue → currentView
defineExpose({
  openModalAno: () => anoModal.value?.open(),
  openModalExcluirAno: () => anoModal.value?.openExcluir(gastosStore.ano),
})
</script>
