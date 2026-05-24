/**
 * Recorrentes store — Pinia.
 * Templates mensais reutilizáveis (CRUD + gerador de lançamentos).
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, CK, cacheGet, cacheSet, cacheDelete, cacheHas } from '@/services/api'
import { useToast } from '@/composables/useToast'

export const useRecorrentesStore = defineStore('recorrentes', () => {
  const { toast } = useToast()

  const lista = ref([])
  const loaded = ref(false)

  function applyFromCache() {
    if (cacheHas(CK.recorrentes)) {
      lista.value = cacheGet(CK.recorrentes) || []
      loaded.value = true
    }
  }

  function reset() {
    lista.value = []
    loaded.value = false
  }

  async function load() {
    if (cacheHas(CK.recorrentes)) {
      lista.value = cacheGet(CK.recorrentes) || []
      loaded.value = true
      return
    }
    try {
      const data = await api('/api/recorrentes')
      lista.value = data.recorrentes || []
      cacheSet(CK.recorrentes, lista.value)
      loaded.value = true
    } catch (err) {
      console.warn('[recorrentes] load falhou', err)
      lista.value = []
    }
  }

  async function save(payload, id = null) {
    let saved
    if (id) {
      saved = await api(`/api/recorrentes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      toast('Template atualizado')
    } else {
      saved = await api('/api/recorrentes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      toast('Template criado')
    }
    cacheDelete(CK.recorrentes)
    await load()
    return saved
  }

  async function remove(id) {
    await api(`/api/recorrentes/${id}`, { method: 'DELETE' })
    toast('Template removido')
    cacheDelete(CK.recorrentes)
    await load()
  }

  async function toggleAtivo(item) {
    return save({ ...item, ativo: !item.ativo }, item.id)
  }

  async function gerar(ano, mes) {
    const data = await api('/api/recorrentes/gerar', {
      method: 'POST',
      body: JSON.stringify({ ano, mes }),
    })
    return data
  }

  return {
    lista, loaded,
    applyFromCache, reset,
    load, save, remove, toggleAtivo, gerar,
  }
})
