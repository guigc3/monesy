import { ref } from 'vue'

const message = ref('')
const isError = ref(false)
const visible = ref(false)
let _timer = null

export function useToast() {
  function toast(msg, error = false) {
    message.value = msg
    isError.value = error
    visible.value = true
    clearTimeout(_timer)
    _timer = setTimeout(() => {
      visible.value = false
    }, 2800)
  }

  return { message, isError, visible, toast }
}
