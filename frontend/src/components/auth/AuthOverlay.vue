<template>
  <div
    v-if="authStore.showOverlay"
    class="auth-overlay"
    aria-hidden="false"
  >
    <div class="auth-card">
      <span class="logo-mark" aria-hidden="true">
        <img src="/design-system/logos/monesy-mark.svg" width="32" height="32" alt="">
      </span>
      <h2>{{ authStore.mode === 'signup' ? 'Criar conta' : 'Entrar' }}</h2>
      <p class="auth-subtitle">
        {{ authStore.mode === 'signup' ? 'Crie uma conta para isolar seus dados' : 'Acesse sua conta para ver seus gastos' }}
      </p>
      <form class="auth-form" autocomplete="on" @submit.prevent="handleSubmit">
        <label class="field">
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="username"
          >
        </label>
        <label class="field">
          Senha
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            autocomplete="current-password"
          >
        </label>
        <div class="auth-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ authStore.mode === 'signup' ? 'Cadastrar' : 'Entrar' }}
          </button>
        </div>
        <p v-if="authStore.authError" class="auth-error">{{ authStore.authError }}</p>
        <p class="auth-switch">
          <span>{{ authStore.mode === 'signup' ? 'Já tem conta?' : 'Não tem conta?' }}</span>
          <button type="button" class="link-btn" @click="toggleMode">
            {{ authStore.mode === 'signup' ? 'Entrar' : 'Cadastre-se' }}
          </button>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { toast } = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

function toggleMode() {
  authStore.mode = authStore.mode === 'signin' ? 'signup' : 'signin'
  authStore.authError = ''
}

async function handleSubmit() {
  authStore.authError = ''
  if (!email.value || !password.value) {
    authStore.authError = 'Preencha email e senha'
    return
  }
  loading.value = true
  try {
    const backend = authStore.config?.backend
    if (backend === 'mysql') {
      await authStore.mysqlSubmit(email.value, password.value)
    } else if (backend === 'supabase') {
      await authStore.supabaseSubmit(email.value, password.value)
    }
  } catch (err) {
    authStore.authError = err.message || 'Falha na autenticação'
  } finally {
    loading.value = false
  }
}
</script>
