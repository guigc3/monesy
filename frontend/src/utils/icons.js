/** Material Icons helpers — Vue 3 equivalents of static/icons.js */

export const MI = {
  add: 'add',
  check: 'check',
  checkCircle: 'check_circle',
  close: 'close',
  contentCopy: 'content_copy',
  delete: 'delete_outline',
  download: 'download',
  edit: 'edit',
  fileDownload: 'file_download',
  history: 'history',
  restore: 'restore',
  trendingUp: 'trending_up',
  undo: 'undo',
  upload: 'upload',
  autoAwesome: 'auto_awesome',
  menu: 'menu',
  darkMode: 'dark_mode',
  lightMode: 'light_mode',
}

/** Returns HTML string — use with v-html directive */
export function mi(name, extraClass = '') {
  const cls = extraClass ? `material-icons ${extraClass}` : 'material-icons'
  return `<span class="${cls}" aria-hidden="true">${name}</span>`
}

export function miWithText(icon, text, iconClass = 'mi-inline') {
  return `${mi(icon, iconClass)}${text}`
}

export function setThemeIcon(btn, dark) {
  if (!btn) return
  btn.innerHTML = mi(dark ? 'light_mode' : 'dark_mode')
  btn.title = dark ? 'Modo claro' : 'Modo escuro'
  btn.setAttribute('aria-label', btn.title)
}
