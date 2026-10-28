// Biblioteca de artes (pedido do Rodrigo, 28/10/2026).
// Painel do cliente (aba "Biblioteca") e Master (/biblioteca.html?clientId=...).
// Você sobe várias imagens; o Nexus apaga as repetidas, decide story/post/carrossel,
// escreve a legenda e programa nos próximos horários livres, esperando aprovação.
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MASTER = location.pathname.startsWith("/biblioteca");
  let clientId = new URLSearchParams(location.search).get("clientId") || "";
  let loaded = false;
  const base = () => MASTER ? "/api/master/biblioteca" : "/api/portal/biblioteca";
  const q = path => base() + path + (MASTER ? (path.includes("?") ? "&" : "?") + "clientId=" + encodeURIComponent(clientId) : "");
  const quando = iso => iso ? new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
  const NOME = { story: "Story", post: "Post", carousel: "Carrossel" };

  async function call(path, init) {
    const r = await fetch(q(path), { credentials: "same-origin", cache: "no-store", ...(init || {}) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error(MASTER ? "Entre no Master primeiro." : "Sua sessão terminou. Entre novamente.");
    if (!r.ok || j.ok === false) throw new Error(j.message || "Não deu certo. Tente de novo.");
    return j;
  }

  function render(items, aviso = "") {
    const box = $("#biblioteca");
    if (!box) return;
    const livres = items.filter(i => i.status === "livre").length;
    box.innerHTML = `
      <section class="block bib">
        <p class="muted">Suba várias imagens de uma vez. O Nexus <strong>apaga as repetidas</strong>, decide o que é <strong>story</strong> (imagem em pé), <strong>post</strong> ou <strong>carrossel</strong> (imagens enviadas juntas), <strong>escreve a legenda</strong> e coloca nos <strong>próximos dias livres</strong> (9h, 12h e 19h; dia que já tem postagem fica de fora). Tudo fica esperando aprovação.</p>
        <label class="btn bib-enviar">＋ Escolher imagens
          <input type="file" id="bib-files" accept="image/jpeg,image/png,image/webp" multiple hidden>
        </label>
        <button type="button" class="btn ghost" id="bib-organizar" ${livres ? "" : "disabled"}>Programar as ${livres} livres</button>
        <p id="bib-status" class="muted" role="status">${esc(aviso)}</p>
        <div class="bib-grade">
          ${items.length ? items.map(i => `
            <figure class="bib-item ${esc(i.status)}">
              <img src="${esc(i.url)}" alt="" loading="lazy">
              <figcaption>
                <b>${i.status === "programado" ? esc(NOME[i.postType] || "Post") + " · " + esc(quando(i.when)) : i.status === "erro" ? "Erro: " + esc(i.error) : (i.format === "story" ? "Story" : "Post/carrossel") + " · livre"}</b>
                ${i.status !== "programado" ? `<button type="button" data-bib-remover="${esc(i.id)}" class="link">Tirar</button>` : ""}
              </figcaption>
            </figure>`).join("") : `<div class="empty"><strong>Biblioteca vazia</strong>Escolha as imagens para começar.</div>`}
        </div>
      </section>`;
  }

  function resumo(r) {
    const partes = [];
    if (r.added) partes.push(`${r.added} imagem(ns) nova(s)`);
    if (r.duplicates?.length) partes.push(`${r.duplicates.length} repetida(s) descartada(s)`);
    if (r.invalid?.length) partes.push(`${r.invalid.length} arquivo(s) inválido(s) (use JPG, PNG ou WEBP até 8 MB)`);
    const o = r.organized || (r.scheduled ? r : null);
    if (o) {
      if (o.scheduled?.length) partes.push(`${o.scheduled.length} postagem(ns) programada(s), esperando aprovação`);
      if (o.duplicatesRemoved) partes.push(`${o.duplicatesRemoved} post(s) repetido(s) tirado(s) da fila`);
      if (o.leftover) partes.push(`${o.leftover} ficaram livres (sem horário nos próximos 14 dias)`);
    }
    return partes.join(" · ") || "Pronto.";
  }

  async function load(aviso = "") {
    const box = $("#biblioteca");
    if (!box) return;
    if (MASTER && !clientId) { box.innerHTML = `<div class="empty"><strong>Escolha o cliente</strong></div>`; return; }
    try { render((await call("")).items, aviso); loaded = true; }
    catch (e) { box.innerHTML = `<div class="empty"><strong>Não consegui abrir a biblioteca</strong>${esc(e.message)}</div>`; }
  }

  document.addEventListener("change", async ev => {
    if (ev.target?.id === "bib-files") {
      const files = [...ev.target.files];
      if (!files.length) return;
      $("#bib-status").textContent = `Enviando ${files.length} imagem(ns) e programando… pode levar alguns minutos.`;
      const form = new FormData();
      files.slice(0, 30).forEach(f => form.append("images", f, f.name));
      try { const r = await call("/enviar", { method: "POST", body: form }); render(r.items, resumo(r)); }
      catch (e) { $("#bib-status").textContent = e.message; }
    }
    if (ev.target?.id === "bib-cliente") { clientId = ev.target.value; history.replaceState(null, "", "?clientId=" + encodeURIComponent(clientId)); load(); }
  });

  document.addEventListener("click", async ev => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    if (!MASTER && t.closest('.tabbar [data-tab="biblioteca"], #more-sheet [data-tab="biblioteca"]') && !loaded) load();
    if (t.id === "bib-organizar") {
      t.disabled = true; $("#bib-status").textContent = "Programando… pode levar alguns minutos.";
      try { const r = await call("/organizar", { method: "POST" }); render(r.items, resumo(r)); }
      catch (e) { $("#bib-status").textContent = e.message; t.disabled = false; }
    }
    const rem = t.closest("[data-bib-remover]");
    if (rem) {
      try { const r = await call("/remover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: rem.dataset.bibRemover }) }); render(r.items, "Imagem tirada da biblioteca."); }
      catch (e) { $("#bib-status").textContent = e.message; }
    }
  });

  if (MASTER) {
    document.addEventListener("DOMContentLoaded", async () => {
      try {
        const clients = await (await fetch("/api/clients", { credentials: "same-origin" })).json();
        const sel = $("#bib-cliente");
        sel.innerHTML = `<option value="">Escolha…</option>` + (Array.isArray(clients) ? clients : []).map(c => `<option value="${esc(c.id)}" ${c.id === clientId ? "selected" : ""}>${esc(c.name || c.id)}</option>`).join("");
      } catch { /* sem login */ }
      load();
    });
  }
})();
