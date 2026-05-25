/**
 * Gastos store — Pinia.
 * Centraliza todo o estado de gastos mensais.
 * Equivalente ao state + funções de static/app.js
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  api,
  apiDownload,
  apiUpload,
  CK,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheHas,
  cacheClear,
  bustPrefix,
} from '@/services/api'
import { useToast } from '@/composables/useToast'

export const useGastosStore = defineStore('gastos', () => {
  const { toast } = useToast()

  const ano = ref(new Date().getFullYear())
  const mes = ref(new Date().getMonth() + 1)
  const secoes = ref({ receita: [], despesa: [] })
  const allTags = ref([])
  const mesesRevisados = ref(new Set())
  const _despesasSecoesRaw = ref([])
  const _receitasSecoesRaw = ref([])
  const totaisMes = ref({})
  const anos = ref([])
  const chartData = ref(null)
  const loaded = ref(false)
  const tagFilter = ref('')
  const metas = ref([])
  const notaMes = ref('')

  function _filtraSecoes(secs, tag) {
    if (!tag) return secs
    const key = tag.toLowerCase()
    return secs
      .map((sec) => ({
        ...sec,
        itens: sec.itens.filter((it) =>
          (it.tags || []).some((t) => String(t).toLowerCase() === key)
        ),
      }))
      .filter((sec) => sec.itens.length > 0)
      .map((sec) => ({
        ...sec,
        total: Math.round(sec.itens.reduce((s, i) => s + (i.valor || 0), 0) * 100) / 100,
      }))
  }

  const despesasSecoes = computed(() => _filtraSecoes(_despesasSecoesRaw.value, tagFilter.value))
  const receitasSecoes = computed(() => _filtraSecoes(_receitasSecoesRaw.value, tagFilter.value))

  // ─── Totais derivados ────────────────────────────────────────────
  const totalPagoDespesas = computed(() =>
    despesasSecoes.value.reduce(
      (sum, sec) => sum + sec.itens.filter((i) => i.pago).reduce((s, i) => s + i.valor, 0),
      0
    )
  )

  const totalInvestidoReceitas = computed(() =>
    receitasSecoes.value.reduce(
      (sum, sec) => sum + sec.itens.filter((i) => i.investido).reduce((s, i) => s + i.valor, 0),
      0
    )
  )

  const totalPendenteDespesas = computed(() =>
    despesasSecoes.value.reduce(
      (sum, sec) => sum + sec.itens.filter((i) => !i.pago).reduce((s, i) => s + i.valor, 0),
      0
    )
  )

  const totalReceitasFiltro = computed(() =>
    receitasSecoes.value.reduce(
      (sum, sec) => sum + sec.itens.reduce((s, i) => s + (i.valor || 0), 0),
      0
    )
  )

  const totalDespesasFiltro = computed(() =>
    despesasSecoes.value.reduce(
      (sum, sec) => sum + sec.itens.reduce((s, i) => s + (i.valor || 0), 0),
      0
    )
  )

  const totaisComputados = computed(() => {
    const filtroAtivo = !!tagFilter.value
    const entrada = filtroAtivo ? totalReceitasFiltro.value : (totaisMes.value.entrada || 0)
    const saida = filtroAtivo ? totalDespesasFiltro.value : (totaisMes.value.saida || 0)
    const entrada_investida = receitasSecoes.value.length || filtroAtivo
      ? totalInvestidoReceitas.value
      : (totaisMes.value.entrada_investida ?? 0)
    const saida_paga = despesasSecoes.value.length || filtroAtivo
      ? totalPagoDespesas.value
      : (totaisMes.value.saida_paga ?? 0)
    const saida_pendente = despesasSecoes.value.length || filtroAtivo
      ? totalPendenteDespesas.value
      : (totaisMes.value.saida_pendente ?? 0)
    return {
      ...totaisMes.value,
      entrada,
      saida,
      entrada_investida,
      saida_paga,
      saida_pendente,
      caixa: entrada - entrada_investida - saida_paga,
      liquido: filtroAtivo ? entrada - saida : (totaisMes.value.liquido ?? entrada - saida),
    }
  })

  // ─── Cache sync ──────────────────────────────────────────────────
  function _applyMesResumo(resumo) {
    totaisMes.value = { ...(resumo.totais || {}) }
    _receitasSecoesRaw.value = resumo.receitas_por_secao || []
    _despesasSecoesRaw.value = resumo.despesas_por_secao || []
  }

  function applyFromCache() {
    if (cacheHas(CK.secoes)) secoes.value = cacheGet(CK.secoes)
    if (cacheHas(CK.tags)) allTags.value = cacheGet(CK.tags)
    if (cacheHas(CK.anos)) {
      const lista = cacheGet(CK.anos)
      if (!lista.includes(ano.value)) ano.value = lista[0] || ano.value
      anos.value = lista.length ? lista : [ano.value]
    }
    if (cacheHas(CK.mrev(ano.value))) {
      mesesRevisados.value = new Set(cacheGet(CK.mrev(ano.value)))
    }
    if (cacheHas(CK.mes(ano.value, mes.value))) {
      _applyMesResumo(cacheGet(CK.mes(ano.value, mes.value)))
    }
    if (cacheHas(CK.chart(ano.value))) {
      chartData.value = cacheGet(CK.chart(ano.value))
    }
    if (cacheHas(CK.metas)) {
      metas.value = cacheGet(CK.metas) || []
    }
    loaded.value = true
  }

  function reset() {
    ano.value = new Date().getFullYear()
    mes.value = new Date().getMonth() + 1
    secoes.value = { receita: [], despesa: [] }
    allTags.value = []
    mesesRevisados.value = new Set()
    _despesasSecoesRaw.value = []
    _receitasSecoesRaw.value = []
    totaisMes.value = {}
    anos.value = []
    chartData.value = null
    loaded.value = false
    tagFilter.value = ''
    metas.value = []
    notaMes.value = ''
  }

  function _patchMesCache(updater) {
    const key = CK.mes(ano.value, mes.value)
    if (!cacheHas(key)) return
    const resumo = cacheGet(key)
    updater(resumo)
    cacheSet(key, resumo)
  }

  // ─── Helpers ────────────────────────────────────────────────────
  function findReceitaItem(id) {
    for (const sec of _receitasSecoesRaw.value) {
      const item = sec.itens.find((i) => i.id === id)
      if (item) return { sec, item }
    }
    return null
  }

  function findDespesaItem(id) {
    for (const sec of _despesasSecoesRaw.value) {
      const item = sec.itens.find((i) => i.id === id)
      if (item) return { sec, item }
    }
    return null
  }

  // ─── Loaders ────────────────────────────────────────────────────
  async function loadSecoes() {
    if (cacheHas(CK.secoes)) {
      secoes.value = cacheGet(CK.secoes)
      return
    }
    const data = await api('/api/secoes')
    secoes.value = {
      despesa: data.secoes_despesa || data.secoes || [],
      receita: data.secoes_receita || [],
    }
    cacheSet(CK.secoes, secoes.value)
  }

  async function loadAnos() {
    if (cacheHas(CK.anos)) {
      const cached = cacheGet(CK.anos)
      if (!cached.includes(ano.value)) ano.value = cached[0] || ano.value
      anos.value = cached.length ? cached : [ano.value]
      return
    }
    const data = await api('/api/anos')
    const lista = data.anos || []
    cacheSet(CK.anos, lista)
    if (!lista.includes(ano.value)) ano.value = lista[0] || ano.value
    anos.value = lista.length ? lista : [ano.value]
  }

  async function loadTags() {
    if (cacheHas(CK.tags)) {
      allTags.value = cacheGet(CK.tags)
      return
    }
    const data = await api('/api/tags')
    allTags.value = data.tags || []
    cacheSet(CK.tags, allTags.value)
  }

  async function loadMesesRevisados() {
    const key = CK.mrev(ano.value)
    let revisados
    if (cacheHas(key)) {
      revisados = cacheGet(key)
    } else {
      const data = await api(`/api/revisao?ano=${ano.value}`)
      revisados = data.revisados || []
      cacheSet(key, revisados)
    }
    mesesRevisados.value = new Set(revisados)
  }

  async function toggleMesRevisado(mesNum, revisado) {
    const data = await api('/api/revisao/marcar', {
      method: 'POST',
      body: JSON.stringify({ ano: ano.value, mes: mesNum, revisado }),
    })
    const revisados = data.revisados || []
    mesesRevisados.value = new Set(revisados)
    cacheSet(CK.mrev(ano.value), revisados)
  }

  async function loadMes() {
    const key = CK.mes(ano.value, mes.value)
    let resumo
    if (cacheHas(key)) {
      resumo = cacheGet(key)
    } else {
      resumo = await api(`/api/resumo?ano=${ano.value}&mes=${mes.value}`)
      cacheSet(key, resumo)
    }
    _applyMesResumo(resumo)
  }

  async function loadChart() {
    const key = CK.chart(ano.value)
    let resumo
    if (cacheHas(key)) {
      resumo = cacheGet(key)
    } else {
      resumo = await api(`/api/resumo?ano=${ano.value}`)
      cacheSet(key, resumo)
    }
    chartData.value = resumo
  }

  // ─── Mutations ──────────────────────────────────────────────────
  async function togglePago(id, pago) {
    await api(`/api/lancamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ pago }),
    })
    cacheDelete(CK.mes(ano.value, mes.value))
    const found = findDespesaItem(id)
    if (found) found.item.pago = pago
  }

  async function toggleInvestido(id, investido) {
    await api(`/api/lancamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ investido }),
    })
    cacheDelete(CK.mes(ano.value, mes.value))
    const found = findReceitaItem(id)
    if (found) found.item.investido = investido
  }

  async function deleteLancamento(id) {
    await api(`/api/lancamentos/${id}`, { method: 'DELETE' })
    toast('Lançamento excluído')
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    cacheDelete(CK.lixeira)
    await Promise.all([loadMes(), loadChart()])
  }

  async function saveLancamento(payload, id = null) {
    const hasNewTags = payload.tags?.some(
      (t) => !allTags.value.some((s) => s.toLowerCase() === t.toLowerCase())
    )
    if (id) {
      await api(`/api/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      toast('Lançamento atualizado')
    } else {
      await api('/api/lancamentos', { method: 'POST', body: JSON.stringify(payload) })
      toast('Lançamento criado')
    }
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    if (hasNewTags) cacheDelete(CK.tags)
    if (!id) cacheDelete(CK.anos)
    const tasks = [loadMes(), loadChart()]
    if (hasNewTags) tasks.push(loadTags())
    if (!id) tasks.push(loadAnos())
    await Promise.all(tasks)
  }

  async function limparMes() {
    const data = await api(
      `/api/lancamentos/limpar-mes?ano=${ano.value}&mes=${mes.value}`,
      { method: 'DELETE' }
    )
    const n = data.removidos || 0
    toast(`${n} lançamento${n !== 1 ? 's' : ''} movido${n !== 1 ? 's' : ''} para a lixeira`)
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    cacheDelete(CK.lixeira)
    await Promise.all([loadMes(), loadChart()])
  }

  async function duplicarLancamento(id) {
    const novo = await api(`/api/lancamentos/${id}/duplicar`, {
      method: 'POST',
      body: JSON.stringify({ ano: ano.value, mes: mes.value }),
    })
    toast('Lançamento duplicado')
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    await Promise.all([loadMes(), loadChart()])
    return novo
  }

  async function copiarMes(tipos = ['receita', 'despesa'], origem = null) {
    const body = { ano: ano.value, mes: mes.value, tipos }
    if (origem) body.origem = origem
    const data = await api('/api/lancamentos/copiar-mes', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const n = data.criados || 0
    const origemLabel = origem
      ? `${origem.mes}/${origem.ano}`
      : 'mês anterior'
    if (n === 0) {
      toast(`Nenhum lançamento encontrado em ${origemLabel}`, true)
    } else {
      toast(`${n} lançamento${n !== 1 ? 's' : ''} copiado${n !== 1 ? 's' : ''} de ${origemLabel}`)
    }
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    cacheDelete(CK.anos)
    await Promise.all([loadAnos(), loadMes(), loadChart()])
    return data
  }

  // compat alias
  async function copiarMesAnterior(tipos = ['receita', 'despesa']) {
    return copiarMes(tipos, null)
  }

  async function criarSecao(tipo, nome) {
    const data = await api('/api/secoes', {
      method: 'POST',
      body: JSON.stringify({ tipo, nome }),
    })
    secoes.value[tipo] = data.secoes
    cacheSet(CK.secoes, secoes.value)
    toast('Seção criada')
    return data.nome
  }

  async function criarAno(novoAno) {
    const data = await api('/api/anos', {
      method: 'POST',
      body: JSON.stringify({ ano: novoAno }),
    })
    anos.value = data.anos
    ano.value = data.ano
    cacheDelete(CK.anos)
    cacheDelete(CK.mrev(ano.value))
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    await Promise.all([loadMesesRevisados(), loadMes(), loadChart()])
    toast(`Ano ${data.ano} criado`)
    return data
  }

  async function excluirAno(anoExcluir) {
    const data = await api(`/api/anos/${anoExcluir}?force=true`, { method: 'DELETE' })
    const removidos = data.lancamentos_removidos || 0
    toast(
      removidos
        ? `Ano ${anoExcluir} excluído (${removidos} lançamento${removidos > 1 ? 's' : ''})`
        : `Ano ${anoExcluir} excluído`
    )
    bustPrefix(`mes:${anoExcluir}`)
    bustPrefix(`chart:${anoExcluir}`)
    cacheDelete(CK.anos)
    cacheDelete(CK.tags)
    bustPrefix('mrev:')
    await Promise.all([loadAnos(), loadMesesRevisados(), loadTags(), loadMes(), loadChart()])
  }

  async function loadMetas() {
    if (cacheHas(CK.metas)) {
      metas.value = cacheGet(CK.metas) || []
      return
    }
    try {
      const data = await api('/api/metas')
      metas.value = data.metas || []
      cacheSet(CK.metas, metas.value)
    } catch (err) {
      console.warn('[gastos] loadMetas falhou', err)
      metas.value = []
    }
  }

  function metaPara(tipo, secao) {
    const key = (secao || '').toLowerCase()
    const found = metas.value.find(
      (m) => m.tipo === tipo && (m.secao || '').toLowerCase() === key
    )
    return found ? Number(found.valor) || 0 : 0
  }

  async function setMeta(tipo, secao, valor) {
    const payload = {
      tipo,
      secao,
      valor: valor === null || valor === '' ? null : Number(valor),
    }
    const data = await api('/api/metas', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    metas.value = data.metas || []
    cacheSet(CK.metas, metas.value)
    toast(valor === null || valor === '' || Number(valor) === 0 ? 'Meta removida' : 'Meta salva')
  }

  async function loadNota() {
    try {
      const data = await api(`/api/notas?ano=${ano.value}&mes=${mes.value}`)
      notaMes.value = data.texto || ''
    } catch {
      notaMes.value = ''
    }
  }

  async function saveNota(texto) {
    const data = await api('/api/notas', {
      method: 'PUT',
      body: JSON.stringify({ ano: ano.value, mes: mes.value, texto }),
    })
    notaMes.value = data.texto || ''
  }

  async function downloadTemplate() {
    await apiDownload('/api/template-excel', 'modelo-gastos.xlsx')
  }

  async function exportar({ escopo = 'mes', formato = 'xlsx' } = {}) {
    const params = new URLSearchParams({ ano: String(ano.value), formato })
    let sufixo = `${ano.value}`
    if (escopo === 'mes') {
      params.set('mes', String(mes.value))
      sufixo = `${ano.value}-${String(mes.value).padStart(2, '0')}`
    }
    if (tagFilter.value) params.set('tag', tagFilter.value)
    const ext = formato === 'csv' ? 'csv' : 'xlsx'
    const filename = `monesy-lancamentos-${sufixo}.${ext}`
    await apiDownload(`/api/export?${params.toString()}`, filename)
    toast('Arquivo gerado')
  }

  async function importarExcel(file) {
    const formData = new FormData()
    formData.append('arquivo', file)
    const data = await apiUpload('/api/lancamentos/import-excel', formData)
    const erros = (data.erros || []).length
    let msg = `${data.criados} lançamento(s) importado(s)`
    if (erros) msg += ` · ${erros} linha(s) com erro`
    toast(msg, erros > 0)
    if (erros) console.warn('Linhas com erro:', data.erros)
    cacheClear()
    await Promise.all([loadAnos(), loadSecoes(), loadTags(), loadMes(), loadChart()])
  }

  // ─── Histórico ──────────────────────────────────────────────────
  async function loadHistorico(id) {
    return await api(`/api/lancamentos/${id}/historico`)
  }

  // ─── Lixeira ────────────────────────────────────────────────────
  async function loadLixeira() {
    if (cacheHas(CK.lixeira)) return cacheGet(CK.lixeira)
    const data = await api('/api/lixeira')
    cacheSet(CK.lixeira, data)
    return data
  }

  async function restaurarLancamento(id) {
    await api(`/api/lixeira/${id}/restaurar`, { method: 'POST' })
    toast('Lançamento restaurado')
    cacheDelete(CK.anos)
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    cacheDelete(CK.lixeira)
    await Promise.all([loadAnos(), loadMes(), loadChart()])
  }

  async function deletarPermanente(id) {
    await api(`/api/lixeira/${id}`, { method: 'DELETE' })
    toast('Excluído permanentemente')
    cacheDelete(CK.lixeira)
  }

  async function esvaziarLixeira() {
    const data = await api('/api/lixeira', { method: 'DELETE' })
    toast(`Lixeira esvaziada (${data.removidos} item${data.removidos !== 1 ? 's' : ''})`)
    cacheSet(CK.lixeira, { lixeira: [], total: 0 })
  }

  // ─── Init (fallback quando bootstrap não rodou) ───────────────────
  async function init() {
    await Promise.all([
      loadSecoes().catch((e) => console.error('[gastos] loadSecoes', e)),
      loadTags().catch((e) => console.error('[gastos] loadTags', e)),
      loadAnos().catch((e) => console.error('[gastos] loadAnos', e)),
      loadMetas().catch((e) => console.error('[gastos] loadMetas', e)),
    ])
    await Promise.all([
      loadMesesRevisados().catch((e) => console.error('[gastos] loadMesesRevisados', e)),
      loadMes().catch((e) => console.error('[gastos] loadMes', e)),
      loadChart().catch((e) => console.error('[gastos] loadChart', e)),
    ])
    loaded.value = true
  }

  return {
    ano, mes, secoes, allTags, mesesRevisados,
    despesasSecoes, receitasSecoes,
    despesasSecoesRaw: _despesasSecoesRaw,
    receitasSecoesRaw: _receitasSecoesRaw,
    totaisMes, anos, chartData, loaded,
    tagFilter, metas, notaMes,
    totaisComputados, totalPagoDespesas, totalInvestidoReceitas, totalPendenteDespesas,
    findReceitaItem, findDespesaItem,
    applyFromCache, reset,
    loadSecoes, loadAnos, loadTags, loadMesesRevisados, loadMetas,
    toggleMesRevisado, loadMes, loadChart,
    togglePago, toggleInvestido,
    deleteLancamento, saveLancamento, limparMes,
    duplicarLancamento, copiarMes, copiarMesAnterior,
    metaPara, setMeta,
    loadNota, saveNota,
    criarSecao, criarAno, excluirAno,
    downloadTemplate, importarExcel, exportar,
    loadHistorico, loadLixeira,
    restaurarLancamento, deletarPermanente, esvaziarLixeira,
    init,
  }
})
