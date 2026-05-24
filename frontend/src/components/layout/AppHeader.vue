<template>
  <header class="header" :class="{ 'header-open': menuOpen }" id="appHeader">
    <div class="header-top">
      <div class="header-left">
        <span class="logo-mark" aria-hidden="true">
          <img src="/design-system/logos/monesy-mark-on-dark.svg" width="28" height="28" alt="">
        </span>
        <div class="header-title-wrap">
          <h1>Monesy</h1>
          <p class="subtitle">{{ subtitle }}</p>
        </div>
        <button
          v-if="showLogout"
          type="button"
          class="btn btn-ghost btn-logout"
          @click="logout"
        >Sair</button>
      </div>
      <div class="header-top-actions">
        <button
          type="button"
          class="header-menu-toggle"
          :aria-expanded="menuOpen"
          aria-label="Abrir menu"
          aria-controls="headerActions"
          @click="toggleMenu"
        >
          <span class="material-icons" aria-hidden="true">{{ menuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </div>

    <div class="header-actions" id="headerActions">
      <!-- Seletor de ano — apenas na aba gastos -->
      <label v-if="isGastos" class="field-inline">
        Ano
        <div class="field-with-action ano-wrapper">
          <select :value="gastosStore.ano" @change="changeAno">
            <option v-for="a in gastosStore.anos" :key="a" :value="a">{{ a }}</option>
          </select>
          <button
            type="button"
            class="btn-icon-mini"
            title="Adicionar ano"
            aria-label="Adicionar ano"
            @click="emit('openModalAno'); closeMenu()"
          ><span class="material-icons" aria-hidden="true">add</span></button>
          <button
            type="button"
            class="btn-icon-mini btn-icon-danger"
            title="Excluir ano"
            aria-label="Excluir ano"
            @click="emit('openModalExcluirAno'); closeMenu()"
          ><span class="material-icons" aria-hidden="true">delete_outline</span></button>
        </div>
      </label>

      <div class="header-buttons">
        <!-- Assinaturas: botão nova assinatura -->
        <button
          v-if="isAssinaturas"
          type="button"
          class="btn btn-primary btn-fab"
          @click="emit('novaAssinatura'); closeMenu()"
        >
          <span class="material-icons mi-inline" aria-hidden="true">add</span>
          <span class="btn-text">Nova assinatura</span>
        </button>

        <!-- Gastos: ações -->
        <template v-if="isGastos">
          <button
            type="button"
            class="btn btn-ghost"
            title="Baixar modelo Excel"
            @click="gastosStore.downloadTemplate().catch(e => toast(e.message, true)); closeMenu()"
          >
            <span class="material-icons mi-inline" aria-hidden="true">download</span>
            <span class="btn-text">Modelo</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            title="Importar lançamentos de Excel"
            @click="triggerImport(); closeMenu()"
          >
            <span class="material-icons mi-inline" aria-hidden="true">upload</span>
            <span class="btn-text">Importar</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            title="Lixeira"
            @click="emit('openLixeira'); closeMenu()"
          >
            <span class="material-icons mi-inline" aria-hidden="true">delete_outline</span>
            <span class="btn-text">Lixeira</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls"
            style="display:none"
            @change="handleFileChange"
          >
          <button
            type="button"
            class="btn btn-primary btn-fab"
            @click="emit('novoLancamento'); closeMenu()"
          >
            <span class="material-icons mi-inline" aria-hidden="true">add</span>
            <span class="btn-text">Novo lançamento</span>
          </button>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const emit = defineEmits([
  'novoLancamento', 'openModalAno', 'openModalExcluirAno',
  'openLixeira', 'novaAssinatura',
])

const route = useRoute()
const authStore = useAuthStore()
const gastosStore = useGastosStore()
const { toast } = useToast()

const menuOpen = ref(false)
const fileInput = ref(null)

const isGastos = computed(() => route.name === 'gastos')
const isAssinaturas = computed(() => route.name === 'assinaturas')

const VIEW_SUBTITLES = {
  gastos: 'Receitas, despesas e saldo mensal',
  assinaturas: 'Assinaturas e custos recorrentes no cartão',
  features: 'Histórico de funcionalidades entregues',
}
const subtitle = computed(() => VIEW_SUBTITLES[route.name] || '')

const showLogout = computed(() => {
  const backend = authStore.config?.backend
  return (backend === 'mysql' || backend === 'supabase') && !authStore.showOverlay
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

async function changeAno(e) {
  gastosStore.ano = parseInt(e.target.value, 10)
  await Promise.all([
    gastosStore.loadMesesRevisados(),
    gastosStore.loadMes(),
    gastosStore.loadChart(),
  ])
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    await gastosStore.importarExcel(file)
  } catch (err) {
    toast(err.message, true)
  }
}

async function logout() {
  const backend = authStore.config?.backend
  if (backend === 'mysql') await authStore.mysqlLogout()
  else if (backend === 'supabase') await authStore.supabaseLogout()
}

// Fecha menu ao redimensionar para desktop
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 900px)').matches) closeMenu()
  })
}
</script>
