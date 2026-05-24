/**
 * Computa a versão do app para injeção em __APP_VERSION__ no build do Vite.
 * Usa: git describe --tags --abbrev=7 (se disponível) ou data YYYY-MM-DD.
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

export function computeAppVersion(rootDir) {
  // 1. Tenta git describe
  try {
    const tag = execSync('git describe --tags --always --abbrev=7', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (tag) return tag
  } catch {
    /* sem git ou sem tags */
  }

  // 2. Tenta ler version do package.json do frontend
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'frontend', 'package.json'), 'utf8'))
    if (pkg.version) return pkg.version
  } catch {
    /* ignora */
  }

  // 3. Fallback: data de build
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
