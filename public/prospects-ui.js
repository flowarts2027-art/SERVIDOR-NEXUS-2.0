// Caçador de clientes no painel Master (aba Contatos). Fonte: Google Maps ou, sem ele, o mapa grátis (OpenStreetMap).
// Regra do Google: a busca aparece na hora e não é guardada. Só fica guardado
// quem o Rodrigo chamar no WhatsApp. Nada é enviado sozinho.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const TABS = [
    ["novo", "Novos"], ["enviado", "Mandei mensagem"], ["respondeu", "Responderam"], ["reuniao", "Reunião marcada"], ["nao-quer", "Não querem"]
  ];
  const NICHE = { cafeteria: "Cafeteria", restaurante: "Restaurante", lanchonete: "Lanchonete", padaria: "Padaria", bar: "Bar", salao: "Salão de beleza e barbearia", academia: "Academia", pet: "Pet shop", racao: "Loja de ração", casa_racao: "Casa de ração", agropecuaria: "Agropecuária", veterinario: "Veterinário", dentista: "Dentista", clinica: "Clínica e consultório", farmacia: "Farmácia", mercado: "Mercado", roupas: "Loja de roupas", oficina: "Oficina mecânica", hotel: "Hotel e pousada", imobiliaria: "Imobiliária", contabilidade: "Contabilidade", material: "Material de construção" };
  const ERRORS = {
    google_key_missing: "Falta ativar o Google Maps: complete o crédito no Google e salve a chave aqui em cima.",
    daily_limit: "Chegou no limite de buscas de hoje. Amanhã libera de novo.",
    google_key_invalid: "Essa chave não parece certa. Confira e digite de novo.",
    osm_busy: "O servidor do mapa gratuito está ocupado. Tente de novo em 1 minuto."
  };
  let status = "novo";
  let busy = false;
  let provider = "google";
  let found = []; // resultado da última busca, só na memória desta página

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
    if (p.status === "novo") return wa + copy + `<button type="button" class="ghost" data-skip="${esc(p.id)}">Não serve</button>`;
    if (p.status === "enviado") return move("respondeu", "Respondeu", "primary") + move("nao-quer", "Não quer") + move("novo", "Não cheguei a mandar");
    if (p.status === "respondeu") return move("reuniao", "Reunião marcada", "primary") + move("nao-quer", "Não quer");
    return "";
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
      const data = await call("/api/master/prospects?status=" + encodeURIComponent(status === "novo" ? "enviado" : status) + "&limit=60");
      items = status === "novo" ? found : (data.items || []);
      provider = data.provider || "osm";
      // O mapa grátis está sempre disponível; o Google é opcional (precisa de crédito).
      $("#prospect-search").disabled = false;
      $("#prospect-usage").textContent = (data.googleKey
        ? "Fonte: Google Maps (se o Google recusar, uso o mapa grátis)."
        : "Fonte: mapa grátis (OpenStreetMap).") + ` Buscas hoje: ${data.usedToday || 0} de ${data.dailyLimit || 30}`;
      const counts = { ...(data.counts || {}), novo: found.length };
      $("#prospect-tabs").innerHTML = TABS.map(([key, label]) =>
        `<button type="button" role="tab" data-tab="${key}" class="${key === status ? "active" : ""}" aria-selected="${key === status}">${label} (${Number(counts[key] || 0)})</button>`).join("");
      list.innerHTML = items.length
        ? items.map(card).join("")
        : `<p class="muted">${status === "novo" ? 'Toque em "Buscar empresas". A lista aparece aqui e não fica guardada: só quem você chamar no WhatsApp fica salvo.' : "Nada aqui ainda."}</p>`;
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
      // O link abre o WhatsApp; aqui guardamos só este contato, como "mandei mensagem".
      const lead = found.find(item => item.id === sent.dataset.sent);
      if (lead) {
        call("/api/master/prospects/contacted", { method: "POST", body: JSON.stringify(lead) })
          .then(() => { found = found.filter(item => item.id !== lead.id); setTimeout(load, 800); }).catch(() => {});
      }
      return;
    }

    const skip = event.target.closest("[data-skip]");
    if (skip) {
      skip.disabled = true;
      try {
        await call("/api/master/prospects/skip", { method: "POST", body: JSON.stringify({ id: skip.dataset.skip }) });
        found = found.filter(item => item.id !== skip.dataset.skip);
        await load();
      } catch { skip.disabled = false; skip.textContent = "Erro, tente de novo"; }
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
        const result = await call("/api/master/prospects/search", { method: "POST", body: JSON.stringify({ calls: 3, niche }) });
        const seen = new Set(found.map(item => item.id));
        for (const item of result.items || []) if (!seen.has(item.id)) { seen.add(item.id); found.push(item); }
        found.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
        result.added = found.length;
        result.found = undefined;
        status = "novo";
        await load();
        usage.textContent = `${result.added || 0} empresas sem site na lista. Buscas hoje: ${result.usedToday} de ${result.dailyLimit}.`
          + (result.fallbackFrom === "google" ? " O Google recusou; usei o mapa grátis." : "")
          + (result.error ? " Uma busca falhou." : "");
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

  // Captador para clientes: liga ou desliga por cliente.
  async function loadAccess() {
    const box = $("#captador-access-list");
    if (!box) return;
    try {
      const data = await call("/api/master/captador/access");
      box.innerHTML = (data.clients || []).length ? data.clients.map(c => `<div class="captador-row">
          <label><input type="checkbox" data-captador-client="${esc(c.id)}" ${c.enabled ? "checked" : ""}>
          <span><b>${esc(c.name)}</b><small>${esc(c.id)}</small></span>
          <em>${c.enabled ? "Ligado" : "Desligado"}</em></label>
          <form class="captador-limit" data-captador-limit="${esc(c.id)}">
            <label>Buscas por mês <input type="number" name="limit" min="0" max="3000" step="1" value="${Number(c.monthlyLimit ?? 100)}" inputmode="numeric"></label>
            <button type="submit" class="ghost">Salvar</button>
            <small>Usou ${Number(c.usedMonth || 0)} este mês</small>
          </form>
        </div>`).join("") : '<p class="muted">Nenhum cliente cadastrado.</p>';
    } catch (error) {
      box.innerHTML = `<p class="muted">Não consegui carregar. ${esc(error.message)}</p>`;
    }
  }

  document.addEventListener("submit", async event => {
    const form = event.target.closest?.("[data-captador-limit]");
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      await call("/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: form.dataset.captadorLimit, monthlyLimit: Number(form.limit.value) }) });
      button.textContent = "Salvo!";
      setTimeout(loadAccess, 900);
    } catch { button.disabled = false; button.textContent = "Erro, tente de novo"; }
  });

  document.addEventListener("change", async event => {
    const input = event.target.closest?.("[data-captador-client]");
    if (!input) return;
    input.disabled = true;
    try {
      await call("/api/master/captador/access", { method: "POST", body: JSON.stringify({ clientId: input.dataset.captadorClient, enabled: input.checked }) });
    } catch { input.checked = !input.checked; }
    input.disabled = false;
    loadAccess();
  });

  // Imagem por IA para clientes: liga/desliga e limite do mês por cliente.
  async function loadAiAccess() {
    const box = $("#ai-images-access-list");
    if (!box) return;
    try {
      const data = await call("/api/master/ai-images/access");
      box.innerHTML = (data.clients || []).length ? data.clients.map(c => `<div class="captador-row">
          <label><input type="checkbox" data-ai-client="${esc(c.id)}" ${c.enabled ? "checked" : ""}>
          <span><b>${esc(c.name)}</b><small>${c.artSource === "ai" ? "Escolheu: criar com IA" : c.artSource === "own" ? "Escolheu: artes prontas" : "Ainda não escolheu"}</small></span>
          <em>${c.enabled ? "Ligado" : "Desligado"}</em></label>
          <p class="captador-limit"><small>${Number(c.campaignLimit) ? `Usou ${Number(c.usedCampaign || 0)} de ${Number(c.campaignLimit)} da campanha` : "Sem campanha salva"}</small></p>
        </div>`).join("") : '<p class="muted">Nenhum cliente cadastrado.</p>';
    } catch (error) {
      box.innerHTML = `<p class="muted">Não consegui carregar. ${esc(error.message)}</p>`;
    }
  }

  document.addEventListener("change", async event => {
    const input = event.target.closest?.("[data-ai-client]");
    if (!input) return;
    input.disabled = true;
    try {
      await call("/api/master/ai-images/access", { method: "POST", body: JSON.stringify({ clientId: input.dataset.aiClient, enabled: input.checked }) });
    } catch { input.checked = !input.checked; }
    input.disabled = false;
    loadAiAccess();
  });

  document.querySelectorAll('[data-view="odin"]').forEach(button => button.addEventListener("click", () => { load(); loadAccess(); loadAiAccess(); }));
  if (document.getElementById("odin")?.classList.contains("active")) { load(); loadAccess(); loadAiAccess(); }
})();
