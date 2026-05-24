/** Google Material Icons — helpers globais */
function mi(name, extraClass = "") {
    const cls = extraClass ? `material-icons ${extraClass}` : "material-icons";
    return `<span class="${cls}" aria-hidden="true">${name}</span>`;
}

function miWithText(icon, text, iconClass = "mi-inline") {
    return `${mi(icon, iconClass)}${text}`;
}

function setThemeIcon(btn, dark) {
    if (!btn) return;
    btn.innerHTML = mi(dark ? "light_mode" : "dark_mode");
    btn.title = dark ? "Modo claro" : "Modo escuro";
    btn.setAttribute("aria-label", btn.title);
}

const MI = {
    add: "add",
    check: "check",
    checkCircle: "check_circle",
    close: "close",
    delete: "delete_outline",
    download: "download",
    edit: "edit",
    history: "history",
    restore: "restore",
    trendingUp: "trending_up",
    undo: "undo",
    upload: "upload",
    autoAwesome: "auto_awesome",
};
