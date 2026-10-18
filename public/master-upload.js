// Master › Postagens › "Subir conteúdo do cliente" (18/10).
// Cliente + tipo → arquivos → legenda pronta pelo nicho (sem IA) → dia e hora (ou o cliente escolhe).
// Post e Stories com várias fotos: cada foto vira um post, em horários seguidos.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const ARCHIVED = new Set(["ragnar-one", "globalplay-streaming", "global-play-streaming", "demo-cafe"]);
  const TYPE = {
    post: { label: "Fotos (cada foto vira um post)", accept: "image/jpeg,image/png,image/webp", hint: "Pode escolher várias: cada uma sai num horário." },
    carousel: { label: "Fotos do carrossel, na ordem", accept: "image/jpeg,image/png,image/webp", hint: "De 2 a 10 fotos. Toque nelas na ordem 1, 2, 3…" },
    reel: { label: "Vídeos (cada vídeo vira um Reels)", accept: "video/mp4,video/quicktime", hint: "MP4 até 95 MB. Pode escolher vários." },
    story: { label: "Fotos ou vídeos dos Stories", accept: "image/jpeg,image/png,image/webp,video/mp4,video/quicktime", hint: "Cada arquivo vira um Stories. Stories não têm legenda." }
  };
  let items = []; // { files: File[], caption, seed }

  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  async function fillClients() {
    const select = $("#mu-client");
    if (!select) return;
    try {
      const response = await fetch("/api/clients", { credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json();
      const list = (Array.isArray(data) ? data : data.clients || []).filter(c => c && c.id && !ARCHIVED.has(String(c.id)) && String(c.status || "online") !== "archived");
      if (list.length) select.innerHTML = list.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`).join("");
    } catch { /* fica a Flow Arts */ }
  }

  function typeNow() { return $("#mu-type")?.value || "post"; }

  function applyType() {
    const t = TYPE[typeNow()];
    const input = $("#mu-files");
    if (!input || !t) return;
    input.accept = t.accept;
    input.value = "";
    $("#mu-files-label").textContent = t.label;
    $("#mu-files-hint").textContent = t.hint;
    items = [];
    render();
  }

  function slots() {
    const times = String($("#mu-times")?.value || "").split(/[,;\s]+/).filter(v => /^\d{1,2}:\d{2}$/.test(v)).map(v => v.padStart(5, "0")).sort();
    const start = $("#mu-date")?.value || today();
    return items.map((_, i) => {
      const day = new Date(start + "T12:00:00Z");
      day.setUTCDate(day.getUTCDate() + Math.floor(i / Math.max(1, times.length)));
      return { date: day.toISOString().slice(0, 10), time: times[i % Math.max(1, times.length)] || "" };
    });
  }

  function whenMode() { return document.querySelector('input[name="when"]:checked')?.value || "date"; }

  function render() {
    const box = $("#mu-list");
    if (!box) return;
    const story = typeNow() === "story";
    const plan = slots();
    $("#mu-date-box").hidden = whenMode() !== "date";
    box.innerHTML = items.map((item, i) => {
      const f = item.files[0];
      const thumbs = item.files.map(file => file.type.startsWith("video/")
        ? `<span class="mu-thumb mu-video">🎬</span>`
        : `<img class="mu-thumb" src="${URL.createObjectURL(file)}" alt="">`).join("");
      const when = whenMode() === "client" ? "O cliente escolhe o dia" : (plan[i].time ? `${plan[i].date.split("-").reverse().join("/")} às ${plan[i].time}` : "Escreva um horário");
      return `<article class="mu-item">
        <header><strong>${items.length > 1 ? (i + 1) + ". " : ""}${esc(f?.name || "")}${item.files.length > 1 ? ` + ${item.files.length - 1}` : ""}</strong><small>${esc(when)}</small></header>
        <div class="mu-thumbs">${thumbs}</div>
        ${story ? "" : `<label>Legenda<textarea data-mu-caption="${i}" rows="7" maxlength="2200">${esc(item.caption)}</textarea></label>
        <button type="button" class="ghost" data-mu-new="${i}">Trocar legenda</button>`}
      </article>`;
    }).join("");
  }

  async function captionFor(i) {
    const clientId = $("#mu-client")?.value || "";
    const item = items[i];
    try {
      const r = await fetch(`/api/master/caption?clientId=${encodeURIComponent(clientId)}&format=${encodeURIComponent(typeNow())}`, { credentials: "same-origin" });
      const data = await r.json();
      item.caption = data.caption || "";
    } catch { /* deixa como está */ }
  }

  async function fillCaptions() {
    if (typeNow() === "story") return render();
    // Uma de cada vez: cada post pega a próxima legenda da vez do cliente (nunca a mesma).
    for (let i = 0; i < items.length; i++) await captionFor(i);
    render();
  }

  function coverFromVideo(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto";
      const url = URL.createObjectURL(file);
      const done = (fn, v) => { URL.revokeObjectURL(url); fn(v); };
      video.onerror = () => done(reject, new Error("cover"));
      video.onloadedmetadata = () => { video.currentTime = Math.min(0.5, (video.duration || 1) / 2); };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        if (!canvas.width || !canvas.height) return done(reject, new Error("cover"));
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(b => b ? done(resolve, b) : done(reject, new Error("cover")), "image/jpeg", 0.88);
      };
      video.src = url;
    });
  }
  function plainCover() {
    return new Promise(resolve => {
      const c = document.createElement("canvas"); c.width = 720; c.height = 1280;
      const x = c.getContext("2d"); x.fillStyle = "#0F2747"; x.fillRect(0, 0, 720, 1280);
      x.fillStyle = "#fff"; x.font = "bold 140px sans-serif"; x.textAlign = "center"; x.fillText("▶", 360, 700);
      c.toBlob(resolve, "image/jpeg", 0.9);
    });
  }

  document.addEventListener("change", async event => {
    const id = event.target?.id;
    if (id === "mu-type") { applyType(); return; }
    if (id === "mu-client") { await fillCaptions(); return; }
    if (id === "mu-date" || id === "mu-times" || event.target?.name === "when") { render(); return; }
    if (id === "mu-files") {
      const files = [...event.target.files];
      items = typeNow() === "carousel" ? (files.length ? [{ files, caption: "" }] : []) : files.map(f => ({ files: [f], caption: "" }));
      await fillCaptions();
    }
  });

  document.addEventListener("input", event => {
    const i = event.target?.dataset?.muCaption;
    if (i !== undefined && items[i]) items[i].caption = event.target.value;
    if (event.target?.id === "mu-times") render();
  });

  document.addEventListener("click", async event => {
    const btn = event.target.closest?.("[data-mu-new]");
    if (!btn) return;
    await captionFor(Number(btn.dataset.muNew));
    render();
  });

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "master-upload-form") return;
    event.preventDefault();
    const form = event.target;
    const status = $("#mu-status");
    const button = form.querySelector('button[type="submit"]');
    const type = typeNow();
    if (!items.length) { status.textContent = "Escolha os arquivos."; return; }
    if (type === "carousel" && (items[0].files.length < 2 || items[0].files.length > 10)) { status.textContent = "O carrossel precisa de 2 a 10 fotos."; return; }
    const plan = slots();
    if (whenMode() === "date" && plan.some(p => !p.time)) { status.textContent = "Escreva pelo menos um horário (ex.: 12:00)."; return; }
    button.disabled = true;
    let ok = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        status.textContent = `Enviando ${i + 1} de ${items.length}…`;
        const item = items[i];
        const data = new FormData();
        data.set("clientId", $("#mu-client").value);
        data.set("type", type);
        data.set("when", whenMode());
        data.set("date", plan[i].date);
        data.set("time", plan[i].time);
        if (form.approval.checked) data.set("approval", "eu");
        if (type !== "story") data.set("caption", item.caption || "");
        const file = item.files[0];
        if (file.type.startsWith("video/")) {
          data.set("video", file);
          data.set("cover", await coverFromVideo(file).catch(() => plainCover()), "capa.jpg");
        } else {
          for (const f of item.files) data.append("images", f);
        }
        const response = await fetch("/api/master/upload", { method: "POST", credentials: "same-origin", body: data });
        const out = await response.json().catch(() => ({}));
        if (!response.ok || out.ok === false) throw new Error((items.length > 1 ? `Item ${i + 1}: ` : "") + (out.message || "Não deu para enviar."));
        ok++;
      }
      status.textContent = `Pronto: ${ok} ${ok === 1 ? "item enviado" : "itens enviados"}. ${form.approval.checked ? "Já aprovados." : "O cliente aprova no painel dele."}`;
      items = []; $("#mu-files").value = ""; render();
    } catch (error) {
      status.textContent = (ok ? `${ok} enviado(s). ` : "") + error.message;
      items = items.slice(ok); render();
    } finally {
      button.disabled = false;
    }
  });

  function start() {
    if (!$("#master-upload-form")) return;
    const d = $("#mu-date"); if (d && !d.value) d.value = today();
    fillClients(); applyType();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
