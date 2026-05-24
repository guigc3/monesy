#!/usr/bin/env python3
"""Migra dados do Supabase (Postgres) para o MySQL 5.6 (UOL Host).

Uso:
    # Configurar variaveis de ambiente antes de rodar:
    #   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (origem)
    #   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE  (destino)
    py scripts/migrate_supabase_to_mysql.py

O script:
1. Le todos os dados do Supabase via API REST (service_role — bypass de RLS).
2. Insere os dados no MySQL com INSERT IGNORE para idempotencia.
3. Exibe um resumo de registros migrados por tabela.

Rodando mais de uma vez e seguro — INSERT IGNORE ignora duplicatas.
"""

from __future__ import annotations

import json
import os
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------

def _env(key, default=""):
    return (os.environ.get(key) or default).strip()


def _supabase_client():
    try:
        from supabase import create_client
    except ImportError:
        print("ERRO: pacote 'supabase' nao instalado. Rode: pip install supabase==2.15.3")
        sys.exit(1)
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env")
        sys.exit(1)
    return create_client(url, key)


def _mysql_conn():
    try:
        import pymysql
        import pymysql.cursors
    except ImportError:
        print("ERRO: pacote 'PyMySQL' nao instalado. Rode: pip install PyMySQL>=1.1.0")
        sys.exit(1)
    host = _env("MYSQL_HOST")
    if not host:
        print("ERRO: defina MYSQL_HOST no .env")
        sys.exit(1)
    return pymysql.connect(
        host=host,
        port=int(_env("MYSQL_PORT", "3306")),
        user=_env("MYSQL_USER", "root"),
        password=_env("MYSQL_PASSWORD"),
        database=_env("MYSQL_DATABASE"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ts(val):
    """Converte timestamp Supabase (string ISO) para DATETIME MySQL (sem timezone)."""
    if not val:
        return None
    # Remove sufixo +00:00 ou Z que MySQL 5.6 nao aceita em DATETIME
    s = str(val)
    for suffix in ("+00:00", "Z", "+0000"):
        if s.endswith(suffix):
            s = s[:-len(suffix)]
    # Remove microsegundos opcionalmente (MySQL DATETIME tem precisao de segundos no 5.6)
    if "." in s:
        s = s.split(".")[0]
    return s or None


def _tags_to_json(val):
    """Converte array Postgres (list) para JSON string."""
    if val is None:
        return "[]"
    if isinstance(val, list):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, str):
        # ja e string — valida como JSON
        try:
            json.loads(val)
            return val
        except Exception:
            return "[]"
    return "[]"


def _json_str(val):
    if val is None:
        return None
    if isinstance(val, str):
        return val
    return json.dumps(val, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Migracao por tabela
# ---------------------------------------------------------------------------

def migrate_users(sb, my):
    """Migra usuarios (requer service_role)."""
    try:
        # A tabela auth.users nao e acessivel via PostgREST padrao.
        # Tentamos via tabela publica se existir um mirror, caso contrario pulamos.
        rows = sb.table("users").select("*").execute().data or []
    except Exception:
        rows = []
    if not rows:
        print("  users: tabela publica 'users' nao encontrada — pulando "
              "(usuarios precisam se re-registrar no MySQL)")
        return 0
    n = 0
    with my.cursor() as cur:
        for r in rows:
            try:
                cur.execute(
                    "INSERT IGNORE INTO users (id, email, password_hash, created_at) "
                    "VALUES (%s, %s, %s, %s)",
                    (r["id"], r["email"], r.get("password_hash", ""), _ts(r.get("created_at"))),
                )
                if cur.rowcount:
                    n += 1
            except Exception as exc:
                print(f"    AVISO user {r.get('email')}: {exc}")
    return n


def migrate_anos(sb, my):
    rows = sb.table("anos_cadastrados").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO anos_cadastrados (id, user_id, ano, created_at) "
                "VALUES (%s, %s, %s, %s)",
                (r.get("id"), r["user_id"], r["ano"], _ts(r.get("created_at"))),
            )
            if cur.rowcount:
                n += 1
    return n


def migrate_secoes(sb, my):
    rows = sb.table("secoes").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO secoes (id, user_id, tipo, nome, created_at) "
                "VALUES (%s, %s, %s, %s, %s)",
                (r.get("id"), r["user_id"], r["tipo"], r["nome"], _ts(r.get("created_at"))),
            )
            if cur.rowcount:
                n += 1
    return n


def migrate_lancamentos(sb, my):
    # Busca paginado (Supabase limita 1000 por request)
    all_rows = []
    offset = 0
    page = 1000
    while True:
        rows = (
            sb.table("lancamentos")
            .select("*")
            .range(offset, offset + page - 1)
            .execute()
            .data
            or []
        )
        all_rows.extend(rows)
        if len(rows) < page:
            break
        offset += page

    n = 0
    with my.cursor() as cur:
        for r in all_rows:
            cur.execute(
                "INSERT IGNORE INTO lancamentos "
                "(id, user_id, ano, mes, tipo, descricao, secao, valor, observacao, tags, "
                "pago, investido, criado_em, excluido_em, ultima_alteracao) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    r["id"], r["user_id"],
                    r["ano"], r["mes"], r["tipo"],
                    r.get("descricao") or "",
                    r.get("secao") or "Geral",
                    float(r.get("valor") or 0),
                    r.get("observacao") or "",
                    _tags_to_json(r.get("tags")),
                    int(bool(r.get("pago", False))),
                    int(bool(r.get("investido", False))),
                    _ts(r.get("criado_em")),
                    _ts(r.get("excluido_em")),
                    _ts(r.get("ultima_alteracao")) or _ts(r.get("criado_em")),
                ),
            )
            if cur.rowcount:
                n += 1
    return n, len(all_rows)


def migrate_lancamento_historico(sb, my):
    all_rows = []
    offset = 0
    page = 1000
    while True:
        rows = (
            sb.table("lancamento_historico")
            .select("*")
            .range(offset, offset + page - 1)
            .execute()
            .data
            or []
        )
        all_rows.extend(rows)
        if len(rows) < page:
            break
        offset += page

    n = 0
    with my.cursor() as cur:
        for r in all_rows:
            cur.execute(
                "INSERT IGNORE INTO lancamento_historico "
                "(id, lancamento_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (
                    r.get("id"), r["lancamento_id"], r["user_id"],
                    r.get("acao") or "",
                    _json_str(r.get("antes")),
                    _json_str(r.get("depois")),
                    _ts(r.get("ts")),
                ),
            )
            if cur.rowcount:
                n += 1
    return n, len(all_rows)


def migrate_meses_revisados(sb, my):
    rows = sb.table("meses_revisados").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO meses_revisados (id, user_id, ano, mes, revisado_em) "
                "VALUES (%s,%s,%s,%s,%s)",
                (r.get("id"), r["user_id"], r["ano"], r["mes"], _ts(r.get("revisado_em"))),
            )
            if cur.rowcount:
                n += 1
    return n


def migrate_assinaturas(sb, my):
    rows = sb.table("assinaturas").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO assinaturas "
                "(id, user_id, descricao, data_inicio, data_fim, valor_mensal, "
                "cartao, criado_em, ultima_alteracao) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    r["id"], r["user_id"],
                    r.get("descricao") or "",
                    r.get("data_inicio"),
                    r.get("data_fim"),
                    float(r.get("valor_mensal") or 0),
                    r.get("cartao") or "",
                    _ts(r.get("criado_em")),
                    _ts(r.get("ultima_alteracao")) or _ts(r.get("criado_em")),
                ),
            )
            if cur.rowcount:
                n += 1
    return n


def migrate_assinatura_historico(sb, my):
    rows = sb.table("assinatura_historico").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO assinatura_historico "
                "(id, assinatura_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (
                    r.get("id"), r["assinatura_id"], r["user_id"],
                    r.get("acao") or "",
                    _json_str(r.get("antes")),
                    _json_str(r.get("depois")),
                    _ts(r.get("ts")),
                ),
            )
            if cur.rowcount:
                n += 1
    return n


def migrate_features(sb, my):
    rows = sb.table("features").select("*").execute().data or []
    n = 0
    with my.cursor() as cur:
        for r in rows:
            cur.execute(
                "INSERT IGNORE INTO features (id, titulo, descricao, implementado_em) "
                "VALUES (%s,%s,%s,%s)",
                (
                    r["id"], r["titulo"],
                    r.get("descricao"),
                    _ts(r.get("implementado_em")),
                ),
            )
            if cur.rowcount:
                n += 1
    return n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  Migracao Supabase → MySQL 5.6")
    print("=" * 60)

    print("\n[1/2] Conectando ao Supabase...")
    sb = _supabase_client()
    print("      OK")

    print("[2/2] Conectando ao MySQL...")
    my = _mysql_conn()
    print("      OK\n")

    print("Migrando tabelas:")

    n = migrate_users(sb, my)
    print(f"  users                : {n} inseridos")

    n = migrate_anos(sb, my)
    print(f"  anos_cadastrados     : {n} inseridos")

    n = migrate_secoes(sb, my)
    print(f"  secoes               : {n} inseridos")

    n_ok, n_total = migrate_lancamentos(sb, my)
    print(f"  lancamentos          : {n_ok}/{n_total} inseridos")

    n_ok, n_total = migrate_lancamento_historico(sb, my)
    print(f"  lancamento_historico : {n_ok}/{n_total} inseridos")

    n = migrate_meses_revisados(sb, my)
    print(f"  meses_revisados      : {n} inseridos")

    n = migrate_assinaturas(sb, my)
    print(f"  assinaturas          : {n} inseridos")

    n = migrate_assinatura_historico(sb, my)
    print(f"  assinatura_historico : {n} inseridos")

    n = migrate_features(sb, my)
    print(f"  features             : {n} inseridos")

    my.close()
    print("\nMigracao concluida!")
    print("\nPROXIMOS PASSOS:")
    print("  1. Atualize o .env com as credenciais MySQL e JWT_SECRET_KEY")
    print("  2. Execute o mysql_schema.sql no banco MySQL para criar as tabelas")
    print("  3. Rode este script para migrar os dados")
    print("  4. Inicie o Flask com STORAGE_BACKEND=mysql (ou apenas MYSQL_HOST definido)")
    print("  5. Os usuarios precisam criar nova senha via /api/auth/register se a")
    print("     tabela 'users' publica nao existia no Supabase")


if __name__ == "__main__":
    main()
