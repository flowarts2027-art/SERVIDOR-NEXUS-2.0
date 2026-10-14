// Captador de clientes (aba "Buscar" do portal do cliente).
// O navegador do cliente acha a cidade e busca no OpenStreetMap (grátis).
// O Nexus guarda os contatos só para este cliente e monta a mensagem dele.
// Nada é enviado sozinho: o botão abre o WhatsApp do próprio cliente.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  const FLOW_WHATS = "https://wa.me/5521964816185?text=" + encodeURIComponent("Olá! Quero ativar o Captador de clientes.");
  const TABS = [["novo", "Novos"], ["enviado", "Mandei"], ["respondeu", "Responderam"], ["reuniao", "Fechando"], ["nao-quer", "Não querem"]];
  let status = "novo";
  let data = null;
  let busy = false;

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Sua sessão terminou. Entre novamente.");
    if (!response.ok) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  async function findCity(text) {
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q=" + encodeURIComponent(text);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const list = await response.json().catch(() => []);
    if (!Array.isArray(list) || !list.length) throw new Error("Não encontrei essa cidade. Escreva a cidade e o estado, por exemplo: Recife PE.");
    return { lat: Number(list[0].lat), lon: Number(list[0].lon) };
  }

  async function overpass(endpoints, query) {
    for (const url of endpoints) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, {
            method: "POST", body: "data=" + encodeURIComponent(query),
            headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(40000)
          });
          if (response.ok) {
            const json = await response.json();
            const failed = /error|timed out|timeout|out of memory/i.test(String(json.remark || ""));
            if (Array.isArray(json.elements) && !failed) return json.elements;
          }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    throw new Error("O mapa grátis está ocupado agora. Tente de novo daqui a alguns minutos.");
  }

  function promo() {
    return `<section class="block cap-promo">
      <h2>Ache novos clientes perto de você</h2>
      <p>Escolha o tipo de negócio e a cidade. O Captador mostra empresas com telefone e uma mensagem pronta para você mandar pelo seu WhatsApp.</p>
      <ul><li>19 tipos de negócio: restaurantes, salões, academias, clínicas e mais</li><li>Mensagem com o seu nome e a sua oferta</li><li>Lista organizada: quem você já chamou, quem respondeu, quem está fechando</li></ul>
      <p class="cap-price">${esc(data?.price || "R$ 97 por mês")}</p>
      ${DEMO ? '<p class="muted">Na demonstração, a busca fica desligada.</p>' : `<a class="btn btn-whats" href="${FLOW_WHATS}" target="_blank" rel="noopener">Quero ativar</a>`}
    </section>`;
  }

  function configForm(config) {
    const open = !config.myName || !config.offer;
    return `<details class="block cap-config" ${open ? "open" : ""}>
      <summary><h2>Sua mensagem</h2></summary>
      <form id="cap-config">
        <label>Seu nome<input name="myName" maxlength="60" value="${esc(config.myName)}" placeholder="Ex.: Ana" required></label>
        <label>Nome da sua empresa<input name="business" maxlength="80" value="${esc(config.business)}" placeholder="Ex.: Doces da Ana"></label>
        <label>O que você oferece (1 ou 2 frases)<textarea name="offer" maxlength="400" rows="3" placeholder="Ex.: Faço bolos e salgados para cafeterias, com entrega no mesmo dia." required>${esc(config.offer)}</textarea></label>
        <label class="cap-check"><input type="checkbox" name="onlyNoSite" ${config.onlyNoSite ? "checked" : ""}> Mostrar só empresas sem site</label>
        <button class="btn btn-primary" type="submit">Salvar mensagem</button>
        <p class="muted cap-note">A mensagem sempre termina com "Se preferir não receber mensagens, é só me avisar."</p>
      </form>
    </details>`;
  }

  function searchForm() {
    return `<section class="block">
      <h2>Buscar empresas</h2>
      <form id="cap-search" class="cap-search">
        <label>Tipo de negócio<select name="niche" required>${(data.niches || []).map(n => `<option value="${esc(n.key)}">${esc(n.label)}</option>`).join("")}</select></label>
        <label>Cidade e estado<input name="city" maxlength="60" placeholder="Ex.: Recife PE" required></label>
        <button class="btn btn-primary" type="submit">Buscar</button>
      </form>
      <p class="muted" id="cap-usage">Buscas hoje: ${Number(data.usedToday || 0)} de ${Number(data.dailyLimit || 10)}</p>
    </section>`;
  }

  function leadActions(lead) {
    const move = (to, label, cls = "btn-soft") => `<button type="button" class="btn ${cls}" data-cap-move="${to}" data-id="${esc(lead.id)}">${label}</button>`;
    if (lead.status === "novo") return `<a class="btn btn-whats" href="${esc(lead.whatsapp)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">Abrir no WhatsApp</a>
      <button type="button" class="btn btn-soft" data-cap-copy="${esc(lead.id)}">Copiar mensagem</button>${move("nao-quer", "Não serve", "btn-ghost")}`;
    if (lead.status === "enviado") return move("respondeu", "Respondeu", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost") + move("novo", "Não cheguei a mandar", "btn-ghost");
    if (lead.status === "respondeu") return move("reuniao", "Está fechando", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost");
    return move("novo", "Voltar para novos", "btn-ghost");
  }

  function leadCard(lead) {
    const bits = [lead.mobile ? "Celular" : "Telefone fixo (pode não ter WhatsApp)", lead.has_site ? "Tem site" : "Sem site no mapa"];
    if (lead.instagram) bits.push("Instagram @" + esc(lead.instagram));
    return `<article class="cap-lead">
      <header><strong>${esc(lead.name)}</strong><span class="cap-score" title="Nota de 0 a 10">${Number(lead.score || 0)}/10</span></header>
      <p>${esc((data.niches || []).find(n => n.key === lead.niche)?.label || lead.niche)} · ${esc(lead.city)}</p>
      <p>${bits.join(" · ")} · <a href="${esc(lead.maps_url)}" target="_blank" rel="noopener">Ver no Maps</a></p>
      <details><summary>Ver a mensagem</summary><pre>${esc(lead.message)}</pre></details>
      <div class="cap-actions">${leadActions(lead)}</div>
    </article>`;
  }

  function render() {
    const box = $("#captador");
    if (!box) return;
    if (!data?.enabled) { box.innerHTML = promo(); return; }
    const counts = data.counts || {};
    box.innerHTML = configForm(data.config || {}) + searchForm() + `
      <div class="cap-tabs" role="tablist">${TABS.map(([key, label]) =>
        `<button type="button" role="tab" data-cap-tab="${key}" class="${key === status ? "active" : ""}" aria-selected="${key === status}">${label} (${Number(counts[key] || 0)})</button>`).join("")}</div>
      <div class="cap-list">${(data.items || []).length ? data.items.map(leadCard).join("")
        : `<div class="empty"><strong>${status === "novo" ? "Nenhuma empresa nova" : "Nada aqui ainda"}</strong>${status === "novo" ? "Escolha o tipo de negócio e a cidade e toque em Buscar." : ""}</div>`}</div>
      <p class="muted cap-credit">Dados do mapa: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores do OpenStreetMap</a>. Confira no Maps antes de mandar.</p>`;
  }

  async function load() {
    const box = $("#captador");
    if (!box) return;
    if (DEMO) { data = { enabled: false }; render(); return; }
    try {
      data = await call("/api/portal/captador?status=" + encodeURIComponent(status));
      render();
    } catch (error) {
      box.innerHTML = `<div class="empty"><strong>Não consegui abrir o Captador</strong>${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id === "cap-config") {
      event.preventDefault();
      const fd = new FormData(form);
      try {
        await call("/api/portal/captador/config", { myName: fd.get("myName"), business: fd.get("business"), offer: fd.get("offer"), onlyNoSite: fd.get("onlyNoSite") === "on" });
        await load();
      } catch (error) { alertLine(error.message); }
    }
    if (form.id === "cap-search" && !busy) {
      event.preventDefault();
      busy = true;
      const fd = new FormData(form);
      const button = form.querySelector("button");
      button.disabled = true;
      const usage = $("#cap-usage");
      try {
        const city = String(fd.get("city") || "").trim();
        usage.textContent = "Procurando a cidade…";
        const point = await findCity(city);
        const plan = await call("/api/portal/captador/plan", { niche: fd.get("niche"), city, lat: point.lat, lon: point.lon });
        usage.textContent = "Buscando no mapa… pode levar até 1 minuto.";
        const elements = await overpass(plan.endpoints, plan.query);
        const result = await call("/api/portal/captador/import", { elements: elements.map(e => ({ type: e.type, id: e.id, tags: e.tags || {} })) });
        status = "novo";
        await load();
        $("#cap-usage").textContent = `${result.found} lugares no mapa, ${result.added} contatos novos. Buscas hoje: ${plan.usedToday} de ${plan.dailyLimit}.`;
      } catch (error) {
        const line = $("#cap-usage");
        if (line) line.textContent = error.message;
      } finally {
        busy = false;
        button.disabled = false;
      }
    }
  });

  function alertLine(text) {
    const line = $("#cap-usage");
    if (line) line.textContent = text;
  }

  document.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('.tabbar [data-tab="buscar"]')) { load(); return; }
    const tab = target.closest("[data-cap-tab]");
    if (tab) { status = tab.dataset.capTab; load(); return; }
    const sent = target.closest("[data-cap-sent]");
    if (sent) {
      call("/api/portal/captador/" + encodeURIComponent(sent.dataset.capSent) + "/status", { status: "enviado" }).then(() => setTimeout(load, 800)).catch(() => {});
      return;
    }
    const copy = target.closest("[data-cap-copy]");
    if (copy) {
      const lead = (data?.items || []).find(item => item.id === copy.dataset.capCopy);
      try { await navigator.clipboard.writeText(lead?.message || ""); copy.textContent = "Copiada!"; } catch { copy.textContent = "Não deu para copiar"; }
      return;
    }
    const move = target.closest("[data-cap-move]");
    if (move) {
      move.disabled = true;
      try {
        await call("/api/portal/captador/" + encodeURIComponent(move.dataset.id) + "/status", { status: move.dataset.capMove });
        await load();
      } catch (error) { move.disabled = false; move.textContent = "Erro, tente de novo"; }
    }
  });
})();
