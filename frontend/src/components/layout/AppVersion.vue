<template>
  <footer class="app-version" aria-label="Versão do sistema">
    v{{ displayVersion }}
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { appVersion } from '@/version'

const displayVersion = computed(() => appVersion.replace('.', ','))
</script>
