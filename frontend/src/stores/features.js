/**
 * Features store — Pinia.
 * Dados carregados via bootstrap; recarrega só após invalidação do cache.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, CK, cacheGet, cacheSet, cacheDelete, cacheHas } from '@/services/api'

export const useFeaturesStore = defineStore('features', () => {
  const all = ref([])
  const loaded = ref(false)

  function applyFromCache() {
    if (cacheHas(CK.features)) {
      all.value = cacheGet(CK.features)
      loaded.value = true
    }
  }

  async function load() {
    if (cacheHas(CK.features)) {
      all.value = cacheGet(CK.features)
      loaded.value = true
      return
    }
    const data = await api('/api/features')
    all.value = data.features || []
    cacheSet(CK.features, all.value)
    loaded.value = true
  }

  function reset() {
    all.value = []
    loaded.value = false
  }

  return { all, loaded, applyFromCache, load, reset }
})
