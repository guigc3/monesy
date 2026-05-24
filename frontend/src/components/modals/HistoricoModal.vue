<template>
  <BaseModal ref="modalRef" @close="reset">
    <div class="modal-header">
      <div>
        <h3>Histórico de alterações</h3>
        <p class="modal-subtitle">{{ subtitle }}</p>
      </div>
      <button type="button" class="btn-icon" aria-label="Fechar" @click="close">
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
    <div class="modal-body" style="min-height:120px">
      <div v-if="loading" class="empty-state" style="padding:32px">Carregando…</div>
      <div v-else-if="error" class="empty-state" style="padding:32px;color:var(--red)">{{ error }}</div>
      <div v-else-if="!entries.length" class="empty-state" style="padding:32px">Nenhuma alteração registrada.</div>
      <div v-else class="hist-list">
        <div v-for="(entry, i) in entries" :key="i" class="hist-entry">
          <div class="hist-entry-header">
            <span class="hist-acao-icon" v-html="acaoIcon(entry.acao)"></span>
            <span class="hist-acao-label">{{ acaoLabel(entry.acao) }}</span>
            <span class="hist-ts">{{ fmtTs(entry.ts) }}</span>
          </div>
          <div v-if="camposLinhas(entry).length" class="hist-campos">
            <div v-for="linha in camposLinhas(entry)" :key="linha.campo" class="hist-campo">
              <span class="hist-campo-nome">{{ linha.label }}</span>
              <span v-if="entry.acao === 'criado'" class="hist-valor-depois">{{ linha.depois }}</span>
              <template v-else>
                <span class="hist-valor-antes">{{ linha.antes }}</span>
                <span class="hist-arrow">→</span>
                <span class="hist-valor-depois">{{ linha.depois }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" @click="close">Fechar</button>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { fmtTs, fmtBRL } from '@/utils/format'
import { mi, MI } from '@/utils/icons'

const modalRef = ref(null)
const loading = ref(false)
const error = ref('')
const subtitle = ref('')
const entries = ref([])

const ACAO_LABELS = {
  criado:       { icon: MI.autoAwesome, label: 'Criado' },
  editado:      { icon: MI.edit, label: 'Editado' },
  pago:         { icon: MI.checkCircle, label: 'Marcado como pago' },
  despago:      { icon: MI.undo, label: 'Desmarcado como pago' },
  investido:    { icon: MI.trendingUp, label: 'Marcado como investimento' },
  desinvestido: { icon: MI.undo, label: 'Desmarcado como investimento' },
  excluido:     { icon: MI.delete, label: 'Excluído' },
  restaurado:   { icon: MI.restore, label: 'Restaurado' },
}

const CAMPO_LABELS = {
  descricao: 'Descrição', valor: 'Valor', secao: 'Seção',
  observacao: 'Observação', tags: 'Tags', pago: 'Pago', investido: 'Investido',
  tipo: 'Tipo', mes: 'Mês', ano: 'Ano',
  data_inicio: 'Data início', data_fim: 'Data fim',
  valor_mensal: 'Valor mensal', cartao: 'Cartão',
}

function acaoIcon(acao) {
  const info = ACAO_LABELS[acao] || { icon: 'fiber_manual_record' }
  return mi(info.icon, 'mi-hist')
}

function acaoLabel(acao) {
  return ACAO_LABELS[acao]?.label || acao
}

function fmtVal(campo, val) {
  if (val === null || val === undefined) return '—'
  if (campo === 'valor' || campo === 'valor_mensal') return fmtBRL(Number(val))
  if (campo === 'pago' || campo === 'investido') return val ? 'Sim' : 'Não'
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—'
  return String(val)
}

function camposLinhas(entry) {
  const antes = entry.antes || {}
  const depois = entry.depois || {}
  const campos = new Set([...Object.keys(antes), ...Object.keys(depois)])
  return [...campos].map((campo) => ({
    campo,
    label: CAMPO_LABELS[campo] || campo,
    antes: fmtVal(campo, antes[campo]),
    depois: fmtVal(campo, depois[campo]),
  }))
}

async function open(loadFn) {
  loading.value = true
  error.value = ''
  subtitle.value = ''
  entries.value = []
  modalRef.value?.open()
  try {
    const data = await loadFn()
    subtitle.value = data.descricao || ''
    entries.value = data.historico || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function close() {
  modalRef.value?.close()
}

function reset() {
  entries.value = []
  subtitle.value = ''
  error.value = ''
}

defineExpose({ open, close })
</script>
