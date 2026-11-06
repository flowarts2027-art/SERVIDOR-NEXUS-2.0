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
  const PLAN_TIMES = ["0900", "1900"]; // plano do dia: 2 posts + 2 stories
  const ORDER = [...PLAN_TIMES.map(t => "post-" + t), ...PLAN_TIMES.map(t => "story-" + t)];
  const nice = t => t.slice(0, 2) + "h" + (t.slice(2) === "00" ? "" : t.slice(2));
  // Veio de um cartão de "Postagens faltando": só existem as vagas do aviso, e o servidor escolhe o horário.
  const params = new URLSearchParams(location.search);
  const lacking = name => Math.min(2, Math.max(0, Math.trunc(Number(params.get(name))) || 0));
  const FILL = { posts: lacking("posts"), stories: lacking("stories") };
  const FILLING = /^\d{4}-\d{2}-\d{2}$/.test(params.get("dia") || "") && Boolean(params.get("cliente")) && FILL.posts + FILL.stories > 0;
  const fillSlots = (kind, count) => Array.from({ length: count }, (_, index) => kind + "-" + (index + 1));
  const FILL_SLOTS = [...fillSlots("post", FILL.posts), ...fillSlots("story", FILL.stories)];
  if (FILLING) ORDER.splice(0, ORDER.length, ...FILL_SLOTS);
  const fillName = slot => (slot.startsWith("story") ? "Story " : "Post ") + slot.split("-")[1];
  const OPTIONS = FILLING ? [...FILL_SLOTS.map(slot => [slot, fillName(slot)]), ["skip", "Não enviar"]] : [
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
    if (!res.ok || data.ok === false) throw Object.assign(new Error(data.message || "Não deu certo. Tente de novo."), { moveTo: data.moveTo, wrongWindow: /^(window_|size_invalid|carousel_mixed|video_window)/.test(String(data.error || "")) });
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
        const groups = await api("/api/master/groups").catch(() => ({}));
        for (const g of groups.groups || []) $("#client").insertAdjacentHTML("beforeend", `<option value="${esc(g.id)}">${esc(g.name)}</option>`);
        // Botão "Enviar artes" do quadro de postagens faltando: já abre no cliente certo.
        const wanted = params.get("cliente");
        if (wanted && list.some(c => c.id === wanted)) $("#client").value = wanted;
      }
    } catch { /* fica a Flow Arts */ }
  }

  async function loadCaptions() {
    if (FILLING) return; // as legendas do ChatGPT são por horário, e aqui o horário só sai no envio
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
    const used = (FILLING ? fillSlots("post", FILL.posts).map(hhmm) : TIMES).filter(t => items.some(i => !i.sent && !i.dup && i.slot === "post-" + t));
    const name = t => FILLING ? "Post " + t : "Post " + t.slice(0, 2) + "h";
    $("#captions-card").hidden = !used.length;
    $("#captions").innerHTML = used.map(t => `
      <div class="cap">
        <span class="tag">${name(t)}</span>${captionFrom[t] === "github" ? `<span class="src">do ChatGPT</span>` : ""}
        <textarea data-caption="${t}" aria-label="Legenda: ${name(t)}" placeholder="Vazia: o Nexus usa a legenda pronta do nicho.">${esc(captions[t] || "")}</textarea>
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

  function filledText(name, out) {
    const when = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(out.scheduledFor));
    return `✓ ${name}: ${when}, ${out.approval === "approved" ? "já aprovado" : "esperando aprovação"}.`;
  }

  function showFillMode() {
    const parts = [];
    if (FILL.posts) parts.push(FILL.posts + (FILL.posts === 1 ? " post" : " posts"));
    if (FILL.stories) parts.push(FILL.stories + (FILL.stories === 1 ? " story" : " stories"));
    const note = $("#fill-note");
    $(".top p").textContent = "Escolha as imagens que faltam. O Nexus põe na agenda do cliente.";
    note.hidden = false;
    note.textContent = `Preenchendo o que falta: ${parts.join(" e ")} em ${$("#date").value.split("-").reverse().join("/")}. O Nexus escolhe o horário livre neste dia.`;
    note.insertAdjacentHTML("beforeend", `<a href="/artes.html">Enviar outras artes</a>`);
    $("#plan-hint").textContent = "As imagens vão só para as vagas do aviso, na ordem. Imagem a mais fica em Não enviar.";
    $("#client").disabled = true;
    $("#date").disabled = true;
    $("#send").textContent = "Enviar para a agenda";
  }

  async function sendAll() {
    const list = groups();
    const problems = [];
    for (const g of list) {
      if (g.story && g.items.length > 1) problems.push(`${FILLING ? fillName(g.slot) : "Story " + nice(g.time)} tem ${g.items.length} imagens. Story é uma imagem só.`);
      if (g.type === "carousel" && g.items.length > 10) problems.push(`${FILLING ? fillName(g.slot) : "Post " + g.time.slice(0, 2) + "h"} tem mais de 10 imagens.`);
    }
    $("#result").innerHTML = "";
    if (problems.length) { problems.forEach(t => toastResult("bad", t)); return; }
    if (!window.confirm(`Enviar ${list.length} conteúdo(s) para o dia ${$("#date").value.split("-").reverse().join("/")}?`)) return;

    $("#send").disabled = true;
    const label = g => FILLING ? fillName(g.slot) : (g.story ? "Story " : g.type === "carousel" ? "Carrossel " : "Post ") + clock(g.time);
    const sendOne = async g => {
      const line = toastResult("wait", `${label(g)}: enviando…`);
      const form = new FormData();
      form.set("clientId", $("#client").value);
      form.set("approval", "cliente");
      form.set("type", g.type);
      form.set("date", $("#date").value);
      if (FILLING) form.set("fill", "1");
      else { form.set("time", clock(g.time)); form.set("noDuplicate", "1"); }
      if (!g.story) form.set("caption", captions[g.time] || "");
      for (const item of g.items) form.append("images", item.file, item.file.name);
      try {
        const out = await api("/api/master/upload", { method: "POST", body: form });
        g.items.forEach(item => { item.sent = true; });
        line.className = "ok"; line.textContent = FILLING ? filledText(label(g), out) : `✓ ${label(g)}: no painel, esperando aprovação.`;
        if (FILLING && "BroadcastChannel" in window) new BroadcastChannel("nexus-postagens").postMessage("mudou");
      } catch (error) {
        line.className = "bad";
        // Aqui o formato é o do aviso: arte de outro tamanho não troca de janela.
        if (error.wrongWindow && !FILLING) window.showWindowAlert(line, `${label(g)}: ${error.message}`, error.moveTo, async moveTo => {
          // Só troca a janela: a mesma arte vai de novo.
          g.story = moveTo === "story";
          g.type = g.story ? "story" : "post";
          line.remove();
          await sendOne(g);
          render();
        });
        else line.textContent = `✕ ${label(g)}: ${error.message === "login" ? "entre no Master primeiro." : error.message}`;
      }
    };
    for (const g of list) await sendOne(g);
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Botão "Enviar artes" do quadro de postagens faltando: abre no dia da linha.
    const wantedDay = params.get("dia");
    $("#date").value = /^\d{4}-\d{2}-\d{2}$/.test(wantedDay || "") ? wantedDay : tomorrow();
    if (FILLING) showFillMode();
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
