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
  const despesasSecoes = ref([])
  const receitasSecoes = ref([])
  const totaisMes = ref({})
  const anos = ref([])
  const chartData = ref(null)

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

  const totaisComputados = computed(() => {
    const entrada = totaisMes.value.entrada || 0
    const saida = totaisMes.value.saida || 0
    const entrada_investida = receitasSecoes.value.length
      ? totalInvestidoReceitas.value
      : (totaisMes.value.entrada_investida ?? 0)
    const saida_paga = despesasSecoes.value.length
      ? totalPagoDespesas.value
      : (totaisMes.value.saida_paga ?? 0)
    const saida_pendente = despesasSecoes.value.length
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
      liquido: totaisMes.value.liquido ?? entrada - saida,
    }
  })

  // ─── Helpers ────────────────────────────────────────────────────
  function findReceitaItem(id) {
    for (const sec of receitasSecoes.value) {
      const item = sec.itens.find((i) => i.id === id)
      if (item) return { sec, item }
    }
    return null
  }

  function findDespesaItem(id) {
    for (const sec of despesasSecoes.value) {
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
    totaisMes.value = { ...(resumo.totais || {}) }
    receitasSecoes.value = resumo.receitas_por_secao || []
    despesasSecoes.value = resumo.despesas_por_secao || []
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
    await Promise.all([loadMes(), loadChart()])
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

  async function downloadTemplate() {
    await apiDownload('/api/template-excel', 'modelo-gastos.xlsx')
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
    return await api('/api/lixeira')
  }

  async function restaurarLancamento(id) {
    await api(`/api/lixeira/${id}/restaurar`, { method: 'POST' })
    toast('Lançamento restaurado')
    cacheDelete(CK.anos)
    cacheDelete(CK.mes(ano.value, mes.value))
    cacheDelete(CK.chart(ano.value))
    await Promise.all([loadAnos(), loadMes(), loadChart()])
  }

  async function deletarPermanente(id) {
    await api(`/api/lixeira/${id}`, { method: 'DELETE' })
    toast('Excluído permanentemente')
  }

  async function esvaziarLixeira() {
    const data = await api('/api/lixeira', { method: 'DELETE' })
    toast(`Lixeira esvaziada (${data.removidos} item${data.removidos !== 1 ? 's' : ''})`)
  }

  // ─── Init ────────────────────────────────────────────────────────
  async function init() {
    await Promise.all([
      loadSecoes().catch((e) => console.error('[gastos] loadSecoes', e)),
      loadTags().catch((e) => console.error('[gastos] loadTags', e)),
      loadAnos().catch((e) => console.error('[gastos] loadAnos', e)),
    ])
    await Promise.all([
      loadMesesRevisados().catch((e) => console.error('[gastos] loadMesesRevisados', e)),
      loadMes().catch((e) => console.error('[gastos] loadMes', e)),
      loadChart().catch((e) => console.error('[gastos] loadChart', e)),
    ])
  }

  return {
    ano, mes, secoes, allTags, mesesRevisados,
    despesasSecoes, receitasSecoes, totaisMes, anos, chartData,
    totaisComputados, totalPagoDespesas, totalInvestidoReceitas, totalPendenteDespesas,
    findReceitaItem, findDespesaItem,
    loadSecoes, loadAnos, loadTags, loadMesesRevisados,
    toggleMesRevisado, loadMes, loadChart,
    togglePago, toggleInvestido,
    deleteLancamento, saveLancamento, limparMes,
    criarSecao, criarAno, excluirAno,
    downloadTemplate, importarExcel,
    loadHistorico, loadLixeira,
    restaurarLancamento, deletarPermanente, esvaziarLixeira,
    init,
  }
})
