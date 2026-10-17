// Master → Postagens → "Criar Reel animado" (17/10).
// 5 cenas de texto (foto opcional) + legenda. O GitHub grava o vídeo; esta tela acompanha até ficar pronto.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const FALHAS = {
    reel_setup_failed: "o gravador não instalou",
    reel_scenes_invalid: "as cenas chegaram erradas",
    reel_render_failed: "a gravação falhou",
    reel_upload_failed: "o vídeo não voltou para o Nexus"
  };

  async function acompanhar(clientId, id, status) {
    const inicio = Date.now();
    while (Date.now() - inicio < 20 * 60 * 1000) {
      await sleep(15000);
      const response = await fetch("/api/master/animated-reel?clientId=" + encodeURIComponent(clientId) + "&id=" + encodeURIComponent(id), { credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (data.status === "ready" && data.videoUrl) {
        status.textContent = "Pronto! O Reel está no painel do cliente. Falta escolher o dia e aprovar.";
        const video = $("#animated-reel-preview");
        video.src = data.videoUrl;
        video.hidden = false;
        return;
      }
      if (data.status === "reel_render_failed") {
        status.textContent = "Não deu certo: " + (FALHAS[data.error] || data.error || "erro na gravação") + ". Tente criar de novo.";
        return;
      }
      status.textContent = "Gravando o vídeo… (" + Math.round((Date.now() - inicio) / 60000) + " min). Pode deixar esta página aberta.";
    }
    status.textContent = "Está demorando. Confira daqui a pouco em Postagens.";
  }

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "animated-reel-form") return;
    event.preventDefault();
    const form = event.target;
    const status = $("#animated-reel-status");
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    $("#animated-reel-preview").hidden = true;
    status.textContent = "Enviando…";
    try {
      const response = await fetch("/api/master/animated-reel", { method: "POST", credentials: "same-origin", body: new FormData(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Não deu para criar o Reel.");
      status.textContent = "Pedido aceito. Gravando o vídeo… leva uns 5 minutos.";
      form.reset();
      await acompanhar(data.clientId, data.id, status);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  // Reel automático: carregar, salvar e "Criar um agora".
  const autoStatus = () => $("#auto-reel-status");
  function mostrar(data) {
    const form = $("#auto-reel-form");
    if (!form || !data?.config) return;
    form.elements.enabled.checked = data.config.enabled;
    form.elements.everyDays.value = data.config.everyDays;
    form.elements.hour.value = data.config.hour;
    form.elements.daysAhead.value = data.config.daysAhead;
    const partes = [data.config.enabled ? "Ligado." : "Desligado."];
    if (data.lastRunAt) partes.push("Último Reel automático: " + new Date(data.lastRunAt).toLocaleString("pt-BR") + ".");
    if (data.lastError) partes.push("Último erro: " + data.lastError);
    autoStatus().textContent = partes.join(" ");
  }
  async function carregar() {
    if (!$("#auto-reel-form")) return;
    const response = await fetch("/api/master/animated-reel/auto?clientId=primeiro-teste", { credentials: "same-origin" });
    mostrar(await response.json().catch(() => ({})));
  }
  async function salvar(runNow) {
    const form = $("#auto-reel-form");
    const config = {
      enabled: form.elements.enabled.checked,
      everyDays: Number(form.elements.everyDays.value),
      hour: form.elements.hour.value,
      daysAhead: Number(form.elements.daysAhead.value)
    };
    autoStatus().textContent = runNow ? "Escrevendo as cenas e pedindo a gravação…" : "Salvando…";
    const response = await fetch("/api/master/animated-reel/auto?clientId=primeiro-teste", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ config, runNow })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) { autoStatus().textContent = data.message || "Não deu certo."; return; }
    if (runNow && data.created) {
      autoStatus().textContent = "Cenas prontas. Gravando o vídeo…";
      await acompanhar("primeiro-teste", data.created.id, autoStatus());
      return;
    }
    await carregar();
  }
  document.addEventListener("submit", event => {
    if (event.target?.id !== "auto-reel-form") return;
    event.preventDefault();
    salvar(false);
  });
  document.addEventListener("click", event => {
    if (event.target?.id !== "auto-reel-now") return;
    event.target.disabled = true;
    salvar(true).finally(() => { event.target.disabled = false; });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => carregar().catch(() => {}));
  else carregar().catch(() => {});

  // Vitrine por nicho (só Flow Arts): qual Reel vai como exemplo na mensagem do Caçador/Captador.
  let vitrine = { map: {}, reels: [], niches: [] };
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function mostrarVitrine() {
    const nicheSel = $("#showcase-niche");
    const reelSel = $("#showcase-reel");
    if (!nicheSel || !reelSel) return;
    const atual = nicheSel.value;
    nicheSel.innerHTML = vitrine.niches.map(n => `<option value="${esc(n.key)}">${esc(n.label)}${vitrine.map[n.key] ? " ✓" : ""}</option>`).join("");
    if (atual) nicheSel.value = atual;
    const escolhido = vitrine.map[nicheSel.value]?.postId || "";
    reelSel.innerHTML = vitrine.reels.length
      ? vitrine.reels.map(r => `<option value="${esc(r.id)}">${esc(r.title)} · ${esc(String(r.createdAt || "").slice(0, 10))}</option>`).join("")
      : '<option value="">Nenhum Reel gravado ainda</option>';
    if (escolhido) reelSel.value = escolhido;
    const itens = vitrine.niches.filter(n => vitrine.map[n.key]);
    $("#showcase-list").innerHTML = itens.length
      ? itens.map(n => `<li>${esc(n.label)}: <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.url)}</a></li>`).join("")
      : "<li>Nenhuma vitrine ainda.</li>";
  }
  async function carregarVitrine() {
    if (!$("#showcase-form")) return;
    const response = await fetch("/api/master/showcase", { credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (data.ok) { vitrine = data; mostrarVitrine(); }
  }
  async function salvarVitrine(postId) {
    const status = $("#showcase-status");
    status.textContent = "Salvando…";
    const response = await fetch("/api/master/showcase", {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ niche: $("#showcase-niche").value, postId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) { status.textContent = data.message || "Não deu certo."; return; }
    status.textContent = postId ? "Vitrine salva. Link: " + data.url : "Vitrine tirada.";
    await carregarVitrine();
  }
  document.addEventListener("change", event => { if (event.target?.id === "showcase-niche") mostrarVitrine(); });
  document.addEventListener("submit", event => {
    if (event.target?.id !== "showcase-form") return;
    event.preventDefault();
    salvarVitrine($("#showcase-reel").value);
  });
  document.addEventListener("click", event => { if (event.target?.id === "showcase-remove") salvarVitrine(""); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => carregarVitrine().catch(() => {}));
  else carregarVitrine().catch(() => {});
})();
