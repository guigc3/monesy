<template>
  <!-- Skeleton de carregamento inicial -->
  <AppSkeleton v-if="!authStore.ready" />

  <template v-else>
    <!-- Auth overlay (mysql / supabase) -->
    <AuthOverlay />

    <template v-if="!authStore.showOverlay">
      <!-- Cabeçalho -->
      <AppHeader
        @novoLancamento="onNovoLancamento"
        @openModalAno="onOpenModalAno"
        @openModalExcluirAno="onOpenModalExcluirAno"
        @openLixeira="onOpenLixeira"
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
import { ref, watch, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppSkeleton from '@/components/layout/AppSkeleton.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
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

// Delegate header events to the currently rendered view
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
function onNovaAssinatura() {
  currentView.value?.openNovaAssinatura?.()
}

onMounted(async () => {
  // 1. Inicializa auth (detecta backend, valida token)
  await authStore.init()

  // 2. Se autenticado, carrega os dados de gastos
  if (authStore.ready && !authStore.showOverlay) {
    await gastosStore.init()
  }

  // 3. Quando auth sair do showOverlay (após login), carrega dados
  // (watch é necessário para mysql/supabase)
})

// Carrega dados após login bem-sucedido
watch(
  () => authStore.showOverlay,
  async (nowHidden) => {
    if (!nowHidden && authStore.ready) {
      await gastosStore.init()
    }
  }
)
</script>
