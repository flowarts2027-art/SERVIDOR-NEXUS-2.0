// Captador de clientes (aba "Buscar" do portal do cliente). Fonte: Google Maps.
// Mesma regra do Caçador do Master: a busca aparece na hora e não é guardada.
// Só fica guardado quem o cliente chamar no WhatsApp. Nada é enviado sozinho:
// o botão abre o WhatsApp do próprio cliente.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  const FLOW_WHATS = "https://wa.me/5521964816185?text=" + encodeURIComponent("Olá! Quero ativar o Captador de clientes.");
  const TABS = [["novo", "Novos"], ["enviado", "Mandei mensagem"], ["respondeu", "Responderam"], ["reuniao", "Fechando"], ["nao-quer", "Não querem"]];
  let status = "novo";
  let data = null;
  let busy = false;
  let found = []; // resultado das buscas, só na memória desta página
  let lastNiche = "";
  let lastCity = "";
  let note = "";

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Sua sessão terminou. Entre novamente.");
    if (!response.ok) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  function promo() {
    return `<section class="block cap-promo">
      <h2>Ache novos clientes perto de você</h2>
      <p>Escolha o tipo de negócio e a cidade. O Captador busca no Google Maps e mostra empresas com telefone e uma mensagem pronta para você mandar pelo seu WhatsApp.</p>
      <ul><li>22 tipos de negócio: pet shops, lojas de ração, agropecuárias, restaurantes, salões, clínicas e mais</li><li>Mensagem com o seu nome e a sua oferta</li><li>Lista organizada: quem você já chamou, quem respondeu, quem está fechando</li></ul>
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

  function usageLine() {
    if (note) return note;
    if (!data.ready) return "A busca no Google Maps está fora do ar agora. Fale com a Flow Arts.";
    return `Fonte: Google Maps. Buscas hoje: ${Number(data.usedToday || 0)} de ${Number(data.dailyLimit || 10)}`;
  }

  function searchForm() {
    return `<section class="block">
      <h2>Buscar empresas</h2>
      <form id="cap-search" class="cap-search">
        <label>Tipo de negócio<select name="niche" required>${(data.niches || []).map(n =>
          `<option value="${esc(n.key)}" ${n.key === lastNiche ? "selected" : ""}>${esc(n.label)}</option>`).join("")}</select></label>
        <label>Cidade e estado<input name="city" maxlength="60" placeholder="Ex.: Uberlândia MG" value="${esc(lastCity)}" required></label>
        <button class="btn btn-primary" type="submit" ${data.ready ? "" : "disabled"}>Buscar empresas</button>
      </form>
      <p class="muted" id="cap-usage">${esc(usageLine())}</p>
    </section>`;
  }

  function leadActions(lead) {
    const move = (to, label, cls = "btn-soft") => `<button type="button" class="btn ${cls}" data-cap-move="${to}" data-id="${esc(lead.id)}">${label}</button>`;
    if (lead.status === "novo") return `<a class="btn btn-whats" href="${esc(lead.whatsapp)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">Abrir no WhatsApp</a>
      <button type="button" class="btn btn-soft" data-cap-copy="${esc(lead.id)}">Copiar mensagem</button>
      <button type="button" class="btn btn-ghost" data-cap-skip="${esc(lead.id)}">Não serve</button>`;
    if (lead.status === "enviado") return move("respondeu", "Respondeu", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost") + move("novo", "Não cheguei a mandar", "btn-ghost");
    if (lead.status === "respondeu") return move("reuniao", "Está fechando", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost");
    return "";
  }

  function leadCard(lead) {
    const bits = [lead.mobile ? "Celular" : "Telefone fixo (pode não ter WhatsApp)", lead.has_site ? "Tem site" : "Sem site"];
    if (lead.instagram) bits.push("Instagram @" + esc(lead.instagram));
    const stars = Number(lead.reviews) ? `<p>Nota ${esc(String(Number(lead.rating || 0).toFixed(1)).replace(".", ","))} · ${Number(lead.reviews)} avaliações no Google</p>` : "";
    return `<article class="cap-lead">
      <header><strong>${esc(lead.name)}</strong><span class="cap-score" title="Nota de 0 a 10">${Number(lead.score || 0)}/10</span></header>
      <p>${esc((data.niches || []).find(n => n.key === lead.niche)?.label || lead.niche)} · ${esc(lead.city)}</p>
      ${lead.address ? `<p>${esc(lead.address)}</p>` : ""}${stars}
      <p>${bits.join(" · ")} · <a href="${esc(lead.maps_url)}" target="_blank" rel="noopener">Ver no Maps</a></p>
      <details><summary>Ver a mensagem</summary><pre>${esc(lead.message)}</pre></details>
      <div class="cap-actions">${leadActions(lead)}</div>
    </article>`;
  }

  function render() {
    const box = $("#captador");
    if (!box) return;
    if (!data?.enabled) { box.innerHTML = promo(); return; }
    const counts = { ...(data.counts || {}), novo: found.length };
    const items = status === "novo" ? found : (data.items || []);
    box.innerHTML = configForm(data.config || {}) + searchForm() + `
      <div class="cap-tabs" role="tablist">${TABS.map(([key, label]) =>
        `<button type="button" role="tab" data-cap-tab="${key}" class="${key === status ? "active" : ""}" aria-selected="${key === status}">${label} (${Number(counts[key] || 0)})</button>`).join("")}</div>
      <div class="cap-list">${items.length ? items.map(leadCard).join("")
        : `<div class="empty"><strong>${status === "novo" ? "Nenhuma empresa na lista" : "Nada aqui ainda"}</strong>${status === "novo" ? 'Escolha o tipo de negócio, escreva a cidade e toque em "Buscar empresas". A lista aparece aqui e não fica guardada: só quem você chamar no WhatsApp fica salvo.' : ""}</div>`}</div>
      <p class="muted cap-credit">Dados do Google Maps. Confira no Maps antes de mandar.</p>`;
  }

  async function load() {
    const box = $("#captador");
    if (!box) return;
    if (DEMO) { data = { enabled: false }; render(); return; }
    try {
      data = await call("/api/portal/captador?status=" + encodeURIComponent(status === "novo" ? "enviado" : status));
      render();
    } catch (error) {
      box.innerHTML = `<div class="empty"><strong>Não consegui abrir o Captador</strong>${esc(error.message)}</div>`;
    }
  }

  function alertLine(text) {
    note = text;
    const line = $("#cap-usage");
    if (line) line.textContent = text;
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id === "cap-config") {
      event.preventDefault();
      const fd = new FormData(form);
      try {
        await call("/api/portal/captador/config", { myName: fd.get("myName"), business: fd.get("business"), offer: fd.get("offer"), onlyNoSite: fd.get("onlyNoSite") === "on" });
        found = []; // a mensagem mudou: as próximas buscas já vêm com o texto novo
        note = "Mensagem salva.";
        await load();
      } catch (error) { alertLine(error.message); }
    }
    if (form.id === "cap-search" && !busy) {
      event.preventDefault();
      busy = true;
      const fd = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      lastNiche = String(fd.get("niche") || "");
      lastCity = String(fd.get("city") || "").trim();
      alertLine("Buscando no Google Maps…");
      try {
        const result = await call("/api/portal/captador/search", { niche: lastNiche, city: lastCity });
        const seen = new Set(found.map(item => item.id));
        let added = 0;
        for (const item of result.items || []) if (!seen.has(item.id)) { seen.add(item.id); found.push(item); added++; }
        found.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
        status = "novo";
        note = `${added} empresas novas na lista. Buscas hoje: ${result.usedToday} de ${result.dailyLimit}.`;
        await load();
      } catch (error) {
        alertLine(error.message);
      } finally {
        busy = false;
        const again = $('#cap-search button[type="submit"]');
        if (again) again.disabled = !data?.ready;
      }
    }
  });

  document.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('.tabbar [data-tab="buscar"]')) { load(); return; }
    const tab = target.closest("[data-cap-tab]");
    if (tab) { status = tab.dataset.capTab; note = ""; load(); return; }
    const sent = target.closest("[data-cap-sent]");
    if (sent) {
      // O link abre o WhatsApp; aqui guardamos só este contato, como "mandei mensagem".
      const lead = found.find(item => item.id === sent.dataset.capSent);
      if (lead) call("/api/portal/captador/contacted", lead)
        .then(() => { found = found.filter(item => item.id !== lead.id); setTimeout(load, 800); }).catch(() => {});
      return;
    }
    const skip = target.closest("[data-cap-skip]");
    if (skip) {
      skip.disabled = true;
      try {
        await call("/api/portal/captador/skip", { id: skip.dataset.capSkip });
        found = found.filter(item => item.id !== skip.dataset.capSkip);
        await load();
      } catch { skip.disabled = false; skip.textContent = "Erro, tente de novo"; }
      return;
    }
    const copy = target.closest("[data-cap-copy]");
    if (copy) {
      const lead = [...found, ...(data?.items || [])].find(item => item.id === copy.dataset.capCopy);
      try { await navigator.clipboard.writeText(lead?.message || ""); copy.textContent = "Copiada!"; } catch { copy.textContent = "Não deu para copiar"; }
      return;
    }
    const move = target.closest("[data-cap-move]");
    if (move) {
      move.disabled = true;
      try {
        await call("/api/portal/captador/" + encodeURIComponent(move.dataset.id) + "/status", { status: move.dataset.capMove });
        await load();
      } catch { move.disabled = false; move.textContent = "Erro, tente de novo"; }
    }
  });
})();
