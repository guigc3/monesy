/**
 * API service — fetch wrapper com JWT e loading state reativo.
 * Equivalente ao api() + _cache + _loading* de static/app.js
 */
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Loading counter — reativo para uso nos componentes
export const loadingCount = ref(0)

// Cache em memória — idêntico ao _cache do app.js
const _cache = new Map()

export const CK = {
  mes: (ano, mes) => `mes:${ano}:${mes}`,
  chart: (ano) => `chart:${ano}`,
  secoes: 'secoes',
  tags: 'tags',
  anos: 'anos',
  mrev: (ano) => `mrev:${ano}`,
  lixeira: 'lixeira',
  assinaturas: 'assinaturas',
  features: 'features',
  metas: 'metas',
  recorrentes: 'recorrentes',
}

export function bustPrefix(prefix) {
  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k)
  }
}

export function cacheGet(key) {
  return _cache.get(key)
}

export function cacheSet(key, value) {
  _cache.set(key, value)
}

export function cacheDelete(key) {
  _cache.delete(key)
}

export function cacheClear() {
  _cache.clear()
}

export function cacheHas(key) {
  return _cache.has(key)
}

let _showTimer = null
let _hideTimer = null
const SHOW_DELAY = 180
const HIDE_DELAY = 100

function _showLoading() {
  loadingCount.value++
}

function _hideLoading() {
  loadingCount.value = Math.max(0, loadingCount.value - 1)
}

function _loadingStart() {
  clearTimeout(_hideTimer)
  if (loadingCount.value === 0) {
    clearTimeout(_showTimer)
    _showTimer = setTimeout(_showLoading, SHOW_DELAY)
  }
}

function _loadingEnd() {
  clearTimeout(_showTimer)
  clearTimeout(_hideTimer)
  _hideTimer = setTimeout(_hideLoading, HIDE_DELAY)
}

export async function api(path, options = {}) {
  _loadingStart()
  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

    // JWT injection — lê do authStore sem criar dependência circular
    // (authStore.getAccessToken é uma função síncrona)
    const authStore = useAuthStore()
    const token = authStore.getAccessToken()
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(path, { ...options, headers })

    if (res.status === 401) {
      await authStore.handleUnauthorized()
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      let msg = data.error
      if (!msg && res.status === 404) {
        msg = 'Recurso não encontrado.'
      }
      throw new Error(msg || 'Erro na requisição')
    }
    return data
  } finally {
    _loadingEnd()
  }
}

/** Download de arquivo binário (template Excel etc.) */
export async function apiDownload(path, filename) {
  const authStore = useAuthStore()
  const token = authStore.getAccessToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(path, { headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Falha ao baixar arquivo')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Upload multipart (importação Excel) */
export async function apiUpload(path, formData) {
  _loadingStart()
  try {
    const authStore = useAuthStore()
    const token = authStore.getAccessToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(path, { method: 'POST', body: formData, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Falha ao importar')
    return data
  } finally {
    _loadingEnd()
  }
}
