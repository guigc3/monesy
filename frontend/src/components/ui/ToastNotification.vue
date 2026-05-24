<template>
  <div
    v-if="visible"
    class="toast"
    role="status"
    :class="{ error: isError }"
  >{{ message }}</div>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { message, isError, visible } = useToast()
</script>
