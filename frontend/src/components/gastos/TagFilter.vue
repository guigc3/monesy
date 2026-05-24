<template>
  <div v-if="gastosStore.allTags.length" class="tag-filter" role="region" aria-label="Filtro por tag">
    <div class="tag-filter-header">
      <span class="tag-filter-label">
        <span class="material-icons mi-inline" aria-hidden="true">filter_alt</span>
        Filtrar por tag
      </span>
      <button
        v-if="gastosStore.tagFilter"
        type="button"
        class="btn btn-ghost btn-sm tag-filter-clear"
        @click="clear"
      >
        <span class="material-icons mi-inline" aria-hidden="true">close</span>
        Limpar
      </button>
    </div>
    <div class="tag-filter-chips">
      <button
        v-for="tag in gastosStore.allTags"
        :key="tag"
        type="button"
        class="tag-chip-filter"
        :class="{ active: isActive(tag) }"
        :aria-pressed="isActive(tag)"
        @click="toggle(tag)"
      >{{ tag }}</button>
    </div>
    <p v-if="gastosStore.tagFilter" class="tag-filter-caption">
      Mostrando lançamentos com a tag <strong>{{ gastosStore.tagFilter }}</strong>.
    </p>
  </div>
</template>

<script setup>
import { useGastosStore } from '@/stores/gastos'

const gastosStore = useGastosStore()

function isActive(tag) {
  return gastosStore.tagFilter.toLowerCase() === String(tag).toLowerCase()
}

function toggle(tag) {
  gastosStore.tagFilter = isActive(tag) ? '' : tag
}

function clear() {
  gastosStore.tagFilter = ''
}
</script>
