/* Autenticacao adaptativa por backend.
 *
 * - modo "json"     : inicializa o app direto, sem pedir login.
 * - modo "mysql"    : login/registro via /api/auth/login e /api/auth/register;
 *                     JWT armazenado em localStorage.
 * - modo "supabase" : login via Supabase JS SDK (comportamento anterior).
 */

(function () {
    "use strict";

    const state = {
        config: null,
        client: null,   // apenas supabase
        session: null,  // apenas supabase
        token: null,    // apenas mysql
        userId: null,   // apenas mysql
        mode: "signin", // "signin" | "signup"
        ready: false,
    };

    const overlay  = () => document.getElementById("authOverlay");
    const errorEl  = () => document.getElementById("authError");
    const submitBtn= () => document.getElementById("authSubmit");
    const logoutBtn= () => document.getElementById("btnLogout");

    function showOverlay(visible) {
        const el = overlay();
        if (!el) return;
        el.classList.toggle("hidden", !visible);
        el.setAttribute("aria-hidden", visible ? "false" : "true");
        document.body.classList.toggle("auth-locked", visible);
    }

    function showError(msg) {
        const el = errorEl();
        if (!el) return;
        el.textContent = msg || "";
        el.classList.toggle("hidden", !msg);
    }

    function setMode(mode) {
        state.mode = mode;
        const title      = document.getElementById("authTitle");
        const subtitle   = document.getElementById("authSubtitle");
        const btn        = submitBtn();
        const switchText = document.getElementById("authSwitchText");
        const switchBtn  = document.getElementById("authSwitchBtn");
        if (mode === "signup") {
            title.textContent      = "Criar conta";
            subtitle.textContent   = "Crie uma conta para isolar seus dados";
            btn.textContent        = "Cadastrar";
            switchText.textContent = "Ja tem conta?";
            switchBtn.textContent  = "Entrar";
        } else {
            title.textContent      = "Entrar";
            subtitle.textContent   = "Acesse sua conta para ver seus gastos";
            btn.textContent        = "Entrar";
            switchText.textContent = "Nao tem conta?";
            switchBtn.textContent  = "Cadastre-se";
        }
        showError("");
    }

    async function loadConfig() {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error("Nao foi possivel obter /api/config");
        return res.json();
    }

    // -----------------------------------------------------------------------
    // Modo MySQL
    // -----------------------------------------------------------------------

    const MYSQL_TOKEN_KEY = "monesy_jwt";
    const MYSQL_USER_KEY  = "monesy_user_id";

    function mysqlSaveSession(token, userId) {
        localStorage.setItem(MYSQL_TOKEN_KEY, token);
        localStorage.setItem(MYSQL_USER_KEY, userId);
        state.token  = token;
        state.userId = userId;
    }

    function mysqlClearSession() {
        localStorage.removeItem(MYSQL_TOKEN_KEY);
        localStorage.removeItem(MYSQL_USER_KEY);
        state.token  = null;
        state.userId = null;
    }

    function mysqlLoadSession() {
        state.token  = localStorage.getItem(MYSQL_TOKEN_KEY) || null;
        state.userId = localStorage.getItem(MYSQL_USER_KEY) || null;
    }

    async function mysqlHandleSubmit(evt) {
        evt.preventDefault();
        showError("");
        const email    = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPassword").value;
        if (!email || !password) { showError("Preencha email e senha"); return; }

        submitBtn().disabled = true;
        try {
            const endpoint = state.mode === "signup"
                ? "/api/auth/register"
                : "/api/auth/login";
            const res  = await fetch(endpoint, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { showError(data.error || "Falha na autenticacao"); return; }
            mysqlSaveSession(data.token, data.user_id);
            applyMysqlSession(true);
        } catch (err) {
            showError(err.message || "Falha na autenticacao");
        } finally {
            submitBtn().disabled = false;
        }
    }

    function applyMysqlSession(hasSession) {
        if (typeof hideAppLoading === "function") hideAppLoading();
        if (hasSession) {
            showOverlay(false);
            logoutBtn()?.classList.remove("hidden");
            if (!state.ready) {
                state.ready = true;
                window.dispatchEvent(new CustomEvent("app:ready"));
            }
        } else {
            showOverlay(true);
            logoutBtn()?.classList.add("hidden");
        }
    }

    function mysqlLogout() {
        mysqlClearSession();
        showOverlay(true);
        logoutBtn()?.classList.add("hidden");
        const pwEl = document.getElementById("authPassword");
        if (pwEl) pwEl.value = "";
    }

    async function startMysql() {
        mysqlLoadSession();

        document.getElementById("authForm").addEventListener("submit", mysqlHandleSubmit);
        document.getElementById("authSwitchBtn").addEventListener("click", () => {
            setMode(state.mode === "signin" ? "signup" : "signin");
        });
        logoutBtn()?.addEventListener("click", mysqlLogout);
        setMode("signin");

        if (state.token) {
            // Valida o token salvo com uma chamada leve ao backend
            try {
                const res = await fetch("/api/anos", {
                    headers: { Authorization: `Bearer ${state.token}` },
                });
                if (res.ok) { applyMysqlSession(true); return; }
            } catch (_) { /* ignora */ }
            mysqlClearSession();
        }
        applyMysqlSession(false);
    }

    // -----------------------------------------------------------------------
    // Modo Supabase
    // -----------------------------------------------------------------------

    function createSupabaseClient(cfg) {
        const { createClient } = window.supabase;
        return createClient(cfg.url, cfg.anon_key, {
            auth: { persistSession: true, autoRefreshToken: true },
        });
    }

    async function handleSupabaseSubmit(evt) {
        evt.preventDefault();
        showError("");
        const email    = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPassword").value;
        if (!email || !password) { showError("Preencha email e senha"); return; }

        submitBtn().disabled = true;
        try {
            let result;
            if (state.mode === "signup") {
                result = await state.client.auth.signUp({ email, password });
                if (result.error) throw result.error;
                if (!result.data.session) {
                    showError("Conta criada. Confirme o email se necessario e entre.");
                    setMode("signin");
                    return;
                }
            } else {
                result = await state.client.auth.signInWithPassword({ email, password });
                if (result.error) throw result.error;
            }
            await applySupabaseSession(result.data.session);
        } catch (err) {
            showError(err.message || "Falha na autenticacao");
        } finally {
            submitBtn().disabled = false;
        }
    }

    async function applySupabaseSession(session) {
        if (typeof hideAppLoading === "function") hideAppLoading();
        state.session = session || null;
        if (session) {
            showOverlay(false);
            logoutBtn()?.classList.remove("hidden");
            if (!state.ready) {
                state.ready = true;
                window.dispatchEvent(new CustomEvent("app:ready"));
            }
        } else {
            showOverlay(true);
            logoutBtn()?.classList.add("hidden");
        }
    }

    async function supabaseLogout() {
        if (!state.client) return;
        await state.client.auth.signOut();
        state.session = null;
        showOverlay(true);
        logoutBtn()?.classList.add("hidden");
        const pwEl = document.getElementById("authPassword");
        if (pwEl) pwEl.value = "";
    }

    async function startSupabase(cfg) {
        // Espera o supabase-js carregar
        if (!window.supabase || !window.supabase.createClient) {
            await new Promise((r) => setTimeout(r, 50));
            return startSupabase(cfg);
        }
        state.client = createSupabaseClient(cfg.supabase);

        document.getElementById("authForm").addEventListener("submit", handleSupabaseSubmit);
        document.getElementById("authSwitchBtn").addEventListener("click", () => {
            setMode(state.mode === "signin" ? "signup" : "signin");
        });
        logoutBtn()?.addEventListener("click", supabaseLogout);
        setMode("signin");

        const { data } = await state.client.auth.getSession();
        await applySupabaseSession(data.session);

        state.client.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT") applySupabaseSession(null);
            else if (session) state.session = session;
        });
    }

    // -----------------------------------------------------------------------
    // Entry point
    // -----------------------------------------------------------------------

    async function start() {
        try {
            state.config = await loadConfig();
        } catch (err) {
            console.error("[auth] /api/config falhou", err);
            // fallback: inicia o app sem autenticacao
            state.ready = true;
            window.dispatchEvent(new CustomEvent("app:ready"));
            return;
        }

        const backend = state.config.backend;

        if (backend === "mysql") {
            await startMysql();
            return;
        }

        if (backend === "supabase" && state.config.supabase) {
            await startSupabase(state.config);
            return;
        }

        // Modo json: sem login
        state.ready = true;
        window.dispatchEvent(new CustomEvent("app:ready"));
    }

    // -----------------------------------------------------------------------
    // API publica (usada por app.js / assinaturas.js / features.js)
    // -----------------------------------------------------------------------

    window.AppAuth = {
        getAccessToken() {
            // mysql
            if (state.token) return state.token;
            // supabase
            return state.session?.access_token || null;
        },
        getUserId() {
            // mysql
            if (state.userId) return state.userId;
            // supabase
            return state.session?.user?.id || null;
        },
        isReady() {
            return state.ready;
        },
        async handleUnauthorized() {
            if (state.token) {
                // mysql: JWT expirado/invalido — forca novo login
                mysqlClearSession();
                showOverlay(true);
                logoutBtn()?.classList.add("hidden");
                return;
            }
            if (!state.client) return;
            await state.client.auth.signOut();
            await applySupabaseSession(null);
        },
    };

    document.addEventListener("DOMContentLoaded", start);
})();
