// Página "Enviar artes" (pedido do Rodrigo, 27/10/2026).
// O ChatGPT não consegue subir imagem no GitHub (o conector dele só grava texto). Então:
//   ChatGPT cria as imagens e deixa só as LEGENDAS em agendamentos/.../HHMM/legenda.txt;
//   o Rodrigo salva as imagens no celular e escolhe todas aqui de uma vez.
// Cada post entra no painel do cliente ESPERANDO APROVAÇÃO (mesma rota do Master: /api/master/upload).
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const ARCHIVED = new Set(["ragnar-one", "globalplay-streaming", "global-play-streaming", "demo-cafe"]);
  const TIMES = ["0900", "1200", "1900"];
  const STORY_TIMES = ["0900", "1030", "1200", "1600", "1900"]; // grade de 22/10 usa 10h30 e 16h
  const ORDER = [...TIMES.map(t => "post-" + t), ...TIMES.map(t => "story-" + t)];
  const nice = t => t.slice(0, 2) + "h" + (t.slice(2) === "00" ? "" : t.slice(2));
  const OPTIONS = [
    ...TIMES.map(t => ["post-" + t, "Post " + nice(t)]),
    ...STORY_TIMES.map(t => ["story-" + t, "Story " + nice(t)]),
    ["skip", "Não enviar"]
  ];
  const ALL_SLOTS = OPTIONS.map(([v]) => v).filter(v => v !== "skip");
  const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const MAX_BYTES = 8 * 1024 * 1024;

  let items = [];          // { id, file, url, hash, slot, dup, sent }
  let captions = {};       // "0900" -> texto
  let captionFrom = {};    // "0900" -> "github" | "editado"
  let seq = 0;

  const tomorrow = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 864e5));
  const hhmm = slot => slot.split("-")[1];
  const clock = t => t.slice(0, 2) + ":" + t.slice(2);

  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: "same-origin", ...options });
    if (res.status === 401) { $("#login-msg").hidden = false; throw new Error("login"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.message || "Não deu certo. Tente de novo.");
    return data;
  }

  async function loadClients() {
    try {
      const data = await api("/api/clients");
      const list = (Array.isArray(data) ? data : data.clients || [])
        .filter(c => c && c.id && !ARCHIVED.has(String(c.id)) && String(c.status || "online") !== "archived");
      if (list.length) {
        $("#client").innerHTML = list.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`).join("");
        if (list.some(c => c.id === "primeiro-teste")) $("#client").value = "primeiro-teste";
      }
    } catch { /* fica a Flow Arts */ }
  }

  async function loadCaptions() {
    const status = $("#caption-status");
    status.textContent = "Buscando legendas do ChatGPT…";
    captions = {}; captionFrom = {};
    try {
      const data = await api(`/api/master/legendas?clientId=${encodeURIComponent($("#client").value)}&date=${encodeURIComponent($("#date").value)}`);
      for (const t of TIMES) if (data.captions?.[t]) { captions[t] = data.captions[t]; captionFrom[t] = "github"; }
      const n = Object.keys(captions).length;
      status.textContent = n ? `✓ ${n} legenda(s) do ChatGPT encontrada(s) para este dia.` : "Nenhuma legenda do ChatGPT para este dia. Pode escrever aqui.";
    } catch (error) {
      status.textContent = error.message === "login" ? "" : "Não achei as legendas agora. Pode escrever aqui.";
    }
    renderCaptions();
  }

  // Imagem fora do padrão (HEIC, muito grande): vira JPEG no próprio celular antes de enviar.
  async function normalize(file) {
    if (OK_TYPES.has(file.type) && file.size <= MAX_BYTES) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2160 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  }

  async function sha(file) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  }

  function markDuplicates() {
    const seen = new Set();
    for (const item of items) { item.dup = seen.has(item.hash); seen.add(item.hash); }
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const raw of files) {
      let file;
      try { file = await normalize(raw); } catch { toastResult("bad", `${raw.name}: este arquivo não é uma imagem que dê para usar.`); continue; }
      const used = new Set(items.filter(i => i.slot !== "skip").map(i => i.slot));
      const slot = ORDER.find(s => !used.has(s)) || "skip";
      items.push({ id: ++seq, file, url: URL.createObjectURL(file), hash: await sha(file), slot, dup: false, sent: false });
    }
    markDuplicates();
    render();
  }

  function render() {
    $("#list").innerHTML = items.map((item, index) => `
      <div class="item ${item.slot.startsWith("story") ? "is-story" : ""} ${item.slot === "skip" ? "is-skip" : ""} ${item.dup ? "is-dup" : ""}" data-id="${item.id}">
        <img src="${item.url}" alt="Imagem ${index + 1}">
        <div class="side">
          <span class="name">${index + 1}. ${esc(item.file.name)}${item.sent ? " · ✓ enviada" : ""}</span>
          <select data-slot aria-label="Para onde vai a imagem ${index + 1}">
            ${OPTIONS.map(([v, l]) => `<option value="${v}" ${v === item.slot ? "selected" : ""}>${l}</option>`).join("")}
          </select>
          ${item.dup ? `<span class="warn">Imagem repetida. Não será enviada.</span>` : ""}
          <div class="moves">
            <button type="button" data-move="-1" aria-label="Subir">↑</button>
            <button type="button" data-move="1" aria-label="Descer">↓</button>
            <button type="button" data-remove aria-label="Tirar">✕</button>
          </div>
        </div>
      </div>`).join("");
    renderCaptions();
    $("#send").disabled = !groups().length;
  }

  function renderCaptions() {
    const used = TIMES.filter(t => items.some(i => !i.sent && !i.dup && i.slot === "post-" + t));
    $("#captions-card").hidden = !used.length;
    $("#captions").innerHTML = used.map(t => `
      <div class="cap">
        <span class="tag">Post ${t.slice(0, 2)}h</span>${captionFrom[t] === "github" ? `<span class="src">do ChatGPT</span>` : ""}
        <textarea data-caption="${t}" aria-label="Legenda do post das ${t.slice(0, 2)}h" placeholder="Vazia: o Nexus usa a legenda pronta do nicho.">${esc(captions[t] || "")}</textarea>
      </div>`).join("");
  }

  // Junta as imagens por horário: post com 2+ imagens = carrossel.
  function groups() {
    const out = [];
    for (const slot of ALL_SLOTS) {
      const files = items.filter(i => i.slot === slot && !i.dup && !i.sent);
      if (!files.length) continue;
      const story = slot.startsWith("story");
      out.push({ slot, time: hhmm(slot), story, items: files, type: story ? "story" : (files.length > 1 ? "carousel" : "post") });
    }
    return out;
  }

  function toastResult(kind, text) {
    const p = document.createElement("p");
    p.className = kind; p.textContent = text;
    $("#result").append(p);
    return p;
  }

  async function sendAll() {
    const list = groups();
    const problems = [];
    for (const g of list) {
      if (g.story && g.items.length > 1) problems.push(`Story ${nice(g.time)} tem ${g.items.length} imagens. Story é uma imagem só.`);
      if (g.type === "carousel" && g.items.length > 10) problems.push(`Post ${g.time.slice(0, 2)}h tem mais de 10 imagens.`);
    }
    $("#result").innerHTML = "";
    if (problems.length) { problems.forEach(t => toastResult("bad", t)); return; }
    if (!window.confirm(`Enviar ${list.length} conteúdo(s) para o dia ${$("#date").value.split("-").reverse().join("/")}?`)) return;

    $("#send").disabled = true;
    const label = g => (g.story ? "Story " : g.type === "carousel" ? "Carrossel " : "Post ") + clock(g.time);
    for (const g of list) {
      const line = toastResult("wait", `${label(g)}: enviando…`);
      const form = new FormData();
      form.set("clientId", $("#client").value);
      form.set("approval", "cliente");
      form.set("type", g.type);
      form.set("date", $("#date").value);
      form.set("time", clock(g.time));
      form.set("noDuplicate", "1");
      if (!g.story) form.set("caption", captions[g.time] || "");
      for (const item of g.items) form.append("images", item.file, item.file.name);
      try {
        await api("/api/master/upload", { method: "POST", body: form });
        g.items.forEach(item => { item.sent = true; });
        line.className = "ok"; line.textContent = `✓ ${label(g)}: no painel, esperando aprovação.`;
      } catch (error) {
        line.className = "bad"; line.textContent = `✕ ${label(g)}: ${error.message === "login" ? "entre no Master primeiro." : error.message}`;
      }
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#date").value = tomorrow();
    loadClients().then(loadCaptions);
    $("#client").addEventListener("change", loadCaptions);
    $("#date").addEventListener("change", loadCaptions);
    $("#files").addEventListener("change", event => { addFiles(event.target.files); event.target.value = ""; });
    $("#send").addEventListener("click", sendAll);
    $("#list").addEventListener("change", event => {
      const row = event.target.closest("[data-id]");
      if (!row || !event.target.matches("[data-slot]")) return;
      const item = items.find(i => i.id === Number(row.dataset.id));
      if (item) { item.slot = event.target.value; render(); }
    });
    $("#list").addEventListener("click", event => {
      const row = event.target.closest("[data-id]");
      if (!row) return;
      const index = items.findIndex(i => i.id === Number(row.dataset.id));
      if (index < 0) return;
      if (event.target.closest("[data-remove]")) {
        URL.revokeObjectURL(items[index].url); items.splice(index, 1);
      } else if (event.target.closest("[data-move]")) {
        const to = index + Number(event.target.closest("[data-move]").dataset.move);
        if (to < 0 || to >= items.length) return;
        [items[index], items[to]] = [items[to], items[index]];
      } else return;
      markDuplicates(); render();
    });
    $("#captions").addEventListener("input", event => {
      const t = event.target.dataset.caption;
      if (t) { captions[t] = event.target.value; captionFrom[t] = "editado"; }
    });
  });
})();
