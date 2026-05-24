const state = {
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    secoes: { receita: [], despesa: [] },
    allTags: [],
    modalTags: [],
    chart: null,
    darkMode: false,
    mesesRevisados: new Set(),
    despesasSecoes: [],
    receitasSecoes: [],
    totaisMes: {},
};

// ── Cache em memória ─────────────────────────────────────────
// Armazena respostas brutas da API. Invalidado seletivamente
// a cada mutação; nunca persiste entre reloads de página.
const _cache = new Map();
const CK = {
    mes:  () => `mes:${state.ano}:${state.mes}`,
    chart: () => `chart:${state.ano}`,
    secoes: "secoes",
    tags:   "tags",
    anos:   "anos",
    mrev:  () => `mrev:${state.ano}`,
};
// Bust por prefixo — útil para invalidar todo o ano de uma vez
function _bustPrefix(prefix) {
    for (const k of _cache.keys()) if (k.startsWith(prefix)) _cache.delete(k);
}

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function applyTheme(dark) {
    state.darkMode = dark;
    if (dark) {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    const btn = document.getElementById("btnTheme");
    setThemeIcon(btn, dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    if (state.chart) {
        updateChartTheme(state.chart, dark);
    }
}

function updateChartTheme(chart, dark) {
    const legendColor = dark ? cssVar("--text-secondary") : cssVar("--text-secondary");
    chart.options.plugins.legend.labels.color = legendColor;
    chart.options.scales.x.ticks.color = cssVar("--text-muted");
    chart.options.scales.y.ticks.color = cssVar("--text-muted");
    chart.options.scales.y.grid.color = dark
        ? cssVar("--border-soft")
        : "rgba(221,224,229,0.8)";
    const tooltip = chart.options.plugins.tooltip;
    tooltip.backgroundColor = dark ? "rgba(22, 25, 31, 0.94)" : "rgba(22, 25, 31, 0.96)";
    tooltip.titleColor = cssVar("--gold");
    tooltip.bodyColor = cssVar("--cream");
    tooltip.borderColor = dark ? "rgba(212,175,55,0.22)" : "rgba(212,175,55,0.28)";
    chart.update("none");
}

(function initTheme() {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved ? saved === "dark" : prefersDark);
})();

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function api(path, options = {}) {
    _loadingStart();
    try {
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

        const token = window.AppAuth?.getAccessToken?.();
        if (token && !headers.Authorization) {
            headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(path, { ...options, headers });

        if (res.status === 401 && window.AppAuth?.handleUnauthorized) {
            await window.AppAuth.handleUnauthorized();
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let msg = data.error;
            if (!msg && res.status === 404) {
                msg = "Recurso nao encontrado. Reinicie o servidor com py app.py e atualize a pagina (Ctrl+F5).";
            }
            throw new Error(msg || "Erro na requisicao");
        }
        return data;
    } finally {
        _loadingEnd();
    }
}

// ── Loading overlay central (compartilhado com auth.js) ──────
let _apiCount = 0;
let _showLoadingTimer = null;
let _hideLoadingTimer = null;
const SHOW_LOADING_DELAY = 180;  // ms — evita flash em chamadas rápidas
const HIDE_LOADING_DELAY = 100;  // ms — evita piscar entre fases sequenciais

function _showLoadingOverlay() {
    const el = document.getElementById("appLoading");
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.remove("fade-out");
}

function _hideLoadingOverlay() {
    const el = document.getElementById("appLoading");
    if (!el || el.classList.contains("hidden")) return;
    el.classList.add("fade-out");
    setTimeout(() => {
        // Só esconde se ainda estiver fade-out (não reexibido nesse meio tempo)
        if (el.classList.contains("fade-out")) el.classList.add("hidden");
    }, 350);
}

function _loadingStart() {
    _apiCount++;
    clearTimeout(_hideLoadingTimer);
    if (_apiCount > 1) return;
    const el = document.getElementById("appLoading");
    // Já visível (carga inicial) — não precisa reagendar
    if (el && !el.classList.contains("hidden") && !el.classList.contains("fade-out")) return;
    clearTimeout(_showLoadingTimer);
    _showLoadingTimer = setTimeout(_showLoadingOverlay, SHOW_LOADING_DELAY);
}

function _loadingEnd() {
    _apiCount = Math.max(0, _apiCount - 1);
    if (_apiCount > 0) return;
    clearTimeout(_showLoadingTimer);
    clearTimeout(_hideLoadingTimer);
    _hideLoadingTimer = setTimeout(_hideLoadingOverlay, HIDE_LOADING_DELAY);
}

function hideAppLoading() {
    clearTimeout(_showLoadingTimer);
    clearTimeout(_hideLoadingTimer);
    _hideLoadingOverlay();
}

function toast(msg, isError = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.toggle("error", isError);
    el.classList.remove("hidden");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add("hidden"), 2800);
}

function fmtTs(ts) {
    if (!ts) return "";
    try {
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return "";
    }
}

function renderMonthTabs() {
    const nav = document.getElementById("monthTabs");
    nav.innerHTML = "";
    const meses = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    meses.forEach((nome, idx) => {
        const mesNum = idx + 1;
        const revisado = state.mesesRevisados.has(mesNum);

        const cell = document.createElement("div");
        cell.className = "month-tab-cell" + (revisado ? " revisado" : "");

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "month-tab" + (state.mes === mesNum ? " active" : "");
        btn.textContent = nome;
        btn.addEventListener("click", () => {
            state.mes = mesNum;
            renderMonthTabs();
            loadMes();
        });

        const label = document.createElement("label");
        label.className = "month-revisado-label";
        label.title = revisado ? "Desmarcar mês como revisado" : "Marcar mês como revisado";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.className = "month-revisado-cb";
        chk.checked = revisado;
        chk.setAttribute("aria-label", `Mês ${nome} revisado`);
        chk.addEventListener("click", (e) => e.stopPropagation());
        chk.addEventListener("change", () => toggleMesRevisado(mesNum, chk.checked));

        label.appendChild(chk);
        cell.appendChild(btn);
        cell.appendChild(label);
        nav.appendChild(cell);
    });
}

async function loadMesesRevisados() {
    try {
        const key = CK.mrev();
        let revisados;
        if (_cache.has(key)) {
            revisados = _cache.get(key);
        } else {
            const data = await api(`/api/revisao?ano=${state.ano}`);
            revisados = data.revisados || [];
            _cache.set(key, revisados);
        }
        state.mesesRevisados = new Set(revisados);
        renderMonthTabs();
    } catch (err) {
        console.warn("revisao:", err);
    }
}

async function toggleMesRevisado(mes, revisado) {
    try {
        const data = await api("/api/revisao/marcar", {
            method: "POST",
            body: JSON.stringify({ ano: state.ano, mes, revisado }),
        });
        const revisados = data.revisados || [];
        state.mesesRevisados = new Set(revisados);
        _cache.set(CK.mrev(), revisados);
        renderMonthTabs();
    } catch (err) {
        toast(err.message, true);
        renderMonthTabs();
    }
}

function renderAnos(anos) {
    const sel = document.getElementById("anoSelect");
    sel.innerHTML = "";
    anos.forEach((ano) => {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        if (ano === state.ano) opt.selected = true;
        sel.appendChild(opt);
    });
}

function totalPagoSecao(sec) {
    return sec.itens.filter((i) => i.pago).reduce((s, i) => s + i.valor, 0);
}

function totalPagoDespesas(secoes) {
    return (secoes || []).reduce((sum, sec) => sum + totalPagoSecao(sec), 0);
}

function updateSecaoPagoBadge(secaoBlock, sec) {
    if (!secaoBlock) return;
    const right = secaoBlock.querySelector(".secao-title-right");
    if (!right) return;
    const totalPago = totalPagoSecao(sec);
    let badge = right.querySelector(".secao-pago-badge");
    if (totalPago > 0) {
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "secao-pago-badge";
            right.insertBefore(badge, right.firstChild);
        }
        badge.innerHTML = `${mi(MI.checkCircle, "mi-badge")} ${fmt.format(totalPago)} pago`;
    } else if (badge) {
        badge.remove();
    }
}

function updateDespesasPagoTotal() {
    const el = document.getElementById("despesasPagoTotal");
    if (!el) return;
    const total = totalPagoDespesas(state.despesasSecoes);
    if (total > 0) {
        el.innerHTML = `${mi(MI.checkCircle, "mi-badge")} ${fmt.format(total)} pago`;
        el.classList.remove("hidden");
    } else {
        el.textContent = "";
        el.classList.add("hidden");
    }
}

function findDespesaItem(id) {
    for (const sec of state.despesasSecoes || []) {
        const item = sec.itens.find((i) => i.id === id);
        if (item) return { sec, item };
    }
    return null;
}

function totalInvestidoSecao(sec) {
    return sec.itens.filter((i) => i.investido).reduce((s, i) => s + i.valor, 0);
}

function totalInvestidoReceitas(secoes) {
    return (secoes || []).reduce((sum, sec) => sum + totalInvestidoSecao(sec), 0);
}

function updateSecaoInvestBadge(secaoBlock, sec) {
    if (!secaoBlock) return;
    const right = secaoBlock.querySelector(".secao-title-right");
    if (!right) return;
    const total = totalInvestidoSecao(sec);
    let badge = right.querySelector(".secao-invest-badge");
    if (total > 0) {
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "secao-invest-badge";
            right.insertBefore(badge, right.firstChild);
        }
        badge.innerHTML = `${mi(MI.trendingUp, "mi-badge")} ${fmt.format(total)} investido`;
    } else if (badge) {
        badge.remove();
    }
}

function updateReceitasInvestidoTotal() {
    const el = document.getElementById("receitasInvestidoTotal");
    if (!el) return;
    const total = totalInvestidoReceitas(state.receitasSecoes);
    if (total > 0) {
        el.innerHTML = `${mi(MI.trendingUp, "mi-badge")} ${fmt.format(total)} investido`;
        el.classList.remove("hidden");
    } else {
        el.textContent = "";
        el.classList.add("hidden");
    }
}

function findReceitaItem(id) {
    for (const sec of state.receitasSecoes || []) {
        const item = sec.itens.find((i) => i.id === id);
        if (item) return { sec, item };
    }
    return null;
}

function renderSecoes(containerId, secoes, tipo, emptyMsg) {
    const container = document.getElementById(containerId);
    if (!secoes.length) {
        container.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
        return;
    }
    const hasPagoCol = tipo === "despesa";
    const hasInvestCol = tipo === "receita";
    const checkTh = hasPagoCol
        ? `<th class="col-check" title="Pago?">${mi(MI.check, "mi-th")}</th>`
        : hasInvestCol
            ? `<th class="col-check" title="Reserva / investimento imediato">${mi(MI.trendingUp, "mi-th")}</th>`
            : `<th class="col-check"></th>`;
    container.innerHTML = secoes.map((sec) => {
        const totalPago = hasPagoCol ? totalPagoSecao(sec) : 0;
        const totalInvest = hasInvestCol ? totalInvestidoSecao(sec) : 0;
        const pagoBadge = hasPagoCol && totalPago > 0
            ? `<span class="secao-pago-badge">${mi(MI.checkCircle, "mi-badge")} ${fmt.format(totalPago)} pago</span>`
            : "";
        const investBadge = hasInvestCol && totalInvest > 0
            ? `<span class="secao-invest-badge">${mi(MI.trendingUp, "mi-badge")} ${fmt.format(totalInvest)} investido</span>`
            : "";
        return `
        <div class="secao-block" data-secao="${escapeHtml(sec.secao)}">
            <div class="secao-title">
                <span>${escapeHtml(sec.secao)}</span>
                <span class="secao-title-right">${pagoBadge}${investBadge}<span>${fmt.format(sec.total)}</span></span>
            </div>
            <table class="responsive-table">
                <thead><tr>${checkTh}<th>Descrição</th><th class="col-valor">Valor</th><th class="col-acoes">Ações</th></tr></thead>
                <tbody>${sec.itens.map((item) => rowHtml(item, tipo)).join("")}</tbody>
            </table>
        </div>`;
    }).join("");
    bindRowActions(container);
}

function renderReceitas(secoes) {
    state.receitasSecoes = secoes || [];
    renderSecoes("receitasContainer", state.receitasSecoes, "receita", "Nenhuma receita neste mês");
    updateReceitasInvestidoTotal();
}

function renderDespesas(secoes) {
    state.despesasSecoes = secoes || [];
    renderSecoes("despesasContainer", state.despesasSecoes, "despesa", "Nenhuma despesa neste mês");
    updateDespesasPagoTotal();
}

function normalizeTagsList(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === "string") {
        return tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return [];
}

function tagsHtml(tags) {
    const list = normalizeTagsList(tags);
    if (!list.length) return "";
    return `<div class="tag-list">${list.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>`;
}

function rowHtml(item, tipo) {
    const cls = tipo === "receita" ? "valor-pos" : "valor-neg";
    const tagsBlock = tagsHtml(item.tags);
    const pago = tipo === "despesa" && item.pago;
    const investido = tipo === "receita" && item.investido;
    const rowCls = pago ? " row-pago" : investido ? " row-investido" : "";
    const statusIcon = pago
        ? `<span class="pago-emoji">${mi(MI.checkCircle, "mi-row")}</span> `
        : investido
            ? `<span class="invest-emoji">${mi(MI.trendingUp, "mi-row")}</span> `
            : "";

    let checkboxCol = `<td class="col-check"></td>`;
    if (tipo === "despesa") {
        checkboxCol = `<td class="col-check"><input type="checkbox" class="check-pago" data-id="${item.id}" ${pago ? "checked" : ""} aria-label="${pago ? "Desmarcar como pago" : "Marcar como pago"}"></td>`;
    } else if (tipo === "receita") {
        checkboxCol = `<td class="col-check"><input type="checkbox" class="check-investido" data-id="${item.id}" ${investido ? "checked" : ""} aria-label="${investido ? "Desmarcar investimento" : "Marcar como investimento (reserva)"}"></td>`;
    }

    const tsUltima = item.ultima_alteracao || item.criado_em;
    const tsFmt = fmtTs(tsUltima);
    const ultimaAlt = tsFmt
        ? `<br><small class="lanc-ultima-alteracao">Última alteração: ${escapeHtml(tsFmt)}</small>`
        : "";

        return `
        <tr data-id="${item.id}" data-valor="${item.valor}" class="row-lancamento${rowCls}">
            ${checkboxCol}
            <td data-label="Descrição">${statusIcon}${escapeHtml(item.descricao || "")}${item.observacao ? `<br><small>${escapeHtml(item.observacao)}</small>` : ""}${ultimaAlt}${tagsBlock ? `<br>${tagsBlock}` : ""}</td>
            <td class="col-valor ${cls}" data-label="Valor">${fmt.format(item.valor)}</td>
            <td class="col-acoes" data-label="Ações">
                <button type="button" class="btn btn-ghost btn-sm btn-hist" data-id="${item.id}" title="Histórico" aria-label="Histórico">${mi(MI.history, "mi-btn")}</button>
                <button type="button" class="btn btn-ghost btn-sm btn-edit" data-id="${item.id}" title="Editar" aria-label="Editar">${mi(MI.edit, "mi-btn")}</button>
                <button type="button" class="btn btn-danger btn-sm btn-del" data-id="${item.id}" title="Excluir" aria-label="Excluir">${mi(MI.delete, "mi-btn")}</button>
            </td>
        </tr>
    `;
}

function bindRowActions(root) {
    root.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    root.querySelectorAll(".btn-del").forEach((btn) => {
        btn.addEventListener("click", () => deleteLancamento(btn.dataset.id));
    });
    root.querySelectorAll(".check-pago").forEach((chk) => {
        chk.addEventListener("change", () => togglePago(chk.dataset.id, chk.checked));
    });
    root.querySelectorAll(".check-investido").forEach((chk) => {
        chk.addEventListener("change", () => toggleInvestido(chk.dataset.id, chk.checked));
    });
    root.querySelectorAll(".btn-hist").forEach((btn) => {
        btn.addEventListener("click", () => openHistoricoModal(btn.dataset.id));
    });
}

async function togglePago(id, pago) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    try {
        await api(`/api/lancamentos/${id}`, {
            method: "PUT",
            body: JSON.stringify({ pago }),
        });
        _cache.delete(CK.mes());
        if (row) {
            row.classList.toggle("row-pago", pago);
            const descCell = row.querySelector("td:nth-child(2)");
            if (descCell) {
                if (pago) {
                    if (!descCell.querySelector(".pago-emoji")) {
                        descCell.insertAdjacentHTML("afterbegin", `<span class="pago-emoji">${mi(MI.checkCircle, "mi-row")}</span> `);
                    }
                } else {
                    const em = descCell.querySelector(".pago-emoji");
                    if (em) em.nextSibling?.nodeType === 3 && em.nextSibling.nodeValue === " "
                        ? (em.nextSibling.remove(), em.remove())
                        : em.remove();
                }
            }
            const chk = row.querySelector(".check-pago");
            if (chk) chk.setAttribute("aria-label", pago ? "Desmarcar" : "Marcar como pago");
        }
        const found = findDespesaItem(id);
        if (found) {
            found.item.pago = pago;
            const secaoBlock = row?.closest(".secao-block");
            updateSecaoPagoBadge(secaoBlock, found.sec);
            updateDespesasPagoTotal();
            refreshCaixaFromState();
        }
    } catch (err) {
        toast(err.message, true);
        if (row) {
            const chk = row.querySelector(".check-pago");
            if (chk) chk.checked = !pago;
        }
    }
}

async function toggleInvestido(id, investido) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    try {
        await api(`/api/lancamentos/${id}`, {
            method: "PUT",
            body: JSON.stringify({ investido }),
        });
        _cache.delete(CK.mes());
        if (row) {
            row.classList.toggle("row-investido", investido);
            const descCell = row.querySelector("td:nth-child(2)");
            if (descCell) {
                if (investido) {
                    if (!descCell.querySelector(".invest-emoji")) {
                        descCell.insertAdjacentHTML("afterbegin", `<span class="invest-emoji">${mi(MI.trendingUp, "mi-row")}</span> `);
                    }
                } else {
                    const em = descCell.querySelector(".invest-emoji");
                    if (em) em.nextSibling?.nodeType === 3 && em.nextSibling.nodeValue === " "
                        ? (em.nextSibling.remove(), em.remove())
                        : em.remove();
                }
            }
            const chk = row.querySelector(".check-investido");
            if (chk) {
                chk.setAttribute("aria-label", investido ? "Desmarcar investimento" : "Marcar como investimento (reserva)");
            }
        }
        const found = findReceitaItem(id);
        if (found) {
            found.item.investido = investido;
            const secaoBlock = row?.closest(".secao-block");
            updateSecaoInvestBadge(secaoBlock, found.sec);
            updateReceitasInvestidoTotal();
            refreshCaixaFromState();
        }
    } catch (err) {
        toast(err.message, true);
        if (row) {
            const chk = row.querySelector(".check-investido");
            if (chk) chk.checked = !investido;
        }
    }
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function totalPendenteDespesas(secoes) {
    return (secoes || []).reduce(
        (sum, sec) => sum + sec.itens.filter((i) => !i.pago).reduce((s, i) => s + i.valor, 0),
        0
    );
}

function refreshCaixaFromState() {
    const entrada = state.totaisMes.entrada || 0;
    const saida = state.totaisMes.saida || 0;
    const entrada_investida = state.receitasSecoes.length
        ? totalInvestidoReceitas(state.receitasSecoes)
        : (state.totaisMes.entrada_investida ?? 0);
    const saida_paga = state.despesasSecoes.length
        ? totalPagoDespesas(state.despesasSecoes)
        : (state.totaisMes.saida_paga ?? 0);
    const saida_pendente = state.despesasSecoes.length
        ? totalPendenteDespesas(state.despesasSecoes)
        : (state.totaisMes.saida_pendente ?? 0);
    updateTotais({
        ...state.totaisMes,
        entrada_investida,
        saida_paga,
        saida_pendente,
        caixa: entrada - entrada_investida - saida_paga,
        saida,
        liquido: state.totaisMes.liquido ?? entrada - saida,
    });
}

function setCardValue(id, value, colorize) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = fmt.format(value || 0);
    if (colorize) {
        el.className = "card-value " + (value >= 0 ? "valor-pos" : "valor-neg");
    }
}

function updateTotais(totais) {
    state.totaisMes = { ...totais };
    document.getElementById("totalEntrada").textContent = fmt.format(totais.entrada || 0);
    document.getElementById("totalSaida").textContent = fmt.format(totais.saida || 0);
    setCardValue("totalCaixa", totais.caixa ?? 0, true);
    setCardValue("totalPendente", totais.saida_pendente ?? 0, false);
    setCardValue("totalOrcamento", totais.liquido ?? 0, true);
}

function secoesFor(tipo) {
    return state.secoes[tipo] || [];
}

function fillSecaoSelect(tipo, selected) {
    const sel = document.getElementById("lancSecao");
    const lista = secoesFor(tipo);
    sel.innerHTML = lista.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    if (selected && lista.some((s) => s.toLowerCase() === String(selected).toLowerCase())) {
        sel.value = lista.find((s) => s.toLowerCase() === String(selected).toLowerCase());
    }
}

function fillTagSuggestions() {
    const list = document.getElementById("tagSuggestions");
    list.innerHTML = state.allTags.map((t) => `<option value="${escapeHtml(t)}">`).join("");
}

function renderModalTags() {
    const box = document.getElementById("tagChips");
    box.innerHTML = state.modalTags.map((tag, idx) => `
        <span class="tag-chip tag-chip-removable">
            ${escapeHtml(tag)}
            <button type="button" class="tag-remove" data-idx="${idx}" aria-label="Remover tag">${mi(MI.close, "mi-tag-remove")}</button>
        </span>
    `).join("");
    box.querySelectorAll(".tag-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.modalTags.splice(parseInt(btn.dataset.idx, 10), 1);
            renderModalTags();
        });
    });
}

function addModalTag(raw) {
    const name = (raw || "").trim().replace(/,$/, "");
    if (!name) return;
    const key = name.toLowerCase();
    if (state.modalTags.some((t) => t.toLowerCase() === key)) return;
    state.modalTags.push(name);
    renderModalTags();
    document.getElementById("tagText").value = "";
}

function flushPendingTag() {
    const input = document.getElementById("tagText");
    if (input.value.trim()) addModalTag(input.value);
}

function setModalTags(tags) {
    state.modalTags = [...(tags || [])];
    renderModalTags();
    document.getElementById("tagText").value = "";
}

function toggleNovaSecaoForm(show) {
    document.getElementById("novaSecaoForm").classList.toggle("hidden", !show);
    document.getElementById("btnNovaSecao").classList.toggle("hidden", show);
    if (show) {
        document.getElementById("novaSecaoNome").value = "";
        document.getElementById("novaSecaoNome").focus();
    }
}

async function createSecao() {
    const nome = document.getElementById("novaSecaoNome").value.trim();
    if (!nome) {
        toast("Informe o nome da seção", true);
        return;
    }
    const tipo = document.getElementById("lancTipo").value;
    try {
        const data = await api("/api/secoes", {
            method: "POST",
            body: JSON.stringify({ tipo, nome }),
        });
        state.secoes[tipo] = data.secoes;
        _cache.set(CK.secoes, state.secoes);
        fillSecaoSelect(tipo, data.nome);
        toggleNovaSecaoForm(false);
        toast("Seção criada");
    } catch (err) {
        toast(err.message, true);
    }
}

function openModal(tipo = "despesa", item = null) {
    const modal = document.getElementById("modalLancamento");
    document.getElementById("modalTitle").textContent = item ? "Editar lançamento" : "Novo lançamento";
    document.getElementById("lancId").value = item ? item.id : "";
    document.getElementById("lancTipo").value = tipo;
    document.getElementById("lancTipo").disabled = !!item;
    document.getElementById("lancValor").value = item ? item.valor : "";
    document.getElementById("lancDescricao").value = item ? (item.descricao || "") : "";
    document.getElementById("lancObs").value = item ? (item.observacao || "") : "";
    fillSecaoSelect(tipo, item ? item.secao : null);
    setModalTags(item ? item.tags : []);
    toggleNovaSecaoForm(false);
    modal.showModal();
}

function openEditModal(id) {
    const receita = findReceitaItem(id);
    if (receita) {
        openModal("receita", { ...receita.item, tipo: "receita" });
        return;
    }
    const despesa = findDespesaItem(id);
    if (despesa) {
        openModal("despesa", { ...despesa.item, tipo: "despesa" });
        return;
    }
    toast("Lancamento nao encontrado na visualizacao atual", true);
}

async function deleteLancamento(id) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
        await api(`/api/lancamentos/${id}`, { method: "DELETE" });
        toast("Lancamento excluido");
        _cache.delete(CK.mes()); _cache.delete(CK.chart());
        await Promise.all([loadMes(), loadChart()]);
    } catch (err) {
        toast(err.message, true);
    }
}

async function limparMes() {
    const MESES_NOMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesNome = MESES_NOMES[state.mes - 1] || `Mês ${state.mes}`;
    if (!confirm(`Mover todos os lançamentos de ${mesNome} ${state.ano} para a lixeira? Esta ação pode ser desfeita pela lixeira.`)) return;
    try {
        const data = await api(`/api/lancamentos/limpar-mes?ano=${state.ano}&mes=${state.mes}`, { method: "DELETE" });
        const n = data.removidos || 0;
        toast(`${n} lançamento${n !== 1 ? "s" : ""} movido${n !== 1 ? "s" : ""} para a lixeira`);
        _cache.delete(CK.mes()); _cache.delete(CK.chart());
        await Promise.all([loadMes(), loadChart()]);
    } catch (err) {
        toast(err.message, true);
    }
}

async function loadSecoes() {
    if (_cache.has(CK.secoes)) {
        state.secoes = _cache.get(CK.secoes);
        return;
    }
    const data = await api("/api/secoes");
    state.secoes = {
        despesa: data.secoes_despesa || data.secoes || [],
        receita: data.secoes_receita || [],
    };
    _cache.set(CK.secoes, state.secoes);
}

async function loadAnos() {
    if (_cache.has(CK.anos)) {
        const anos = _cache.get(CK.anos);
        if (!anos.includes(state.ano)) state.ano = anos[0] || state.ano;
        renderAnos(anos.length ? anos : [state.ano]);
        return;
    }
    const { anos } = await api("/api/anos");
    _cache.set(CK.anos, anos);
    if (!anos.includes(state.ano)) state.ano = anos[0] || state.ano;
    renderAnos(anos.length ? anos : [state.ano]);
}

function openModalAno() {
    const dlg = document.getElementById("modalAno");
    const input = document.getElementById("novoAnoInput");
    const ultimoAno = parseInt(document.getElementById("anoSelect").value, 10);
    input.value = Number.isFinite(ultimoAno) ? ultimoAno + 1 : new Date().getFullYear();
    dlg.showModal();
    setTimeout(() => input.focus(), 50);
}

async function criarAno(ev) {
    if (ev) ev.preventDefault();
    const input = document.getElementById("novoAnoInput");
    const ano = parseInt(input.value, 10);
    if (!Number.isFinite(ano)) {
        toast("Ano invalido", true);
        return;
    }
    try {
        const data = await api("/api/anos", {
            method: "POST",
            body: JSON.stringify({ ano }),
        });
        document.getElementById("modalAno").close();
        renderAnos(data.anos);
        state.ano = data.ano;
        document.getElementById("anoSelect").value = String(data.ano);
        _cache.delete(CK.anos); _cache.delete(CK.mrev()); _cache.delete(CK.mes()); _cache.delete(CK.chart());
        await Promise.all([loadMesesRevisados(), loadMes(), loadChart()]);
        toast(`Ano ${data.ano} criado`);
    } catch (err) {
        toast(err.message, true);
    }
}

async function openModalExcluirAno() {
    const ano = parseInt(document.getElementById("anoSelect").value, 10);
    if (!Number.isFinite(ano)) {
        toast("Selecione um ano", true);
        return;
    }
    document.getElementById("excluirAnoLabel").textContent = ano;
    const impacto = document.getElementById("excluirAnoImpacto");
    impacto.textContent = "";
    try {
        const lancamentos = await api(`/api/lancamentos?ano=${ano}`);
        if (lancamentos.length > 0) {
            impacto.textContent = `Esta ação removerá ${lancamentos.length} lançamento(s) deste ano.`;
        }
    } catch {
        // silencioso: o backend revalida na exclusão
    }
    document.getElementById("modalExcluirAno").dataset.ano = String(ano);
    document.getElementById("modalExcluirAno").showModal();
}

async function downloadTemplate() {
    try {
        const token = window.AppAuth?.getAccessToken?.();
        const res = await fetch("/api/template-excel", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Falha ao baixar template");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo-gastos.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        toast(err.message, true);
    }
}

async function importarExcel(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
        const token = window.AppAuth?.getAccessToken?.();
        const res = await fetch("/api/lancamentos/import-excel", {
            method: "POST",
            body: formData,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || "Falha ao importar");
        }
        const erros = (data.erros || []).length;
        let msg = `${data.criados} lançamento(s) importado(s)`;
        if (erros) msg += ` · ${erros} linha(s) com erro`;
        toast(msg, erros > 0);
        if (erros) {
            console.warn("Linhas com erro:", data.erros);
        }
        _cache.clear();
        await Promise.all([loadAnos(), loadSecoes(), loadTags(), loadMes(), loadChart()]);
    } catch (err) {
        toast(err.message, true);
    }
}

async function confirmarExcluirAno(ev) {
    if (ev) ev.preventDefault();
    const dlg = document.getElementById("modalExcluirAno");
    const ano = parseInt(dlg.dataset.ano || "0", 10);
    if (!Number.isFinite(ano)) return;
    try {
        const data = await api(`/api/anos/${ano}?force=true`, { method: "DELETE" });
        dlg.close();
        const removidos = data.lancamentos_removidos || 0;
        toast(
            removidos
                ? `Ano ${ano} excluído (${removidos} lançamento${removidos > 1 ? "s" : ""})`
                : `Ano ${ano} excluído`
        );
        _bustPrefix(`mes:${ano}`); _bustPrefix(`chart:${ano}`);
        _cache.delete(CK.anos); _cache.delete(CK.tags); _bustPrefix(`mrev:`);
        await Promise.all([loadAnos(), loadMesesRevisados(), loadTags(), loadMes(), loadChart()]);
    } catch (err) {
        toast(err.message, true);
    }
}

async function loadTags() {
    if (_cache.has(CK.tags)) {
        state.allTags = _cache.get(CK.tags);
        fillTagSuggestions();
        return;
    }
    const { tags } = await api("/api/tags");
    state.allTags = tags || [];
    _cache.set(CK.tags, state.allTags);
    fillTagSuggestions();
}

async function loadMes() {
    const key = CK.mes();
    let resumo;
    if (_cache.has(key)) {
        resumo = _cache.get(key);
    } else {
        resumo = await api(`/api/resumo?ano=${state.ano}&mes=${state.mes}`);
        _cache.set(key, resumo);
    }
    state.totaisMes = { ...(resumo.totais || {}) };
    renderReceitas(resumo.receitas_por_secao || []);
    renderDespesas(resumo.despesas_por_secao || []);
    refreshCaixaFromState();
}

function makeGradient(ctx, area, color1, color2) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    return g;
}

const fmtCompact = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
});

// Plugin: linha guia vertical no hover + destaque do mes atual + rotulos do liquido
const hoverGuidePlugin = {
    id: "hoverGuide",
    defaults: { currentMonth: null, liquidoLabels: null },
    afterDraw(chart, _args, options) {
        const { ctx, tooltip, chartArea, scales } = chart;
        if (!chartArea) return;

        const currentMonth = options?.currentMonth;
        if (currentMonth && currentMonth >= 1 && currentMonth <= 12) {
            const x = scales.x.getPixelForValue(currentMonth - 1);
            const barWidth = (chartArea.right - chartArea.left) / 12;
            ctx.save();
            ctx.fillStyle = "rgba(212, 155, 59, 0.06)";
            ctx.fillRect(x - barWidth / 2, chartArea.top, barWidth, chartArea.bottom - chartArea.top);
            ctx.restore();
        }

        const liquidoLabels = options?.liquidoLabels;
        if (Array.isArray(liquidoLabels) && liquidoLabels.length) {
            ctx.save();
            ctx.font = "500 10.5px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            liquidoLabels.forEach((valor, i) => {
                if (valor === 0) return;
                const x = scales.x.getPixelForValue(i);
                const y = chartArea.top - 8;
                const label = liquidoLabels._fmt(valor);
                const w = ctx.measureText(label).width + 10;
                const h = 16;
                const bg = valor >= 0 ? "rgba(0, 172, 193, 0.12)" : "rgba(220, 38, 38, 0.12)";
                const border = valor >= 0 ? "rgba(0, 172, 193, 0.45)" : "rgba(220, 38, 38, 0.45)";
                const color = valor >= 0 ? cssVar("--petrol-deep") : cssVar("--red");
                const r = 6;
                ctx.beginPath();
                ctx.moveTo(x - w / 2 + r, y - h / 2);
                ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, r);
                ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, r);
                ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, r);
                ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, r);
                ctx.closePath();
                ctx.fillStyle = bg;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = border;
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.fillText(label, x, y);
            });
            ctx.restore();
        }

        if (tooltip && tooltip.opacity > 0 && tooltip.dataPoints?.length) {
            const x = tooltip.dataPoints[0].element.x;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(212, 155, 59, 0.5)";
            ctx.stroke();
            ctx.restore();
        }
    },
};

function renderHighlights(mensal) {
    const box = document.getElementById("chartHighlights");
    if (!box) return;
    const comDados = mensal.filter((m) => m.entrada || m.saida);
    if (!comDados.length) {
        box.innerHTML = "";
        return;
    }
    const melhor = comDados.reduce((a, b) => (a.liquido >= b.liquido ? a : b));
    const pior = comDados.reduce((a, b) => (a.liquido <= b.liquido ? a : b));
    const mediaSaida = comDados.reduce((s, m) => s + m.saida, 0) / comDados.length;

    box.innerHTML = `
        <div class="highlight">
            <span class="highlight-label">Melhor mês</span>
            <span class="highlight-value valor-pos">${escapeHtml(melhor.mes_nome.slice(0, 3))} · ${fmtCompact.format(melhor.liquido)}</span>
        </div>
        <div class="highlight">
            <span class="highlight-label">Pior mês</span>
            <span class="highlight-value valor-neg">${escapeHtml(pior.mes_nome.slice(0, 3))} · ${fmtCompact.format(pior.liquido)}</span>
        </div>
        <div class="highlight">
            <span class="highlight-label">Saída média</span>
            <span class="highlight-value">${fmtCompact.format(mediaSaida)}</span>
        </div>
    `;
}

async function loadChart() {
    const key = CK.chart();
    let resumo;
    if (_cache.has(key)) {
        resumo = _cache.get(key);
    } else {
        resumo = await api(`/api/resumo?ano=${state.ano}`);
        _cache.set(key, resumo);
    }
    const labels = resumo.mensal.map((m) => m.mes_nome.slice(0, 3));
    const liquido = resumo.mensal.map((m) => m.liquido);
    const entrada = resumo.mensal.map((m) => m.entrada);
    const saida = resumo.mensal.map((m) => m.saida);

    const totaisAno = resumo.totais_ano || { entrada: 0, saida: 0, liquido: 0 };
    const subtitle = document.getElementById("chartSubtitle");
    if (subtitle) {
        subtitle.innerHTML =
            `<span class="dot dot-green"></span> ${fmt.format(totaisAno.entrada)}` +
            ` <span class="sep">·</span> ` +
            `<span class="dot dot-red"></span> ${fmt.format(totaisAno.saida)}` +
            ` <span class="sep">·</span> ` +
            `<span class="dot dot-mustard"></span> <strong>${fmt.format(totaisAno.liquido)}</strong>`;
        subtitle.classList.toggle("negative", (totaisAno.liquido || 0) < 0);
    }

    renderHighlights(resumo.mensal);

    const ctxEl = document.getElementById("chartAnual");
    if (state.chart) state.chart.destroy();

    const isCurrentYear = state.ano === new Date().getFullYear();
    const currentMonth = isCurrentYear ? new Date().getMonth() + 1 : null;

    const liquidoLabels = liquido.slice();
    liquidoLabels._fmt = (v) => fmtCompact.format(v);

    const dark = state.darkMode;
    const gridColor = dark ? cssVar("--border-soft") : "rgba(221,224,229,0.8)";
    const tickColor = cssVar("--text-muted");
    const legendColor = cssVar("--text-secondary");
    const petrol = cssVar("--petrol");
    const red = cssVar("--red");
    const gold = cssVar("--gold");
    const pointBorder = cssVar("--surface-2");
    const cream = cssVar("--cream");
    const monoFont = cssVar("--font-mono");
    const displayFont = cssVar("--font-sans");

    state.chart = new Chart(ctxEl, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Entrada",
                    data: entrada,
                    borderColor: petrol,
                    backgroundColor: (ctx) => {
                        const { chart } = ctx;
                        if (!chart.chartArea) return "rgba(0, 172, 193, 0.15)";
                        return makeGradient(chart.ctx, chart.chartArea,
                            "rgba(0, 172, 193, 0.28)", "rgba(0, 172, 193, 0.02)");
                    },
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: petrol,
                    pointHoverBorderColor: pointBorder,
                    pointHoverBorderWidth: 2,
                    order: 3,
                },
                {
                    label: "Saída",
                    data: saida,
                    borderColor: red,
                    backgroundColor: (ctx) => {
                        const { chart } = ctx;
                        if (!chart.chartArea) return "rgba(220, 38, 38, 0.12)";
                        return makeGradient(chart.ctx, chart.chartArea,
                            "rgba(220, 38, 38, 0.22)", "rgba(220, 38, 38, 0.02)");
                    },
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: red,
                    pointHoverBorderColor: pointBorder,
                    pointHoverBorderWidth: 2,
                    order: 2,
                },
                {
                    label: "Líquido",
                    data: liquido,
                    borderColor: gold,
                    backgroundColor: "transparent",
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: gold,
                    pointBorderColor: pointBorder,
                    pointBorderWidth: 2,
                    pointRadius: (ctx) => {
                        const v = ctx.parsed?.y ?? 0;
                        return v === 0 ? 0 : 3.5;
                    },
                    pointHoverRadius: 7,
                    order: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            layout: { padding: { top: 28, right: 12, left: 4, bottom: 4 } },
            animation: { duration: 700, easing: "easeOutQuart" },
            plugins: {
                hoverGuide: { currentMonth, liquidoLabels },
                legend: {
                    position: "bottom",
                    align: "end",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 18,
                        font: { size: 12, weight: "600", family: displayFont },
                        color: legendColor,
                    },
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: "rgba(22, 25, 31, 0.96)",
                    titleColor: gold,
                    titleFont: { weight: "700", size: 13, family: displayFont },
                    titleMarginBottom: 8,
                    bodyColor: cream,
                    bodyFont: { size: 12, family: monoFont },
                    bodySpacing: 6,
                    padding: { x: 14, y: 12 },
                    cornerRadius: 10,
                    displayColors: true,
                    boxPadding: 6,
                    borderColor: "rgba(212, 175, 55, 0.28)",
                    borderWidth: 1,
                    caretSize: 6,
                    callbacks: {
                        title: (items) => items[0]?.label || "",
                        label: (c) => `  ${c.dataset.label}: ${fmt.format(c.raw)}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: tickColor, font: { size: 11, weight: "600", family: displayFont }, padding: 6 },
                    border: { display: false },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, drawTicks: false, lineWidth: 1 },
                    ticks: {
                        color: tickColor,
                        font: { size: 10, family: monoFont },
                        padding: 10,
                        maxTicksLimit: 6,
                        callback: (v) => fmtCompact.format(v),
                    },
                    border: { display: false },
                },
            },
        },
        plugins: [hoverGuidePlugin],
    });
    updateChartTheme(state.chart, dark);
}

async function saveLancamento(ev) {
    ev.preventDefault();
    flushPendingTag();
    const id = document.getElementById("lancId").value;
    const tipo = document.getElementById("lancTipo").value;
    const descricao = document.getElementById("lancDescricao").value.trim();
    const valor = parseFloat(document.getElementById("lancValor").value);
    const observacao = document.getElementById("lancObs").value.trim();
    const secao = document.getElementById("lancSecao").value;

    const payload = { valor, descricao, observacao, tags: state.modalTags, secao };
    const novasTags = state.modalTags.some(
        (t) => !state.allTags.some((s) => s.toLowerCase() === t.toLowerCase())
    );

    try {
        if (id) {
            await api(`/api/lancamentos/${id}`, { method: "PUT", body: JSON.stringify(payload) });
            toast("Lancamento atualizado");
        } else {
            await api("/api/lancamentos", {
                method: "POST",
                body: JSON.stringify({
                    ano: state.ano,
                    mes: state.mes,
                    tipo,
                    descricao,
                    valor,
                    observacao,
                    secao,
                    tags: state.modalTags,
                }),
            });
            toast("Lancamento criado");
        }
        document.getElementById("modalLancamento").close();

        // Atualizar o mes e o grafico em paralelo; tags so quando uma nova foi usada;
        // anos so depois de criar (edits nao mudam anos).
        _cache.delete(CK.mes()); _cache.delete(CK.chart());
        if (novasTags) _cache.delete(CK.tags);
        if (!id) _cache.delete(CK.anos);
        const tasks = [loadMes(), loadChart()];
        if (novasTags) tasks.push(loadTags());
        if (!id) tasks.push(loadAnos());
        await Promise.all(tasks);
    } catch (err) {
        toast(err.message, true);
    }
}

// ── Histórico ────────────────────────────────────────────────────
const ACAO_LABELS = {
    criado:       { icon: MI.autoAwesome, label: "Criado" },
    editado:      { icon: MI.edit, label: "Editado" },
    pago:         { icon: MI.checkCircle, label: "Marcado como pago" },
    despago:      { icon: MI.undo, label: "Desmarcado como pago" },
    investido:    { icon: MI.trendingUp, label: "Marcado como investimento" },
    desinvestido: { icon: MI.undo, label: "Desmarcado como investimento" },
    excluido:     { icon: MI.delete, label: "Excluído" },
    restaurado:   { icon: MI.restore, label: "Restaurado" },
};

const CAMPO_LABELS = {
    descricao: "Descrição", valor: "Valor", secao: "Seção",
    observacao: "Observação", tags: "Tags", pago: "Pago", investido: "Investido",
    tipo: "Tipo", mes: "Mês", ano: "Ano",
};

function fmtHistoricoValor(campo, val) {
    if (val === null || val === undefined) return "—";
    if (campo === "valor") return fmt.format(Number(val));
    if (campo === "pago" || campo === "investido") return val ? "Sim" : "Não";
    if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
    return escapeHtml(String(val));
}

function renderHistoricoEntry(entry) {
    const info = ACAO_LABELS[entry.acao] || { icon: "fiber_manual_record", label: entry.acao };
    const antes = entry.antes || {};
    const depois = entry.depois || {};
    const campos = new Set([...Object.keys(antes), ...Object.keys(depois)]);
    const linhas = [...campos].map((campo) => {
        const lbl = CAMPO_LABELS[campo] || campo;
        const a = fmtHistoricoValor(campo, antes[campo]);
        const d = fmtHistoricoValor(campo, depois[campo]);
        if (entry.acao === "criado") {
            return `<div class="hist-campo"><span class="hist-campo-nome">${escapeHtml(lbl)}</span><span class="hist-valor-depois">${d}</span></div>`;
        }
        return `<div class="hist-campo"><span class="hist-campo-nome">${escapeHtml(lbl)}</span><span class="hist-valor-antes">${a}</span><span class="hist-arrow">→</span><span class="hist-valor-depois">${d}</span></div>`;
    }).join("");

    return `
        <div class="hist-entry">
            <div class="hist-entry-header">
                <span class="hist-acao-icon">${mi(info.icon, "mi-hist")}</span>
                <span class="hist-acao-label">${escapeHtml(info.label)}</span>
                <span class="hist-ts">${fmtTs(entry.ts)}</span>
            </div>
            ${linhas ? `<div class="hist-campos">${linhas}</div>` : ""}
        </div>`;
}

async function openHistoricoModal(id) {
    const dlg = document.getElementById("modalHistorico");
    const body = document.getElementById("historicoBody");
    const subtitle = document.getElementById("historicoSubtitle");
    body.innerHTML = `<div class="empty-state" style="padding:32px">Carregando…</div>`;
    subtitle.textContent = "";
    dlg.showModal();
    try {
        const data = await api(`/api/lancamentos/${id}/historico`);
        subtitle.textContent = data.descricao || "";
        if (!data.historico || !data.historico.length) {
            body.innerHTML = `<div class="empty-state" style="padding:32px">Nenhuma alteração registrada.</div>`;
            return;
        }
        body.innerHTML = `<div class="hist-list">${data.historico.map(renderHistoricoEntry).join("")}</div>`;
    } catch (err) {
        body.innerHTML = `<div class="empty-state" style="padding:32px;color:var(--red)">${escapeHtml(err.message)}</div>`;
    }
}

// ── Lixeira ──────────────────────────────────────────────────────
function fmtLixeiraRow(item) {
    const mes = item.mes_nome ? `${item.mes_nome}/${item.ano}` : item.ano;
    const tipo = item.tipo === "receita"
        ? `<span class="badge-receita">Receita</span>`
        : `<span class="badge-despesa">Despesa</span>`;
    const excluido = fmtTs(item.excluido_em);
    return `
        <tr class="lixeira-row" data-id="${item.id}">
            <td data-label="Tipo">${tipo}</td>
            <td data-label="Descrição"><strong>${escapeHtml(item.descricao)}</strong><br><small>${escapeHtml(item.secao || "")}</small></td>
            <td class="col-valor" data-label="Valor">${fmt.format(item.valor)}</td>
            <td data-label="Período"><small>${escapeHtml(mes)}</small></td>
            <td data-label="Excluído"><small class="text-muted">${escapeHtml(excluido)}</small></td>
            <td class="col-acoes" data-label="Ações">
                <button class="btn btn-ghost btn-sm btn-restaurar" data-id="${item.id}" title="Restaurar">${miWithText(MI.restore, "Restaurar", "mi-inline")}</button>
                <button class="btn btn-danger btn-sm btn-del-permanente" data-id="${item.id}" title="Excluir permanentemente">${mi(MI.delete, "mi-btn")}</button>
            </td>
        </tr>`;
}

async function loadLixeira() {
    const body = document.getElementById("lixeiraBody");
    body.innerHTML = `<div class="empty-state" style="padding:32px">Carregando…</div>`;
    try {
        const data = await api("/api/lixeira");
        if (!data.lixeira || !data.lixeira.length) {
            body.innerHTML = `<div class="empty-state" style="padding:40px">Lixeira vazia</div>`;
            return;
        }
        body.innerHTML = `
            <div class="table-wrap">
                <table class="responsive-table">
                    <thead><tr>
                        <th>Tipo</th><th>Descrição</th>
                        <th class="col-valor">Valor</th>
                        <th>Período</th><th>Excluído em</th><th class="col-acoes">Ações</th>
                    </tr></thead>
                    <tbody>${data.lixeira.map(fmtLixeiraRow).join("")}</tbody>
                </table>
            </div>`;
        body.querySelectorAll(".btn-restaurar").forEach((btn) => {
            btn.addEventListener("click", () => restaurarLancamento(btn.dataset.id));
        });
        body.querySelectorAll(".btn-del-permanente").forEach((btn) => {
            btn.addEventListener("click", () => deletarPermanente(btn.dataset.id));
        });
    } catch (err) {
        body.innerHTML = `<div class="empty-state" style="padding:32px;color:var(--red)">${escapeHtml(err.message)}</div>`;
    }
}

async function restaurarLancamento(id) {
    try {
        await api(`/api/lixeira/${id}/restaurar`, { method: "POST" });
        toast("Lançamento restaurado");
        _cache.delete(CK.anos); _cache.delete(CK.mes()); _cache.delete(CK.chart());
        await Promise.all([loadLixeira(), loadAnos(), loadMes(), loadChart()]);
    } catch (err) { toast(err.message, true); }
}

async function deletarPermanente(id) {
    if (!confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) return;
    try {
        await api(`/api/lixeira/${id}`, { method: "DELETE" });
        toast("Excluído permanentemente");
        await loadLixeira();
    } catch (err) { toast(err.message, true); }
}

async function esvaziarLixeira() {
    if (!confirm("Esvaziar a lixeira? Todos os lançamentos serão excluídos permanentemente.")) return;
    try {
        const data = await api("/api/lixeira", { method: "DELETE" });
        toast(`Lixeira esvaziada (${data.removidos} item${data.removidos !== 1 ? "s" : ""})`);
        await loadLixeira();
    } catch (err) { toast(err.message, true); }
}

function bindEvents() {
    initHeaderMenu();
    document.getElementById("anoSelect").addEventListener("change", async (e) => {
        state.ano = parseInt(e.target.value, 10);
        await loadMesesRevisados();
        await loadMes();
        await loadChart();
    });

    document.getElementById("tagText").addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addModalTag(e.target.value);
        } else if (e.key === "Backspace" && !e.target.value && state.modalTags.length) {
            state.modalTags.pop();
            renderModalTags();
        }
    });

    document.getElementById("tagText").addEventListener("blur", (e) => {
        if (e.target.value.trim()) addModalTag(e.target.value);
    });

    document.getElementById("btnNovo").addEventListener("click", () => openModal("despesa"));
    document.querySelectorAll("[data-add]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(btn.dataset.add));
    });

    document.getElementById("lancTipo").addEventListener("change", (e) => {
        fillSecaoSelect(e.target.value);
        toggleNovaSecaoForm(false);
    });

    document.getElementById("btnNovaSecao").addEventListener("click", () => toggleNovaSecaoForm(true));
    document.getElementById("btnSalvarSecao").addEventListener("click", createSecao);
    document.getElementById("btnCancelarSecao").addEventListener("click", () => toggleNovaSecaoForm(false));
    document.getElementById("novaSecaoNome").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            createSecao();
        }
    });

    document.getElementById("formLancamento").addEventListener("submit", saveLancamento);
    document.getElementById("btnCancelar").addEventListener("click", () => {
        document.getElementById("modalLancamento").close();
    });
    document.getElementById("btnFecharModal").addEventListener("click", () => {
        document.getElementById("modalLancamento").close();
    });

    document.getElementById("btnNovoAno").addEventListener("click", openModalAno);
    document.getElementById("formAno").addEventListener("submit", criarAno);
    document.getElementById("btnCancelarAno").addEventListener("click", () => {
        document.getElementById("modalAno").close();
    });
    document.getElementById("btnFecharAno").addEventListener("click", () => {
        document.getElementById("modalAno").close();
    });

    document.getElementById("btnExcluirAno").addEventListener("click", openModalExcluirAno);
    document.getElementById("formExcluirAno").addEventListener("submit", confirmarExcluirAno);
    document.getElementById("btnCancelarExcluirAno").addEventListener("click", () => {
        document.getElementById("modalExcluirAno").close();
    });
    document.getElementById("btnFecharExcluirAno").addEventListener("click", () => {
        document.getElementById("modalExcluirAno").close();
    });

    document.getElementById("btnTheme").addEventListener("click", () => applyTheme(!state.darkMode));
    document.getElementById("btnDownloadTemplate").addEventListener("click", downloadTemplate);
    document.getElementById("btnImportExcel").addEventListener("click", () => {
        document.getElementById("fileExcel").click();
    });
    document.getElementById("fileExcel").addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (file) await importarExcel(file);
    });

    // Histórico de alterações
    document.getElementById("btnFecharHistorico")?.addEventListener("click", () => document.getElementById("modalHistorico").close());
    document.getElementById("btnFecharHistoricoFooter")?.addEventListener("click", () => document.getElementById("modalHistorico").close());
    document.getElementById("modalHistorico")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

    document.getElementById("btnLimparMes")?.addEventListener("click", limparMes);

    // Lixeira
    document.getElementById("btnLixeira")?.addEventListener("click", () => {
        document.getElementById("modalLixeira").showModal();
        loadLixeira();
    });
    document.getElementById("btnFecharLixeira")?.addEventListener("click", () => document.getElementById("modalLixeira").close());
    document.getElementById("btnFecharLixeiraFooter")?.addEventListener("click", () => document.getElementById("modalLixeira").close());
    document.getElementById("btnEsvaziarLixeira")?.addEventListener("click", esvaziarLixeira);
    document.getElementById("modalLixeira")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
}

async function safeRun(fn, label) {
    try {
        await fn();
    } catch (err) {
        console.error(`[gastos] Falha em ${label}:`, err);
        toast(`Falha em ${label}: ${err.message}`, true);
    }
}

function initHeaderMenu() {
    const header = document.getElementById("appHeader");
    const btn = document.getElementById("btnHeaderMenu");
    if (!header || !btn) return;

    const close = () => {
        header.classList.remove("header-open");
        btn.setAttribute("aria-expanded", "false");
        btn.querySelector(".material-icons").textContent = "menu";
    };

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = header.classList.toggle("header-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.querySelector(".material-icons").textContent = open ? "close" : "menu";
    });

    header.querySelectorAll(".header-buttons .btn").forEach((el) => {
        el.addEventListener("click", close);
    });

    document.addEventListener("click", (e) => {
        if (!header.classList.contains("header-open")) return;
        if (header.contains(e.target)) return;
        close();
    });

    window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 900px)").matches) close();
    });
}

async function init() {
    bindEvents();
    renderMonthTabs();
    // Fase 1: requests independentes em paralelo. loadAnos pode alterar state.ano,
    // então tudo que depende do ano corrente roda na fase 2.
    await Promise.all([
        safeRun(loadSecoes, "carregar seções"),
        safeRun(loadTags, "carregar tags"),
        safeRun(loadAnos, "carregar anos"),
    ]);
    await Promise.all([
        safeRun(loadMesesRevisados, "carregar revisão dos meses"),
        safeRun(loadMes, "carregar mês"),
        safeRun(loadChart, "carregar gráfico"),
    ]);
    hideAppLoading();
}

// Quando o auth.js esta carregado, ele dispara o evento "app:ready" depois
// que o usuario esta autenticado (ou imediatamente em modo json). Caso o
// auth.js nao exista (build antigo), caimos no DOMContentLoaded direto.
window.addEventListener("app:ready", () => init());
window.addEventListener("DOMContentLoaded", () => {
    if (!window.AppAuth) init();
});
