// Exemplos por nicho (pedido de 17/10/2026): carrossel ou vídeo de exemplo para cada tipo de negócio.
// Vai junto na mensagem do Caçador como link (com foto no WhatsApp). Só para vendas:
// NÃO vira post, NÃO vai para o painel do cliente e NÃO vai para o Instagram.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const IN_PANEL = new Set(["ready", "scheduled", "failed"]);
  let data = null;
  let openNiche = "";
  let message = {};

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    const out = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Login do painel não aceito. Recarregue a página.");
    if (!response.ok || out.ok === false) throw new Error(out.message || "Não deu certo. Tente de novo.");
    return out;
  }

  function describe(entry) {
    if (!entry) return { text: "Sem exemplo", cls: "none" };
    if (entry.kind === "carousel" && entry.images?.length) return { text: `Carrossel · ${entry.images.length} cartões`, cls: "ok" };
    if (entry.videoUrl) return { text: "Vídeo", cls: "ok" };
    return { text: "Sem exemplo", cls: "none" };
  }

  function uploader(niche) {
    const reels = (data?.reels || []).map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("");
    return `<form class="example-form" data-example-form="${esc(niche)}">
      <div class="example-kind" role="radiogroup">
        <label><input type="radio" name="kind" value="carousel" checked> Carrossel</label>
        <label><input type="radio" name="kind" value="video"> Vídeo</label>
      </div>
      <label class="example-carousel">Imagens na ordem (2 a 10)<input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple></label>
      <label class="example-video" hidden>Vídeo MP4 (vertical)<input type="file" name="video" accept="video/mp4,video/quicktime"></label>
      <div class="example-actions"><button type="submit" class="primary">Salvar exemplo</button><button type="button" class="ghost" data-example-cancel>Cancelar</button></div>
      ${reels ? `<details class="example-reels"><summary>Ou usar um Reel que já foi gravado</summary>
        <div class="example-actions"><select name="postId">${reels}</select><button type="button" class="ghost" data-example-reel="${esc(niche)}">Usar este</button></div></details>` : ""}
    </form>`;
  }

  function row(n) {
    const entry = data.map[n.key];
    const d = describe(entry);
    const thumb = entry?.imageUrl || entry?.images?.[0] || "";
    const panelStatus = entry?.postId ? data.panel?.[entry.postId] : "";
    const warn = IN_PANEL.has(String(panelStatus || ""))
      ? `<p class="example-warn">Este vídeo também está no painel da Flow Arts esperando para ser postado. <button type="button" class="ghost" data-example-unpanel="${esc(entry.postId)}">Tirar do painel</button></p>` : "";
    const msg = message[n.key] ? `<p class="example-msg">${esc(message[n.key])}</p>` : "";
    return `<article class="example-row" data-niche="${esc(n.key)}">
      <div class="example-main">
        <div class="example-thumb">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : "<span>＋</span>"}</div>
        <div class="example-text"><strong>${esc(n.label)}</strong><span class="example-chip ${d.cls}">${esc(d.text)}</span></div>
        <div class="example-buttons">
          ${d.cls === "ok" ? `<a class="ghost" href="${esc(n.url)}" target="_blank" rel="noopener">Ver</a>` : ""}
          <button type="button" class="${d.cls === "ok" ? "ghost" : "primary"}" data-example-open="${esc(n.key)}">${d.cls === "ok" ? "Trocar" : "Adicionar"}</button>
          ${d.cls === "ok" ? `<button type="button" class="ghost danger-text" data-example-remove="${esc(n.key)}">Tirar</button>` : ""}
        </div>
      </div>
      ${warn}${msg}
      ${openNiche === n.key ? uploader(n.key) : ""}
    </article>`;
  }

  function render() {
    const box = $("#examples-list");
    if (!box || !data) return;
    const niches = data.niches || [];
    const done = niches.filter(n => describe(data.map[n.key]).cls === "ok").length;
    const sorted = [...niches].sort((a, b) => (describe(data.map[b.key]).cls === "ok") - (describe(data.map[a.key]).cls === "ok"));
    box.innerHTML = `<p class="examples-count"><b>${done}</b> de ${niches.length} nichos com exemplo</p>` + sorted.map(row).join("");
  }

  async function load() {
    const box = $("#examples-list");
    if (!box) return;
    try {
      data = await call("/api/master/showcase");
      render();
    } catch (error) {
      box.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  }

  // Capa do vídeo (para a foto que aparece no WhatsApp).
  function coverFromVideo(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      const done = (fn, value) => { URL.revokeObjectURL(url); fn(value); };
      video.muted = true; video.playsInline = true; video.preload = "auto"; video.src = url;
      video.onerror = () => done(reject, new Error("cover"));
      video.onloadeddata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2); };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        if (!canvas.width || !canvas.height) return done(reject, new Error("cover"));
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(blob => blob ? done(resolve, blob) : done(reject, new Error("cover")), "image/jpeg", 0.88);
      };
      setTimeout(() => done(reject, new Error("cover")), 15000);
    });
  }

  document.addEventListener("change", event => {
    const form = event.target.closest?.("[data-example-form]");
    if (!form || event.target.name !== "kind") return;
    const video = event.target.value === "video";
    form.querySelector(".example-video").hidden = !video;
    form.querySelector(".example-carousel").hidden = video;
  });

  document.addEventListener("submit", async event => {
    const form = event.target.closest?.("[data-example-form]");
    if (!form) return;
    event.preventDefault();
    const niche = form.dataset.exampleForm;
    const kind = form.querySelector("input[name=kind]:checked").value;
    const body = new FormData();
    body.set("niche", niche);
    body.set("kind", kind);
    const button = form.querySelector("button[type=submit]");
    try {
      if (kind === "carousel") {
        // Ordem pelo número do arquivo (1, 2, 3…), igual ao carrossel pronto.
        const files = [...form.images.files].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
        if (files.length < 2 || files.length > 10) throw new Error("Escolha de 2 a 10 imagens.");
        files.forEach(file => body.append("images", file));
      } else {
        const file = form.video.files[0];
        if (!file) throw new Error("Escolha o vídeo.");
        body.set("video", file);
        const cover = await coverFromVideo(file).catch(() => null);
        if (cover) body.set("cover", new File([cover], "capa.jpg", { type: "image/jpeg" }));
      }
      button.disabled = true;
      button.textContent = "Enviando…";
      await call("/api/master/showcase/upload", { method: "POST", body });
      message[niche] = "Exemplo salvo. ✔ Já vai junto na mensagem do Caçador.";
      openNiche = "";
      await load();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Salvar exemplo";
      message[niche] = error.message;
      const p = form.parentElement.querySelector(".example-msg") || form.insertAdjacentElement("beforebegin", Object.assign(document.createElement("p"), { className: "example-msg" }));
      p.textContent = error.message;
    }
  });

  document.addEventListener("click", async event => {
    const t = event.target.closest?.("[data-example-open],[data-example-cancel],[data-example-remove],[data-example-unpanel],[data-example-reel]");
    if (!t) return;
    if (t.matches("[data-example-open]")) { openNiche = t.dataset.exampleOpen; message = {}; render(); return; }
    if (t.matches("[data-example-cancel]")) { openNiche = ""; render(); return; }
    if (t.matches("[data-example-reel]")) {
      const niche = t.dataset.exampleReel;
      const postId = t.closest("form").postId.value;
      try {
        await call("/api/master/showcase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ niche, postId }) });
        message[niche] = "Exemplo salvo. ✔";
        openNiche = "";
        await load();
      } catch (error) { t.textContent = error.message; }
      return;
    }
    if (t.matches("[data-example-remove]")) {
      if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Toque de novo"; return; }
      const niche = t.dataset.exampleRemove;
      try {
        await call("/api/master/showcase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ niche, postId: "" }) });
        message[niche] = "Exemplo tirado.";
        await load();
      } catch (error) { t.textContent = error.message; }
      return;
    }
    if (t.matches("[data-example-unpanel]")) {
      if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Toque de novo para tirar"; return; }
      try {
        await call("/api/master/showcase/remove-from-panel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId: t.dataset.exampleUnpanel }) });
        await load();
      } catch (error) { t.textContent = error.message; }
    }
  });

  document.addEventListener("nexus:view", event => { if (event.detail === "odin") load(); });
})();
