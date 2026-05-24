"""Camada de acesso a dados.

Tres backends sao suportados:

- ``json``: persiste em arquivos locais (desenvolvimento rapido e testes).
- ``mysql``: persiste em MySQL 5.6+ via PyMySQL; filtro explicito por ``user_id``.
- ``supabase``: legado — Postgres do Supabase com RLS por ``user_id``.

A selecao acontece via ``auth.storage_backend()`` (variavel ``STORAGE_BACKEND`` ou
deteccao automatica por ``MYSQL_HOST`` / ``SUPABASE_URL``).
"""

from .repositories import (
    BaseRepository,
    JsonRepository,
    SupabaseRepository,
    get_repository,
)

__all__ = [
    "BaseRepository",
    "JsonRepository",
    "SupabaseRepository",
    "get_repository",
]
