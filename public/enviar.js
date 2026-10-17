// Painel do cliente → Posts → "Enviar conteúdo pronto" (16/10).
// Feed, carrossel (ordem pelo número do arquivo + setas), reels (capa tirada do vídeo) e stories.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  let images = [];
  let video = null;

  const type = () => document.querySelector("#upload-form input[name=type]:checked")?.value || "feed";
  const numberIn = name => { const m = String(name).match(/(\d+)(?!.*\d)/); return m ? Number(m[1]) : Infinity; };

  function tomorrow() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 864e5));
  }

  function setupFields() {
    const t = type();
    const input = $("#upload-images");
    input.multiple = t === "carousel";
    $("#upload-images-label").firstChild.textContent = t === "carousel" ? "Imagens (2 a 10)" : t === "story" ? "Imagem (ou escolha um vídeo abaixo)" : "Imagem";
    $("#upload-images-label").hidden = t === "reel";
    $("#upload-video-label").hidden = !["reel", "story"].includes(t);
    $("#upload-caption-label").hidden = t === "story";
    $("#upload-order-help").hidden = t !== "carousel";
    images = []; video = null;
    input.value = ""; $("#upload-video").value = "";
    render();
  }

  function updateCount() {
    const help = $("#upload-order-help");
    if (!help || type() !== "carousel") return;
    help.textContent = (images.length ? images.length + " de 10 imagens escolhidas. " : "") + "Pode escolher uma por vez ou várias juntas. A ordem segue o número no nome do arquivo (1, 2, 3…); use as setas para trocar.";
  }

  function render() {
    updateCount();
    const box = $("#upload-preview");
    box.innerHTML = "";
    if (video) {
      const v = document.createElement("video");
      v.src = URL.createObjectURL(video); v.muted = true; v.playsInline = true; v.controls = true;
      const fig = document.createElement("figure"); fig.append(v); box.append(fig);
    }
    images.forEach((file, index) => {
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file); img.alt = "Imagem " + (index + 1);
      const cap = document.createElement("figcaption"); cap.textContent = String(index + 1);
      fig.append(img, cap);
      if (type() === "carousel") {
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "remove"; remove.dataset.remove = String(index);
        remove.setAttribute("aria-label", "Tirar a imagem " + (index + 1)); remove.textContent = "✕ Tirar";
        fig.append(remove);
      }
      if (type() === "carousel" && images.length > 1) {
        const order = document.createElement("div"); order.className = "order";
        order.innerHTML = `<button type="button" data-move="-1" data-i="${index}" aria-label="Mover para a esquerda" ${index === 0 ? "disabled" : ""}>←</button><button type="button" data-move="1" data-i="${index}" aria-label="Mover para a direita" ${index === images.length - 1 ? "disabled" : ""}>→</button>`;
        fig.append(order);
      }
      box.append(fig);
    });
  }

  function coverFromVideo(file) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto";
      const url = URL.createObjectURL(file);
      const done = (fn, value) => { URL.revokeObjectURL(url); fn(value); };
      v.onerror = () => done(reject, new Error("cover"));
      v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
      v.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth; canvas.height = v.videoHeight;
        if (!canvas.width || !canvas.height) return done(reject, new Error("cover"));
        canvas.getContext("2d").drawImage(v, 0, 0);
        canvas.toBlob(blob => blob ? done(resolve, blob) : done(reject, new Error("cover")), "image/jpeg", 0.88);
      };
      v.src = url;
    });
  }

  document.addEventListener("change", event => {
    const target = event.target;
    if (target?.name === "type" && target.closest("#upload-form")) setupFields();
    if (target?.id === "upload-images") {
      const picked = [...target.files];
      if (type() === "carousel") {
        // Soma às já escolhidas (dá para escolher uma por vez); ignora a mesma imagem repetida; máximo 10.
        const key = file => file.name + "|" + file.size;
        const have = new Set(images.map(key));
        images = images.concat(picked.filter(file => !have.has(key(file)))).slice(0, 10);
        images.sort((a, b) => numberIn(a.name) - numberIn(b.name));
        target.value = "";
      } else {
        images = picked.slice(0, 1);
      }
      if (type() === "story" && images.length) { video = null; $("#upload-video").value = ""; }
      if (type() === "carousel" && images.length < 2) $("#upload-status").textContent = "Escolha mais imagens (mínimo 2).";
      else $("#upload-status").textContent = "";
      render();
    }
    if (target?.id === "upload-video") {
      video = target.files[0] || null;
      if (video) { images = []; $("#upload-images").value = ""; }
      render();
    }
  });

  document.addEventListener("click", event => {
    const del = event.target.closest?.("#upload-preview [data-remove]");
    if (del) { images.splice(Number(del.dataset.remove), 1); render(); updateCount(); return; }
    const btn = event.target.closest?.("#upload-preview [data-move]");
    if (!btn) return;
    const i = Number(btn.dataset.i), j = i + Number(btn.dataset.move);
    if (j < 0 || j >= images.length) return;
    [images[i], images[j]] = [images[j], images[i]];
    render();
  });

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "upload-form") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.target;
    const status = $("#upload-status");
    const button = form.querySelector("button[type=submit]");
    const t = type();
    const data = new FormData();
    data.set("type", t);
    data.set("caption", form.caption.value);
    data.set("date", form.date.value);
    data.set("time", form.time.value);
    if (t === "carousel" && images.length < 2) { status.textContent = "Escolha pelo menos 2 imagens para o carrossel."; return; }
    button.disabled = true;
    status.textContent = "Enviando… não feche a página.";
    try {
      if (["reel", "story"].includes(t) && video) {
        data.set("video", video, video.name);
        data.set("cover", await coverFromVideo(video), "capa.jpg");
      }
      images.forEach(file => data.append("images", file, file.name));
      const response = await fetch("/api/portal/uploads", { method: "POST", credentials: "same-origin", body: data });
      const out = await response.json().catch(() => ({}));
      if (!response.ok || !out.ok) throw new Error(out.message || "Não deu para enviar.");
      status.textContent = "Pronto! Agendado. Ele aparece em \"Agendados\".";
      form.caption.value = "";
      setupFields();
      $("#refresh")?.click();
    } catch (error) {
      status.textContent = error.message === "cover" ? "Não consegui tirar a capa do vídeo. Tente outro navegador." : error.message;
    } finally {
      button.disabled = false;
    }
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    const date = document.querySelector("#upload-form input[name=date]");
    if (date && !date.value) date.value = tomorrow();
    if ($("#upload-form")) setupFields();
  });
})();
