// Caçador de clientes no painel Master (aba Contatos).
// Lê /api/master/prospects. Nada é enviado sozinho: o botão abre o WhatsApp do Rodrigo.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const TABS = [
    ["novo", "Novos"], ["enviado", "Mandei mensagem"], ["respondeu", "Responderam"], ["reuniao", "Reunião marcada"], ["nao-quer", "Não querem"]
  ];
  const NICHE = { cafeteria: "Cafeteria", salao: "Salão de beleza", lanchonete: "Lanchonete" };
  const ERRORS = {
    google_key_missing: "Falta a chave do Google Maps.",
    daily_limit: "Chegou no limite de buscas de hoje. Amanhã libera de novo.",
    google_key_invalid: "Essa chave não parece certa. Confira e digite de novo.",
    osm_busy: "O servidor do mapa gratuito está ocupado. Tente de novo em 1 minuto."
  };
  let status = "novo";
  let busy = false;
  let provider = "osm";

  // Busca grátis: o navegador consulta o OpenStreetMap e manda o resultado ao Nexus.
  async function overpass(endpoints, query) {
    for (const url of endpoints) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, {
            method: "POST", body: "data=" + encodeURIComponent(query),
            headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(40000)
          });
          if (response.ok) {
            const data = await response.json();
            // O Overpass às vezes responde 200 com lista vazia e um aviso de erro (tempo esgotado).
            const failedRemark = /error|timed out|timeout|out of memory/i.test(String(data.remark || ""));
            if (Array.isArray(data.elements) && !failedRemark) return data.elements;
          }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    throw new Error("osm_busy");
  }

  async function browserSearch(niche, progress) {
    const plan = await call("/api/master/prospects/plan", { method: "POST", body: JSON.stringify({ calls: 3, niche }) });
    let added = 0, failed = 0, found = 0;
    for (const [i, job] of plan.jobs.entries()) {
      progress(`Buscando ${job.label} (${i + 1} de ${plan.jobs.length})…`);
      try {
        const elements = await overpass(plan.endpoints, job.query);
        const slim = elements.map(e => ({ type: e.type, id: e.id, tags: e.tags || {} }));
        const result = await call("/api/master/prospects/import", { method: "POST", body: JSON.stringify({ niche: job.niche, cityIndex: job.cityIndex, elements: slim }) });
        added += Number(result.added || 0);
        found += Number(result.found || 0);
      } catch { failed++; }
    }
    return { added, failed, found, usedToday: plan.usedToday, dailyLimit: plan.dailyLimit };
  }

  const call = async (path, options = {}) => {
    const response = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Login do painel não aceito. Recarregue a página.");
    if (!response.ok && !data.added) throw new Error(ERRORS[data.error] || (String(data.error || "").startsWith("google_") ? "O Google recusou a busca (" + data.error.slice(7) + "). Confira a chave." : "Erro " + response.status));
    return data;
  };

  function actions(p) {
    const move = (to, label, cls = "ghost") => `<button type="button" class="${cls}" data-move="${to}" data-id="${esc(p.id)}">${label}</button>`;
    const wa = `<a class="prospect-wa" href="${esc(p.whatsapp)}" target="_blank" rel="noopener" data-sent="${esc(p.id)}">Abrir no WhatsApp</a>`;
    const copy = `<button type="button" class="ghost" data-copy="${esc(p.id)}">Copiar mensagem</button>`;
    if (p.status === "novo") return wa + copy + move("nao-quer", "Não serve");
    if (p.status === "enviado") return move("respondeu", "Respondeu", "primary") + move("nao-quer", "Não quer") + move("novo", "Não cheguei a mandar");
    if (p.status === "respondeu") return move("reuniao", "Reunião marcada", "primary") + move("nao-quer", "Não quer");
    return move("novo", "Voltar para novos");
  }

  function card(p) {
    const stars = p.reviews ? `⭐ ${String(Number(p.rating || 0).toFixed(1)).replace(".", ",")} · ${p.reviews} avaliações` : (String(p.id).startsWith("osm:") ? "Do OpenStreetMap (sem avaliações)" : "Ainda sem avaliações");
    const web = p.instagram ? `Sem site no mapa · Instagram @${esc(p.instagram)}` : "Sem site no mapa";
    const phone = p.mobile ? "Celular" : "Telefone fixo (pode não ter WhatsApp)";
    return `<article class="prospect-card">
      <header><h3>${esc(p.name)}</h3><span class="prospect-score" title="Nota de potencial">${Number(p.score || 0)}/10</span></header>
      <p>${esc(NICHE[p.niche] || p.niche)} · ${esc(p.city)}</p>
      <p>${stars}</p>
      <p>${web} · ${phone}${p.maps_url ? ` · <a href="${esc(p.maps_url)}" target="_blank" rel="noopener">Ver no Maps</a>` : ""}</p>
      <details><summary>Ver a mensagem</summary><pre>${esc(p.message)}</pre></details>
      <div class="prospect-buttons">${actions(p)}</div>
    </article>`;
  }

  let items = [];
  async function load() {
    const list = $("#prospect-list");
    if (!list) return;
    try {
      const data = await call("/api/master/prospects?status=" + encodeURIComponent(status) + "&limit=60");
      items = data.items || [];
      provider = data.provider || "osm";
      const source = provider === "google" ? "Google Maps" : "OpenStreetMap (grátis)";
      $("#prospect-usage").textContent = `Fonte: ${source}. Buscas hoje: ${data.usedToday || 0} de ${data.dailyLimit || 30}`;
      const counts = data.counts || {};
      $("#prospect-tabs").innerHTML = TABS.map(([key, label]) =>
        `<button type="button" role="tab" data-tab="${key}" class="${key === status ? "active" : ""}" aria-selected="${key === status}">${label} (${Number(counts[key] || 0)})</button>`).join("");
      list.innerHTML = items.length
        ? items.map(card).join("")
        : `<p class="muted">${status === "novo" ? 'Nenhuma empresa nova. Toque em "Buscar empresas".' : "Nada aqui ainda."}</p>`;
    } catch (error) {
      list.innerHTML = `<p class="muted">Não consegui carregar a lista. ${esc(error.message)}</p>`;
    }
  }

  async function move(id, to) {
    await call("/api/master/prospects/" + encodeURIComponent(id) + "/status", { method: "POST", body: JSON.stringify({ status: to }) });
  }

  document.addEventListener("click", async event => {
    const tab = event.target.closest("[data-tab]");
    if (tab) { status = tab.dataset.tab; load(); return; }

    const sent = event.target.closest("[data-sent]");
    if (sent) {
      // O link abre o WhatsApp; aqui só marcamos como "mandei mensagem".
      move(sent.dataset.sent, "enviado").then(() => setTimeout(load, 800)).catch(() => {});
      return;
    }

    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const p = items.find(item => item.id === copy.dataset.copy);
      try { await navigator.clipboard.writeText(p?.message || ""); copy.textContent = "Copiada!"; }
      catch { copy.textContent = "Não deu para copiar"; }
      return;
    }

    const btn = event.target.closest("[data-move]");
    if (btn) {
      btn.disabled = true;
      try { await move(btn.dataset.id, btn.dataset.move); await load(); }
      catch (error) { btn.disabled = false; btn.textContent = "Erro, tente de novo"; }
      return;
    }

    if (event.target.closest("#prospect-search") && !busy) {
      busy = true;
      const button = $("#prospect-search");
      const usage = $("#prospect-usage");
      button.disabled = true;
      usage.textContent = "Buscando no mapa… pode levar até 1 minuto.";
      try {
        const niche = $("#prospect-niche").value;
        let result;
        if (provider === "google") {
          result = await call("/api/master/prospects/search", { method: "POST", body: JSON.stringify({ calls: 3, niche }) });
        } else {
          result = await browserSearch(niche, text => { usage.textContent = text; });
        }
        status = "novo";
        await load();
        usage.textContent = `${result.found != null ? result.found + " lugares no mapa, " : ""}${result.added || 0} empresas novas sem site. Buscas hoje: ${result.usedToday} de ${result.dailyLimit}.` + (result.failed ? ` ${result.failed} busca(s) falharam: o mapa grátis estava ocupado.` : "");
      } catch (error) {
        usage.textContent = error.message;
      } finally {
        busy = false;
        button.disabled = false;
      }
    }
  });

  const keyForm = $("#prospect-key-form");
  if (keyForm) keyForm.addEventListener("submit", async event => {
    event.preventDefault();
    const input = keyForm.querySelector('input[name="apiKey"]');
    const message = $("#prospect-key-message");
    message.textContent = "Salvando…";
    try {
      await call("/api/master/prospects/key", { method: "POST", body: JSON.stringify({ apiKey: input.value.trim() }) });
      input.value = "";
      message.textContent = "Chave salva.";
      await load();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelectorAll('[data-view="odin"]').forEach(button => button.addEventListener("click", load));
  if (document.getElementById("odin")?.classList.contains("active")) load();
})();
