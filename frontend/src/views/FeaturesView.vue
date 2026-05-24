<template>
  <main class="container view-features">
    <section class="panel features-panel">
      <div class="panel-header">
        <div class="panel-header-title">
          <span class="panel-eyebrow">Produto</span>
          <h2>Features implementadas</h2>
          <span class="chart-subtitle">Registro das entregas com data e hora</span>
        </div>
        <span class="feature-count-badge">{{ visibleFeatures.length }}</span>
      </div>

      <!-- Timeline -->
      <div class="features-timeline-section">
        <h3 class="features-timeline-heading">Linha do tempo</h3>
        <div class="features-timeline-scroll">
          <div class="features-timeline" role="tablist" aria-label="Datas de implementação">
            <!-- Botão "Todas" -->
            <button
              type="button"
              class="timeline-node timeline-node-all"
              :class="{ active: !selectedDate }"
              :aria-pressed="!selectedDate"
              data-date=""
              @click="selectDate(null)"
            >
              <span class="timeline-date">Todas</span>
              <span class="timeline-count">{{ all.length }}</span>
            </button>

            <template v-for="(date, idx) in dates" :key="date">
              <span class="timeline-connector" aria-hidden="true"></span>
              <button
                type="button"
                class="timeline-node"
                :class="{ active: selectedDate === date }"
                :aria-pressed="selectedDate === date"
                :data-date="date"
                @click="selectDate(date)"
              >
                <span class="timeline-date">{{ fmtDataBr(date) }}</span>
                <span class="timeline-count">{{ byDate.get(date)?.length }} feature{{ byDate.get(date)?.length !== 1 ? 's' : '' }}</span>
              </button>
            </template>
          </div>
        </div>
        <p class="features-filter-caption" aria-live="polite">{{ filterCaption }}</p>
      </div>

      <!-- Lista -->
      <div v-if="loading" class="empty-state" style="padding:32px">Carregando…</div>
      <div v-else-if="error" class="empty-state" style="padding:32px;color:var(--red)">{{ error }}</div>
      <ol v-else class="features-list" aria-label="Lista de features">
        <li v-if="!visibleFeatures.length" class="empty-state" style="padding:40px">
          Nenhuma feature nesta data.
        </li>
        <li v-for="item in visibleFeatures" :key="item.id" class="feature-item">
          <div class="feature-item-header">
            <h3 class="feature-title">{{ item.titulo }}</h3>
            <time class="feature-ts" :datetime="item.implementado_em || ''">{{ fmtTs(item.implementado_em) }}</time>
          </div>
          <p v-if="item.descricao" class="feature-desc">{{ item.descricao }}</p>
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/services/api'
import { useToast } from '@/composables/useToast'
import { fmtTs, fmtDataBr } from '@/utils/format'

const { toast } = useToast()

const all = ref([])
const selectedDate = ref(null)
const loading = ref(false)
const error = ref('')

const byDate = computed(() => {
  const map = new Map()
  for (const item of all.value) {
    const date = String(item.implementado_em || '').slice(0, 10)
    if (!date) continue
    if (!map.has(date)) map.set(date, [])
    map.get(date).push(item)
  }
  return map
})

const dates = computed(() =>
  [...byDate.value.keys()].sort((a, b) => b.localeCompare(a))
)

const visibleFeatures = computed(() => {
  if (!selectedDate.value) return all.value
  return all.value.filter(
    (f) => String(f.implementado_em || '').slice(0, 10) === selectedDate.value
  )
})

const filterCaption = computed(() => {
  const total = all.value.length
  const visible = visibleFeatures.value.length
  if (!selectedDate.value) {
    return total ? `Exibindo todas as ${total} features cadastradas. Clique em uma data na linha do tempo para filtrar.` : ''
  }
  const dataLabel = fmtDataBr(selectedDate.value)
  return `Exibindo ${visible} feature${visible !== 1 ? 's' : ''} implementada${visible !== 1 ? 's' : ''} em ${dataLabel}.`
})

function selectDate(date) {
  selectedDate.value = selectedDate.value === date ? null : date
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api('/api/features')
    all.value = data.features || []
    selectedDate.value = null
  } catch (err) {
    error.value = err.message
    toast(err.message, true)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
