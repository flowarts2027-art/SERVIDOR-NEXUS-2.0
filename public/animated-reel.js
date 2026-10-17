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
})();
