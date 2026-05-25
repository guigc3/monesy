<template>
  <div class="month-note" :class="{ 'month-note--editing': editing }">
    <div class="month-note-header">
      <span class="month-note-label">
        <span class="material-icons mi-inline" aria-hidden="true">sticky_note_2</span>
        Notas do mês
      </span>
      <button
        v-if="!editing"
        type="button"
        class="btn btn-ghost btn-sm"
        @click="startEdit"
      >
        <span class="material-icons mi-inline" aria-hidden="true">edit</span>
        {{ gastosStore.notaMes ? 'Editar' : 'Adicionar nota' }}
      </button>
    </div>

    <!-- Modo visualização -->
    <p v-if="!editing && gastosStore.notaMes" class="month-note-text">
      {{ gastosStore.notaMes }}
    </p>
    <p v-else-if="!editing" class="month-note-empty">
      Nenhuma nota para este mês.
    </p>

    <!-- Modo edição -->
    <template v-if="editing">
      <textarea
        ref="textareaRef"
        v-model="draft"
        class="month-note-textarea"
        rows="3"
        placeholder="Escreva observações sobre este mês…"
        maxlength="1000"
        @keydown.ctrl.enter="save"
        @keydown.esc="cancel"
      />
      <div class="month-note-actions">
        <span class="month-note-counter">{{ draft.length }}/1000</span>
        <button type="button" class="btn btn-ghost btn-sm" @click="cancel">Cancelar</button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="save">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useGastosStore } from '@/stores/gastos'
import { useToast } from '@/composables/useToast'

const gastosStore = useGastosStore()
const { toast } = useToast()

const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const textareaRef = ref(null)

// Recarrega nota quando muda de mês/ano
watch(
  () => `${gastosStore.ano}:${gastosStore.mes}`,
  async () => {
    editing.value = false
    await gastosStore.loadNota()
  },
  { immediate: true }
)

async function startEdit() {
  draft.value = gastosStore.notaMes
  editing.value = true
  await nextTick()
  textareaRef.value?.focus()
}

function cancel() {
  editing.value = false
  draft.value = ''
}

async function save() {
  saving.value = true
  try {
    await gastosStore.saveNota(draft.value)
    editing.value = false
    toast(draft.value.trim() ? 'Nota salva' : 'Nota removida')
  } catch (err) {
    toast(err.message, true)
  } finally {
    saving.value = false
  }
}
</script>
