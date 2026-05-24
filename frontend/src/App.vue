<template>
  <!-- Skeleton de carregamento inicial -->
  <AppSkeleton v-if="!authStore.ready" />

  <template v-else>
    <!-- Auth overlay (mysql / supabase) -->
    <AuthOverlay />

    <AppVersion />

    <template v-if="!authStore.showOverlay">
      <!-- Cabeçalho -->
      <AppHeader
        @novoLancamento="onNovoLancamento"
        @openModalAno="onOpenModalAno"
        @openModalExcluirAno="onOpenModalExcluirAno"
        @openLixeira="onOpenLixeira"
        @openExport="onOpenExport"
        @openRecorrentes="onOpenRecorrentes"
        @novaAssinatura="onNovaAssinatura"
      />

      <!-- Navegação por abas -->
      <nav class="app-tabs container" aria-label="Seções do aplicativo">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="app-tab"
          active-class="active"
          :aria-current="$route.name === tab.name ? 'page' : undefined"
        >{{ tab.label }}</RouterLink>
      </nav>

      <!-- Conteúdo das abas -->
      <RouterView v-slot="{ Component }">
        <component :is="Component" ref="currentView" />
      </RouterView>

      <!-- Toast global -->
      <ToastNotification />

      <!-- Botão de tema (FAB) -->
      <button
        type="button"
        class="theme-fab"
        :title="darkMode ? 'Modo claro' : 'Modo escuro'"
        :aria-label="darkMode ? 'Modo claro' : 'Modo escuro'"
        @click="toggleTheme"
      >
        <span class="material-icons" aria-hidden="true">
          {{ darkMode ? 'light_mode' : 'dark_mode' }}
        </span>
      </button>
    </template>
  </template>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AppSkeleton from '@/components/layout/AppSkeleton.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppVersion from '@/components/layout/AppVersion.vue'
import AuthOverlay from '@/components/auth/AuthOverlay.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAuthStore } from '@/stores/auth'
import { useGastosStore } from '@/stores/gastos'
import { useTheme } from '@/composables/useTheme'

const authStore = useAuthStore()
const gastosStore = useGastosStore()
const { darkMode, toggleTheme } = useTheme()
const currentView = ref(null)

const tabs = [
  { to: '/gastos',       name: 'gastos',       label: 'Gastos mensais' },
  { to: '/assinaturas',  name: 'assinaturas',  label: 'Assinaturas' },
  { to: '/features',     name: 'features',     label: 'Features' },
]

function onNovoLancamento() {
  currentView.value?.openModalNovo?.()
}
function onOpenModalAno() {
  currentView.value?.openModalAno?.()
}
function onOpenModalExcluirAno() {
  currentView.value?.openModalExcluirAno?.()
}
function onOpenLixeira() {
  currentView.value?.openLixeira?.()
}
function onOpenExport() {
  currentView.value?.openExport?.()
}
function onOpenRecorrentes() {
  currentView.value?.openRecorrentes?.()
}
function onNovaAssinatura() {
  currentView.value?.openNovaAssinatura?.()
}

onMounted(async () => {
  await authStore.init()
  if (authStore.ready && !authStore.showOverlay && !gastosStore.loaded) {
    await gastosStore.init()
  }
})
</script>
