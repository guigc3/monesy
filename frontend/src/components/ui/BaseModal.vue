<template>
  <dialog
    ref="dialogRef"
    class="modal"
    :class="sizeClass"
    @click="onBackdropClick"
    @close="emit('close')"
  >
    <slot />
  </dialog>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: '', // '' | 'sm' | 'lg'
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close'])

const dialogRef = ref(null)

const sizeClass = props.size ? `modal-${props.size}` : ''

function open() {
  dialogRef.value?.showModal()
}

function close() {
  dialogRef.value?.close()
}

function onBackdropClick(e) {
  if (props.closeOnBackdrop && e.target === dialogRef.value) {
    close()
  }
}

defineExpose({ open, close })
</script>
