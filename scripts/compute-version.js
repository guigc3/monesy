/**
 * Calcula a versão do app a partir de version.json e do total de commits.
 * major=1, baseCommitCount=N → v1 na baseline; +0,1 a cada commit seguinte.
 * Para ir à v2: altere major para 2 e baseCommitCount para o total de commits atual.
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function computeAppVersion(cwd = root) {
  const cfg = JSON.parse(readFileSync(resolve(cwd, 'version.json'), 'utf8'))
  const major = Number(cfg.major) || 1
  const base = Number(cfg.baseCommitCount) || 0

  let commits = base
  try {
    commits = parseInt(
      execSync('git rev-list --count HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim(),
      10
    )
  } catch (_) {
    /* fora de repo git ou git indisponível */
  }

  const steps = Math.max(0, commits - base)
  if (steps === 0) return String(major)
  return (major + steps * 0.1).toFixed(1)
}
