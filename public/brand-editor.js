// Editor de marca (05/11/2026): usado no "Novo cliente" e no lápis do cliente ou do grupo, no Master.
// Tudo acontece no navegador, com canvas, sem serviço pago.
(() => {
  const SIZE = 512;
  const DEFAULT_COLORS = Object.freeze({ primary: "#1c283a", accent: "#ffc20e", text: "#1c283a" });
  const COVER_MESSAGE = "Esta imagem parece uma capa, não uma logo. Envie só a logo.";
  const COVER_RATIO = 3;
  const FACEBOOK_COVER_RATIO = 851 / 315; // 2,7: a capa padrão fica abaixo de 3, por isso entra pela medida exata
  const DARK_LOGO = 0.18;
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

  // Corta as sobras em volta da logo: fundo transparente ou da mesma cor nos quatro cantos.
  function trimBackground(canvas) {
    const { width, height } = canvas;
    const data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height).data;
    const at = (x, y) => (y * width + x) * 4;
    const same = (a, b) => Math.abs(data[a + 3] - data[b + 3]) <= 16
      && (data[a + 3] < 16 || [0, 1, 2].every(c => Math.abs(data[a + c] - data[b + c]) <= 24));
    const corner = at(0, 0);
    if (![at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)].every(other => same(other, corner))) return canvas;
    let left = width, right = -1, top = height, bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (same(at(x, y), corner)) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return canvas;
    const out = document.createElement("canvas");
    out.width = right - left + 1;
    out.height = bottom - top + 1;
    out.getContext("2d").drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  // Só avisa, não bloqueia: logo escrita em linha também pode ser bem larga.
  function looksLikeCover(original, trimmed) {
    const ratio = item => item.width / item.height;
    return ratio(original) > COVER_RATIO || ratio(trimmed) > COVER_RATIO || Math.abs(ratio(original) - FACEBOOK_COVER_RATIO) < 0.03;
  }

  function isDarkLogo(canvas) {
    const small = document.createElement("canvas");
    small.width = small.height = 64;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let total = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      total += 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]);
      count += 1;
    }
    return count > 0 && total / count < DARK_LOGO;
  }

  // Cartão da logo escura: cor principal, ou branco se a principal também for escura.
  const cardColor = primary => textOn(primary) === "#000000" ? primary : "#ffffff";

  function mount(box) {
    box.classList.add("brand-editor");
    box.innerHTML = `
      ${window.UploadRules?.html("logo") || ""}
      <label class="brand-upload">Enviar logo<input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden></label>
      <button type="button" class="brand-white" hidden>Tirar fundo branco</button>
      <p class="brand-cover" role="alert"></p>
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
    let saved = null;
    let dirty = false;
    const $ = selector => box.querySelector(selector);
    const color = name => $(`[data-color=${name}]`).value;

    function paint() {
      const top = $(".brand-preview-top"), button = $(".brand-preview-button");
      top.style.background = readable(color("text"));
      top.style.color = "#ffffff";
      $(".brand-preview-body p").style.color = readable(color("text"));
      button.style.background = color("accent");
      button.style.color = textOn(color("accent"));
      button.textContent = "COMENTE " + ($("[data-word]").value.trim().toUpperCase() || "QUERO");
      const img = $(".brand-preview-top img");
      const source = canvas ? canvas.toDataURL("image/png") : saved?.logoUrl || "";
      const dark = canvas ? isDarkLogo(canvas) : Boolean(saved?.logoDark);
      img.hidden = !source;
      if (source) img.src = source;
      img.classList.toggle("brand-logo-card", dark);
      img.style.background = dark ? cardColor(color("primary")) : "";
    }

    $("input[type=file]").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;
      $(".brand-error").textContent = "";
      $(".brand-cover").textContent = "";
      try {
        const original = toCanvas(await loadImage(file));
        const white = hasWhiteBackground(original);
        canvas = trimBackground(original);
        $(".brand-cover").textContent = looksLikeCover(original, canvas) ? COVER_MESSAGE : "";
        const colors = colorsOf(canvas);
        for (const name of Object.keys(colors)) $(`[data-color=${name}]`).value = colors[name];
        $(".brand-white").hidden = !white;
        paint();
      } catch (error) { $(".brand-error").textContent = error.message; }
    });
    $(".brand-white").addEventListener("click", () => { removeWhite(canvas); canvas = trimBackground(canvas); $(".brand-white").hidden = true; dirty = true; paint(); });
    box.addEventListener("input", () => { dirty = true; paint(); });
    paint();

    return {
      hasLogo: () => Boolean(canvas),
      changed: () => dirty,
      load(brand) {
        canvas = null;
        saved = brand || null;
        dirty = false;
        for (const name of ["primary", "accent", "text"]) $(`[data-color=${name}]`).value = brand?.colors?.[name] || DEFAULT_COLORS[name];
        $("[data-word]").value = brand?.buttonWord || "";
        $("input[type=file]").value = "";
        $(".brand-white").hidden = true;
        $(".brand-cover").textContent = "";
        $(".brand-error").textContent = "";
        paint();
      },
      async save(target) {
        const form = new FormData();
        form.set("target", target);
        for (const name of ["primary", "accent", "text"]) form.set(name, color(name));
        form.set("buttonWord", $("[data-word]").value);
        if (canvas) {
          form.set("logo", await new Promise(resolve => canvas.toBlob(resolve, "image/png")), "logo.png");
          form.set("logoDark", isDarkLogo(canvas) ? "1" : "0");
        }
        const response = await fetch("/api/master/brand", { method: "POST", credentials: "same-origin", body: form });
        const out = await response.json().catch(() => ({}));
        if (!response.ok || !out.ok) throw new Error(out.message || "Não deu para salvar a marca.");
        return out;
      }
    };
  }

  window.BrandEditor = { mount, colorsOf, removeWhite, contrast, readable, textOn, trimBackground, looksLikeCover, isDarkLogo, cardColor, COVER_MESSAGE };
})();
