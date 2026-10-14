// Aba "Campanha" do portal do cliente: artes prontas ou criadas por IA,
// quantos dias (7, 15 ou 30) e quantos posts por dia (1 ou 2), e o envio das artes.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  let data = null;
  let note = "";
  let busy = false;

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Sua sessão terminou. Entre novamente.");
    if (!response.ok) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  const shortDate = day => day ? day.slice(8, 10) + "/" + day.slice(5, 7) : "";

  function choice(name, value, label, checked, disabled = false, hint = "") {
    return `<label class="camp-choice ${disabled ? "is-off" : ""}">
      <input type="radio" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ""}</span>
    </label>`;
  }

  function settingsForm() {
    const s = data.settings || { artSource: "own", days: 30, postsPerDay: 1 };
    const ai = data.ai || {};
    const aiHint = ai.enabled
      ? `Você usou ${Number(ai.usedMonth || 0)} de ${Number(ai.monthlyLimit || 0)} imagens este mês.`
      : "Ainda não liberado na sua conta. Fale com a Flow Arts.";
    return `<section class="block">
      <h2>Como vai ser a sua campanha</h2>
      <form id="camp-form" class="camp-form">
        <fieldset><legend>Quem faz as artes?</legend>
          ${choice("artSource", "own", "Eu envio as artes prontas", s.artSource !== "ai", false, "Você manda as imagens aqui embaixo e o Nexus posta na ordem.")}
          ${choice("artSource", "ai", "Criar com IA", s.artSource === "ai", !ai.enabled && s.artSource !== "ai", aiHint)}
        </fieldset>
        <fieldset><legend>Quantos dias?</legend>
          <div class="camp-row">${[7, 15, 30].map(d => choice("days", d, d + " dias", Number(s.days) === d)).join("")}</div>
        </fieldset>
        <fieldset><legend>Quantos posts por dia?</legend>
          <div class="camp-row">${[1, 2].map(n => choice("postsPerDay", n, n === 1 ? "1 post" : "2 posts", Number(s.postsPerDay) === n)).join("")}</div>
        </fieldset>
        <button class="btn btn-primary" type="submit" ${DEMO ? "disabled" : ""}>Salvar campanha</button>
        <p class="muted" id="camp-status" role="status">${esc(note || summary())}</p>
      </form>
    </section>`;
  }

  function summary() {
    const s = data.settings;
    if (!s) return "Escolha as opções e toque em Salvar campanha.";
    const total = s.days * s.postsPerDay;
    const base = `Campanha de ${s.days} dias, de ${shortDate(s.startDate)} a ${shortDate(s.endDate)}: ${total} posts.`;
    if (s.artSource !== "own") return base + " As artes são criadas por IA.";
    const left = Number(data.artLeft || 0);
    return base + (left >= total ? ` Você tem ${left} artes na fila.` : ` Você tem ${left} artes na fila. Envie mais ${total - left}.`);
  }

  function artSection() {
    if ((data.settings?.artSource || "own") !== "own") return "";
    const art = data.art || [];
    return `<section class="block">
      <h2>Suas artes</h2>
      <p class="muted">Envie imagens prontas no formato 4:5 (1080 × 1350), em JPG, PNG ou WEBP, até 10 MB cada. Elas são postadas da mais antiga para a mais nova.</p>
      <label class="btn btn-soft camp-upload">Enviar artes<input type="file" id="camp-files" accept="image/jpeg,image/png,image/webp" multiple hidden ${DEMO ? "disabled" : ""}></label>
      <p class="muted" id="camp-upload-status" role="status"></p>
      <div class="camp-grid">${art.length ? art.map(item => `<figure class="camp-art ${item.used ? "is-used" : ""}">
          <img src="${esc(item.url)}" alt="${esc(item.name)}" loading="lazy">
          <figcaption>${item.used ? "Já usada" : "Na fila"}
            ${item.used ? "" : `<button type="button" class="link" data-camp-delete="${esc(item.key)}">Apagar</button>`}</figcaption>
        </figure>`).join("") : '<div class="empty"><strong>Nenhuma arte ainda</strong>Toque em "Enviar artes" para mandar as suas imagens.</div>'}</div>
    </section>`;
  }

  function render() {
    const box = $("#campanha");
    if (!box) return;
    box.innerHTML = settingsForm() + artSection();
  }

  async function load() {
    const box = $("#campanha");
    if (!box) return;
    if (DEMO) { data = { settings: null, ai: { enabled: false }, art: [], artLeft: 0 }; render(); return; }
    try {
      data = await call("/api/portal/campaign");
      render();
    } catch (error) {
      box.innerHTML = `<div class="empty"><strong>Não consegui abrir a campanha</strong>${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id !== "camp-form" || DEMO) return;
    event.preventDefault();
    const fd = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    $("#camp-status").textContent = "Salvando…";
    try {
      data = await call("/api/portal/campaign", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ artSource: fd.get("artSource"), days: Number(fd.get("days")), postsPerDay: Number(fd.get("postsPerDay")) })
      });
      note = "Campanha salva. " + summary();
      render();
      note = "";
    } catch (error) {
      $("#camp-status").textContent = error.message;
      button.disabled = false;
    }
  });

  document.addEventListener("change", async event => {
    const input = event.target;
    if (input?.id !== "camp-files" || busy || DEMO) return;
    const files = [...(input.files || [])];
    if (!files.length) return;
    busy = true;
    const status = $("#camp-upload-status");
    let sent = 0;
    for (const file of files) {
      status.textContent = `Enviando ${sent + 1} de ${files.length}…`;
      if (file.size > 10 * 1024 * 1024) { status.textContent = `"${file.name}" tem mais de 10 MB. Pulei essa.`; continue; }
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "publish");
      try { await call("/api/portal/media", { method: "POST", body: form }); sent++; }
      catch (error) { status.textContent = error.message; }
    }
    busy = false;
    note = `${sent} ${sent === 1 ? "arte enviada" : "artes enviadas"}.`;
    await load();
    note = "";
  });

  document.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('.tabbar [data-tab="campanha"]')) { load(); return; }
    const del = target.closest("[data-camp-delete]");
    if (del) {
      if (!confirm("Apagar esta arte?")) return;
      del.disabled = true;
      try { await call("/api/portal/media/" + encodeURIComponent(del.dataset.campDelete), { method: "DELETE" }); await load(); }
      catch { del.disabled = false; del.textContent = "Erro, tente de novo"; }
    }
  });
})();
