// Master → Postagens → "Testar carrossel" (agente de marketing, 16/10).
// Cria 1 carrossel de teste (não publica) e acompanha: títulos, fotos revisadas e os 5 cartões prontos.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const CLIENT = "primeiro-teste";
  const KEY = "nexus-carousel-test-id";
  let timer = null;

  const PHOTO = { approved: "aprovada", rejected: "reprovada (refazendo)", generated: "gerada", unavailable: "esperando revisão" };
  const STATUS = { waiting: "Começando…", planning: "Agente escrevendo os 5 cartões…", building: "Gerando e revisando as fotos…", rendering: "Fotos aprovadas. O GitHub está escrevendo os títulos…", approved: "Pronto!", failed: "Falhou." };

  function render(test) {
    const box = $("#carousel-test-status");
    if (!box) return;
    const titles = test.titles.length ? "<ol>" + test.titles.map(t => "<li>" + esc(t) + "</li>").join("") + "</ol>" : "";
    const photos = test.photos.length ? "<p>Fotos: " + test.photos.map((p, i) => (i + 1) + " " + esc(PHOTO[p.status] || p.status) + (p.status === "rejected" && p.reason ? " — " + esc(p.reason) : "")).join(" · ") + "</p>" : "";
    const cards = test.carouselUrls.length ? '<div style="display:flex;gap:8px;overflow-x:auto">' + test.carouselUrls.map(u => '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="" style="width:180px;border-radius:8px"></a>').join("") + "</div>" : "";
    const fail = test.status === "failed" && test.failure ? "<p>Motivo: " + esc(test.failure) + "</p>" : "";
    box.innerHTML = "<p><strong>" + esc(STATUS[test.status] || test.status) + "</strong></p>" + fail + titles + photos + cards;
  }

  // Faz o trabalho passo a passo pelo próprio navegador (não depende do relógio do servidor).
  let stepping = false;
  async function drive(id) {
    if (stepping) return;
    stepping = true;
    try {
      for (let i = 0; i < 25; i++) {
        const response = await fetch("/api/master/carousel-test/" + CLIENT + "/" + encodeURIComponent(id) + "/step", { method: "POST", credentials: "same-origin" });
        if (!response.ok) break;
        const data = await response.json();
        if (data?.test) render(data.test);
        if (!data?.test || ["rendering", "approved", "failed"].includes(data.test.status)) break;
      }
    } catch {}
    stepping = false;
    poll(id);
  }

  async function poll(id) {
    clearTimeout(timer);
    try {
      const response = await fetch("/api/master/carousel-test/" + CLIENT + "/" + encodeURIComponent(id), { credentials: "same-origin" });
      if (response.status === 404) { try { localStorage.removeItem(KEY); } catch {} return; }
      const data = await response.json();
      if (data?.test) render(data.test);
      if (data?.test && ["approved", "failed"].includes(data.test.status)) return;
      if (data?.test && !["rendering"].includes(data.test.status) && !stepping) return drive(id);
    } catch {}
    timer = setTimeout(() => poll(id), 20000);
  }

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "carousel-test-form") return;
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const data = Object.fromEntries(new FormData(form));
    button.disabled = true;
    $("#carousel-test-status").textContent = "Criando o teste…";
    try {
      const response = await fetch("/api/master/carousel-test", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: CLIENT, nicheId: data.nicheId, theme: data.theme }) });
      const out = await response.json();
      if (!response.ok || !out?.test?.id) throw new Error(out?.error || "erro " + response.status);
      try { localStorage.setItem(KEY, out.test.id); } catch {}
      drive(out.test.id);
    } catch (error) {
      $("#carousel-test-status").textContent = "Não consegui criar o teste: " + error.message;
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    let id = "";
    try { id = localStorage.getItem(KEY) || ""; } catch {}
    if (id) drive(id);
  });
})();
