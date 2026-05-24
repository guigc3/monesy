"""Clientes do Supabase usados pela API e pelos scripts de migracao."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = None  # type: ignore[assignment]
    create_client = None  # type: ignore[assignment]


def _env(key: str) -> Optional[str]:
    value = os.environ.get(key)
    return value.strip() if value else None


def supabase_configured() -> bool:
    """True quando as variaveis minimas para conexao estao presentes."""
    return bool(_env("SUPABASE_URL") and _env("SUPABASE_ANON_KEY"))


@lru_cache(maxsize=1)
def admin_client() -> "Client":
    """Cliente com service_role; usar apenas no servidor."""
    if create_client is None:
        raise RuntimeError("Pacote 'supabase' nao instalado. Rode pip install -r requirements.txt")
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios para o cliente admin"
        )
    return create_client(url, key)


@lru_cache(maxsize=1)
def _anon_client() -> "Client":
    """Cliente base com anon key; reutilizado para evitar TLS handshake a cada request.

    Nao usar diretamente — use user_client() para injetar o JWT do usuario.
    """
    if create_client is None:
        raise RuntimeError("Pacote 'supabase' nao instalado. Rode pip install -r requirements.txt")
    url = _env("SUPABASE_URL")
    anon = _env("SUPABASE_ANON_KEY")
    if not url or not anon:
        raise RuntimeError("SUPABASE_URL e SUPABASE_ANON_KEY obrigatorios")
    return create_client(url, anon)


def user_client(access_token: str) -> "Client":
    """Cliente para chamadas em nome de um usuario autenticado.

    Reutiliza a sessao HTTPX subjacente (criada uma unica vez via _anon_client)
    e apenas atualiza o header Authorization com o JWT do usuario.
    Isso evita um novo TCP+TLS handshake a cada request Flask, reduzindo a
    latencia de ~200-300 ms por chamada para ~20-50 ms (so o RTT ao Supabase).
    """
    client = _anon_client()
    client.postgrest.auth(access_token)
    return client
