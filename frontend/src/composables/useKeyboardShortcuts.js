/**
 * Atalhos de teclado globais do Monesy.
 *
 * N → Novo lançamento (apenas na aba Gastos)
 * / → Focar filtro de tag (aba Gastos)
 * ESC → fecha modal aberto (tratado nativamente pelo <dialog>)
 *
 * Os atalhos são ignorados quando o foco está em inputs, textareas ou elementos editáveis.
 */
import { onMounted, onUnmounted } from 'vue'

function _isTyping() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el.isContentEditable
}

export function useKeyboardShortcuts({ onNovoLancamento } = {}) {
  function handler(e) {
    if (_isTyping()) return
    // Ignora combos com modificadores (Ctrl, Alt, Meta)
    if (e.ctrlKey || e.altKey || e.metaKey) return

    switch (e.key) {
      case 'n':
      case 'N':
        e.preventDefault()
        onNovoLancamento?.()
        break

      case '/':
        e.preventDefault()
        // Tenta focar o primeiro chip de tag visível
        document.querySelector('.tag-chip-filter')?.focus()
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
