// Editor de marca (05/11/2026): usado no "Novo cliente" e na aba Marca do Master.
// Tudo acontece no navegador, com canvas, sem serviço pago.
(() => {
  const SIZE = 512;
  const hex = values => "#" + values.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const channel = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const rgb = color => [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16));
  const luminance = color => { const [r, g, b] = rgb(color).map(channel); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [l, d] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l + 0.05) / (d + 0.05); };
  const textOn = bg => contrast("#ffffff", bg) >= contrast("#000000", bg) ? "#ffffff" : "#000000";
  const readable = color => { let v = rgb(color); for (let i = 0; i < 40 && contrast(hex(v), "#ffffff") < 4.5; i++) v = v.map(x => x * 0.92); return hex(v); };

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não consegui abrir esta logo."));
      image.src = URL.createObjectURL(file);
    });
  }

  // SVG, PNG e JPG viram PNG aqui. A Cloudflare não precisa saber ler SVG.
  function toCanvas(image) {
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth || SIZE, image.naturalHeight || SIZE));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((image.naturalWidth || SIZE) * scale);
    canvas.height = Math.round((image.naturalHeight || SIZE) * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function colorsOf(canvas) {
    const small = document.createElement("canvas");
    small.width = small.height = 64;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 128 || Math.min(r, g, b) > 235 || Math.max(r, g, b) < 20) continue;
      const key = [r >> 4, g >> 4, b >> 4].join();
      const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      bucket.n += 1; bucket.r += r; bucket.g += g; bucket.b += b;
      buckets.set(key, bucket);
    }
    const ranked = [...buckets.values()].sort((a, b) => b.n - a.n).map(x => hex([x.r / x.n, x.g / x.n, x.b / x.n]));
    const primary = ranked[0] || "#1c283a";
    const distance = (a, b) => rgb(a).reduce((sum, v, i) => sum + Math.abs(v - rgb(b)[i]), 0);
    const accent = ranked.find(color => distance(color, primary) > 120) || primary;
    return { primary, accent, text: readable(primary) };
  }

  function removeWhite(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      if (Math.min(image.data[i], image.data[i + 1], image.data[i + 2]) > 240) image.data[i + 3] = 0;
    }
    ctx.putImageData(image, 0, 0);
  }

  function hasWhiteBackground(canvas) {
    const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, 1, 1).data;
    return data[3] > 200 && Math.min(data[0], data[1], data[2]) > 240;
  }

  function mount(box) {
    box.classList.add("brand-editor");
    box.innerHTML = `
      <label class="brand-upload">Enviar logo<input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden></label>
      <button type="button" class="brand-white" hidden>Tirar fundo branco</button>
      <p class="brand-error" role="status"></p>
      <div class="brand-fields">
        <label>Cor principal<input type="color" data-color="primary" value="#1c283a"></label>
        <label>Cor de destaque<input type="color" data-color="accent" value="#ffc20e"></label>
        <label>Cor do texto<input type="color" data-color="text" value="#1c283a"></label>
        <label>Palavra do botão<input type="text" data-word maxlength="20" placeholder="Ex.: QUERO" autocomplete="off"></label>
      </div>
      <div class="brand-preview" aria-label="Prévia do painel do cliente">
        <div class="brand-preview-top"><img alt="" hidden><span>Painel do cliente</span></div>
        <div class="brand-preview-body"><p>Suas postagens</p><span class="brand-preview-button">COMENTE QUERO</span></div>
      </div>`;
    let canvas = null;
    const $ = selector => box.querySelector(selector);
    const color = name => $(`[data-color=${name}]`).value;

    function paint() {
      const top = $(".brand-preview-top"), button = $(".brand-preview-button");
      top.style.background = color("primary");
      top.style.color = textOn(color("primary"));
      $(".brand-preview-body p").style.color = readable(color("text"));
      button.style.background = color("accent");
      button.style.color = textOn(color("accent"));
      button.textContent = "COMENTE " + ($("[data-word]").value.trim().toUpperCase() || "QUERO");
      const img = $(".brand-preview-top img");
      img.hidden = !canvas;
      if (canvas) img.src = canvas.toDataURL("image/png");
    }

    $("input[type=file]").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;
      $(".brand-error").textContent = "";
      try {
        canvas = toCanvas(await loadImage(file));
        const colors = colorsOf(canvas);
        for (const name of Object.keys(colors)) $(`[data-color=${name}]`).value = colors[name];
        $(".brand-white").hidden = !hasWhiteBackground(canvas);
        paint();
      } catch (error) { $(".brand-error").textContent = error.message; }
    });
    $(".brand-white").addEventListener("click", () => { removeWhite(canvas); $(".brand-white").hidden = true; paint(); });
    box.addEventListener("input", paint);
    paint();

    return {
      hasLogo: () => Boolean(canvas),
      load(brand) {
        canvas = null;
        const c = brand?.colors || {};
        for (const name of ["primary", "accent", "text"]) if (c[name]) $(`[data-color=${name}]`).value = c[name];
        $("[data-word]").value = brand?.buttonWord || "";
        paint();
      },
      async save(target) {
        const form = new FormData();
        form.set("target", target);
        for (const name of ["primary", "accent", "text"]) form.set(name, color(name));
        form.set("buttonWord", $("[data-word]").value);
        if (canvas) form.set("logo", await new Promise(resolve => canvas.toBlob(resolve, "image/png")), "logo.png");
        const response = await fetch("/api/master/brand", { method: "POST", credentials: "same-origin", body: form });
        const out = await response.json().catch(() => ({}));
        if (!response.ok || !out.ok) throw new Error(out.message || "Não deu para salvar a marca.");
        return out;
      }
    };
  }

  window.BrandEditor = { mount, colorsOf, removeWhite, contrast, readable, textOn };
})();
