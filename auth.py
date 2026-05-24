"""Middleware de autenticacao adaptativa.

Tres modos de operacao:

- ``json``: autenticacao desativada; ``g.user_id`` recebe ``DEV_USER_ID``.
- ``mysql``: JWT proprio (HS256) gerado por ``create_token()`` e validado com
  ``JWT_SECRET_KEY``. Rotas ``/api/auth/login`` e ``/api/auth/register`` em
  ``app.py`` fazem a autenticacao e devolvem o token.
- ``supabase``: JWT do Supabase validado via JWKS (ES256) ou SUPABASE_JWT_SECRET
  (HS256 legado).

O modo e selecionado por ``storage_backend()``, que le as variaveis de ambiente.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from functools import lru_cache, wraps
from typing import Callable, Optional

from flask import Response, g, jsonify, request

try:
    import jwt  # PyJWT
except ImportError:  # pragma: no cover
    jwt = None  # type: ignore[assignment]


DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

ANON_ROUTES = {
    "index",
    "static",
    "meta",
}


def storage_backend() -> str:
    """Retorna ``mysql``, ``supabase`` ou ``json`` baseado nas variaveis de ambiente."""
    explicit = (os.environ.get("STORAGE_BACKEND") or "").strip().lower()
    if explicit in ("supabase", "json", "mysql"):
        return explicit
    if (os.environ.get("MYSQL_HOST") or "").strip():
        return "mysql"
    if (os.environ.get("SUPABASE_URL") or "").strip():
        return "supabase"
    return "json"


def _bearer_token(req) -> Optional[str]:
    header = req.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header.split(" ", 1)[1].strip()
    return token or None


# ---------------------------------------------------------------------------
# MySQL JWT (HS256 proprio)
# ---------------------------------------------------------------------------


def create_token(user_id: str) -> str:
    """Gera um JWT HS256 com duracao de 7 dias para o usuario MySQL."""
    if jwt is None:
        raise RuntimeError("PyJWT nao instalado. Rode pip install -r requirements.txt")
    secret = (os.environ.get("JWT_SECRET_KEY") or "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY nao definido no ambiente")
    now = datetime.utcnow()
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm="HS256")  # type: ignore[attr-defined]


def _verify_mysql_token(token: str) -> dict:
    if jwt is None:
        raise RuntimeError("PyJWT nao instalado. Rode pip install -r requirements.txt")
    secret = (os.environ.get("JWT_SECRET_KEY") or "").strip()
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY nao definido no ambiente")
    try:
        return jwt.decode(  # type: ignore[attr-defined]
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:  # type: ignore[attr-defined]
        raise ValueError(f"Token invalido: {exc}") from exc


# ---------------------------------------------------------------------------
# Supabase JWT (ES256 via JWKS ou HS256 legado)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _jwks_client():
    """Cria (e cacheia) o cliente JWKS do projeto Supabase."""
    if jwt is None:
        raise RuntimeError("PyJWT nao instalado. Rode pip install -r requirements.txt")
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    if not url:
        raise RuntimeError("SUPABASE_URL nao definido")
    return jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json")  # type: ignore[attr-defined]


def _verify_supabase_token(token: str) -> dict:
    if jwt is None:
        raise RuntimeError("PyJWT nao instalado. Rode pip install -r requirements.txt")
    supabase_url = (os.environ.get("SUPABASE_URL") or "").strip()
    if supabase_url:
        try:
            signing_key = _jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(  # type: ignore[attr-defined]
                token,
                signing_key,
                algorithms=[signing_key.algorithm_name],
                audience="authenticated",
                leeway=60,
                options={"require": ["exp", "sub"]},
            )
        except jwt.PyJWTError as exc:  # type: ignore[attr-defined]
            raise ValueError(f"Token invalido: {exc}") from exc

    # Fallback legado: HS256 com SUPABASE_JWT_SECRET
    secret = (os.environ.get("SUPABASE_JWT_SECRET") or "").strip()
    if not secret:
        raise RuntimeError("SUPABASE_URL ou SUPABASE_JWT_SECRET nao definidos")
    try:
        return jwt.decode(  # type: ignore[attr-defined]
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            leeway=60,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:  # type: ignore[attr-defined]
        raise ValueError(f"Token invalido: {exc}") from exc


# ---------------------------------------------------------------------------
# Interface publica
# ---------------------------------------------------------------------------


def verify_token(token: str) -> dict:
    """Valida o JWT e devolve as claims. Lanca ``ValueError`` se invalido."""
    backend = storage_backend()
    if backend == "mysql":
        return _verify_mysql_token(token)
    return _verify_supabase_token(token)


def require_auth(view: Callable) -> Callable:
    """Decorator a ser aplicado em rotas que exigem usuario autenticado."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if storage_backend() == "json":
            g.user_id = DEV_USER_ID
            g.access_token = None
            return view(*args, **kwargs)

        token = _bearer_token(request)
        if not token:
            return jsonify({"error": "Token de autenticacao ausente"}), 401
        try:
            claims = verify_token(token)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401
        g.user_id = claims["sub"]
        g.access_token = token
        return view(*args, **kwargs)

    return wrapper


def init_app(app) -> None:
    """Aplica middleware global e responde preflight CORS antes da autenticacao."""

    @app.before_request
    def _attach_context() -> Optional[Response]:
        if request.method == "OPTIONS":
            return None
        if storage_backend() == "json":
            g.user_id = DEV_USER_ID
            g.access_token = None
        else:  # mysql ou supabase
            token = _bearer_token(request)
            if token:
                try:
                    claims = verify_token(token)
                    g.user_id = claims.get("sub")
                    g.access_token = token
                except ValueError:
                    g.user_id = None
                    g.access_token = None
            else:
                g.user_id = None
                g.access_token = None
        return None
