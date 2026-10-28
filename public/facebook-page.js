// Master › Integrações › Postar no Facebook (28/10/2026). Não depende do app.js para não derrubar o painel.
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const CLIENT = "primeiro-teste"; // Flow Arts
  const when = iso => iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ainda não";
  const api = (path, opts = {}) => fetch(path, { credentials: "same-origin", ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } })
    .then(r => r.json().catch(() => ({})));

  async function load() {
    if (!$("#fbpage-panel")) return;
    const d = await api("/api/master/facebook-page?clientId=" + CLIENT);
    if (d.error === "unauthorized") return;
    const on = d.connected && d.enabled;
    $("#fbpage-state").textContent = on ? "LIGADO" : d.connected ? "PAUSADO" : "DESLIGADO";
    $("#fbpage-state").className = on ? "badge" : "badge off";
    $("#fbpage-connect").textContent = d.connected ? "Conectar de novo" : "Conectar Página";
    const toggle = $("#fbpage-toggle");
    toggle.hidden = !d.connected;
    toggle.textContent = d.enabled ? "Pausar" : "Ligar de novo";
    let info;
    if (!d.appConfigured) info = "Falta colocar os códigos META_APP_ID e META_APP_SECRET na Cloudflare.";
    else if (!d.connected) info = "Toque em Conectar Página e autorize a Página da Flow Arts, com a opção de publicar ligada.";
    else {
      info = "Página: " + d.pageName + ". Último post no Facebook: " + when(d.lastPostAt) + ".";
      if (d.lastError) info += " Último erro da Meta: " + d.lastError;
    }
    $("#fbpage-info").textContent = info;
  }

  document.addEventListener("click", async event => {
    if (event.target.id === "fbpage-connect") {
      event.target.disabled = true;
      const d = await api("/api/master/facebook-page/connect", { method: "POST", body: JSON.stringify({ clientId: CLIENT }) });
      event.target.disabled = false;
      if (d.url) location.href = d.url;
      else $("#fbpage-info").textContent = d.message || "Não deu certo agora.";
    }
    if (event.target.id === "fbpage-toggle") {
      event.target.disabled = true;
      const enabled = event.target.textContent !== "Pausar";
      const d = await api("/api/master/facebook-page/toggle", { method: "POST", body: JSON.stringify({ clientId: CLIENT, enabled }) });
      event.target.disabled = false;
      if (!d.ok) $("#fbpage-info").textContent = d.message || "Não deu certo agora.";
      else load();
    }
  });
  document.addEventListener("click", e => { if (e.target.closest?.('[data-view="settings"]')) setTimeout(load, 50); });
  if (document.readyState !== "loading") load(); else document.addEventListener("DOMContentLoaded", load);
})();
