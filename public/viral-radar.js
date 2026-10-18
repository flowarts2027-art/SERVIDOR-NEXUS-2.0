// Master › Integrações › Radar de virais. Não depende do app.js para não derrubar o painel.
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NAMES = { marketing: "Marketing (Flow Arts)", salao: "Salão de beleza", pet: "Pet shop", racao: "Loja de ração", roupas: "Loja de roupas", oficina: "Oficina mecânica" };
  const when = iso => iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
  const api = (path, opts = {}) => fetch(path, { credentials: "same-origin", ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } })
    .then(r => r.json().catch(() => ({})));

  async function load() {
    const panel = $("#radar-panel");
    if (!panel) return;
    const d = await api("/api/master/viral-radar");
    if (d.error === "unauthorized") return;
    const state = $("#radar-state");
    state.textContent = d.connected ? "LIGADO" : "DESLIGADO";
    state.className = d.connected ? "badge" : "badge off";
    $("#radar-run").hidden = !d.connected;
    $("#radar-connect").textContent = d.connected ? "Conectar de novo" : "Conectar Facebook";
    let info;
    if (!d.appConfigured) info = "Falta colocar os códigos META_APP_ID e META_APP_SECRET na Cloudflare.";
    else if (!d.connected) info = "Toque em Conectar Facebook e autorize a Página da Flow Arts.";
    else {
      info = "Conta @" + esc(d.igUsername) + ". Última busca: " + when(d.lastRunAt) + ".";
      const err = d.lastResult?.errors?.[0];
      if (err && !d.lastResult?.ok) info += " A Meta respondeu: " + esc(err.message) + ".";
    }
    $("#radar-info").innerHTML = info;
    const results = d.results || {};
    $("#radar-results").innerHTML = Object.entries(results).filter(([, list]) => list.length).map(([key, list]) =>
      `<details class="fold"><summary><span class="fold-icon">🔥</span><span><strong>${esc(NAMES[key] || key)}</strong><small>${list.length} ganchos</small></span></summary><div class="fold-body">` +
      list.map(i => `<p><b>${esc(i.hook)}</b><br><small class="muted">${esc(i.format)} · ${i.likes} curtidas · ${i.comments} comentários${i.permalink ? ` · <a href="${esc(i.permalink)}" target="_blank" rel="noopener">ver</a>` : ""}</small></p>`).join("") +
      `</div></details>`).join("");
  }

  document.addEventListener("click", async event => {
    if (event.target.id === "radar-connect") {
      event.target.disabled = true;
      const d = await api("/api/master/viral-radar/connect", { method: "POST", body: "{}" });
      event.target.disabled = false;
      if (d.url) location.href = d.url;
      else $("#radar-info").textContent = d.message || "Não deu certo agora.";
    }
    if (event.target.id === "radar-run") {
      event.target.disabled = true;
      $("#radar-info").textContent = "Buscando… pode levar um minuto.";
      const d = await api("/api/master/viral-radar/run", { method: "POST", body: "{}" });
      event.target.disabled = false;
      if (!d.ok) $("#radar-info").textContent = d.skipped === "not_connected" ? "Conecte o Facebook primeiro." : "A Meta não deixou buscar: " + (d.errors?.[0]?.message || d.message || "erro desconhecido");
      else load();
    }
  });
  document.addEventListener("click", e => { if (e.target.closest?.('[data-view="settings"]')) setTimeout(load, 50); });
  if (document.readyState !== "loading") load(); else document.addEventListener("DOMContentLoaded", load);
})();
