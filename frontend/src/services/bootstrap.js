/**
 * Carrega todos os dados do usuário e popula o cache.
 * Usa /api/bootstrap quando disponível; senão, fallback incremental.
 */
import { api, CK, cacheSet, cacheClear } from '@/services/api'

export function hydrateBootstrapCache(data) {
  cacheClear()

  cacheSet(CK.secoes, data.secoes)
  cacheSet(CK.tags, data.tags || [])
  cacheSet(CK.anos, data.anos || [])
  cacheSet(CK.lixeira, { lixeira: data.lixeira || [], total: (data.lixeira || []).length })
  cacheSet(CK.assinaturas, data.assinaturas)
  cacheSet(CK.features, data.features || [])
  cacheSet(CK.metas, data.metas || [])
  cacheSet(CK.recorrentes, data.recorrentes || [])

  for (const [ano, revisados] of Object.entries(data.meses_revisados || {})) {
    cacheSet(CK.mrev(parseInt(ano, 10)), revisados)
  }
  for (const [key, resumo] of Object.entries(data.resumos_mes || {})) {
    const [ano, mes] = key.split(':').map((n) => parseInt(n, 10))
    cacheSet(CK.mes(ano, mes), resumo)
  }
  for (const [ano, chart] of Object.entries(data.charts || {})) {
    cacheSet(CK.chart(parseInt(ano, 10)), chart)
  }
}

async function loadUserDataFallback() {
  const [
    { useGastosStore },
    { useAssinaturasStore },
    { useFeaturesStore },
    { useRecorrentesStore },
  ] = await Promise.all([
    import('@/stores/gastos'),
    import('@/stores/assinaturas'),
    import('@/stores/features'),
    import('@/stores/recorrentes'),
  ])

  const gastos = useGastosStore()
  const assinaturas = useAssinaturasStore()
  const features = useFeaturesStore()
  const recorrentes = useRecorrentesStore()

  await gastos.init()
  await Promise.all([
    assinaturas.load(),
    features.load(),
    gastos.loadLixeira(),
    recorrentes.load(),
  ])

  const savedAno = gastos.ano
  const savedMes = gastos.mes
  for (const ano of [...gastos.anos]) {
    gastos.ano = ano
    await gastos.loadMesesRevisados()
    await gastos.loadChart()
    for (let m = 1; m <= 12; m++) {
      gastos.mes = m
      await gastos.loadMes()
    }
  }
  gastos.ano = savedAno
  gastos.mes = savedMes
  gastos.applyFromCache()
  assinaturas.applyFromCache()
  features.applyFromCache()
  recorrentes.applyFromCache()
}

export async function loadUserData() {
  try {
    const data = await api('/api/bootstrap')
    hydrateBootstrapCache(data)
    return data
  } catch (err) {
    const msg = err?.message || ''
    if (!/não encontrado|not found|404/i.test(msg)) throw err
    console.warn('[bootstrap] /api/bootstrap indisponível — carregando via APIs individuais')
    await loadUserDataFallback()
    return null
  }
}

export function clearUserDataCache() {
  cacheClear()
}
