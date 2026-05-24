# Documentação — Monesy

Aplicação Flask + MySQL (produção) + frontend estático (HTML/CSS/JS), porta **5001**. O modo legado JSON em disco continua disponível para desenvolvimento local rápido e testes.

## Executar

### Modo dev (JSON)

```bash
py app.py
```

Abra [http://localhost:5001](http://localhost:5001). Dados em `data/*.json`. Sem login.

### Modo MySQL (produção)

1. Copie `.env.example` para `.env` e preencha `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `JWT_SECRET_KEY` e `STORAGE_BACKEND=mysql`.
2. Aplique `mysql_schema.sql` no banco MySQL.
3. `py app.py` — a tela de login aparece antes do app.
4. Cadastre o usuário em `/api/auth/register` (via tela de login) ou importe dados com `scripts/migrate_supabase_to_mysql.py` (se vier do Supabase).

### Modo Supabase (legado)

Não recomendado para novas instalações. Ver `README.md` se ainda precisar manter uma instalação antiga.

## Arquitetura

```
Frontend (auth.js → login MySQL ou sessão json)
   │  fetch(..., Authorization: Bearer <jwt>)
   ▼
Flask (auth.py valida JWT → g.user_id)
   │
   ├── JsonRepository      (modo dev, data/*.json)
   ├── MySQLRepository     (modo produção, PyMySQL, filtra por user_id)
   └── SupabaseRepository  (legado, Postgres + RLS)
```

A escolha entre repositórios é feita a cada request por `db.repositories.get_repository()` a partir de `auth.storage_backend()`:

| Prioridade | Condição | Backend |
|------------|----------|---------|
| 1 | `STORAGE_BACKEND` explícito (`mysql`, `supabase`, `json`) | Valor definido |
| 2 | `MYSQL_HOST` preenchido | `mysql` |
| 3 | `SUPABASE_URL` preenchido | `supabase` |
| 4 | Nenhum dos acima | `json` |

## Modelo de dados (`data/gastos.json` — modo dev)

Em MySQL, a mesma estrutura lógica está normalizada nas tabelas descritas abaixo.

```json
{
  "secoes_despesa": ["Despesas fixas", "..."],
  "secoes_receita": ["Receitas", "..."],
  "anos": [2026],
  "meses_revisados": [{ "ano": 2026, "mes": 5 }],
  "lancamentos": [ ... ],
  "lixeira": [ ... ]
}
```

## Lançamento

| Campo | Descrição |
|-------|-----------|
| `id` | UUID |
| `ano`, `mes` | Período (mes 1–12) |
| `tipo` | `receita` ou `despesa` |
| `descricao` | Texto livre |
| `valor` | Número positivo |
| `secao` | Agrupamento na UI |
| `tags` | Lista de strings (JSON em TEXT no MySQL) |
| `observacao` | Texto opcional |
| `pago` | Despesa quitada (afeta caixa) |
| `investido` | Receita reservada (não entra no caixa) |
| `historico` | Log de alterações |
| `criado_em` | ISO timestamp |
| `excluido_em` | Preenchido na lixeira |

## Métricas do mês (`calc_totais`)

| Métrica | Fórmula |
|---------|---------|
| `entrada` | Soma de todas as receitas |
| `entrada_investida` | Receitas com `investido=true` |
| `saida` | Soma de todas as despesas |
| `saida_paga` | Despesas com `pago=true` |
| `saida_pendente` | `saida - saida_paga` |
| **caixa** | `entrada - entrada_investida - saida_paga` |
| **liquido** (orçamento) | `entrada - saida` |

## API (referência)

### Metadados e anos
- `GET /api/meta` — nomes dos meses
- `GET /api/anos` — anos disponíveis
- `POST /api/anos` — `{ "ano": 2027 }`
- `DELETE /api/anos/:ano?force=true` — excluir ano

### Seções e tags
- `GET /api/secoes` — `secoes_despesa`, `secoes_receita`
- `POST /api/secoes` — `{ "tipo": "receita|despesa", "nome": "..." }`
- `GET /api/tags` — tags em uso

### Lançamentos
- `GET /api/lancamentos?ano=&mes=`
- `POST /api/lancamentos` — criar
- `PUT /api/lancamentos/:id` — editar (`pago`, `investido`, etc.)
- `DELETE /api/lancamentos/:id` — soft-delete → lixeira
- `DELETE /api/lancamentos/limpar-mes?ano=&mes=`
- `GET /api/lancamentos/:id/historico`

### Resumo e revisão
- `GET /api/resumo?ano=` — visão anual
- `GET /api/resumo?ano=&mes=` — totais + listas por seção
- `GET /api/revisao?ano=`
- `POST /api/revisao/marcar`

### Lixeira
- `GET /api/lixeira`
- `POST /api/lixeira/:id/restaurar`
- `DELETE /api/lixeira/:id` — permanente
- `DELETE /api/lixeira` — esvaziar

### Excel
- `GET /api/template-excel`
- `POST /api/lancamentos/import-excel`

### Configuração e autenticação

- `GET /api/config` — informa o backend ativo (`json`, `mysql` ou `supabase`)
- `POST /api/auth/register` — cadastro (somente modo MySQL)
- `POST /api/auth/login` — login (somente modo MySQL)
- Em modo **mysql** ou **supabase**, rotas `/api/*` (exceto `/api/meta`, `/api/config` e estáticos) exigem `Authorization: Bearer <jwt>`
- Em modo **json**, auth é desativada (`DEV_USER_ID` fixo)

## Tabelas MySQL (produção)

Isolamento por `user_id` em todas as queries — sem RLS; o filtro é explícito no `MySQLRepository`.

| Tabela | Conteúdo |
|--------|----------|
| `users` | Email e hash de senha (auth própria) |
| `secoes` | Seções de receita/despesa por usuário |
| `anos_cadastrados` | Anos planejados |
| `lancamentos` | Receitas e despesas (com `excluido_em` para lixeira) |
| `lancamento_historico` | Log de alterações |
| `meses_revisados` | Marca de mês conferido |
| `assinaturas` | Custos recorrentes no cartão |
| `assinatura_historico` | Log de alterações de assinaturas |
| `features` | Changelog global |

Schema completo: `mysql_schema.sql`.

## Frontend (`static/`)

- `auth.js`: em modo **mysql**, login/cadastro via `/api/auth/login` e `/api/auth/register`; JWT em `localStorage`; dispara `app:ready`
- `auth.js`: em modo **supabase** (legado), usa `@supabase/supabase-js` carregado condicionalmente
- `app.js`: estado, `loadMes()`, `refreshCaixaFromState()` para cards de caixa, envia `Bearer` no `api()`
- Modo escuro via `localStorage`
- Chart.js para gráfico anual

## Testes

`tests/test_api.py` — CRUD, caixa, pago, investido, lixeira, limpar mês, revisão, seções, template Excel, assinaturas (CRUD/histórico/filtros), features, `/api/config` e bloqueio 401 em modos autenticados sem token.
