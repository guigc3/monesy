# Monesy

Sistema web para controle mensal de receitas e despesas, com visão de orçamento, caixa disponível, histórico de alterações e lixeira.

| App | Como rodar | URL |
|-----|------------|-----|
| **Monesy** | `py app.py` | http://localhost:5001 |

## Instalação

```bash
pip install -r requirements.txt
```

## Executar

O backend é escolhido automaticamente pelas variáveis de ambiente (ver `.env.example`):

| Modo | Quando | Auth |
|------|--------|------|
| **json** | Padrão sem `.env` ou sem credenciais de banco | Desativada (usuário dev fixo) |
| **mysql** | `MYSQL_HOST` definido ou `STORAGE_BACKEND=mysql` | Login/cadastro próprio (JWT) |
| **supabase** | `STORAGE_BACKEND=supabase` + credenciais Supabase | Legado — não recomendado |

### Modo local (JSON — desenvolvimento rápido)

```bash
py app.py
```

Não exige configuração. Os dados ficam em `data/*.json`.

### Modo MySQL (produção — recomendado)

1. Copie `.env.example` para `.env` e preencha as credenciais MySQL e `JWT_SECRET_KEY`.
2. Aplique o schema no banco: `mysql -h HOST -u USER -p DATABASE < mysql_schema.sql`
3. Defina `STORAGE_BACKEND=mysql` (ou apenas deixe `MYSQL_HOST` preenchido — o sistema detecta automaticamente).
4. Inicie o Flask: `py app.py`. A primeira tela do site será a de login/cadastro.

Para importar dados JSON existentes, cadastre o usuário pelo site e use os scripts de migração conforme a origem dos dados.

Para migrar de Supabase para MySQL:

```bash
py scripts/migrate_supabase_to_mysql.py
```

### Modo Supabase (legado)

Mantido apenas para compatibilidade com instalações antigas. Prefira MySQL.

1. Copie `.env.example` e preencha `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
2. Aplique `supabase/migrations/001_initial_schema.sql` no projeto Supabase.
3. Defina `STORAGE_BACKEND=supabase`.
4. Instale o pacote legado: `pip install supabase==2.15.3`

## Testes

```bash
py -m pytest tests -v
```

Os testes rodam no modo JSON (não precisam de MySQL nem Supabase) e exercitam o middleware de auth no caminho `STORAGE_BACKEND=json`.

## Estrutura

```
app.py              # API Flask (porta 5001)
auth.py             # Middleware JWT (MySQL, Supabase legado ou modo json)
db/                 # Repositórios (JsonRepository, MySQLRepository, SupabaseRepository legado)
  mysql_client.py   # Conexão PyMySQL por request
  repositories.py   # Camada de persistência
import_excel.py     # Importação a partir de planilha Excel
mysql_schema.sql    # Schema MySQL 5.6 (produção)
data/gastos.json        # Persistência JSON (lançamentos) — modo dev
data/assinaturas.json   # Assinaturas / recorrentes — modo dev
data/features.json      # Changelog de features — modo dev
scripts/
  migrate_supabase_to_mysql.py   # Migração Supabase → MySQL
  migrate_json_to_supabase.py    # Legado: JSON → Supabase
supabase/migrations/    # Schema Postgres legado
static/             # Frontend (HTML, CSS, JS) — auth.js com fluxo MySQL
tests/test_api.py   # Testes da API + auth middleware
```

## Deploy

Sugestão para produção:

- **Banco:** MySQL 5.6+ (ex.: UOL Host). Aplique `mysql_schema.sql`.
- **Auth:** JWT próprio via `JWT_SECRET_KEY` — rotas `/api/auth/login` e `/api/auth/register`.
- **Backend Flask:** Railway, Render ou Fly.io — defina as variáveis do `.env` (`MYSQL_*`, `JWT_SECRET_KEY`, `STORAGE_BACKEND=mysql`).
- **Frontend estático:** pode continuar servido pelo próprio Flask, ou ir para Vercel/Netlify configurando o `API_URL`.

## Documentação

- **[FEATURES.md](FEATURES.md)** — todas as funcionalidades implementadas
- **[CONTEXT.md](CONTEXT.md)** — modelo de dados, API, métricas de caixa e fluxos

## Funcionalidades (resumo)

- **Aba Assinaturas** — controle de assinaturas e custos recorrentes no cartão (independente dos lançamentos mensais)
- **Aba Features** — lista de funcionalidades implementadas com data e hora

## Registrar nova feature

Ao concluir uma entrega, adicione um item em `data/features.json`:

```json
{
  "id": "f014-identificador-unico",
  "titulo": "Nome curto da feature",
  "descricao": "Opcional — o que foi entregue.",
  "implementado_em": "2026-05-23T18:45:00"
}
```

Use data e hora reais no formato ISO (`AAAA-MM-DDTHH:MM:SS`).

- CRUD de receitas/despesas, seções, tags, gráfico anual, modo escuro
- Despesas **pagas** e receitas **investidas** (afetam caixa disponível)
- Lixeira, limpar mês, meses revisados, histórico por lançamento
- Import/export Excel

## Importar da planilha Excel

```bash
py import_excel.py
```

Variáveis opcionais: `PLANILHA_GASTOS`, `PLANILHA_ANO`.
