<template>
  <section
    v-if="mostrar"
    class="panel consolidated-panel"
    :class="{ 'is-collapsed': !expanded }"
    aria-label="Visão consolidada"
  >
    <div class="panel-header consolidated-header">
      <button
        type="button"
        class="consolidated-toggle"
        :aria-expanded="expanded"
        aria-controls="consolidatedPanelBody"
        @click="toggleExpanded"
      >
        <span class="material-icons consolidated-chevron" aria-hidden="true">
          {{ expanded ? 'expand_less' : 'expand_more' }}
        </span>
        <div class="panel-header-title">
          <span class="panel-eyebrow">Visão consolidada</span>
          <h2>Gastos + Assinaturas</h2>
          <p v-if="!expanded" class="consolidated-summary">
            Total mensal <strong>{{ fmtBRL(totalMensal) }}</strong>
            <template v-if="entrada > 0">
              <span class="consolidated-summary-sep">·</span>
              <span :class="comprometidoClass">{{ percComprometido.toFixed(1) }}% comprometido</span>
            </template>
          </p>
        </div>
      </button>
      <RouterLink to="/assinaturas" class="btn btn-ghost btn-sm" @click.stop>
        <span class="material-icons mi-inline" aria-hidden="true">credit_card</span>
        Ver assinaturas
      </RouterLink>
    </div>

    <div
      id="consolidatedPanelBody"
      class="consolidated-body"
      :hidden="!expanded"
    >
      <div class="consolidated-grid">
        <article class="consolidated-card">
          <span class="consolidated-label">Saída do mês</span>
          <strong class="consolidated-value valor-neg">{{ fmtBRL(saidaMes) }}</strong>
          <span class="consolidated-hint">Despesas registradas</span>
        </article>
        <article class="consolidated-card">
          <span class="consolidated-label">Assinaturas ativas</span>
          <strong class="consolidated-value valor-neg">{{ fmtBRL(totalAssinaturas) }}</strong>
          <span class="consolidated-hint">{{ qtdAssinaturasAtivas }} ativa(s) no cartão</span>
        </article>
        <article class="consolidated-card destaque">
          <span class="consolidated-label">Total mensal</span>
          <strong class="consolidated-value valor-neg">{{ fmtBRL(totalMensal) }}</strong>
          <span class="consolidated-hint">Despesas + assinaturas</span>
        </article>
        <article class="consolidated-card">
          <span class="consolidated-label">Comprometido</span>
          <strong class="consolidated-value" :class="comprometidoClass">
            {{ entrada > 0 ? `${percComprometido.toFixed(1)}%` : '—' }}
          </strong>
          <span class="consolidated-hint">
            {{ entrada > 0 ? 'da entrada do mês' : 'Cadastre uma receita' }}
          </span>
          <div
            v-if="entrada > 0"
            class="consolidated-bar"
            :aria-label="`${percComprometido.toFixed(1)}% comprometido`"
          >
            <span
              class="consolidated-bar-fill"
              :class="comprometidoClass"
              :style="{ width: Math.min(percComprometido, 100) + '%' }"
            ></span>
          </div>
        </article>
        <article class="consolidated-card">
          <span class="consolidated-label">Projeção anual</span>
          <strong class="consolidated-value">{{ fmtBRL(projecaoAnual) }}</strong>
          <span class="consolidated-hint">Total mensal × 12</span>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useGastosStore } from '@/stores/gastos'
import { useAssinaturasStore } from '@/stores/assinaturas'
import { fmtBRL } from '@/utils/format'

const STORAGE_KEY = 'monesy:consolidated-expanded'

const gastosStore = useGastosStore()
const assinaturasStore = useAssinaturasStore()

const expanded = ref(readExpandedPreference())

function readExpandedPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '0') return false
    if (saved === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

function toggleExpanded() {
  expanded.value = !expanded.value
  try {
    localStorage.setItem(STORAGE_KEY, expanded.value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const saidaMes = computed(() => gastosStore.totaisComputados.saida || 0)
const entrada = computed(() => gastosStore.totaisComputados.entrada || 0)
const totalAssinaturas = computed(() => assinaturasStore.totalMensalAtivas || 0)
const qtdAssinaturasAtivas = computed(
  () => (assinaturasStore.lista || []).filter((a) => a.ativa).length
)

const totalMensal = computed(() => saidaMes.value + totalAssinaturas.value)
const projecaoAnual = computed(() => totalMensal.value * 12)

const percComprometido = computed(() => {
  if (!entrada.value) return 0
  return (totalMensal.value / entrada.value) * 100
})

const comprometidoClass = computed(() => {
  if (!entrada.value) return ''
  if (percComprometido.value >= 100) return 'valor-neg'
  if (percComprometido.value >= 80) return 'valor-alerta'
  return 'valor-pos'
})

const mostrar = computed(
  () => totalAssinaturas.value > 0 || qtdAssinaturasAtivas.value > 0
)
</script>

<style scoped>
.consolidated-panel {
  margin-bottom: 20px;
}

.consolidated-panel .panel-header {
  border-left: 3px solid var(--petrol);
}

.consolidated-header {
  align-items: center;
}

.consolidated-toggle {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.consolidated-toggle:hover .consolidated-chevron {
  color: var(--petrol);
}

.consolidated-chevron {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 22px;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.consolidated-summary {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  line-height: 1.4;
}

.consolidated-summary strong {
  font-weight: 600;
  color: var(--text-primary);
}

.consolidated-summary-sep {
  margin: 0 6px;
  color: var(--text-faint);
}

.consolidated-panel.is-collapsed .panel-header {
  border-bottom: none;
}

.consolidated-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px 20px 20px;
}

.consolidated-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.consolidated-card.destaque {
  background: linear-gradient(160deg, rgba(0,106,117,0.10) 0%, var(--paper) 60%);
  border-color: rgba(0,106,117,0.30);
}

.consolidated-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.consolidated-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.consolidated-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.consolidated-bar {
  height: 6px;
  background: var(--surface-3, rgba(0,0,0,0.08));
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
}

.consolidated-bar-fill {
  display: block;
  height: 100%;
  background: var(--petrol);
  border-radius: inherit;
  transition: width 0.35s ease;
}

.consolidated-bar-fill.valor-pos   { background: var(--green); }
.consolidated-bar-fill.valor-alerta { background: var(--gold); }
.consolidated-bar-fill.valor-neg   { background: var(--red); }

.valor-alerta { color: var(--gold-deep, var(--gold)) !important; }

[data-theme="dark"] .consolidated-card {
  background: var(--surface-2);
  border-color: var(--border);
}

[data-theme="dark"] .consolidated-card.destaque {
  background: linear-gradient(160deg, rgba(0,172,193,0.12) 0%, var(--surface) 60%);
  border-color: rgba(0,172,193,0.35);
}

@media (min-width: 600px) {
  .consolidated-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .consolidated-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .consolidated-header {
    flex-direction: row;
  }
}
</style>
