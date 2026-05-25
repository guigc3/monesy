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

      <!-- Botão de tema (FAB) — cicla: auto → escuro → claro -->
      <button
        type="button"
        class="theme-fab"
        :title="themeFabTitle"
        :aria-label="themeFabTitle"
        @click="toggleTheme"
      >
        <span class="material-icons" aria-hidden="true">{{ themeFabIcon }}</span>
      </button>
    </template>
  </template>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import AppSkeleton from '@/components/layout/AppSkeleton.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppVersion from '@/components/layout/AppVersion.vue'
import AuthOverlay from '@/components/auth/AuthOverlay.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import { useAuthStore } from '@/stores/auth'
import { useGastosStore } from '@/stores/gastos'
import { useTheme } from '@/composables/useTheme'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const authStore = useAuthStore()
const gastosStore = useGastosStore()
const { darkMode, themeMode, toggleTheme } = useTheme()
const currentView = ref(null)

const themeFabIcon = computed(() => {
  if (themeMode.value === 'auto') return 'brightness_auto'
  return darkMode.value ? 'light_mode' : 'dark_mode'
})
const themeFabTitle = computed(() => {
  const labels = { auto: 'Automático (19h-7h)', dark: 'Modo escuro', light: 'Modo claro' }
  return `Tema: ${labels[themeMode.value]} — clique para alternar`
})

const tabs = [
  { to: '/visao-geral',  name: 'visao-geral',  label: 'Visão Geral' },
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

useKeyboardShortcuts({
  onNovoLancamento: () => currentView.value?.openModalNovo?.(),
})

onMounted(async () => {
  await authStore.init()
  if (authStore.ready && !authStore.showOverlay && !gastosStore.loaded) {
    await gastosStore.init()
  }
})
</script>
