/**
 * Assinaturas store — Pinia.
 * Equivalente a static/assinaturas.js
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/services/api'
import { useToast } from '@/composables/useToast'

export const useAssinaturasStore = defineStore('assinaturas', () => {
  const { toast } = useToast()

  const cartoes = ref([])
  const filtroCartao = ref('')
  const lista = ref([])
  const totalMensalAtivas = ref(0)
  const loaded = ref(false)

  async function loadCartoes() {
    const data = await api('/api/assinaturas/cartoes')
    cartoes.value = data.cartoes || []
  }

  async function loadLista() {
    const params = new URLSearchParams()
    if (filtroCartao.value) params.set('cartao', filtroCartao.value)
    const qs = params.toString()
    const data = await api(`/api/assinaturas${qs ? `?${qs}` : ''}`)
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
    await load()
  }

  async function remove(id) {
    await api(`/api/assinaturas/${id}`, { method: 'DELETE' })
    toast('Assinatura excluída')
    await load()
  }

  async function loadHistorico(id) {
    return await api(`/api/assinaturas/${id}/historico`)
  }

  function getById(id) {
    return lista.value.find((a) => a.id === id) || null
  }

  return {
    cartoes, filtroCartao, lista, totalMensalAtivas, loaded,
    load, loadCartoes, loadLista,
    save, remove, loadHistorico,
    getById,
  }
})
