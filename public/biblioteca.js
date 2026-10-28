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

  // ---------- Texto por código nas artes sem texto (Rodrigo, 28/10/2026) ----------
  // Se a imagem chega com as faixas de cima e de baixo VAZIAS (só a logo), o Nexus refaz a arte no
  // padrão aprovado (PADRAO_ARTES.md): logo em cima, título em 3 linhas, foto só no meio, 3 vantagens
  // e o botão embaixo. O assunto vem da IA grátis (/texto); o texto é o revisado do Nexus.
  const TEMA = { fundo: [4, 16, 44], destaque: "#ffc20e", texto: "#ffffff", botaoTexto: "#04102c" };
  let fonteOk = null;
  function carregarFonte() {
    if (fonteOk) return fonteOk;
    if (!document.querySelector("link[data-montserrat]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.dataset.montserrat = "1";
      l.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&display=swap";
      document.head.appendChild(l);
    }
    fonteOk = Promise.all([document.fonts.load('800 60px "Montserrat"'), document.fonts.load('700 30px "Montserrat"')]).catch(() => null);
    return fonteOk;
  }

  const perto = (d, i, c, tol) => Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]) <= tol;
  // Mede as faixas lisas de cima e de baixo (retas, inclinadas ou em curva).
  // Devolve null se a arte já tem texto, ou se não dá para ter certeza (aí fica como está).
  function faixasVazias(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data;
    const px = (x, y) => (y * w + x) * 4;
    const cor = (x, y) => [d[px(x, y)], d[px(x, y) + 1], d[px(x, y) + 2]];
    const corCima = cor(3, 3), corBaixo = cor(Math.round(w / 2), h - 3);
    const escura = c => c[0] + c[1] + c[2] < 230 && c[2] >= c[0];
    if (!escura(corCima) || !escura(corBaixo)) return null;
    const cols = [];
    for (let x = Math.round(w * 0.45); x < w; x += 3) cols.push(x);
    const todas = [];
    for (let x = 0; x < w; x += 3) todas.push(x);
    const cima = cols.map(x => { let y = 0; while (y < h * 0.4 && perto(d, px(x, y), corCima, 45)) y++; return y; }).sort((p, q) => p - q);
    const baixo = todas.map(x => { let y = h - 1; while (y > h * 0.6 && perto(d, px(x, y), corBaixo, 45)) y--; return h - 1 - y; }).sort((p, q) => p - q);
    const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
    // Arte com título e botão: o fundo liso some logo no começo. Arte vazia: a faixa é alta.
    if (pct(cima, 0.5) < h * 0.055 || pct(baixo, 0.5) < h * 0.075) return null;
    return { topo: pct(cima, 0.05), base: h - pct(baixo, 0.05) };
  }

  const logos = {};
  function logoDoCliente(url) {
    if (!url) return Promise.resolve(null);
    if (!logos[url]) logos[url] = new Promise(ok => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        // Tira o fundo liso da logo (cor do canto) para ela assentar na faixa.
        const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext("2d"); g.drawImage(im, 0, 0);
        const id = g.getImageData(0, 0, c.width, c.height), fundo = [id.data[0], id.data[1], id.data[2]];
        for (let i = 0; i < id.data.length; i += 4) if (perto(id.data, i, fundo, 50)) id.data[i + 3] = 0;
        g.putImageData(id, 0, 0);
        // Recorta a sobra transparente em volta.
        let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (id.data[(y * c.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const r = document.createElement("canvas"); r.width = x1 - x0 + 1; r.height = y1 - y0 + 1;
        r.getContext("2d").drawImage(c, -x0, -y0);
        ok(r);
      };
      im.onerror = () => ok(null);
      im.src = url;
    });
    return logos[url];
  }

  function cobrir(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, foco = 0.4) {
    const escala = Math.max(dw / sw, dh / sh);
    const cw = dw / escala, ch = dh / escala;
    ctx.drawImage(img, sx + (sw - cw) / 2, sy + (sh - ch) * foco, cw, ch, dx, dy, dw, dh);
  }

  function caber(ctx, texto, peso, max, largura, min = 18) {
    let t = max;
    while (t > min) { ctx.font = `${peso} ${t}px Montserrat, sans-serif`; if (ctx.measureText(texto).width <= largura) break; t -= 2; }
    return t;
  }

  function desenharArte(img, f, texto, story, logo) {
    const W = 1080, H = story ? 1920 : 1350;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const fy0 = f.topo + 8, fh = Math.max(10, f.base - f.topo - 16);
    // Fundo: a própria foto bem desfocada e escurecida na cor do cliente.
    g.filter = "blur(18px)"; cobrir(g, img, 0, fy0, img.width, fh, -40, -40, W + 80, H + 80, 0.5); g.filter = "none";
    g.fillStyle = `rgba(${TEMA.fundo.join(",")},0.78)`; g.fillRect(0, 0, W, H);
    const m = 64, topo = story ? 270 : 48, logoAlt = story ? 170 : 150;
    // Título: 3 linhas do mesmo tamanho, a 3ª no amarelo.
    const tam = Math.min(...texto.titulo.map(t => caber(g, t, 800, story ? 92 : 86, W - 2 * m, 40)));
    let y = topo + logoAlt + 34;
    const linha = Math.round(tam * 1.1);
    const fimTitulo = y + 3 * linha + 24;
    // Embaixo: vantagens e botão (story: acima dos 20% de baixo).
    const bh = 96, baseBotao = story ? H - Math.round(H * 0.2) - bh - 24 : H - bh - 44;
    const yv = baseBotao - 150, inicioRodape = yv - 62;
    // Foto só no meio, com as bordas sumindo no fundo.
    const top = fimTitulo - 20, alt = inicioRodape + 20 - top;
    const fc = document.createElement("canvas"); fc.width = W; fc.height = alt;
    const fg = fc.getContext("2d");
    cobrir(fg, img, 0, fy0, img.width, fh, 0, 0, W, alt);
    fg.globalCompositeOperation = "destination-in";
    const gr = fg.createLinearGradient(0, 0, 0, alt);
    const fade = Math.min(0.15, 90 / alt);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(fade, "rgba(0,0,0,1)"); gr.addColorStop(1 - fade, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    fg.fillStyle = gr; fg.fillRect(0, 0, W, alt);
    g.drawImage(fc, 0, top);
    // Logo verdadeira (arquivo original do cliente), uma só, no canto de cima à esquerda.
    if (logo) g.drawImage(logo, m, topo, Math.round(logo.width * logoAlt / logo.height), logoAlt);
    g.textBaseline = "top"; g.textAlign = "left";
    g.font = `800 ${tam}px Montserrat, sans-serif`;
    texto.titulo.forEach((t, i) => { g.fillStyle = i === 2 ? TEMA.destaque : TEMA.texto; g.fillText(t, m, y); y += linha; });
    // 3 vantagens com ícone redondo amarelo.
    texto.vantagens.slice(0, 3).forEach((v, i) => {
      const cx = Math.round(W * (0.19 + 0.31 * i));
      g.fillStyle = TEMA.destaque; g.beginPath(); g.arc(cx, yv, 34, 0, Math.PI * 2); g.fill();
      g.strokeStyle = TEMA.botaoTexto; g.lineWidth = 6; g.lineCap = g.lineJoin = "round"; g.beginPath();
      if (i === 0) { g.moveTo(cx - 15, yv); g.lineTo(cx - 3, yv + 12); g.lineTo(cx + 17, yv - 12); }
      else if (i === 1) { g.moveTo(cx - 15, yv + 10); g.lineTo(cx, yv - 12); g.lineTo(cx + 15, yv + 10); }
      else { g.moveTo(cx - 15, yv); g.lineTo(cx + 14, yv); g.moveTo(cx + 2, yv - 13); g.lineTo(cx + 15, yv); g.lineTo(cx + 2, yv + 13); }
      g.stroke();
      const p = v.toUpperCase().split(" "), meio = Math.ceil(p.length / 2);
      const linhas = p.length > 1 ? [p.slice(0, meio).join(" "), p.slice(meio).join(" ")] : [v.toUpperCase()];
      g.fillStyle = TEMA.texto; g.textAlign = "center";
      linhas.forEach((ln, k) => { const t = caber(g, ln, 700, 27, 290); g.font = `700 ${t}px Montserrat, sans-serif`; g.fillText(ln, cx, yv + 50 + k * 32); });
    });
    // Botão amarelo com letra azul.
    const bw = story ? 760 : 600, bx = (W - bw) / 2;
    g.fillStyle = TEMA.destaque; g.beginPath(); g.roundRect(bx, baseBotao, bw, bh, bh / 2); g.fill();
    const tb = caber(g, texto.botao, 800, 48, bw - 70);
    g.font = `800 ${tb}px Montserrat, sans-serif`; g.fillStyle = TEMA.botaoTexto; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(texto.botao, W / 2, baseBotao + bh / 2 + 2);
    return c;
  }

  // Devolve o arquivo como está, ou a arte refeita com texto quando as faixas vieram vazias.
  async function comTexto(file, seed) {
    try {
      const img = await createImageBitmap(file);
      const nome = String(file.name || "arte.jpg");
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const f = faixasVazias(ctx, img.width, img.height);
      if (!f) return { file, escrito: false };
      const story = img.height / img.width >= 1.5;
      // Miniatura do meio da foto para a IA dizer o assunto.
      const mini = document.createElement("canvas"); const mw = 512, mh = Math.round(512 * (f.base - f.topo) / img.width);
      mini.width = mw; mini.height = Math.max(64, mh);
      mini.getContext("2d").drawImage(img, 0, f.topo, img.width, f.base - f.topo, 0, 0, mini.width, mini.height);
      const r = await call("/texto", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: mini.toDataURL("image/jpeg", 0.8), seed, story }) });
      if (!r.text) return { file, escrito: false };
      const [, logo] = await Promise.all([carregarFonte(), logoDoCliente(r.logo)]);
      const arte = desenharArte(img, f, r.text, story, logo);
      const blob = await new Promise(ok => arte.toBlob(ok, "image/jpeg", 0.92));
      if (!blob) return { file, escrito: false };
      return { file: new File([blob], nome.replace(/\.\w+$/, "") + "-texto.jpg", { type: "image/jpeg" }), escrito: true };
    } catch {
      return { file, escrito: false };
    }
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
        ${items.some(i => i.status === "programado" && !i.withText) ? `<button type="button" class="btn ghost" id="bib-texto">Pôr texto nas artes que estão sem texto</button>` : ""}
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
      const form = new FormData();
      let escritas = 0;
      const lista = files.slice(0, 30);
      try {
        const base = Date.now() % 997;
        for (const [i, f] of lista.entries()) {
          $("#bib-status").textContent = `Conferindo os textos: imagem ${i + 1} de ${lista.length}…`;
          const r = await comTexto(f, base + i);
          if (r.escrito) escritas++;
          form.append("images", r.file, r.file.name);
        }
        $("#bib-status").textContent = `Enviando ${lista.length} imagem(ns) e programando… pode levar alguns minutos.`;
        const r = await call("/enviar", { method: "POST", body: form });
        render(r.items, (escritas ? `${escritas} imagem(ns) sem texto: o Nexus escreveu o título e o botão · ` : "") + resumo(r));
      }
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
    // Artes que já estão programadas, mas chegaram sem texto: refaz e troca a imagem no post.
    if (t.id === "bib-texto") {
      t.disabled = true;
      let feitas = 0, ultimo = null;
      try {
        const lista = (await call("")).items.filter(i => i.status === "programado" && !i.withText);
        for (const [n, it] of lista.entries()) {
          $("#bib-status").textContent = `Conferindo a arte ${n + 1} de ${lista.length}…`;
          const blob = await fetch(it.url, { credentials: "same-origin", cache: "no-store" }).then(r => r.ok ? r.blob() : null).catch(() => null);
          if (!blob) continue;
          const r = await comTexto(new File([blob], it.id + ".jpg", { type: blob.type || "image/jpeg" }), n);
          if (!r.escrito) continue;
          const form = new FormData();
          form.append("id", it.id);
          form.append("image", r.file, r.file.name);
          ultimo = await call("/trocar", { method: "POST", body: form });
          feitas++;
        }
        if (ultimo) render(ultimo.items, `Pronto: o Nexus escreveu o texto em ${feitas} arte(s). Elas continuam esperando aprovação.`);
        else $("#bib-status").textContent = "Nenhuma arte sem texto encontrada.";
      } catch (e) { $("#bib-status").textContent = e.message; t.disabled = false; }
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
