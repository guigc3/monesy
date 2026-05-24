"""Migracao one-shot dos JSONs locais para o Postgres do Supabase.

Uso:

    python scripts/migrate_json_to_supabase.py --email seu@email.com [--user-id <uuid>]

- ``--email`` e usado apenas como referencia (e para listar usuarios). O
  ``user_id`` final pode ser passado explicitamente em ``--user-id`` para evitar
  qualquer ambiguidade.
- O script usa ``SUPABASE_SERVICE_ROLE_KEY`` (admin) e ignora RLS para inserir
  os registros em nome do usuario indicado.

Antes de rodar, garanta que:
1. ``.env`` esta preenchido (veja ``.env.example``).
2. O schema ``supabase/migrations/001_initial_schema.sql`` ja foi aplicado.
3. O usuario alvo ja existe no Supabase Auth (cadastrar via tela de login,
   ou via Dashboard > Auth > Users > Add user).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path
from typing import List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from db.client import admin_client  # noqa: E402


def _load_json(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def find_user_id(client, email: str) -> Optional[str]:
    """Resolve user_id buscando pela API admin do Supabase."""
    try:
        page = client.auth.admin.list_users(page=1, per_page=200)
    except Exception as exc:  # pragma: no cover
        print(f"[warn] nao foi possivel listar usuarios: {exc}")
        return None
    users = getattr(page, "users", None) or page  # supabase-py varia a forma
    if isinstance(users, dict):
        users = users.get("users", [])
    for user in users:
        user_email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else None)
        if user_email and user_email.lower() == email.lower():
            return getattr(user, "id", None) or user["id"]
    return None


def migrate_gastos(client, user_id: str, gastos: dict) -> None:
    print("[gastos] migrando...")
    secoes_rows = []
    for nome in gastos.get("secoes_despesa") or []:
        secoes_rows.append({"user_id": user_id, "tipo": "despesa", "nome": nome})
    for nome in gastos.get("secoes_receita") or []:
        secoes_rows.append({"user_id": user_id, "tipo": "receita", "nome": nome})
    if secoes_rows:
        client.table("secoes").upsert(secoes_rows, on_conflict="user_id,tipo,nome").execute()
        print(f"  secoes: {len(secoes_rows)}")

    anos_rows = [{"user_id": user_id, "ano": int(a)} for a in (gastos.get("anos") or []) if isinstance(a, int)]
    if anos_rows:
        client.table("anos_cadastrados").upsert(anos_rows, on_conflict="user_id,ano").execute()
        print(f"  anos: {len(anos_rows)}")

    ativos = gastos.get("lancamentos") or []
    lixeira = gastos.get("lixeira") or []
    todos = list(ativos) + list(lixeira)
    lanc_rows = []
    hist_rows = []
    for l in todos:
        lanc_id = l.get("id") or str(uuid.uuid4())
        lanc_rows.append({
            "id": lanc_id,
            "user_id": user_id,
            "ano": int(l["ano"]),
            "mes": int(l["mes"]),
            "tipo": l["tipo"],
            "descricao": l.get("descricao") or "",
            "secao": l.get("secao") or "Geral",
            "valor": float(l.get("valor") or 0),
            "observacao": l.get("observacao") or "",
            "tags": list(l.get("tags") or []),
            "pago": bool(l.get("pago", False)),
            "investido": bool(l.get("investido", False)),
            "criado_em": l.get("criado_em"),
            "excluido_em": l.get("excluido_em"),
        })
        for h in (l.get("historico") or []):
            hist_rows.append({
                "lancamento_id": lanc_id,
                "user_id": user_id,
                "acao": h.get("acao") or "evento",
                "antes": h.get("antes"),
                "depois": h.get("depois"),
                "ts": h.get("ts"),
            })

    if lanc_rows:
        client.table("lancamentos").upsert(lanc_rows, on_conflict="id").execute()
        print(f"  lancamentos: {len(lanc_rows)} (lixeira incl. {len(lixeira)})")
    if hist_rows:
        client.table("lancamento_historico").insert(hist_rows).execute()
        print(f"  historico de lancamentos: {len(hist_rows)}")

    rev_rows = [
        {"user_id": user_id, "ano": int(r["ano"]), "mes": int(r["mes"])}
        for r in (gastos.get("meses_revisados") or [])
        if isinstance(r.get("ano"), int) and isinstance(r.get("mes"), int)
    ]
    if rev_rows:
        client.table("meses_revisados").upsert(rev_rows, on_conflict="user_id,ano,mes").execute()
        print(f"  meses revisados: {len(rev_rows)}")


def migrate_assinaturas(client, user_id: str, data: dict) -> None:
    print("[assinaturas] migrando...")
    items = data.get("assinaturas") or []
    rows = []
    hist_rows = []
    for a in items:
        item_id = a.get("id") or str(uuid.uuid4())
        rows.append({
            "id": item_id,
            "user_id": user_id,
            "descricao": a.get("descricao") or "",
            "data_inicio": a.get("data_inicio"),
            "data_fim": a.get("data_fim"),
            "valor_mensal": float(a.get("valor_mensal") or 0),
            "cartao": a.get("cartao") or "",
            "criado_em": a.get("criado_em"),
        })
        for h in (a.get("historico") or []):
            hist_rows.append({
                "assinatura_id": item_id,
                "user_id": user_id,
                "acao": h.get("acao") or "evento",
                "antes": h.get("antes"),
                "depois": h.get("depois"),
                "ts": h.get("ts"),
            })
    if rows:
        client.table("assinaturas").upsert(rows, on_conflict="id").execute()
        print(f"  assinaturas: {len(rows)}")
    if hist_rows:
        client.table("assinatura_historico").insert(hist_rows).execute()
        print(f"  historico de assinaturas: {len(hist_rows)}")


def migrate_features(client, data: dict) -> None:
    print("[features] migrando (global)...")
    features = data.get("features") or []
    rows = [
        {
            "id": f["id"],
            "titulo": f.get("titulo") or "",
            "descricao": f.get("descricao"),
            "implementado_em": f.get("implementado_em"),
        }
        for f in features
        if f.get("id")
    ]
    if rows:
        client.table("features").upsert(rows, on_conflict="id").execute()
        print(f"  features: {len(rows)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="Email do usuario alvo no Supabase Auth")
    parser.add_argument("--user-id", default=None, help="UUID do usuario (opcional, sobrepoe --email)")
    parser.add_argument("--data-dir", default=str(REPO_ROOT / "data"))
    parser.add_argument("--skip-features", action="store_true")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    gastos = _load_json(data_dir / "gastos.json") or {}
    assinaturas = _load_json(data_dir / "assinaturas.json") or {}
    features = _load_json(data_dir / "features.json") or {}

    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        print("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env", file=sys.stderr)
        return 1

    client = admin_client()

    user_id = args.user_id or find_user_id(client, args.email)
    if not user_id:
        print(
            f"ERRO: usuario '{args.email}' nao encontrado no Supabase Auth.\n"
            "Cadastre-o na tela de login antes de rodar a migracao, ou passe --user-id explicitamente.",
            file=sys.stderr,
        )
        return 2

    print(f"Migrando dados para user_id={user_id} ({args.email})")
    if gastos:
        migrate_gastos(client, user_id, gastos)
    if assinaturas:
        migrate_assinaturas(client, user_id, assinaturas)
    if features and not args.skip_features:
        migrate_features(client, features)
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
