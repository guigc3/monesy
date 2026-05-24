import { ref } from 'vue'

const darkMode = ref(false)

function _apply(dark) {
  darkMode.value = dark
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

// Inicializa imediatamente (antes de montar o app)
;(function initTheme() {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  _apply(saved ? saved === 'dark' : prefersDark)
})()

export function useTheme() {
  function toggleTheme() {
    _apply(!darkMode.value)
  }

  function applyTheme(dark) {
    _apply(dark)
  }

  return { darkMode, toggleTheme, applyTheme }
}
