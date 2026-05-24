/**
 * Auth store — Pinia.
 * Implementa os 3 modos: json (sem login), mysql (JWT), supabase (SDK).
 * Equivalente a static/auth.js
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const MYSQL_TOKEN_KEY = 'monesy_jwt'
const MYSQL_USER_KEY = 'monesy_user_id'

export const useAuthStore = defineStore('auth', () => {
  const config = ref(null)
  const ready = ref(false)
  const showOverlay = ref(false)
  const mode = ref('signin') // 'signin' | 'signup'
  const authError = ref('')

  // MySQL
  const mysqlToken = ref(null)
  const mysqlUserId = ref(null)

  // Supabase
  const supabaseClient = ref(null)
  const supabaseSession = ref(null)

  // ─── Public API (mesmo contrato que window.AppAuth) ─────────────
  function getAccessToken() {
    if (mysqlToken.value) return mysqlToken.value
    return supabaseSession.value?.access_token || null
  }

  function getUserId() {
    if (mysqlUserId.value) return mysqlUserId.value
    return supabaseSession.value?.user?.id || null
  }

  async function handleUnauthorized() {
    if (mysqlToken.value) {
      _mysqlClearSession()
      showOverlay.value = true
      return
    }
    if (supabaseClient.value) {
      await supabaseClient.value.auth.signOut()
      supabaseSession.value = null
      showOverlay.value = true
    }
  }

  // ─── MySQL ──────────────────────────────────────────────────────
  function _mysqlSaveSession(token, userId) {
    localStorage.setItem(MYSQL_TOKEN_KEY, token)
    localStorage.setItem(MYSQL_USER_KEY, userId)
    mysqlToken.value = token
    mysqlUserId.value = userId
  }

  function _mysqlClearSession() {
    localStorage.removeItem(MYSQL_TOKEN_KEY)
    localStorage.removeItem(MYSQL_USER_KEY)
    mysqlToken.value = null
    mysqlUserId.value = null
  }

  function _mysqlLoadSession() {
    mysqlToken.value = localStorage.getItem(MYSQL_TOKEN_KEY) || null
    mysqlUserId.value = localStorage.getItem(MYSQL_USER_KEY) || null
  }

  async function mysqlSubmit(email, password) {
    authError.value = ''
    const endpoint = mode.value === 'signup' ? '/api/auth/register' : '/api/auth/login'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha na autenticação')
    _mysqlSaveSession(data.token, data.user_id)
    _applyMysqlSession(true)
  }

  function _applyMysqlSession(hasSession) {
    // Sempre marca como pronto (skeleton sai independente de autenticação)
    if (!ready.value) ready.value = true
    if (hasSession) {
      showOverlay.value = false
    } else {
      showOverlay.value = true
    }
  }

  function mysqlLogout() {
    _mysqlClearSession()
    showOverlay.value = true
  }

  async function _startMysql() {
    _mysqlLoadSession()
    if (mysqlToken.value) {
      try {
        const res = await fetch('/api/anos', {
          headers: { Authorization: `Bearer ${mysqlToken.value}` },
        })
        if (res.ok) {
          _applyMysqlSession(true)
          return
        }
      } catch (_) {
        /* ignora */
      }
      _mysqlClearSession()
    }
    _applyMysqlSession(false)
  }

  // ─── Supabase ───────────────────────────────────────────────────
  function _createSupabaseClient(cfg) {
    const { createClient } = window.supabase
    return createClient(cfg.url, cfg.anon_key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }

  async function supabaseSubmit(email, password) {
    authError.value = ''
    let result
    if (mode.value === 'signup') {
      result = await supabaseClient.value.auth.signUp({ email, password })
      if (result.error) throw result.error
      if (!result.data.session) {
        throw new Error('Conta criada. Confirme o email se necessário e entre.')
      }
    } else {
      result = await supabaseClient.value.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
    }
    await _applySupabaseSession(result.data.session)
  }

  async function _applySupabaseSession(session) {
    supabaseSession.value = session || null
    if (!ready.value) ready.value = true
    if (session) {
      showOverlay.value = false
    } else {
      showOverlay.value = true
    }
  }

  async function supabaseLogout() {
    if (!supabaseClient.value) return
    await supabaseClient.value.auth.signOut()
    supabaseSession.value = null
    showOverlay.value = true
  }

  async function _waitForSupabase() {
    if (window.supabase?.createClient) return
    await new Promise((r) => setTimeout(r, 50))
    return _waitForSupabase()
  }

  async function _startSupabase(cfg) {
    await _waitForSupabase()
    supabaseClient.value = _createSupabaseClient(cfg.supabase)
    const { data } = await supabaseClient.value.auth.getSession()
    await _applySupabaseSession(data.session)
    supabaseClient.value.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') _applySupabaseSession(null)
      else if (session) supabaseSession.value = session
    })
  }

  // ─── Entry point ────────────────────────────────────────────────
  async function init() {
    try {
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error('Falha ao obter /api/config')
      config.value = await res.json()
    } catch (err) {
      console.error('[auth] /api/config falhou', err)
      ready.value = true
      return
    }

    const backend = config.value.backend

    if (backend === 'mysql') {
      await _startMysql()
      return
    }

    if (backend === 'supabase' && config.value.supabase) {
      // Carrega supabase-js dinamicamente
      if (!window.supabase) {
        await new Promise((resolve) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
          s.onload = resolve
          document.head.appendChild(s)
        })
      }
      await _startSupabase(config.value)
      return
    }

    // Modo json — sem login
    ready.value = true
  }

  return {
    config,
    ready,
    showOverlay,
    mode,
    authError,
    supabaseClient,
    // Public API
    getAccessToken,
    getUserId,
    handleUnauthorized,
    // MySQL
    mysqlSubmit,
    mysqlLogout,
    // Supabase
    supabaseSubmit,
    supabaseLogout,
    // Init
    init,
  }
})
