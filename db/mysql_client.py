"""Conexao MySQL 5.6 via PyMySQL com gestao de ciclo de vida por request Flask.

Cada request abre uma conexao (ou reutiliza a do flask.g) e fecha ao termino.
Registrar ``teardown_db`` com ``app.teardown_appcontext``.
"""

from __future__ import annotations

import os
from typing import Optional

try:
    import pymysql
    import pymysql.cursors
except ImportError:  # pragma: no cover
    pymysql = None  # type: ignore[assignment]

from flask import g


def _env(key: str, default: str = "") -> str:
    return (os.environ.get(key) or default).strip()


def mysql_configured() -> bool:
    """True quando as variaveis minimas para conexao MySQL estao presentes."""
    return bool(_env("MYSQL_HOST") and _env("MYSQL_DATABASE"))


def _connect():
    """Abre uma nova conexao PyMySQL com as configuracoes do ambiente."""
    if pymysql is None:
        raise RuntimeError(
            "Pacote 'PyMySQL' nao instalado. Rode: pip install -r requirements.txt"
        )
    return pymysql.connect(
        host=_env("MYSQL_HOST"),
        port=int(_env("MYSQL_PORT", "3306")),
        user=_env("MYSQL_USER", "root"),
        password=_env("MYSQL_PASSWORD"),
        database=_env("MYSQL_DATABASE"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        autocommit=True,
    )


def get_db():
    """Retorna (e cacheia em flask.g) a conexao MySQL para a request atual.

    Reconecta automaticamente se a conexao foi perdida (idle timeout,
    reinicio do servidor, etc.).
    """
    if "mysql_db" not in g:
        g.mysql_db = _connect()
    else:
        try:
            g.mysql_db.ping(reconnect=True)
        except Exception:
            g.mysql_db = _connect()
    return g.mysql_db


def teardown_db(exc=None) -> None:
    """Fecha a conexao ao final do contexto da aplicacao.

    Registrar com::

        app.teardown_appcontext(teardown_db)
    """
    db = g.pop("mysql_db", None)
    if db is not None:
        try:
            db.close()
        except Exception:
            pass
