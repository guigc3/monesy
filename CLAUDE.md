# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Flask)

```bash
# Desenvolvimento local — modo JSON (sem banco, sem login)
py app.py                        # porta 5001

# Testes (sempre rodam em modo json com diretório temporário)
pytest                           # todos os testes
pytest tests/test_api.py::nome_do_teste   # teste específico
```

### Frontend (Vue 3 + Vite)

```bash
cd frontend

npm run dev      # dev server com HMR na porta 5173 (proxy /api → localhost:5001)
npm run build    # gera frontend/dist/ (necessário antes de qualquer deploy)
```

### Fluxo completo de desenvolvimento

Dois terminais: `py app.py` + `cd frontend && npm run dev`. O Vite proxeia `/api` e `/design-system` para o Flask.

Para testar como produção (apenas Flask servindo o Vue buildado):

```bash
cd frontend && npm run build && cd ..
py app.py   # serve frontend/dist/ na porta 5001
```

## Arquitetura

### Camada de dados — três backends

O backend é selecionado automaticamente em `auth.storage_backend()` com esta prioridade:

| Prioridade | Condição | Backend |
|---|---|---|
| 1 | `STORAGE_BACKEND` explícito | Valor definido |
| 2 | `MYSQL_HOST` preenchido | `mysql` |
| 3 | `SUPABASE_URL` preenchido | `supabase` (legado) |
| 4 | Nenhum | `json` (dev) |

`db/repositories.py` define `BaseRepository` com a interface comum. `JsonRepository` usa arquivos JSON com file-locking (`_safe_read_json`/`_safe_write_json`). `db/mysql_client.py` contém as queries MySQL com `PyMySQL`. Supabase é legado — não usar em instalações novas.

### Autenticação (`auth.py`)

Decorator `@require_auth` injeta `g.user_id` em todas as rotas protegidas. Em modo `json`, `g.user_id` recebe `DEV_USER_ID` fixo (sem login). Em modo `mysql`, valida JWT HS256 com `JWT_SECRET_KEY` (7 dias). Rotas anônimas: `index`, `static`, `meta`, `/api/config`, `/api/auth/login`, `/api/auth/register`.

### Servidor Flask (`app.py`)

Flask detecta `frontend/dist/` no startup e o usa como `static_folder`. Se não existir, cai para `static-legacy/`. O SPA fallback é implementado via `@app.errorhandler(404)`: retorna `index.html` para qualquer path não-`/api/`. Todas as rotas de API estão em `app.py` e usam `get_repository()` para obter a implementação correta do backend ativo.

### Frontend Vue (`frontend/src/`)

**Fluxo de inicialização** — `App.vue` → `authStore.init()` → `gastosStore.init()`. O skeleton (`AppSkeleton.vue`) fica visível até `authStore.ready = true`; o `AuthOverlay` bloqueia a UI enquanto `authStore.showOverlay = true`.

**Comunicação header → view** — `AppHeader` emite eventos (`@novoLancamento`, `@openModalAno` etc.). `App.vue` mantém `ref="currentView"` no `<RouterView>` e repassa para `currentView.value?.openModalNovo?.()`. As views expõem esses métodos via `defineExpose()`.

**Cache** — `services/api.js` mantém um `Map` em memória. Use `CK.*` para construir chaves e `bustPrefix()` para invalidar por prefixo após mutações. O cache nunca é persistido — limpa no reload.

**Stores:**
- `stores/auth.js` — detecta backend, gerencia tokens JWT/Supabase, expõe `getAccessToken()` e `handleUnauthorized()`
- `stores/gastos.js` — estado central: `ano`, `mes`, `secoes`, `allTags`, `anos`, `chartData`, `mesesRevisados`, `metas`
- `stores/assinaturas.js` — lista de assinaturas com filtro por cartão

**Modais** — `BaseModal.vue` wrappa `<dialog>` nativo com `defineExpose({ open, close })`. Sem biblioteca externa de modais.

**CSS** — Todo o CSS vem do design system em `Design System/` (espelhado em `frontend/public/design-system/` para o Vite e em `static-legacy/design-system/` para o legado). Extensões do app ficam em `frontend/src/assets/monesy-extensions.css`, importado em `main.js`. Não usar Tailwind nem nenhuma lib de UI — o design system deve ser respeitado.

### Versionamento do build

`vite.config.js` chama `computeAppVersion()` de um script local e injeta `__APP_VERSION__` como global nos bundles. Isso popula a tela de Features com a versão atual.

### Testes

Os testes em `tests/test_api.py` forçam `STORAGE_BACKEND=json` e usam um diretório temporário isolado. Nenhum banco é necessário. A fixture `gastos_client` remonta os caminhos de arquivo no módulo `app` antes de cada teste e restaura ao final.
