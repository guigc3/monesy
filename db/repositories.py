"""Repositorios de persistencia para gastos, assinaturas e features.

A interface ``BaseRepository`` define operacoes granulares — cada metodo
mapeia para o conjunto minimo de queries necessarias. Em modo Supabase isso
evita carregar (e regravar) o estado inteiro do usuario a cada requisicao.

Duas implementacoes:

- ``JsonRepository``: arquivos JSON locais; mantem a abordagem "le, modifica,
  grava" porque o custo de I/O local e desprezivel e simplifica os testes.
- ``SupabaseRepository``: queries direcionadas por ``user_id`` e por periodo
  (ano/mes) quando aplicavel. Historico nunca e carregado junto da lista —
  apenas sob demanda.
"""

from __future__ import annotations

import json
import os
import random
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from flask import current_app, g

# ----------------------------------------------------------------------------
# Helpers de arquivo
# ----------------------------------------------------------------------------

LOCK_TIMEOUT = 5.0
MAX_RETRIES = 15
RETRY_DELAY_MIN = 0.05
RETRY_DELAY_MAX = 0.35


def _safe_read_json(filepath: str) -> Optional[dict]:
    if not os.path.exists(filepath):
        return None
    lock_path = filepath + ".lock"
    deadline = time.time() + LOCK_TIMEOUT
    while time.time() < deadline and os.path.exists(lock_path):
        time.sleep(random.uniform(0.02, 0.08))
    for _ in range(MAX_RETRIES):
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.close(fd)
            try:
                with open(filepath, "r", encoding="utf-8-sig") as f:
                    return json.load(f)
            finally:
                if os.path.exists(lock_path):
                    os.remove(lock_path)
        except FileExistsError:
            time.sleep(random.uniform(RETRY_DELAY_MIN, RETRY_DELAY_MAX))
    raise RuntimeError(f"Nao foi possivel ler {filepath}")


def _safe_write_json(filepath: str, data: dict) -> None:
    lock_path = filepath + ".lock"
    deadline = time.time() + LOCK_TIMEOUT
    while time.time() < deadline and os.path.exists(lock_path):
        time.sleep(random.uniform(0.02, 0.08))
    for _ in range(MAX_RETRIES):
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.close(fd)
            try:
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                return
            finally:
                if os.path.exists(lock_path):
                    os.remove(lock_path)
        except FileExistsError:
            time.sleep(random.uniform(RETRY_DELAY_MIN, RETRY_DELAY_MAX))
    raise RuntimeError(f"Nao foi possivel gravar {filepath}")


# ----------------------------------------------------------------------------
# Defaults
# ----------------------------------------------------------------------------

DEFAULT_SECOES = ["Despesas fixas", "Moradia", "Cartões", "Bancos", "Outros"]
DEFAULT_SECOES_RECEITA = ["Receitas", "Salários", "Outras receitas"]


def _default_data() -> dict:
    return {
        "secoes_despesa": list(DEFAULT_SECOES),
        "secoes_receita": list(DEFAULT_SECOES_RECEITA),
        "anos": [datetime.now().year],
        "lancamentos": [],
        "lixeira": [],
        "meses_revisados": [],
    }


def _default_assinaturas() -> dict:
    return {"cartoes": [], "assinaturas": []}


# ----------------------------------------------------------------------------
# Interface
# ----------------------------------------------------------------------------


class BaseRepository:
    """Operacoes granulares usadas pelas rotas Flask."""

    # --- secoes -----------------------------------------------------------
    def list_secoes(self, user_id: str) -> Dict[str, List[str]]:
        raise NotImplementedError

    def add_secao(self, user_id: str, tipo: str, nome: str) -> None:
        raise NotImplementedError

    # --- anos -------------------------------------------------------------
    def list_anos(self, user_id: str) -> List[int]:
        raise NotImplementedError

    def add_ano(self, user_id: str, ano: int) -> None:
        raise NotImplementedError

    def has_ano(self, user_id: str, ano: int) -> bool:
        raise NotImplementedError

    def count_lancamentos_ano(self, user_id: str, ano: int) -> int:
        raise NotImplementedError

    def remove_ano(self, user_id: str, ano: int, cascade: bool) -> List[int]:
        raise NotImplementedError

    # --- meses revisados --------------------------------------------------
    def list_meses_revisados(self, user_id: str, ano: int) -> List[int]:
        raise NotImplementedError

    def set_mes_revisado(self, user_id: str, ano: int, mes: int, revisado: bool) -> List[int]:
        raise NotImplementedError

    # --- tags -------------------------------------------------------------
    def list_tags(self, user_id: str) -> List[str]:
        raise NotImplementedError

    # --- lancamentos ------------------------------------------------------
    def list_lancamentos(
        self,
        user_id: str,
        ano: int,
        mes: Optional[int] = None,
        tipo: Optional[str] = None,
        with_ultima_alteracao: bool = True,
    ) -> List[dict]:
        raise NotImplementedError

    def get_lancamento(self, user_id: str, lanc_id: str) -> Optional[dict]:
        raise NotImplementedError

    def insert_lancamento(
        self,
        user_id: str,
        lanc: dict,
        history_entry: Optional[dict] = None,
        ensure_secao: bool = True,
        ensure_ano: bool = True,
    ) -> dict:
        raise NotImplementedError

    def bulk_insert_lancamentos(
        self,
        user_id: str,
        lancs: List[dict],
    ) -> int:
        raise NotImplementedError

    def update_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
        ensure_secao_for: Optional[str] = None,
    ) -> Optional[dict]:
        raise NotImplementedError

    def soft_delete_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
        excluido_em: str,
    ) -> Optional[dict]:
        raise NotImplementedError

    def soft_delete_lancamentos_bulk(
        self,
        user_id: str,
        entries: List[Tuple[str, dict]],
        excluido_em: str,
    ) -> int:
        """``entries``: [(lanc_id, history_entry_dict), ...]. Retorna #removidos."""
        raise NotImplementedError

    # --- lixeira ----------------------------------------------------------
    def list_lixeira(self, user_id: str) -> List[dict]:
        raise NotImplementedError

    def restore_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
    ) -> Optional[dict]:
        raise NotImplementedError

    def delete_permanente(self, user_id: str, lanc_id: str) -> bool:
        raise NotImplementedError

    def empty_lixeira(self, user_id: str) -> int:
        raise NotImplementedError

    # --- historico --------------------------------------------------------
    def get_lancamento_historico(self, user_id: str, lanc_id: str) -> List[dict]:
        raise NotImplementedError

    # --- assinaturas ------------------------------------------------------
    def list_assinaturas(self, user_id: str) -> List[dict]:
        raise NotImplementedError

    def list_cartoes(self, user_id: str) -> List[str]:
        raise NotImplementedError

    def get_assinatura(self, user_id: str, item_id: str) -> Optional[dict]:
        raise NotImplementedError

    def insert_assinatura(
        self,
        user_id: str,
        item: dict,
        history_entry: Optional[dict] = None,
    ) -> dict:
        raise NotImplementedError

    def update_assinatura(
        self,
        user_id: str,
        item_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
    ) -> Optional[dict]:
        raise NotImplementedError

    def delete_assinatura(self, user_id: str, item_id: str) -> bool:
        raise NotImplementedError

    def get_assinatura_historico(self, user_id: str, item_id: str) -> List[dict]:
        raise NotImplementedError

    # --- resumo (otimizado) -----------------------------------------------
    def resumo_mes(self, user_id: str, ano: int, mes: int) -> Dict[str, Any]:
        """Retorna lancamentos e secoes do mes em uma estrutura unificada.

        A implementacao padrao faz 2 queries separadas.
        SupabaseRepository sobrescreve com 1 chamada RPC ao Postgres.
        """
        lancs = self.list_lancamentos(user_id, ano, mes=mes)
        secoes = self.list_secoes(user_id)
        return {"lancamentos": lancs, "secoes": secoes}

    # --- metas ------------------------------------------------------------
    def list_metas(self, user_id: str) -> List[dict]:
        return []

    def set_meta(
        self,
        user_id: str,
        tipo: str,
        secao: str,
        valor: Optional[float],
    ) -> List[dict]:
        return []

    # --- recorrentes ------------------------------------------------------
    def list_recorrentes(self, user_id: str) -> List[dict]:
        return []

    def get_recorrente(self, user_id: str, rec_id: str) -> Optional[dict]:
        return None

    def upsert_recorrente(self, user_id: str, item: dict) -> dict:
        raise NotImplementedError

    def delete_recorrente(self, user_id: str, rec_id: str) -> bool:
        return False

    # --- features ---------------------------------------------------------
    def list_features(self) -> List[dict]:
        raise NotImplementedError


# ----------------------------------------------------------------------------
# JSON (legado / dev / tests)
# ----------------------------------------------------------------------------


def _ultima_alteracao_ts(lanc: dict) -> Optional[str]:
    historico = lanc.get("historico") or []
    if historico:
        return historico[-1].get("ts") or lanc.get("criado_em")
    return lanc.get("criado_em")


class JsonRepository(BaseRepository):
    """Repositorio que le/grava nos arquivos JSON locais.

    Cada operacao faz uma leitura (opcionalmente uma gravacao) do arquivo
    inteiro — adequado para desenvolvimento local e testes.
    """

    def __init__(
        self,
        data_file: str,
        assinaturas_file: str,
        features_file: str,
    ) -> None:
        self.data_file = data_file
        self.assinaturas_file = assinaturas_file
        self.features_file = features_file
        os.makedirs(os.path.dirname(data_file), exist_ok=True)

    # ----- IO helpers -----------------------------------------------------
    def _read_gastos(self) -> dict:
        data = _safe_read_json(self.data_file)
        if data is None:
            data = _default_data()
            _safe_write_json(self.data_file, data)
        data.setdefault("secoes_despesa", list(DEFAULT_SECOES))
        data.setdefault("secoes_receita", list(DEFAULT_SECOES_RECEITA))
        data.setdefault("anos", [])
        data.setdefault("lancamentos", [])
        data.setdefault("lixeira", [])
        data.setdefault("meses_revisados", [])
        data.setdefault("metas", [])
        data.setdefault("recorrentes", [])
        return data

    def _write_gastos(self, data: dict) -> None:
        _safe_write_json(self.data_file, data)

    def _read_assinaturas(self) -> dict:
        data = _safe_read_json(self.assinaturas_file)
        if data is None:
            data = _default_assinaturas()
            _safe_write_json(self.assinaturas_file, data)
        data.setdefault("cartoes", [])
        data.setdefault("assinaturas", [])
        return data

    def _write_assinaturas(self, data: dict) -> None:
        _safe_write_json(self.assinaturas_file, data)

    # ----- secoes ---------------------------------------------------------
    def list_secoes(self, user_id: str) -> Dict[str, List[str]]:
        data = self._read_gastos()
        return {
            "despesa": list(data.get("secoes_despesa") or []),
            "receita": list(data.get("secoes_receita") or []),
        }

    def add_secao(self, user_id: str, tipo: str, nome: str) -> None:
        key = "secoes_receita" if tipo == "receita" else "secoes_despesa"
        data = self._read_gastos()
        lista = data.setdefault(key, [])
        if not any(s.lower() == nome.lower() for s in lista):
            lista.append(nome)
            self._write_gastos(data)

    # ----- anos -----------------------------------------------------------
    def list_anos(self, user_id: str) -> List[int]:
        data = self._read_gastos()
        derivados = {l.get("ano") for l in data.get("lancamentos", []) if l.get("ano")}
        cadastrados = set(data.get("anos") or [])
        return sorted(derivados | cadastrados, reverse=True)

    def add_ano(self, user_id: str, ano: int) -> None:
        data = self._read_gastos()
        anos = data.setdefault("anos", [])
        if ano not in anos:
            anos.append(ano)
            self._write_gastos(data)

    def has_ano(self, user_id: str, ano: int) -> bool:
        data = self._read_gastos()
        if ano in (data.get("anos") or []):
            return True
        return any(l.get("ano") == ano for l in data.get("lancamentos", []))

    def count_lancamentos_ano(self, user_id: str, ano: int) -> int:
        data = self._read_gastos()
        return sum(1 for l in data.get("lancamentos", []) if l.get("ano") == ano)

    def remove_ano(self, user_id: str, ano: int, cascade: bool) -> List[int]:
        data = self._read_gastos()
        anos = data.setdefault("anos", [])
        if cascade:
            data["lancamentos"] = [l for l in data["lancamentos"] if l.get("ano") != ano]
        if ano in anos:
            anos.remove(ano)
        self._write_gastos(data)
        derivados = {l.get("ano") for l in data["lancamentos"] if l.get("ano")}
        return sorted(set(anos) | derivados, reverse=True)

    # ----- meses revisados -----------------------------------------------
    def list_meses_revisados(self, user_id: str, ano: int) -> List[int]:
        data = self._read_gastos()
        return sorted(
            r["mes"]
            for r in data.get("meses_revisados", [])
            if r.get("ano") == ano and isinstance(r.get("mes"), int) and 1 <= r["mes"] <= 12
        )

    def set_mes_revisado(self, user_id: str, ano: int, mes: int, revisado: bool) -> List[int]:
        data = self._read_gastos()
        lista = data.setdefault("meses_revisados", [])
        lista[:] = [r for r in lista if not (r.get("ano") == ano and r.get("mes") == mes)]
        if revisado:
            lista.append({"ano": ano, "mes": mes})
        self._write_gastos(data)
        return sorted(
            r["mes"] for r in lista
            if r.get("ano") == ano and isinstance(r.get("mes"), int) and 1 <= r["mes"] <= 12
        )

    # ----- tags -----------------------------------------------------------
    def list_tags(self, user_id: str) -> List[str]:
        data = self._read_gastos()
        seen = set()
        tags: List[str] = []
        for lanc in data.get("lancamentos", []):
            for tag in (lanc.get("tags") or []):
                name = (tag or "").strip()
                if not name:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                tags.append(name)
        return sorted(tags, key=str.lower)

    # ----- lancamentos ---------------------------------------------------
    def list_lancamentos(
        self,
        user_id: str,
        ano: int,
        mes: Optional[int] = None,
        tipo: Optional[str] = None,
        with_ultima_alteracao: bool = True,
    ) -> List[dict]:
        data = self._read_gastos()
        result = [l for l in data.get("lancamentos", []) if l.get("ano") == ano]
        if mes is not None:
            result = [l for l in result if l.get("mes") == mes]
        if tipo:
            result = [l for l in result if l.get("tipo") == tipo]
        out = []
        for l in result:
            item = {k: v for k, v in l.items() if k != "historico"}
            if with_ultima_alteracao:
                item["ultima_alteracao"] = _ultima_alteracao_ts(l)
            out.append(item)
        return out

    def get_lancamento(self, user_id: str, lanc_id: str) -> Optional[dict]:
        data = self._read_gastos()
        for l in data.get("lancamentos", []):
            if l.get("id") == lanc_id:
                return {**l, "ultima_alteracao": _ultima_alteracao_ts(l)}
        return None

    def insert_lancamento(
        self,
        user_id: str,
        lanc: dict,
        history_entry: Optional[dict] = None,
        ensure_secao: bool = True,
        ensure_ano: bool = True,
    ) -> dict:
        data = self._read_gastos()
        lanc = dict(lanc)
        lanc.setdefault("id", str(uuid.uuid4()))
        if history_entry is not None:
            lanc.setdefault("historico", []).append(history_entry)
        data["lancamentos"].append(lanc)
        if ensure_ano and isinstance(lanc.get("ano"), int):
            anos = data.setdefault("anos", [])
            if lanc["ano"] not in anos:
                anos.append(lanc["ano"])
        if ensure_secao:
            key = "secoes_receita" if lanc.get("tipo") == "receita" else "secoes_despesa"
            secao = lanc.get("secao")
            if secao:
                lista = data.setdefault(key, [])
                if not any(s.lower() == secao.lower() for s in lista):
                    lista.append(secao)
        self._write_gastos(data)
        return {**lanc, "ultima_alteracao": _ultima_alteracao_ts(lanc)}

    def bulk_insert_lancamentos(self, user_id: str, lancs: List[dict]) -> int:
        if not lancs:
            return 0
        data = self._read_gastos()
        novos_anos = set()
        novas_secoes_d = set()
        novas_secoes_r = set()
        for l in lancs:
            lanc = dict(l)
            lanc.setdefault("id", str(uuid.uuid4()))
            data["lancamentos"].append(lanc)
            if isinstance(lanc.get("ano"), int):
                novos_anos.add(lanc["ano"])
            secao = lanc.get("secao")
            if secao:
                if lanc.get("tipo") == "receita":
                    novas_secoes_r.add(secao)
                else:
                    novas_secoes_d.add(secao)
        anos = data.setdefault("anos", [])
        for a in novos_anos:
            if a not in anos:
                anos.append(a)
        for key, novos in (("secoes_despesa", novas_secoes_d), ("secoes_receita", novas_secoes_r)):
            lista = data.setdefault(key, [])
            for nome in novos:
                if not any(s.lower() == nome.lower() for s in lista):
                    lista.append(nome)
        self._write_gastos(data)
        return len(lancs)

    def update_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
        ensure_secao_for: Optional[str] = None,
    ) -> Optional[dict]:
        data = self._read_gastos()
        lanc = next((l for l in data.get("lancamentos", []) if l.get("id") == lanc_id), None)
        if lanc is None:
            return None
        lanc.update(fields)
        if history_entry is not None:
            lanc.setdefault("historico", []).append(history_entry)
        if ensure_secao_for in ("receita", "despesa") and "secao" in fields:
            key = "secoes_receita" if ensure_secao_for == "receita" else "secoes_despesa"
            nova = fields["secao"]
            if nova:
                lista = data.setdefault(key, [])
                if not any(s.lower() == nova.lower() for s in lista):
                    lista.append(nova)
        self._write_gastos(data)
        return {**lanc, "ultima_alteracao": _ultima_alteracao_ts(lanc)}

    def soft_delete_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
        excluido_em: str,
    ) -> Optional[dict]:
        data = self._read_gastos()
        lanc = next((l for l in data.get("lancamentos", []) if l.get("id") == lanc_id), None)
        if lanc is None:
            return None
        lanc.setdefault("historico", []).append(history_entry)
        lanc["excluido_em"] = excluido_em
        data["lancamentos"] = [l for l in data["lancamentos"] if l.get("id") != lanc_id]
        data.setdefault("lixeira", []).append(lanc)
        self._write_gastos(data)
        return lanc

    def soft_delete_lancamentos_bulk(
        self,
        user_id: str,
        entries: List[Tuple[str, dict]],
        excluido_em: str,
    ) -> int:
        if not entries:
            return 0
        data = self._read_gastos()
        entry_by_id = {lid: he for lid, he in entries}
        target = [l for l in data.get("lancamentos", []) if l.get("id") in entry_by_id]
        for l in target:
            l.setdefault("historico", []).append(entry_by_id[l["id"]])
            l["excluido_em"] = excluido_em
        if not target:
            return 0
        ids = {l["id"] for l in target}
        data["lancamentos"] = [l for l in data["lancamentos"] if l["id"] not in ids]
        data.setdefault("lixeira", []).extend(target)
        self._write_gastos(data)
        return len(target)

    # ----- lixeira --------------------------------------------------------
    def list_lixeira(self, user_id: str) -> List[dict]:
        data = self._read_gastos()
        lixeira = sorted(
            data.get("lixeira", []),
            key=lambda l: l.get("excluido_em", ""),
            reverse=True,
        )
        return [dict(l) for l in lixeira]

    def restore_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
    ) -> Optional[dict]:
        data = self._read_gastos()
        lanc = next((l for l in data.get("lixeira", []) if l.get("id") == lanc_id), None)
        if lanc is None:
            return None
        lanc.pop("excluido_em", None)
        lanc.setdefault("historico", []).append(history_entry)
        data["lixeira"] = [l for l in data["lixeira"] if l.get("id") != lanc_id]
        data["lancamentos"].append(lanc)
        ano = lanc.get("ano")
        if isinstance(ano, int) and ano not in data.setdefault("anos", []):
            data["anos"].append(ano)
        self._write_gastos(data)
        return lanc

    def delete_permanente(self, user_id: str, lanc_id: str) -> bool:
        data = self._read_gastos()
        before = len(data.get("lixeira", []))
        data["lixeira"] = [l for l in data.get("lixeira", []) if l.get("id") != lanc_id]
        if len(data["lixeira"]) == before:
            return False
        self._write_gastos(data)
        return True

    def empty_lixeira(self, user_id: str) -> int:
        data = self._read_gastos()
        n = len(data.get("lixeira", []))
        if n == 0:
            return 0
        data["lixeira"] = []
        self._write_gastos(data)
        return n

    # ----- historico ------------------------------------------------------
    def get_lancamento_historico(self, user_id: str, lanc_id: str) -> List[dict]:
        data = self._read_gastos()
        for pool in ("lancamentos", "lixeira"):
            for l in data.get(pool, []):
                if l.get("id") == lanc_id:
                    return list(l.get("historico") or [])
        return []

    # ----- assinaturas ----------------------------------------------------
    def list_assinaturas(self, user_id: str) -> List[dict]:
        data = self._read_assinaturas()
        out = []
        for a in data.get("assinaturas", []):
            out.append({**a, "ultima_alteracao": _ultima_alteracao_ts(a)})
        return out

    def list_cartoes(self, user_id: str) -> List[str]:
        data = self._read_assinaturas()
        # uniao do campo explicito + derivacao
        cartoes = set(data.get("cartoes") or [])
        for a in data.get("assinaturas", []):
            c = (a.get("cartao") or "").strip()
            if c:
                cartoes.add(c)
        return sorted(cartoes, key=str.lower)

    def get_assinatura(self, user_id: str, item_id: str) -> Optional[dict]:
        data = self._read_assinaturas()
        a = next((x for x in data.get("assinaturas", []) if x.get("id") == item_id), None)
        if a is None:
            return None
        return {**a, "ultima_alteracao": _ultima_alteracao_ts(a)}

    def insert_assinatura(
        self,
        user_id: str,
        item: dict,
        history_entry: Optional[dict] = None,
    ) -> dict:
        data = self._read_assinaturas()
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        if history_entry is not None:
            item.setdefault("historico", []).append(history_entry)
        data.setdefault("assinaturas", []).append(item)
        cartao = (item.get("cartao") or "").strip()
        if cartao:
            cartoes = data.setdefault("cartoes", [])
            if not any(c.lower() == cartao.lower() for c in cartoes):
                cartoes.append(cartao)
                cartoes.sort(key=str.lower)
        self._write_assinaturas(data)
        return {**item, "ultima_alteracao": _ultima_alteracao_ts(item)}

    def update_assinatura(
        self,
        user_id: str,
        item_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
    ) -> Optional[dict]:
        data = self._read_assinaturas()
        item = next((x for x in data.get("assinaturas", []) if x.get("id") == item_id), None)
        if item is None:
            return None
        item.update(fields)
        if history_entry is not None:
            item.setdefault("historico", []).append(history_entry)
        cartao = (fields.get("cartao") or "").strip() if "cartao" in fields else ""
        if cartao:
            cartoes = data.setdefault("cartoes", [])
            if not any(c.lower() == cartao.lower() for c in cartoes):
                cartoes.append(cartao)
                cartoes.sort(key=str.lower)
        self._write_assinaturas(data)
        return {**item, "ultima_alteracao": _ultima_alteracao_ts(item)}

    def delete_assinatura(self, user_id: str, item_id: str) -> bool:
        data = self._read_assinaturas()
        before = len(data.get("assinaturas", []))
        data["assinaturas"] = [a for a in data.get("assinaturas", []) if a.get("id") != item_id]
        if len(data["assinaturas"]) == before:
            return False
        self._write_assinaturas(data)
        return True

    def get_assinatura_historico(self, user_id: str, item_id: str) -> List[dict]:
        data = self._read_assinaturas()
        for a in data.get("assinaturas", []):
            if a.get("id") == item_id:
                return list(a.get("historico") or [])
        return []

    # ----- metas ----------------------------------------------------------
    def list_metas(self, user_id: str) -> List[dict]:
        data = self._read_gastos()
        metas = data.get("metas") or []
        return [
            {
                "tipo": m.get("tipo"),
                "secao": m.get("secao"),
                "valor": float(m.get("valor") or 0),
            }
            for m in metas
            if m.get("tipo") in ("receita", "despesa") and m.get("secao")
        ]

    def set_meta(
        self,
        user_id: str,
        tipo: str,
        secao: str,
        valor: Optional[float],
    ) -> List[dict]:
        data = self._read_gastos()
        metas = data.setdefault("metas", [])
        metas[:] = [
            m for m in metas
            if not (m.get("tipo") == tipo and (m.get("secao") or "").lower() == secao.lower())
        ]
        if valor is not None and float(valor) > 0:
            metas.append({
                "tipo": tipo,
                "secao": secao,
                "valor": round(float(valor), 2),
            })
        self._write_gastos(data)
        return self.list_metas(user_id)

    # ----- recorrentes ----------------------------------------------------
    def list_recorrentes(self, user_id: str) -> List[dict]:
        data = self._read_gastos()
        recs = data.get("recorrentes") or []
        return [dict(r) for r in recs]

    def get_recorrente(self, user_id: str, rec_id: str) -> Optional[dict]:
        for r in self.list_recorrentes(user_id):
            if r.get("id") == rec_id:
                return r
        return None

    def upsert_recorrente(self, user_id: str, item: dict) -> dict:
        data = self._read_gastos()
        recs = data.setdefault("recorrentes", [])
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        for i, r in enumerate(recs):
            if r.get("id") == item["id"]:
                merged = {**r, **item}
                recs[i] = merged
                self._write_gastos(data)
                return merged
        recs.append(item)
        self._write_gastos(data)
        return item

    def delete_recorrente(self, user_id: str, rec_id: str) -> bool:
        data = self._read_gastos()
        recs = data.setdefault("recorrentes", [])
        n_antes = len(recs)
        recs[:] = [r for r in recs if r.get("id") != rec_id]
        if len(recs) == n_antes:
            return False
        self._write_gastos(data)
        return True

    # ----- features -------------------------------------------------------
    def list_features(self) -> List[dict]:
        data = _safe_read_json(self.features_file)
        if data is None:
            data = {"features": []}
            _safe_write_json(self.features_file, data)
        return list(data.get("features", []))


# ----------------------------------------------------------------------------
# Supabase
# ----------------------------------------------------------------------------


_LANC_COLS = (
    "id,user_id,ano,mes,tipo,descricao,secao,valor,observacao,tags,"
    "pago,investido,criado_em,excluido_em,ultima_alteracao"
)


def _row_to_lanc(row: dict) -> dict:
    return {
        "id": row["id"],
        "user_id": row.get("user_id"),
        "ano": row["ano"],
        "mes": row["mes"],
        "tipo": row["tipo"],
        "descricao": row.get("descricao") or "",
        "secao": row.get("secao") or "Geral",
        "valor": float(row.get("valor") or 0),
        "observacao": row.get("observacao") or "",
        "tags": list(row.get("tags") or []),
        "pago": bool(row.get("pago", False)),
        "investido": bool(row.get("investido", False)),
        "criado_em": row.get("criado_em"),
        "excluido_em": row.get("excluido_em"),
        # coluna mantida em sync por trigger — sem necessidade de JOIN com historico
        "ultima_alteracao": row.get("ultima_alteracao") or row.get("criado_em"),
    }


def _row_to_assin(row: dict) -> dict:
    return {
        "id": row["id"],
        "user_id": row.get("user_id"),
        "descricao": row.get("descricao") or "",
        "data_inicio": row.get("data_inicio"),
        "data_fim": row.get("data_fim"),
        "valor_mensal": float(row.get("valor_mensal") or 0),
        "cartao": row.get("cartao") or "",
        "criado_em": row.get("criado_em"),
        "ultima_alteracao": row.get("ultima_alteracao") or row.get("criado_em"),
    }


def _hist_row(row: dict) -> dict:
    return {
        "ts": row.get("ts"),
        "acao": row.get("acao"),
        "antes": row.get("antes"),
        "depois": row.get("depois"),
    }


class SupabaseRepository(BaseRepository):
    """Persiste em Postgres via Supabase aplicando RLS por usuario.

    Cada metodo executa o conjunto MINIMO de queries necessario. Estado de
    historico e carregado apenas sob demanda (via ``get_lancamento_historico``
    ou ``get_assinatura_historico``), evitando a transferencia de logs de
    auditoria a cada listagem.
    """

    def __init__(self) -> None:
        from .client import user_client  # tardio: evita custo em testes

        self._user_client = user_client

    def _client(self):
        token = getattr(g, "access_token", None)
        if not token:
            raise RuntimeError("access_token ausente em flask.g; rota precisa de @require_auth")
        return self._user_client(token)

    # ----- secoes ---------------------------------------------------------
    def list_secoes(self, user_id: str) -> Dict[str, List[str]]:
        client = self._client()
        rows = (
            client.table("secoes")
            .select("tipo,nome")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        despesa = [r["nome"] for r in rows if r.get("tipo") == "despesa"]
        receita = [r["nome"] for r in rows if r.get("tipo") == "receita"]
        if not despesa:
            despesa = list(DEFAULT_SECOES)
        if not receita:
            receita = list(DEFAULT_SECOES_RECEITA)
        return {"despesa": despesa, "receita": receita}

    def add_secao(self, user_id: str, tipo: str, nome: str) -> None:
        client = self._client()
        client.table("secoes").upsert(
            {"user_id": user_id, "tipo": tipo, "nome": nome},
            on_conflict="user_id,tipo,nome",
            ignore_duplicates=True,
        ).execute()

    # ----- anos -----------------------------------------------------------
    def list_anos(self, user_id: str) -> List[int]:
        # anos_cadastrados e sempre atualizado por insert_lancamento/bulk_insert —
        # nao precisa derivar a partir da tabela lancamentos (1 query vs 2)
        client = self._client()
        rows = (
            client.table("anos_cadastrados")
            .select("ano")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        return sorted({r["ano"] for r in rows if r.get("ano")}, reverse=True)

    def add_ano(self, user_id: str, ano: int) -> None:
        client = self._client()
        client.table("anos_cadastrados").upsert(
            {"user_id": user_id, "ano": ano},
            on_conflict="user_id,ano",
            ignore_duplicates=True,
        ).execute()

    def has_ano(self, user_id: str, ano: int) -> bool:
        client = self._client()
        cad = (
            client.table("anos_cadastrados")
            .select("ano")
            .eq("user_id", user_id)
            .eq("ano", ano)
            .limit(1)
            .execute()
            .data
            or []
        )
        if cad:
            return True
        lanc = (
            client.table("lancamentos")
            .select("id")
            .eq("user_id", user_id)
            .eq("ano", ano)
            .limit(1)
            .execute()
            .data
            or []
        )
        return bool(lanc)

    def count_lancamentos_ano(self, user_id: str, ano: int) -> int:
        client = self._client()
        resp = (
            client.table("lancamentos")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("ano", ano)
            .execute()
        )
        return int(getattr(resp, "count", 0) or 0)

    def remove_ano(self, user_id: str, ano: int, cascade: bool) -> List[int]:
        client = self._client()
        if cascade:
            client.table("lancamentos").delete().eq("user_id", user_id).eq("ano", ano).execute()
        client.table("anos_cadastrados").delete().eq("user_id", user_id).eq("ano", ano).execute()
        return self.list_anos(user_id)

    # ----- meses revisados -----------------------------------------------
    def list_meses_revisados(self, user_id: str, ano: int) -> List[int]:
        client = self._client()
        rows = (
            client.table("meses_revisados")
            .select("mes")
            .eq("user_id", user_id)
            .eq("ano", ano)
            .execute()
            .data
            or []
        )
        return sorted(int(r["mes"]) for r in rows if isinstance(r.get("mes"), int) and 1 <= r["mes"] <= 12)

    def set_mes_revisado(self, user_id: str, ano: int, mes: int, revisado: bool) -> List[int]:
        client = self._client()
        if revisado:
            client.table("meses_revisados").upsert(
                {"user_id": user_id, "ano": ano, "mes": mes},
                on_conflict="user_id,ano,mes",
                ignore_duplicates=True,
            ).execute()
        else:
            client.table("meses_revisados").delete().eq("user_id", user_id).eq("ano", ano).eq("mes", mes).execute()
        return self.list_meses_revisados(user_id, ano)

    # ----- tags -----------------------------------------------------------
    def list_tags(self, user_id: str) -> List[str]:
        client = self._client()
        rows = (
            client.table("lancamentos")
            .select("tags")
            .eq("user_id", user_id)
            .is_("excluido_em", "null")
            .execute()
            .data
            or []
        )
        seen = set()
        tags: List[str] = []
        for r in rows:
            for tag in (r.get("tags") or []):
                name = (tag or "").strip()
                if not name:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                tags.append(name)
        return sorted(tags, key=str.lower)

    # ----- lancamentos ----------------------------------------------------
    def list_lancamentos(
        self,
        user_id: str,
        ano: int,
        mes: Optional[int] = None,
        tipo: Optional[str] = None,
        with_ultima_alteracao: bool = True,  # mantido por compat; coluna sempre inclusa
    ) -> List[dict]:
        client = self._client()
        q = (
            client.table("lancamentos")
            .select(_LANC_COLS)  # inclui ultima_alteracao (coluna, sem JOIN extra)
            .eq("user_id", user_id)
            .eq("ano", ano)
            .is_("excluido_em", "null")
        )
        if mes is not None:
            q = q.eq("mes", mes)
        if tipo:
            q = q.eq("tipo", tipo)
        rows = q.execute().data or []
        return [_row_to_lanc(r) for r in rows]

    def get_lancamento(self, user_id: str, lanc_id: str) -> Optional[dict]:
        client = self._client()
        rows = (
            client.table("lancamentos")
            .select(_LANC_COLS)
            .eq("user_id", user_id)
            .eq("id", lanc_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            return None
        return _row_to_lanc(rows[0])

    def insert_lancamento(
        self,
        user_id: str,
        lanc: dict,
        history_entry: Optional[dict] = None,
        ensure_secao: bool = True,
        ensure_ano: bool = True,
    ) -> dict:
        client = self._client()
        lanc = dict(lanc)
        lanc.setdefault("id", str(uuid.uuid4()))
        if ensure_ano and isinstance(lanc.get("ano"), int):
            client.table("anos_cadastrados").upsert(
                {"user_id": user_id, "ano": lanc["ano"]},
                on_conflict="user_id,ano",
                ignore_duplicates=True,
            ).execute()
        if ensure_secao and lanc.get("secao") and lanc.get("tipo") in ("receita", "despesa"):
            client.table("secoes").upsert(
                {"user_id": user_id, "tipo": lanc["tipo"], "nome": lanc["secao"]},
                on_conflict="user_id,tipo,nome",
                ignore_duplicates=True,
            ).execute()
        row = {
            "id": lanc["id"],
            "user_id": user_id,
            "ano": int(lanc["ano"]),
            "mes": int(lanc["mes"]),
            "tipo": lanc["tipo"],
            "descricao": lanc.get("descricao") or "",
            "secao": lanc.get("secao") or "Geral",
            "valor": float(lanc.get("valor") or 0),
            "observacao": lanc.get("observacao") or "",
            "tags": list(lanc.get("tags") or []),
            "pago": bool(lanc.get("pago", False)),
            "investido": bool(lanc.get("investido", False)),
            "criado_em": lanc.get("criado_em") or datetime.now().isoformat(timespec="seconds"),
        }
        client.table("lancamentos").insert(row).execute()
        if history_entry is not None:
            client.table("lancamento_historico").insert({
                "lancamento_id": lanc["id"],
                "user_id": user_id,
                "acao": history_entry.get("acao") or "evento",
                "antes": history_entry.get("antes"),
                "depois": history_entry.get("depois"),
                "ts": history_entry.get("ts"),
            }).execute()
        out = _row_to_lanc(row)
        out["historico"] = [history_entry] if history_entry else []
        out["ultima_alteracao"] = (history_entry or {}).get("ts") or row["criado_em"]
        return out

    def bulk_insert_lancamentos(self, user_id: str, lancs: List[dict]) -> int:
        if not lancs:
            return 0
        client = self._client()
        anos = {int(l["ano"]) for l in lancs if isinstance(l.get("ano"), int)}
        secoes: set = set()
        for l in lancs:
            if l.get("tipo") in ("receita", "despesa") and l.get("secao"):
                secoes.add((l["tipo"], l["secao"]))
        if anos:
            client.table("anos_cadastrados").upsert(
                [{"user_id": user_id, "ano": a} for a in anos],
                on_conflict="user_id,ano",
                ignore_duplicates=True,
            ).execute()
        if secoes:
            client.table("secoes").upsert(
                [{"user_id": user_id, "tipo": t, "nome": n} for t, n in secoes],
                on_conflict="user_id,tipo,nome",
                ignore_duplicates=True,
            ).execute()
        rows = []
        for l in lancs:
            rows.append({
                "id": l.get("id") or str(uuid.uuid4()),
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
                "criado_em": l.get("criado_em") or datetime.now().isoformat(timespec="seconds"),
            })
        client.table("lancamentos").insert(rows).execute()
        return len(rows)

    def update_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
        ensure_secao_for: Optional[str] = None,
    ) -> Optional[dict]:
        if not fields and history_entry is None:
            return self.get_lancamento(user_id, lanc_id)
        client = self._client()
        if ensure_secao_for in ("receita", "despesa") and fields.get("secao"):
            client.table("secoes").upsert(
                {"user_id": user_id, "tipo": ensure_secao_for, "nome": fields["secao"]},
                on_conflict="user_id,tipo,nome",
                ignore_duplicates=True,
            ).execute()
        if fields:
            resp = (
                client.table("lancamentos")
                .update(fields)
                .eq("user_id", user_id)
                .eq("id", lanc_id)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None
            lanc = _row_to_lanc(rows[0])
        else:
            lanc = self.get_lancamento(user_id, lanc_id)
            if lanc is None:
                return None
        if history_entry is not None:
            client.table("lancamento_historico").insert({
                "lancamento_id": lanc_id,
                "user_id": user_id,
                "acao": history_entry.get("acao") or "evento",
                "antes": history_entry.get("antes"),
                "depois": history_entry.get("depois"),
                "ts": history_entry.get("ts"),
            }).execute()
            lanc["ultima_alteracao"] = history_entry.get("ts") or lanc.get("criado_em")
        else:
            lanc.setdefault("ultima_alteracao", lanc.get("criado_em"))
        return lanc

    def soft_delete_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
        excluido_em: str,
    ) -> Optional[dict]:
        client = self._client()
        resp = (
            client.table("lancamentos")
            .update({"excluido_em": excluido_em})
            .eq("user_id", user_id)
            .eq("id", lanc_id)
            .is_("excluido_em", "null")
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        client.table("lancamento_historico").insert({
            "lancamento_id": lanc_id,
            "user_id": user_id,
            "acao": history_entry.get("acao") or "excluido",
            "antes": history_entry.get("antes"),
            "depois": history_entry.get("depois"),
            "ts": history_entry.get("ts"),
        }).execute()
        return _row_to_lanc(rows[0])

    def soft_delete_lancamentos_bulk(
        self,
        user_id: str,
        entries: List[Tuple[str, dict]],
        excluido_em: str,
    ) -> int:
        if not entries:
            return 0
        client = self._client()
        ids = [lid for lid, _ in entries]
        resp = (
            client.table("lancamentos")
            .update({"excluido_em": excluido_em})
            .eq("user_id", user_id)
            .in_("id", ids)
            .is_("excluido_em", "null")
            .execute()
        )
        atualizados = resp.data or []
        if not atualizados:
            return 0
        ids_ok = {r["id"] for r in atualizados}
        hist_rows = [
            {
                "lancamento_id": lid,
                "user_id": user_id,
                "acao": he.get("acao") or "excluido",
                "antes": he.get("antes"),
                "depois": he.get("depois"),
                "ts": he.get("ts"),
            }
            for lid, he in entries
            if lid in ids_ok
        ]
        if hist_rows:
            client.table("lancamento_historico").insert(hist_rows).execute()
        return len(atualizados)

    # ----- lixeira --------------------------------------------------------
    def list_lixeira(self, user_id: str) -> List[dict]:
        client = self._client()
        rows = (
            client.table("lancamentos")
            .select(_LANC_COLS)
            .eq("user_id", user_id)
            .not_.is_("excluido_em", "null")
            .order("excluido_em", desc=True)
            .execute()
            .data
            or []
        )
        return [_row_to_lanc(r) for r in rows]

    def restore_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
    ) -> Optional[dict]:
        client = self._client()
        resp = (
            client.table("lancamentos")
            .update({"excluido_em": None})
            .eq("user_id", user_id)
            .eq("id", lanc_id)
            .not_.is_("excluido_em", "null")
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        lanc = _row_to_lanc(rows[0])
        client.table("lancamento_historico").insert({
            "lancamento_id": lanc_id,
            "user_id": user_id,
            "acao": history_entry.get("acao") or "restaurado",
            "antes": history_entry.get("antes"),
            "depois": history_entry.get("depois"),
            "ts": history_entry.get("ts"),
        }).execute()
        if isinstance(lanc.get("ano"), int):
            client.table("anos_cadastrados").upsert(
                {"user_id": user_id, "ano": lanc["ano"]},
                on_conflict="user_id,ano",
                ignore_duplicates=True,
            ).execute()
        return lanc

    def delete_permanente(self, user_id: str, lanc_id: str) -> bool:
        client = self._client()
        resp = (
            client.table("lancamentos")
            .delete()
            .eq("user_id", user_id)
            .eq("id", lanc_id)
            .not_.is_("excluido_em", "null")
            .execute()
        )
        return bool(resp.data)

    def empty_lixeira(self, user_id: str) -> int:
        client = self._client()
        resp = (
            client.table("lancamentos")
            .delete()
            .eq("user_id", user_id)
            .not_.is_("excluido_em", "null")
            .execute()
        )
        return len(resp.data or [])

    # ----- historico ------------------------------------------------------
    def get_lancamento_historico(self, user_id: str, lanc_id: str) -> List[dict]:
        client = self._client()
        rows = (
            client.table("lancamento_historico")
            .select("ts,acao,antes,depois")
            .eq("user_id", user_id)
            .eq("lancamento_id", lanc_id)
            .order("ts", desc=False)
            .execute()
            .data
            or []
        )
        return [_hist_row(r) for r in rows]

    # ----- assinaturas ----------------------------------------------------
    _ASSIN_COLS = (
        "id,user_id,descricao,data_inicio,data_fim,valor_mensal,cartao,criado_em,ultima_alteracao"
    )

    def list_assinaturas(self, user_id: str) -> List[dict]:
        client = self._client()
        rows = (
            client.table("assinaturas")
            .select(self._ASSIN_COLS)
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        return [_row_to_assin(r) for r in rows]

    def list_cartoes(self, user_id: str) -> List[str]:
        client = self._client()
        rows = (
            client.table("assinaturas")
            .select("cartao")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        cartoes = {(r.get("cartao") or "").strip() for r in rows if r.get("cartao")}
        return sorted(c for c in cartoes if c)

    def get_assinatura(self, user_id: str, item_id: str) -> Optional[dict]:
        client = self._client()
        rows = (
            client.table("assinaturas")
            .select(self._ASSIN_COLS)
            .eq("user_id", user_id)
            .eq("id", item_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            return None
        return _row_to_assin(rows[0])

    def insert_assinatura(
        self,
        user_id: str,
        item: dict,
        history_entry: Optional[dict] = None,
    ) -> dict:
        client = self._client()
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        row = {
            "id": item["id"],
            "user_id": user_id,
            "descricao": item.get("descricao") or "",
            "data_inicio": item.get("data_inicio"),
            "data_fim": item.get("data_fim"),
            "valor_mensal": float(item.get("valor_mensal") or 0),
            "cartao": item.get("cartao") or "",
            "criado_em": item.get("criado_em") or datetime.now().isoformat(timespec="seconds"),
        }
        client.table("assinaturas").insert(row).execute()
        if history_entry is not None:
            client.table("assinatura_historico").insert({
                "assinatura_id": item["id"],
                "user_id": user_id,
                "acao": history_entry.get("acao") or "evento",
                "antes": history_entry.get("antes"),
                "depois": history_entry.get("depois"),
                "ts": history_entry.get("ts"),
            }).execute()
        out = _row_to_assin(row)
        out["historico"] = [history_entry] if history_entry else []
        out["ultima_alteracao"] = (history_entry or {}).get("ts") or row["criado_em"]
        return out

    def update_assinatura(
        self,
        user_id: str,
        item_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
    ) -> Optional[dict]:
        if not fields and history_entry is None:
            return self.get_assinatura(user_id, item_id)
        client = self._client()
        if fields:
            resp = (
                client.table("assinaturas")
                .update(fields)
                .eq("user_id", user_id)
                .eq("id", item_id)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                return None
            item = _row_to_assin(rows[0])
        else:
            item = self.get_assinatura(user_id, item_id)
            if item is None:
                return None
        if history_entry is not None:
            client.table("assinatura_historico").insert({
                "assinatura_id": item_id,
                "user_id": user_id,
                "acao": history_entry.get("acao") or "editado",
                "antes": history_entry.get("antes"),
                "depois": history_entry.get("depois"),
                "ts": history_entry.get("ts"),
            }).execute()
            item["ultima_alteracao"] = history_entry.get("ts") or item.get("criado_em")
        else:
            item.setdefault("ultima_alteracao", item.get("criado_em"))
        return item

    def delete_assinatura(self, user_id: str, item_id: str) -> bool:
        client = self._client()
        resp = (
            client.table("assinaturas")
            .delete()
            .eq("user_id", user_id)
            .eq("id", item_id)
            .execute()
        )
        return bool(resp.data)

    def get_assinatura_historico(self, user_id: str, item_id: str) -> List[dict]:
        client = self._client()
        rows = (
            client.table("assinatura_historico")
            .select("ts,acao,antes,depois")
            .eq("user_id", user_id)
            .eq("assinatura_id", item_id)
            .order("ts", desc=False)
            .execute()
            .data
            or []
        )
        return [_hist_row(r) for r in rows]

    # ----- resumo (RPC) ---------------------------------------------------
    def resumo_mes(self, user_id: str, ano: int, mes: int) -> Dict[str, Any]:
        """Uma unica chamada RPC ao Postgres (vs 2-3 queries separadas).

        O Postgres agrega lancamentos + secoes e devolve JSON pronto,
        eliminando round-trips extras para lancamento_historico e secoes.
        """
        client = self._client()
        resp = client.rpc("fn_resumo_mes", {"p_ano": ano, "p_mes": mes}).execute()
        raw = resp.data
        # PostgREST pode encapsular scalar return em lista
        if isinstance(raw, list):
            raw = raw[0] if raw else {}
        if not isinstance(raw, dict):
            raw = {}
        lancs = [_row_to_lanc(r) for r in (raw.get("lancamentos") or [])]
        secoes = raw.get("secoes") or {}
        if not secoes.get("despesa"):
            secoes["despesa"] = list(DEFAULT_SECOES)
        if not secoes.get("receita"):
            secoes["receita"] = list(DEFAULT_SECOES_RECEITA)
        return {"lancamentos": lancs, "secoes": secoes}

    # ----- metas ----------------------------------------------------------
    def list_metas(self, user_id: str) -> List[dict]:
        try:
            rows = (
                self._client()
                .table("metas")
                .select("tipo,secao,valor")
                .eq("user_id", user_id)
                .order("tipo")
                .order("secao")
                .execute()
                .data
                or []
            )
        except Exception:
            return []
        return [
            {"tipo": r["tipo"], "secao": r["secao"], "valor": float(r["valor"])}
            for r in rows
            if r.get("tipo") in ("receita", "despesa") and r.get("secao")
        ]

    def set_meta(
        self,
        user_id: str,
        tipo: str,
        secao: str,
        valor: Optional[float],
    ) -> List[dict]:
        client = self._client()
        try:
            if valor is None or float(valor) <= 0:
                client.table("metas").delete().eq("user_id", user_id).eq("tipo", tipo).eq("secao", secao).execute()
            else:
                client.table("metas").upsert(
                    {
                        "user_id": user_id,
                        "tipo": tipo,
                        "secao": secao,
                        "valor": round(float(valor), 2),
                    },
                    on_conflict="user_id,tipo,secao",
                ).execute()
        except Exception:
            return []
        return self.list_metas(user_id)

    # ----- recorrentes ----------------------------------------------------
    def list_recorrentes(self, user_id: str) -> List[dict]:
        try:
            rows = (
                self._client()
                .table("recorrentes")
                .select("*")
                .eq("user_id", user_id)
                .order("tipo")
                .order("descricao")
                .execute()
                .data
                or []
            )
        except Exception:
            return []
        return [
            {
                "id": r["id"],
                "tipo": r.get("tipo"),
                "descricao": r.get("descricao"),
                "secao": r.get("secao") or "Geral",
                "valor": float(r.get("valor") or 0),
                "observacao": r.get("observacao") or "",
                "tags": r.get("tags") or [],
                "ativo": bool(r.get("ativo", True)),
                "criado_em": r.get("criado_em"),
            }
            for r in rows
        ]

    def get_recorrente(self, user_id: str, rec_id: str) -> Optional[dict]:
        for r in self.list_recorrentes(user_id):
            if r.get("id") == rec_id:
                return r
        return None

    def upsert_recorrente(self, user_id: str, item: dict) -> dict:
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        payload = {
            "id": item["id"],
            "user_id": user_id,
            "tipo": item.get("tipo"),
            "descricao": item.get("descricao"),
            "secao": item.get("secao") or "Geral",
            "valor": round(float(item.get("valor") or 0), 2),
            "observacao": item.get("observacao") or "",
            "tags": item.get("tags") or [],
            "ativo": bool(item.get("ativo", True)),
        }
        try:
            self._client().table("recorrentes").upsert(payload).execute()
        except Exception:
            return payload
        return self.get_recorrente(user_id, item["id"]) or payload

    def delete_recorrente(self, user_id: str, rec_id: str) -> bool:
        try:
            self._client().table("recorrentes").delete().eq("user_id", user_id).eq("id", rec_id).execute()
            return True
        except Exception:
            return False

    # ----- features -------------------------------------------------------
    def list_features(self) -> List[dict]:
        client = self._client()
        rows = (
            client.table("features")
            .select("id,titulo,descricao,implementado_em")
            .order("implementado_em", desc=True)
            .execute()
            .data
            or []
        )
        return [
            {
                "id": r["id"],
                "titulo": r["titulo"],
                "descricao": r.get("descricao"),
                "implementado_em": r["implementado_em"],
            }
            for r in rows
        ]


# ----------------------------------------------------------------------------
# MySQL 5.6
# ----------------------------------------------------------------------------


def _mysql_ts(val) -> Optional[str]:
    """Converte datetime/date do PyMySQL para string ISO 8601."""
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


def _mysql_row_to_lanc(row: dict) -> dict:
    tags_raw = row.get("tags") or "[]"
    if isinstance(tags_raw, str):
        try:
            tags = json.loads(tags_raw)
        except Exception:
            tags = []
    else:
        tags = list(tags_raw or [])
    return {
        "id": row["id"],
        "user_id": row.get("user_id"),
        "ano": row["ano"],
        "mes": row["mes"],
        "tipo": row["tipo"],
        "descricao": row.get("descricao") or "",
        "secao": row.get("secao") or "Geral",
        "valor": float(row.get("valor") or 0),
        "observacao": row.get("observacao") or "",
        "tags": tags,
        "pago": bool(row.get("pago", 0)),
        "investido": bool(row.get("investido", 0)),
        "criado_em": _mysql_ts(row.get("criado_em")),
        "excluido_em": _mysql_ts(row.get("excluido_em")),
        "ultima_alteracao": (
            _mysql_ts(row.get("ultima_alteracao"))
            or _mysql_ts(row.get("criado_em"))
        ),
    }


def _mysql_row_to_assin(row: dict) -> dict:
    di = row.get("data_inicio")
    df = row.get("data_fim")
    return {
        "id": row["id"],
        "user_id": row.get("user_id"),
        "descricao": row.get("descricao") or "",
        "data_inicio": str(di) if di else None,
        "data_fim": str(df) if df else None,
        "valor_mensal": float(row.get("valor_mensal") or 0),
        "cartao": row.get("cartao") or "",
        "criado_em": _mysql_ts(row.get("criado_em")),
        "ultima_alteracao": (
            _mysql_ts(row.get("ultima_alteracao"))
            or _mysql_ts(row.get("criado_em"))
        ),
    }


def _mysql_json(val) -> Optional[str]:
    """Serializa dict/list para JSON string; None retorna None."""
    if val is None:
        return None
    return json.dumps(val, ensure_ascii=False)


def _mysql_parse_hist(row: dict) -> dict:
    antes = row.get("antes")
    depois = row.get("depois")
    if isinstance(antes, str):
        try:
            antes = json.loads(antes)
        except Exception:
            pass
    if isinstance(depois, str):
        try:
            depois = json.loads(depois)
        except Exception:
            pass
    return {
        "ts": _mysql_ts(row.get("ts")),
        "acao": row.get("acao"),
        "antes": antes,
        "depois": depois,
    }


_MYSQL_LANC_SELECT = (
    "SELECT id, user_id, ano, mes, tipo, descricao, secao, valor, "
    "observacao, tags, pago, investido, criado_em, excluido_em, ultima_alteracao "
    "FROM lancamentos"
)

_MYSQL_ASSIN_SELECT = (
    "SELECT id, user_id, descricao, data_inicio, data_fim, valor_mensal, "
    "cartao, criado_em, ultima_alteracao FROM assinaturas"
)


class MySQLRepository(BaseRepository):
    """Repositorio MySQL 5.6 via PyMySQL.

    Sem RLS — todo filtro inclui ``user_id`` explicitamente.
    Tags armazenadas como JSON string em coluna TEXT.
    Campos booleanos como TINYINT(1).
    """

    def _db(self):
        from .mysql_client import get_db
        return get_db()

    def _exec(self, sql: str, args=()) -> int:
        """Executa statement DML e retorna rowcount."""
        db = self._db()
        with db.cursor() as cur:
            cur.execute(sql, args)
            return cur.rowcount

    def _query(self, sql: str, args=()) -> List[dict]:
        """Executa SELECT e retorna lista de dicts."""
        db = self._db()
        with db.cursor() as cur:
            cur.execute(sql, args)
            return list(cur.fetchall() or [])

    def _query_one(self, sql: str, args=()) -> Optional[dict]:
        db = self._db()
        with db.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchone()

    # ----- secoes ---------------------------------------------------------
    def list_secoes(self, user_id: str) -> Dict[str, List[str]]:
        rows = self._query(
            "SELECT tipo, nome FROM secoes WHERE user_id = %s ORDER BY nome",
            (user_id,),
        )
        despesa = [r["nome"] for r in rows if r.get("tipo") == "despesa"]
        receita = [r["nome"] for r in rows if r.get("tipo") == "receita"]
        if not despesa:
            despesa = list(DEFAULT_SECOES)
        if not receita:
            receita = list(DEFAULT_SECOES_RECEITA)
        return {"despesa": despesa, "receita": receita}

    def add_secao(self, user_id: str, tipo: str, nome: str) -> None:
        self._exec(
            "INSERT IGNORE INTO secoes (user_id, tipo, nome) VALUES (%s, %s, %s)",
            (user_id, tipo, nome),
        )

    # ----- anos -----------------------------------------------------------
    def list_anos(self, user_id: str) -> List[int]:
        rows = self._query(
            "SELECT ano FROM anos_cadastrados WHERE user_id = %s ORDER BY ano DESC",
            (user_id,),
        )
        return [r["ano"] for r in rows]

    def add_ano(self, user_id: str, ano: int) -> None:
        self._exec(
            "INSERT IGNORE INTO anos_cadastrados (user_id, ano) VALUES (%s, %s)",
            (user_id, ano),
        )

    def has_ano(self, user_id: str, ano: int) -> bool:
        row = self._query_one(
            "SELECT 1 FROM anos_cadastrados WHERE user_id = %s AND ano = %s LIMIT 1",
            (user_id, ano),
        )
        if row:
            return True
        row = self._query_one(
            "SELECT 1 FROM lancamentos WHERE user_id = %s AND ano = %s LIMIT 1",
            (user_id, ano),
        )
        return bool(row)

    def count_lancamentos_ano(self, user_id: str, ano: int) -> int:
        row = self._query_one(
            "SELECT COUNT(*) AS cnt FROM lancamentos WHERE user_id = %s AND ano = %s",
            (user_id, ano),
        )
        return int((row or {}).get("cnt", 0))

    def remove_ano(self, user_id: str, ano: int, cascade: bool) -> List[int]:
        if cascade:
            self._exec(
                "DELETE FROM lancamentos WHERE user_id = %s AND ano = %s",
                (user_id, ano),
            )
        self._exec(
            "DELETE FROM anos_cadastrados WHERE user_id = %s AND ano = %s",
            (user_id, ano),
        )
        return self.list_anos(user_id)

    # ----- meses revisados -----------------------------------------------
    def list_meses_revisados(self, user_id: str, ano: int) -> List[int]:
        rows = self._query(
            "SELECT mes FROM meses_revisados WHERE user_id = %s AND ano = %s ORDER BY mes",
            (user_id, ano),
        )
        return [r["mes"] for r in rows if 1 <= r["mes"] <= 12]

    def set_mes_revisado(self, user_id: str, ano: int, mes: int, revisado: bool) -> List[int]:
        if revisado:
            self._exec(
                "INSERT IGNORE INTO meses_revisados (user_id, ano, mes) VALUES (%s, %s, %s)",
                (user_id, ano, mes),
            )
        else:
            self._exec(
                "DELETE FROM meses_revisados WHERE user_id = %s AND ano = %s AND mes = %s",
                (user_id, ano, mes),
            )
        return self.list_meses_revisados(user_id, ano)

    # ----- tags -----------------------------------------------------------
    def list_tags(self, user_id: str) -> List[str]:
        rows = self._query(
            "SELECT tags FROM lancamentos WHERE user_id = %s AND excluido_em IS NULL",
            (user_id,),
        )
        seen: set = set()
        tags: List[str] = []
        for r in rows:
            raw = r.get("tags") or "[]"
            try:
                row_tags = json.loads(raw) if isinstance(raw, str) else list(raw)
            except Exception:
                row_tags = []
            for tag in row_tags:
                name = (tag or "").strip()
                if not name:
                    continue
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)
                tags.append(name)
        return sorted(tags, key=str.lower)

    # ----- lancamentos ----------------------------------------------------
    def list_lancamentos(
        self,
        user_id: str,
        ano: int,
        mes: Optional[int] = None,
        tipo: Optional[str] = None,
        with_ultima_alteracao: bool = True,
    ) -> List[dict]:
        sql = (
            f"{_MYSQL_LANC_SELECT} "
            "WHERE user_id = %s AND ano = %s AND excluido_em IS NULL"
        )
        args: list = [user_id, ano]
        if mes is not None:
            sql += " AND mes = %s"
            args.append(mes)
        if tipo:
            sql += " AND tipo = %s"
            args.append(tipo)
        return [_mysql_row_to_lanc(r) for r in self._query(sql, args)]

    def get_lancamento(self, user_id: str, lanc_id: str) -> Optional[dict]:
        row = self._query_one(
            f"{_MYSQL_LANC_SELECT} WHERE user_id = %s AND id = %s LIMIT 1",
            (user_id, lanc_id),
        )
        return _mysql_row_to_lanc(row) if row else None

    def insert_lancamento(
        self,
        user_id: str,
        lanc: dict,
        history_entry: Optional[dict] = None,
        ensure_secao: bool = True,
        ensure_ano: bool = True,
    ) -> dict:
        lanc = dict(lanc)
        lanc.setdefault("id", str(uuid.uuid4()))
        if ensure_ano and isinstance(lanc.get("ano"), int):
            self._exec(
                "INSERT IGNORE INTO anos_cadastrados (user_id, ano) VALUES (%s, %s)",
                (user_id, lanc["ano"]),
            )
        if ensure_secao and lanc.get("secao") and lanc.get("tipo") in ("receita", "despesa"):
            self._exec(
                "INSERT IGNORE INTO secoes (user_id, tipo, nome) VALUES (%s, %s, %s)",
                (user_id, lanc["tipo"], lanc["secao"]),
            )
        criado_em = lanc.get("criado_em") or datetime.now().isoformat(timespec="seconds")
        tags_json = json.dumps(list(lanc.get("tags") or []), ensure_ascii=False)
        self._exec(
            "INSERT INTO lancamentos "
            "(id, user_id, ano, mes, tipo, descricao, secao, valor, observacao, tags, "
            "pago, investido, criado_em, ultima_alteracao) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                lanc["id"], user_id,
                int(lanc["ano"]), int(lanc["mes"]),
                lanc["tipo"],
                lanc.get("descricao") or "",
                lanc.get("secao") or "Geral",
                float(lanc.get("valor") or 0),
                lanc.get("observacao") or "",
                tags_json,
                int(bool(lanc.get("pago", False))),
                int(bool(lanc.get("investido", False))),
                criado_em,
                criado_em,
            ),
        )
        if history_entry is not None:
            ts = history_entry.get("ts") or criado_em
            self._exec(
                "INSERT INTO lancamento_historico "
                "(lancamento_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    lanc["id"], user_id,
                    history_entry.get("acao") or "criado",
                    _mysql_json(history_entry.get("antes")),
                    _mysql_json(history_entry.get("depois")),
                    ts,
                ),
            )
        return _mysql_row_to_lanc({
            "id": lanc["id"], "user_id": user_id,
            "ano": lanc["ano"], "mes": lanc["mes"], "tipo": lanc["tipo"],
            "descricao": lanc.get("descricao") or "",
            "secao": lanc.get("secao") or "Geral",
            "valor": lanc.get("valor") or 0,
            "observacao": lanc.get("observacao") or "",
            "tags": tags_json,
            "pago": int(bool(lanc.get("pago", False))),
            "investido": int(bool(lanc.get("investido", False))),
            "criado_em": criado_em,
            "excluido_em": None,
            "ultima_alteracao": (history_entry or {}).get("ts") or criado_em,
        })

    def bulk_insert_lancamentos(self, user_id: str, lancs: List[dict]) -> int:
        if not lancs:
            return 0
        anos = {int(l["ano"]) for l in lancs if isinstance(l.get("ano"), int)}
        secoes: set = set()
        for l in lancs:
            if l.get("tipo") in ("receita", "despesa") and l.get("secao"):
                secoes.add((l["tipo"], l["secao"]))
        for ano in anos:
            self._exec(
                "INSERT IGNORE INTO anos_cadastrados (user_id, ano) VALUES (%s, %s)",
                (user_id, ano),
            )
        for tipo, nome in secoes:
            self._exec(
                "INSERT IGNORE INTO secoes (user_id, tipo, nome) VALUES (%s, %s, %s)",
                (user_id, tipo, nome),
            )
        agora = datetime.now().isoformat(timespec="seconds")
        db = self._db()
        with db.cursor() as cur:
            for l in lancs:
                criado_em = l.get("criado_em") or agora
                tags_json = json.dumps(list(l.get("tags") or []), ensure_ascii=False)
                cur.execute(
                    "INSERT INTO lancamentos "
                    "(id, user_id, ano, mes, tipo, descricao, secao, valor, observacao, tags, "
                    "pago, investido, criado_em, ultima_alteracao) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        l.get("id") or str(uuid.uuid4()), user_id,
                        int(l["ano"]), int(l["mes"]), l["tipo"],
                        l.get("descricao") or "",
                        l.get("secao") or "Geral",
                        float(l.get("valor") or 0),
                        l.get("observacao") or "",
                        tags_json,
                        int(bool(l.get("pago", False))),
                        int(bool(l.get("investido", False))),
                        criado_em, criado_em,
                    ),
                )
        return len(lancs)

    def update_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
        ensure_secao_for: Optional[str] = None,
    ) -> Optional[dict]:
        if not fields and history_entry is None:
            return self.get_lancamento(user_id, lanc_id)
        if ensure_secao_for in ("receita", "despesa") and fields.get("secao"):
            self._exec(
                "INSERT IGNORE INTO secoes (user_id, tipo, nome) VALUES (%s, %s, %s)",
                (user_id, ensure_secao_for, fields["secao"]),
            )
        if fields:
            mysql_fields = {}
            for k, v in fields.items():
                if k == "tags":
                    mysql_fields["tags"] = json.dumps(list(v or []), ensure_ascii=False)
                elif k in ("pago", "investido"):
                    mysql_fields[k] = int(bool(v))
                else:
                    mysql_fields[k] = v
            set_clause = ", ".join(f"`{k}` = %s" for k in mysql_fields)
            vals = list(mysql_fields.values()) + [user_id, lanc_id]
            n = self._exec(
                f"UPDATE lancamentos SET {set_clause} WHERE user_id = %s AND id = %s",
                vals,
            )
            if n == 0:
                return None

        lanc = self.get_lancamento(user_id, lanc_id)
        if lanc is None:
            return None

        if history_entry is not None:
            ts = history_entry.get("ts") or datetime.now().isoformat(timespec="seconds")
            self._exec(
                "INSERT INTO lancamento_historico "
                "(lancamento_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    lanc_id, user_id,
                    history_entry.get("acao") or "editado",
                    _mysql_json(history_entry.get("antes")),
                    _mysql_json(history_entry.get("depois")),
                    ts,
                ),
            )
            self._exec(
                "UPDATE lancamentos SET ultima_alteracao = %s WHERE user_id = %s AND id = %s",
                (ts, user_id, lanc_id),
            )
            lanc["ultima_alteracao"] = ts

        return lanc

    def soft_delete_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
        excluido_em: str,
    ) -> Optional[dict]:
        n = self._exec(
            "UPDATE lancamentos SET excluido_em = %s "
            "WHERE user_id = %s AND id = %s AND excluido_em IS NULL",
            (excluido_em, user_id, lanc_id),
        )
        if n == 0:
            return None
        # Busca o item ja com excluido_em preenchido (sem filtro IS NULL)
        row = self._query_one(
            f"{_MYSQL_LANC_SELECT} WHERE user_id = %s AND id = %s LIMIT 1",
            (user_id, lanc_id),
        )
        self._exec(
            "INSERT INTO lancamento_historico "
            "(lancamento_id, user_id, acao, antes, depois, ts) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                lanc_id, user_id,
                history_entry.get("acao") or "excluido",
                _mysql_json(history_entry.get("antes")),
                _mysql_json(history_entry.get("depois")),
                history_entry.get("ts") or excluido_em,
            ),
        )
        return _mysql_row_to_lanc(row) if row else None

    def soft_delete_lancamentos_bulk(
        self,
        user_id: str,
        entries: List[Tuple[str, dict]],
        excluido_em: str,
    ) -> int:
        if not entries:
            return 0
        ids = [lid for lid, _ in entries]
        placeholders = ", ".join(["%s"] * len(ids))
        n = self._exec(
            f"UPDATE lancamentos SET excluido_em = %s "
            f"WHERE user_id = %s AND id IN ({placeholders}) AND excluido_em IS NULL",
            [excluido_em, user_id] + ids,
        )
        if n == 0:
            return 0
        db = self._db()
        with db.cursor() as cur:
            for lid, he in entries:
                cur.execute(
                    "INSERT INTO lancamento_historico "
                    "(lancamento_id, user_id, acao, antes, depois, ts) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    (
                        lid, user_id,
                        he.get("acao") or "excluido",
                        _mysql_json(he.get("antes")),
                        _mysql_json(he.get("depois")),
                        he.get("ts") or excluido_em,
                    ),
                )
        return n

    # ----- lixeira --------------------------------------------------------
    def list_lixeira(self, user_id: str) -> List[dict]:
        rows = self._query(
            f"{_MYSQL_LANC_SELECT} "
            "WHERE user_id = %s AND excluido_em IS NOT NULL "
            "ORDER BY excluido_em DESC",
            (user_id,),
        )
        return [_mysql_row_to_lanc(r) for r in rows]

    def restore_lancamento(
        self,
        user_id: str,
        lanc_id: str,
        history_entry: dict,
    ) -> Optional[dict]:
        n = self._exec(
            "UPDATE lancamentos SET excluido_em = NULL "
            "WHERE user_id = %s AND id = %s AND excluido_em IS NOT NULL",
            (user_id, lanc_id),
        )
        if n == 0:
            return None
        lanc = self.get_lancamento(user_id, lanc_id)
        if lanc is None:
            return None
        ts = history_entry.get("ts") or datetime.now().isoformat(timespec="seconds")
        self._exec(
            "INSERT INTO lancamento_historico "
            "(lancamento_id, user_id, acao, antes, depois, ts) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                lanc_id, user_id,
                history_entry.get("acao") or "restaurado",
                _mysql_json(history_entry.get("antes")),
                _mysql_json(history_entry.get("depois")),
                ts,
            ),
        )
        if isinstance(lanc.get("ano"), int):
            self._exec(
                "INSERT IGNORE INTO anos_cadastrados (user_id, ano) VALUES (%s, %s)",
                (user_id, lanc["ano"]),
            )
        return lanc

    def delete_permanente(self, user_id: str, lanc_id: str) -> bool:
        n = self._exec(
            "DELETE FROM lancamentos "
            "WHERE user_id = %s AND id = %s AND excluido_em IS NOT NULL",
            (user_id, lanc_id),
        )
        return n > 0

    def empty_lixeira(self, user_id: str) -> int:
        return self._exec(
            "DELETE FROM lancamentos WHERE user_id = %s AND excluido_em IS NOT NULL",
            (user_id,),
        )

    # ----- historico ------------------------------------------------------
    def get_lancamento_historico(self, user_id: str, lanc_id: str) -> List[dict]:
        rows = self._query(
            "SELECT ts, acao, antes, depois FROM lancamento_historico "
            "WHERE user_id = %s AND lancamento_id = %s ORDER BY ts ASC",
            (user_id, lanc_id),
        )
        return [_mysql_parse_hist(r) for r in rows]

    # ----- assinaturas ----------------------------------------------------
    def list_assinaturas(self, user_id: str) -> List[dict]:
        rows = self._query(
            f"{_MYSQL_ASSIN_SELECT} WHERE user_id = %s",
            (user_id,),
        )
        return [_mysql_row_to_assin(r) for r in rows]

    def list_cartoes(self, user_id: str) -> List[str]:
        rows = self._query(
            "SELECT DISTINCT cartao FROM assinaturas "
            "WHERE user_id = %s AND cartao != ''",
            (user_id,),
        )
        return sorted((r["cartao"] for r in rows if r.get("cartao")), key=str.lower)

    def get_assinatura(self, user_id: str, item_id: str) -> Optional[dict]:
        row = self._query_one(
            f"{_MYSQL_ASSIN_SELECT} WHERE user_id = %s AND id = %s LIMIT 1",
            (user_id, item_id),
        )
        return _mysql_row_to_assin(row) if row else None

    def insert_assinatura(
        self,
        user_id: str,
        item: dict,
        history_entry: Optional[dict] = None,
    ) -> dict:
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        criado_em = item.get("criado_em") or datetime.now().isoformat(timespec="seconds")
        self._exec(
            "INSERT INTO assinaturas "
            "(id, user_id, descricao, data_inicio, data_fim, valor_mensal, "
            "cartao, criado_em, ultima_alteracao) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                item["id"], user_id,
                item.get("descricao") or "",
                item.get("data_inicio"),
                item.get("data_fim"),
                float(item.get("valor_mensal") or 0),
                item.get("cartao") or "",
                criado_em,
                criado_em,
            ),
        )
        if history_entry is not None:
            ts = history_entry.get("ts") or criado_em
            self._exec(
                "INSERT INTO assinatura_historico "
                "(assinatura_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    item["id"], user_id,
                    history_entry.get("acao") or "criado",
                    _mysql_json(history_entry.get("antes")),
                    _mysql_json(history_entry.get("depois")),
                    ts,
                ),
            )
        return _mysql_row_to_assin({
            "id": item["id"], "user_id": user_id,
            "descricao": item.get("descricao") or "",
            "data_inicio": item.get("data_inicio"),
            "data_fim": item.get("data_fim"),
            "valor_mensal": item.get("valor_mensal") or 0,
            "cartao": item.get("cartao") or "",
            "criado_em": criado_em,
            "ultima_alteracao": (history_entry or {}).get("ts") or criado_em,
        })

    def update_assinatura(
        self,
        user_id: str,
        item_id: str,
        fields: dict,
        history_entry: Optional[dict] = None,
    ) -> Optional[dict]:
        if not fields and history_entry is None:
            return self.get_assinatura(user_id, item_id)
        if fields:
            set_clause = ", ".join(f"`{k}` = %s" for k in fields)
            vals = list(fields.values()) + [user_id, item_id]
            n = self._exec(
                f"UPDATE assinaturas SET {set_clause} WHERE user_id = %s AND id = %s",
                vals,
            )
            if n == 0:
                return None

        item = self.get_assinatura(user_id, item_id)
        if item is None:
            return None

        if history_entry is not None:
            ts = history_entry.get("ts") or datetime.now().isoformat(timespec="seconds")
            self._exec(
                "INSERT INTO assinatura_historico "
                "(assinatura_id, user_id, acao, antes, depois, ts) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    item_id, user_id,
                    history_entry.get("acao") or "editado",
                    _mysql_json(history_entry.get("antes")),
                    _mysql_json(history_entry.get("depois")),
                    ts,
                ),
            )
            self._exec(
                "UPDATE assinaturas SET ultima_alteracao = %s WHERE user_id = %s AND id = %s",
                (ts, user_id, item_id),
            )
            item["ultima_alteracao"] = ts

        return item

    def delete_assinatura(self, user_id: str, item_id: str) -> bool:
        return self._exec(
            "DELETE FROM assinaturas WHERE user_id = %s AND id = %s",
            (user_id, item_id),
        ) > 0

    def get_assinatura_historico(self, user_id: str, item_id: str) -> List[dict]:
        rows = self._query(
            "SELECT ts, acao, antes, depois FROM assinatura_historico "
            "WHERE user_id = %s AND assinatura_id = %s ORDER BY ts ASC",
            (user_id, item_id),
        )
        return [_mysql_parse_hist(r) for r in rows]

    # ----- metas ----------------------------------------------------------
    _METAS_TABLE_DDL = (
        "CREATE TABLE IF NOT EXISTS `metas` ("
        " `id` INT NOT NULL AUTO_INCREMENT,"
        " `user_id` CHAR(36) NOT NULL,"
        " `tipo` VARCHAR(20) NOT NULL,"
        " `secao` VARCHAR(120) NOT NULL,"
        " `valor` DECIMAL(12,2) NOT NULL,"
        " `atualizada_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
        " PRIMARY KEY (`id`),"
        " UNIQUE KEY `uq_metas_user_tipo_secao` (`user_id`, `tipo`, `secao`)"
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    )

    def _ensure_metas_table(self) -> None:
        self._exec(self._METAS_TABLE_DDL)

    def list_metas(self, user_id: str) -> List[dict]:
        self._ensure_metas_table()
        rows = self._query(
            "SELECT tipo, secao, valor FROM metas WHERE user_id = %s ORDER BY tipo, secao",
            (user_id,),
        )
        return [
            {"tipo": r["tipo"], "secao": r["secao"], "valor": float(r["valor"])}
            for r in rows
        ]

    def set_meta(
        self,
        user_id: str,
        tipo: str,
        secao: str,
        valor: Optional[float],
    ) -> List[dict]:
        self._ensure_metas_table()
        if valor is None or float(valor) <= 0:
            self._exec(
                "DELETE FROM metas WHERE user_id = %s AND tipo = %s AND secao = %s",
                (user_id, tipo, secao),
            )
        else:
            self._exec(
                "INSERT INTO metas (user_id, tipo, secao, valor) VALUES (%s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE valor = VALUES(valor), atualizada_em = CURRENT_TIMESTAMP",
                (user_id, tipo, secao, round(float(valor), 2)),
            )
        return self.list_metas(user_id)

    # ----- recorrentes ----------------------------------------------------
    _RECORRENTES_TABLE_DDL = (
        "CREATE TABLE IF NOT EXISTS `recorrentes` ("
        " `id` CHAR(36) NOT NULL,"
        " `user_id` CHAR(36) NOT NULL,"
        " `tipo` VARCHAR(20) NOT NULL,"
        " `descricao` VARCHAR(500) NOT NULL,"
        " `secao` VARCHAR(255) NOT NULL DEFAULT 'Geral',"
        " `valor` DECIMAL(12,2) NOT NULL,"
        " `observacao` TEXT,"
        " `tags` TEXT,"
        " `ativo` TINYINT(1) NOT NULL DEFAULT 1,"
        " `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
        " PRIMARY KEY (`id`),"
        " KEY `idx_rec_user` (`user_id`)"
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    )

    def _ensure_recorrentes_table(self) -> None:
        self._exec(self._RECORRENTES_TABLE_DDL)

    @staticmethod
    def _row_to_recorrente(row: dict) -> dict:
        tags_raw = row.get("tags") or "[]"
        if isinstance(tags_raw, str):
            try:
                tags = json.loads(tags_raw)
            except Exception:
                tags = []
        else:
            tags = list(tags_raw or [])
        return {
            "id": row["id"],
            "tipo": row["tipo"],
            "descricao": row["descricao"],
            "secao": row.get("secao") or "Geral",
            "valor": float(row["valor"]),
            "observacao": row.get("observacao") or "",
            "tags": tags,
            "ativo": bool(row.get("ativo", 1)),
            "criado_em": _mysql_ts(row.get("criado_em")),
        }

    def list_recorrentes(self, user_id: str) -> List[dict]:
        self._ensure_recorrentes_table()
        rows = self._query(
            "SELECT id, tipo, descricao, secao, valor, observacao, tags, ativo, criado_em "
            "FROM recorrentes WHERE user_id = %s ORDER BY tipo, descricao",
            (user_id,),
        )
        return [self._row_to_recorrente(r) for r in rows]

    def get_recorrente(self, user_id: str, rec_id: str) -> Optional[dict]:
        self._ensure_recorrentes_table()
        row = self._query_one(
            "SELECT id, tipo, descricao, secao, valor, observacao, tags, ativo, criado_em "
            "FROM recorrentes WHERE user_id = %s AND id = %s",
            (user_id, rec_id),
        )
        return self._row_to_recorrente(row) if row else None

    def upsert_recorrente(self, user_id: str, item: dict) -> dict:
        self._ensure_recorrentes_table()
        item = dict(item)
        item.setdefault("id", str(uuid.uuid4()))
        tags_json = json.dumps(item.get("tags") or [], ensure_ascii=False)
        self._exec(
            "INSERT INTO recorrentes (id, user_id, tipo, descricao, secao, valor, observacao, tags, ativo) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE tipo=VALUES(tipo), descricao=VALUES(descricao), "
            "secao=VALUES(secao), valor=VALUES(valor), observacao=VALUES(observacao), "
            "tags=VALUES(tags), ativo=VALUES(ativo)",
            (
                item["id"], user_id, item.get("tipo"), item.get("descricao"),
                item.get("secao") or "Geral",
                round(float(item.get("valor") or 0), 2),
                item.get("observacao") or "",
                tags_json,
                1 if item.get("ativo", True) else 0,
            ),
        )
        out = self.get_recorrente(user_id, item["id"])
        return out or item

    def delete_recorrente(self, user_id: str, rec_id: str) -> bool:
        self._ensure_recorrentes_table()
        n = self._exec(
            "DELETE FROM recorrentes WHERE user_id = %s AND id = %s",
            (user_id, rec_id),
        )
        return n > 0

    # ----- features -------------------------------------------------------
    def list_features(self) -> List[dict]:
        rows = self._query(
            "SELECT id, titulo, descricao, implementado_em FROM features "
            "ORDER BY implementado_em DESC"
        )
        return [
            {
                "id": r["id"],
                "titulo": r["titulo"],
                "descricao": r.get("descricao"),
                "implementado_em": _mysql_ts(r["implementado_em"]) if r.get("implementado_em") else None,
            }
            for r in rows
        ]


# ----------------------------------------------------------------------------
# Factory
# ----------------------------------------------------------------------------


def get_repository() -> BaseRepository:
    """Retorna o repositorio configurado para a request atual.

    Em modo ``supabase`` ainda retornamos ``JsonRepository`` se a request
    estiver chegando sem token (ex.: testes que nao passaram pelo middleware).
    Isso evita explodir a aplicacao em momentos sem contexto autenticado.
    """
    from auth import storage_backend  # tardio

    backend = storage_backend()
    if backend == "mysql":
        return MySQLRepository()
    if backend == "supabase" and getattr(g, "access_token", None):
        return SupabaseRepository()
    return current_app.extensions["repositories"]["json"]
