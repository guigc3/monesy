import { ref } from 'vue'

// themeMode: 'light' | 'dark' | 'auto'
const themeMode = ref('auto')
const darkMode = ref(false)

function _isDarkByTime() {
  const h = new Date().getHours()
  return h >= 19 || h < 7
}

function _applyDark(dark) {
  darkMode.value = dark
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

function _applyMode(mode) {
  themeMode.value = mode
  localStorage.setItem('themeMode', mode)
  if (mode === 'auto') {
    _applyDark(_isDarkByTime())
  } else {
    _applyDark(mode === 'dark')
  }
}

// Atualiza automaticamente a cada minuto quando modo = 'auto'
let _autoInterval = null
function _startAutoCheck() {
  if (_autoInterval) return
  _autoInterval = setInterval(() => {
    if (themeMode.value === 'auto') {
      _applyDark(_isDarkByTime())
    }
  }, 60_000)
}

// Inicializa imediatamente (antes de montar o app)
;(function initTheme() {
  const saved = localStorage.getItem('themeMode')
  // Compatibilidade com chave antiga 'theme'
  const legacy = localStorage.getItem('theme')
  if (saved && ['light', 'dark', 'auto'].includes(saved)) {
    _applyMode(saved)
  } else if (legacy) {
    _applyMode(legacy === 'dark' ? 'dark' : 'light')
  } else {
    _applyMode('auto')
  }
  _startAutoCheck()
})()

export function useTheme() {
  // Cicla entre modos: auto → dark → light → auto
  function toggleTheme() {
    const next = { auto: 'dark', dark: 'light', light: 'auto' }
    _applyMode(next[themeMode.value] || 'auto')
  }

  function setThemeMode(mode) {
    _applyMode(mode)
  }

  return { darkMode, themeMode, toggleTheme, setThemeMode }
}
