/**
 * Assinaturas store — Pinia.
 * Dados carregados via bootstrap; recarrega só após invalidação do cache.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, CK, cacheGet, cacheSet, cacheDelete, cacheHas } from '@/services/api'
import { useToast } from '@/composables/useToast'

export const useAssinaturasStore = defineStore('assinaturas', () => {
  const { toast } = useToast()

  const cartoes = ref([])
  const filtroCartao = ref('')
  const lista = ref([])
  const totalMensalAtivas = ref(0)
  const loaded = ref(false)

  function _applyListaFromCache() {
    if (!cacheHas(CK.assinaturas)) return false
    const cached = cacheGet(CK.assinaturas)
    cartoes.value = cached.cartoes || []
    let items = cached.assinaturas || []
    if (filtroCartao.value) {
      const key = filtroCartao.value.toLowerCase()
      items = items.filter((a) => (a.cartao || '').toLowerCase() === key)
    }
    lista.value = items
    totalMensalAtivas.value = round(
      items.filter((a) => a.ativa).reduce((s, a) => s + (a.valor_mensal || 0), 0)
    )
    return true
  }

  function round(n) {
    return Math.round(n * 100) / 100
  }

  function applyFromCache() {
    if (_applyListaFromCache()) loaded.value = true
  }

  function reset() {
    cartoes.value = []
    filtroCartao.value = ''
    lista.value = []
    totalMensalAtivas.value = 0
    loaded.value = false
  }

  async function loadCartoes() {
    if (cacheHas(CK.assinaturas)) {
      cartoes.value = cacheGet(CK.assinaturas).cartoes || []
      return
    }
    const data = await api('/api/assinaturas/cartoes')
    cartoes.value = data.cartoes || []
  }

  async function loadLista() {
    if (_applyListaFromCache()) return
    const params = new URLSearchParams()
    if (filtroCartao.value) params.set('cartao', filtroCartao.value)
    const qs = params.toString()
    const data = await api(`/api/assinaturas${qs ? `?${qs}` : ''}`)
    if (!filtroCartao.value) {
      cacheSet(CK.assinaturas, {
        cartoes: cartoes.value.length ? cartoes.value : [...new Set((data.assinaturas || []).map((a) => a.cartao).filter(Boolean))],
        assinaturas: data.assinaturas || [],
        total_mensal_ativas: data.total_mensal_ativas || 0,
      })
    }
    lista.value = data.assinaturas || []
    totalMensalAtivas.value = data.total_mensal_ativas || 0
  }

  async function load() {
    await loadCartoes()
    await loadLista()
    loaded.value = true
  }

  async function save(payload, id = null) {
    if (id) {
      await api(`/api/assinaturas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      toast('Assinatura atualizada')
    } else {
      await api('/api/assinaturas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      toast('Assinatura cadastrada')
    }
    cacheDelete(CK.assinaturas)
    await load()
  }

  async function remove(id) {
    await api(`/api/assinaturas/${id}`, { method: 'DELETE' })
    toast('Assinatura excluída')
    cacheDelete(CK.assinaturas)
    await load()
  }

  async function loadHistorico(id) {
    return await api(`/api/assinaturas/${id}/historico`)
  }

  function getById(id) {
    if (cacheHas(CK.assinaturas)) {
      const item = (cacheGet(CK.assinaturas).assinaturas || []).find((a) => a.id === id)
      if (item) return item
    }
    return lista.value.find((a) => a.id === id) || null
  }

  return {
    cartoes, filtroCartao, lista, totalMensalAtivas, loaded,
    applyFromCache, reset,
    load, loadCartoes, loadLista,
    save, remove, loadHistorico,
    getById,
  }
})
