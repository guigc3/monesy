# Plano de Migração: Vanilla JS → Vue 3 + Vite

**Estratégia:** Opção B — Flask continua servindo tudo. Vue build vai para `frontend/dist/`, Flask serve esse diretório como static folder.

**Data início:** 2026-05-24

---

## Arquitetura

```
monesy/
├── app.py              ← Flask API (atualizado para servir frontend/dist/)
├── frontend/           ← NOVO: projeto Vue 3 + Vite
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── design-system/  ← assets estáticos (fonts, logos)
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── assets/
│       │   ├── app.css             ← cópia de static/design-system/ui_kits/web-app/app.css
│       │   └── monesy-extensions.css ← cópia de static/monesy-extensions.css
│       ├── router/index.js         ← Vue Router (substituí tabs.js)
│       ├── stores/
│       │   ├── auth.js             ← Pinia (substituí auth.js)
│       │   ├── gastos.js           ← Pinia (substituí state global de app.js)
│       │   └── assinaturas.js      ← Pinia (substituí assinaturas.js state)
│       ├── services/api.js         ← fetch wrapper com JWT (substituí api())
│       ├── composables/
│       │   ├── useToast.js
│       │   └── useTheme.js
│       ├── views/
│       │   ├── GastosView.vue
│       │   ├── AssinaturasView.vue
│       │   └── FeaturesView.vue
│       └── components/
│           ├── layout/
│           │   ├── AppHeader.vue
│           │   └── AppSkeleton.vue
│           ├── auth/AuthOverlay.vue
│           ├── gastos/
│           │   ├── MonthTabs.vue
│           │   ├── SummaryCards.vue
│           │   ├── AnnualChart.vue
│           │   ├── LancamentosPanel.vue
│           │   ├── SecaoBlock.vue
│           │   └── LancamentoRow.vue
│           ├── modals/
│           │   ├── LancamentoModal.vue
│           │   ├── AnoModal.vue
│           │   ├── HistoricoModal.vue
│           │   ├── LixeiraModal.vue
│           │   └── AssinaturaModal.vue
│           └── ui/
│               ├── ToastNotification.vue
│               └── BaseModal.vue
└── static-legacy/      ← LEGADO arquivado (fallback se dist/ ausente)
```

## Mapeamento de Arquivos Legado → Vue

| Legado | Vue 3 |
|--------|-------|
| `static/app.js` (state global) | `stores/gastos.js` (Pinia) |
| `static/app.js` (api()) | `services/api.js` |
| `static/app.js` (toast) | `composables/useToast.js` + `ToastNotification.vue` |
| `static/app.js` (theme) | `composables/useTheme.js` |
| `static/app.js` (chart) | `AnnualChart.vue` |
| `static/app.js` (modais) | `components/modals/*.vue` |
| `static/auth.js` | `stores/auth.js` + `AuthOverlay.vue` |
| `static/assinaturas.js` | `AssinaturasView.vue` + `stores/assinaturas.js` |
| `static/tabs.js` | `router/index.js` + Vue Router |
| `static/features.js` | `FeaturesView.vue` |
| `static/icons.js` | `utils/icons.js` |
| `static/index.html` (skeleton) | `AppSkeleton.vue` |

## Endpoints Flask (44 rotas — sem mudanças)

Todos os endpoints `/api/*` permanecem. Flask ganha catch-all para servir Vue SPA.

## Atualização do app.py

```python
# Novo static folder
app = Flask(__name__, static_folder="frontend/dist", static_url_path="")

# Catch-all SPA (adicionado ao final do arquivo, após todas as rotas /api/)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    dist = os.path.join(app.root_path, "frontend/dist")
    if path and os.path.exists(os.path.join(dist, path)):
        return send_from_directory(dist, path)
    return send_from_directory(dist, "index.html")
```

## Vite Config

```js
// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
      '/design-system': 'http://localhost:5001',
    }
  },
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true,
  }
})
```

## Fases de Implementação

### ✅ Fase 0: Leitura e planejamento
- [x] Leitura completa de app.js (1608 linhas)
- [x] Leitura de auth.js, assinaturas.js, tabs.js, features.js, icons.js
- [x] Mapeamento de 44 endpoints Flask
- [x] Plano salvo

### ✅ Fase 1: Setup do projeto
- [x] Criar `frontend/` com package.json, vite.config.js, index.html
- [x] Instalar deps: vue, @vitejs/plugin-vue, vue-router, pinia, chart.js
- [x] Criar estrutura de pastas src/
- [x] Copiar CSS do design system para src/assets/
- [x] Copiar fonts/logos para public/design-system/

### ✅ Fase 2: Infraestrutura
- [x] `services/api.js` — fetch wrapper com JWT, loading, cache
- [x] `composables/useToast.js`
- [x] `composables/useTheme.js`
- [x] `utils/icons.js` — MI constants + helpers
- [x] `utils/format.js` — fmt BRL, fmtTs, escapeHtml
- [x] `stores/auth.js` — Pinia, 3 modos (json/mysql/supabase)
- [x] `stores/gastos.js` — Pinia, toda a lógica de estado
- [x] `stores/assinaturas.js` — Pinia
- [x] `router/index.js` — Vue Router (gastos/assinaturas/features)

### ✅ Fase 3: Componentes base
- [x] `App.vue` — root com loading, auth gate, toast, router-view
- [x] `AppSkeleton.vue` — skeleton loading (HTML do index.html atual)
- [x] `AuthOverlay.vue` — login/signup (3 modos)
- [x] `AppHeader.vue` — header com menu mobile, theme toggle, year select
- [x] `ToastNotification.vue`
- [x] `BaseModal.vue` — wrapper para `<dialog>` nativo

### ✅ Fase 4: GastosView
- [x] `GastosView.vue` — orquestra todos os sub-componentes
- [x] `MonthTabs.vue` — 12 meses com checkbox de revisão
- [x] `SummaryCards.vue` — 5 cards (entrada, saída, caixa, pendente, orçamento)
- [x] `AnnualChart.vue` — Chart.js com hoverGuide plugin
- [x] `LancamentosPanel.vue` — coluna entradas/saídas
- [x] `SecaoBlock.vue` — grupo de lançamentos por seção
- [x] `LancamentoRow.vue` — linha da tabela com checkbox, valor, ações

### ✅ Fase 5: Modais
- [x] `LancamentoModal.vue` — criar/editar lançamento (tags, seções)
- [x] `AnoModal.vue` — criar ano + excluir ano
- [x] `HistoricoModal.vue` — histórico de alterações
- [x] `LixeiraModal.vue` — lixeira com restaurar/excluir
- [x] `AssinaturaModal.vue` — criar/editar assinatura

### ✅ Fase 6: AssinaturasView e FeaturesView
- [x] `AssinaturasView.vue` — tabela de assinaturas com filtros
- [x] `FeaturesView.vue` — timeline de features

### ✅ Fase 7: Integração Flask
- [x] Atualizar `app.py` — novo static_folder + errorhandler(404) para SPA
- [x] Testar build (`npm run build` → `frontend/dist/`)
- [x] Testar produção (Flask serve dist/)
- [x] SPA routing testado: /gastos, /assinaturas, /features retornam index.html

### ✅ Fase 8: Testes e ajustes
- [x] Teste visual: todas as telas (snapshot confirmado)
- [x] Auth overlay: MySQL modo login/signup funcionando
- [x] Dark mode: data-theme toggle + localStorage
- [x] Skeleton loading: animação sk-shimmer
- [x] Modal "Novo lançamento": todos os campos presentes
- [x] Navegação entre abas: todas as 3 views funcionando
- [x] SPA reload em sub-rotas: funciona sem 404

### ✅ Fase 9: Documentação de deploy
- [x] DEPLOY.md criado (ver arquivo na raiz do projeto)

---

## Notas de Implementação

### Cache
O sistema de cache do app.js (Map em memória) migra para Pinia como computed com flag de stale. Cache bust por prefixo mantido.

### Auth (3 modos)
- `json`: sem login, dispara `app:ready` imediatamente
- `mysql`: JWT em localStorage, `/api/auth/login`
- `supabase`: SDK dinâmico, sessão persistente

### Chart.js
O plugin `hoverGuidePlugin` é portado como objeto literal dentro de `AnnualChart.vue`. Usar `Chart.register()` para o plugin customizado.

### Modais nativos (`<dialog>`)
Manter uso de `<dialog>` nativo (sem biblioteca externa). `BaseModal.vue` wrappa o `<dialog>` com `defineExpose({ open, close })`.

### CSS
Todo o CSS existente é mantido intacto. Vite bundla os CSS files. Nenhum Tailwind ou outra lib — respeita o design system existente.

### Icons (Material Icons)
Mantidos como Google Fonts (link no index.html). As funções `mi()`, `miWithText()`, `MI` constante migram para `utils/icons.js` como funções puras (retornam HTML string para v-html onde necessário, ou componentes onde possível).

---

## Como retomar após limite de tokens

1. Ler este arquivo: `MIGRATION_PLAN.md`
2. Verificar o progresso marcado nas fases
3. Ler os arquivos já criados em `frontend/src/`
4. Continuar pela próxima fase não concluída

## Checklist de arquivos criados

- [x] frontend/package.json
- [x] frontend/vite.config.js
- [x] frontend/index.html
- [x] frontend/src/main.js
- [x] frontend/src/App.vue
- [x] frontend/src/assets/monesy-extensions.css
- [x] frontend/src/utils/icons.js
- [x] frontend/src/utils/format.js
- [x] frontend/src/services/api.js
- [x] frontend/src/composables/useToast.js
- [x] frontend/src/composables/useTheme.js
- [x] frontend/src/stores/auth.js
- [x] frontend/src/stores/gastos.js
- [x] frontend/src/stores/assinaturas.js
- [x] frontend/src/router/index.js
- [x] frontend/src/components/ui/ToastNotification.vue
- [x] frontend/src/components/ui/BaseModal.vue
- [x] frontend/src/components/layout/AppSkeleton.vue
- [x] frontend/src/components/layout/AppHeader.vue
- [x] frontend/src/components/auth/AuthOverlay.vue
- [x] frontend/src/components/gastos/MonthTabs.vue
- [x] frontend/src/components/gastos/SummaryCards.vue
- [x] frontend/src/components/gastos/AnnualChart.vue
- [x] frontend/src/components/gastos/LancamentosPanel.vue
- [x] frontend/src/components/gastos/SecaoBlock.vue
- [x] frontend/src/components/gastos/LancamentoRow.vue
- [x] frontend/src/components/modals/LancamentoModal.vue
- [x] frontend/src/components/modals/AnoModal.vue
- [x] frontend/src/components/modals/HistoricoModal.vue
- [x] frontend/src/components/modals/LixeiraModal.vue
- [x] frontend/src/components/modals/AssinaturaModal.vue
- [x] frontend/src/views/GastosView.vue
- [x] frontend/src/views/AssinaturasView.vue
- [x] frontend/src/views/FeaturesView.vue
- [x] app.py (dist + SPA 404 + static-legacy fallback)
- [x] DEPLOY.md
- [x] static/ renomeado para static-legacy/
- [x] CONTEXT.md atualizado
- [x] scripts/verify_vue_serve.py
