// Master → Postagens → "Enviar Reel pronto" (plano com vídeo).
// O Rodrigo envia o vídeo feito no Flow; a capa sai do próprio vídeo.
// O post vai para o painel do cliente esperando aprovação.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const BLOCKED = new Set(["ragnar-one", "globalplay-streaming", "global-play-streaming", "demo-cafe"]);
  let loaded = false;
  let busy = false;

  async function loadClients() {
    const select = $("#manual-reel-client");
    if (!select || loaded) return;
    try {
      const response = await fetch("/api/clients", { credentials: "same-origin" });
      const data = await response.json();
      const clients = (Array.isArray(data) ? data : data.clients || []).filter(c => c?.id && !BLOCKED.has(c.id));
      select.innerHTML = '<option value="">Escolha o cliente</option>' + clients.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`).join("");
      loaded = true;
    } catch {
      select.innerHTML = '<option value="">Não consegui carregar os clientes</option>';
    }
  }

  function tomorrow() {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  }

  // Capa = um quadro do vídeo (meio segundo depois do início).
  function coverFromVideo(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto";
      const url = URL.createObjectURL(file);
      const done = (fn, value) => { URL.revokeObjectURL(url); fn(value); };
      video.onerror = () => done(reject, new Error("cover"));
      video.onloadedmetadata = () => { video.currentTime = Math.min(0.5, (video.duration || 1) / 2); };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        if (!canvas.width || !canvas.height) return done(reject, new Error("cover"));
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(blob => blob ? done(resolve, blob) : done(reject, new Error("cover")), "image/jpeg", 0.88);
      };
      video.src = url;
    });
  }

  // Capa reserva (quando o navegador não consegue ler o vídeo): fundo da marca + primeira linha da legenda.
  function fallbackCover(text) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 720; canvas.height = 1280;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0F1E3D"; ctx.fillRect(0, 0, 720, 1280);
      ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 120px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("▶", 360, 560);
      ctx.font = "bold 44px sans-serif";
      const words = String(text || "Reel").split(/\s+/).slice(0, 12);
      let line = "", y = 700;
      for (const word of words) {
        if (ctx.measureText(line + word).width > 600) { ctx.fillText(line.trim(), 360, y); line = ""; y += 60; }
        line += word + " ";
      }
      ctx.fillText(line.trim(), 360, y);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("cover")), "image/jpeg", 0.9);
    });
  }

  document.addEventListener("change", event => {
    if (event.target?.id !== "manual-reel-video") return;
    const file = event.target.files?.[0];
    const preview = $("#manual-reel-preview");
    if (!preview) return;
    if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
    if (!file) { preview.hidden = true; return; }
    preview.dataset.url = URL.createObjectURL(file);
    preview.src = preview.dataset.url;
    preview.hidden = false;
  });

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form?.id !== "manual-reel-form" || busy) return;
    event.preventDefault();
    const status = $("#manual-reel-status");
    const button = form.querySelector('button[type="submit"]');
    const file = form.video.files?.[0];
    if (!file) { status.textContent = "Escolha o vídeo."; return; }
    busy = true; button.disabled = true;
    try {
      status.textContent = "Preparando a capa…";
      const firstLine = String(form.caption.value || "").split("\n")[0];
      const cover = await coverFromVideo(file).catch(() => fallbackCover(firstLine));
      const data = new FormData(form);
      data.set("cover", cover, "capa.jpg");
      status.textContent = "Enviando o vídeo…";
      const response = await fetch("/api/master/manual-reel", { method: "POST", credentials: "same-origin", body: data });
      if (response.status === 401) { location.href = "/api/master/access"; return; }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Não deu para enviar. Tente de novo.");
      const when = new Date(result.scheduledFor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
      status.textContent = `Enviado para ${result.clientName}. Ele vai aprovar no painel; depois sai em ${when}.`;
      form.reset();
      form.date.value = tomorrow();
      $("#manual-reel-preview").hidden = true;
    } catch (error) {
      status.textContent = error.message === "cover" ? "Não consegui tirar a capa do vídeo. Tente outro navegador." : error.message;
    } finally {
      busy = false; button.disabled = false;
    }
  });

  const form = $("#manual-reel-form");
  if (form?.date) form.date.value = tomorrow();
  document.querySelectorAll('[data-view="posts"]').forEach(button => button.addEventListener("click", loadClients));
  if ($("#posts")?.classList.contains("active")) loadClients();
})();
