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
  const TABS = [["hoje", "Separadas hoje"], ["novo", "Novos"], ["depois", "Mandar depois"], ["enviado", "Mandei mensagem"], ["respondeu", "Responderam"], ["reuniao", "Fechando"], ["nao-quer", "Não querem"]];
  let status = "hoje";
  let data = null;
  let busy = false;
  let found = []; // resultado das buscas, só na memória desta página
  let lastNiche = "";
  let lastCity = "";
  let lastArea = "";
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
      <ul><li>Os tipos de negócio que compram de você</li><li>Mensagem com o seu nome e a sua oferta</li><li>Lista organizada: quem você já chamou, quem respondeu, quem está fechando</li></ul>
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

  // "Meu material" (18/10): fotos, vídeo ou tabela de preço do próprio cliente, mandados junto com a primeira mensagem.
  const canShareFiles = () => typeof navigator.share === "function" && typeof navigator.canShare === "function";
  const hasMaterial = () => Boolean(data?.material?.files?.length);
  const withMedia = lead => Boolean(hasMaterial() && lead.whatsappWithMedia && canShareFiles());

  function materialBlock() {
    const files = data?.material?.files || [];
    const thumbs = files.map(f => String(f.type).startsWith("image/")
      ? `<img src="${esc(f.url)}" alt="" loading="lazy">`
      : `<span class="cap-file">${String(f.type).startsWith("video/") ? "🎬 Vídeo" : "📄 PDF"}</span>`).join("");
    return `<details class="block cap-config" ${files.length ? "" : "open"}>
      <summary><h2>Meu material ${files.length ? `(${files.length})` : ""}</h2></summary>
      <p class="muted">Fotos, vídeo ou tabela de preço do seu negócio. Vão junto com a primeira mensagem, pelo seu WhatsApp. Não é feito por IA: é o seu material.</p>
      ${files.length ? `<div class="cap-thumbs">${thumbs}</div>` : ""}
      <form id="cap-material">
        <label>Escolha até 10 arquivos (foto, vídeo MP4 ou PDF)<input type="file" name="files" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf" multiple required></label>
        <button class="btn btn-primary" type="submit">${files.length ? "Trocar meu material" : "Salvar meu material"}</button>
        ${files.length ? `<button class="btn btn-ghost" type="button" data-cap-material-clear>Tirar o material</button>` : ""}
        <p class="muted" id="cap-material-msg"></p>
      </form>
    </details>`;
  }

  // Busca diária (22/10): o Nexus separa até 10 empresas por dia, a partir das 9h. Nada é enviado sozinho.
  function dailyBlock() {
    const d = data?.daily || { enabled: false, niches: [], cities: [], target: 10, today: 0 };
    const boxes = (data.niches || []).map(n => `<label class="cap-check"><input type="checkbox" name="niches" value="${esc(n.key)}" ${d.niches.includes(n.key) ? "checked" : ""}> ${esc(n.label)}</label>`).join("");
    return `<details class="block cap-config" ${d.enabled ? "" : "open"}>
      <summary><h2>Busca diária automática ${d.enabled ? `· ligada (${Number(d.today || 0)} de ${Number(d.target || 10)} hoje)` : "· desligada"}</h2></summary>
      <p class="muted">Todo dia, a partir das 9h, o Nexus separa empresas novas na aba "Separadas hoje", com a mensagem e o seu material prontos. Você só toca para mandar pelo WhatsApp ou pelo Direct.</p>
      <form id="cap-daily">
        <label class="cap-check"><input type="checkbox" name="enabled" ${d.enabled ? "checked" : ""}> Ligar a busca diária</label>
        <fieldset class="cap-niches"><legend>Tipos de negócio</legend>${boxes}</fieldset>
        ${regionCities(d)}
        <label>Empresas por dia<input name="target" type="number" min="1" max="10" value="${Number(d.target || 10)}"></label>
        <button class="btn btn-primary" type="submit">Salvar busca diária</button>
        <button class="btn btn-soft" type="button" data-cap-daily-run>Buscar agora</button>
        <p class="muted">Usa o mapa grátis (OpenStreetMap). Cada busca conta no limite do mês.</p>
      </form>
    </details>`;
  }

  // Cidades prontas da região (23/10): marque as da busca diária. Outras cidades, escreva embaixo.
  function regionCities(d) {
    const region = data?.region;
    const saved = d.cities || [];
    if (!region) return `<label>Cidades (separe com ponto e vírgula)<input name="cities" maxlength="300" value="${esc(saved.join("; "))}" placeholder="Ex.: Uberaba MG; Araxá MG"></label>`;
    const others = saved.filter(c => !region.cities.includes(c));
    return `<fieldset class="cap-niches cap-cities"><legend>Cidades · ${esc(region.label)}</legend>
        ${region.cities.map(c => `<label class="cap-check"><input type="checkbox" name="regionCities" value="${esc(c)}" ${saved.includes(c) ? "checked" : ""}> ${esc(c.replace(/ MG$/, ""))}</label>`).join("")}
      </fieldset>
      <label>Outras cidades (opcional, separe com ponto e vírgula)<input name="cities" maxlength="300" value="${esc(others.join("; "))}" placeholder="Ex.: Goiânia GO"></label>`;
  }

  function usageLine() {
    if (note) return note;
    if (!data.ready) return "A busca no Google Maps está fora do ar agora. Fale com a Flow Arts.";
    return `Buscas este mês: ${Number(data.usedMonth || 0)} de ${Number(data.monthlyLimit || 0)}`;
  }

  function searchForm() {
    return `<section class="block">
      <h2>Buscar empresas</h2>
      <form id="cap-search" class="cap-search">
        <label>Tipo de negócio<select name="niche" required>${(data.niches || []).map(n =>
          `<option value="${esc(n.key)}" ${n.key === lastNiche ? "selected" : ""}>${esc(n.label)}</option>`).join("")}</select></label>
        ${data.region
          ? `<label>Cidade<select name="city" required>${data.region.cities.map(c => `<option value="${esc(c)}" ${c === lastCity ? "selected" : ""}>${esc(c.replace(/ MG$/, ""))}</option>`).join("")}</select></label>
             <label>Bairro de ${esc(String(data.region.areaCity || "").replace(/ [A-Z]{2}$/, ""))} (opcional)<input name="area" list="cap-bairros" maxlength="60" placeholder="Ex.: Santa Mônica" value="${esc(lastArea)}"></label>
             <datalist id="cap-bairros">${data.region.bairros.map(b => `<option value="${esc(b)}">`).join("")}</datalist>`
          : `<label>Cidade e estado<input name="city" maxlength="60" placeholder="Ex.: Curitiba PR" value="${esc(lastCity)}" required></label>`}
        <button class="btn btn-primary" type="submit" ${data.ready ? "" : "disabled"}>Buscar empresas</button>
      </form>
      <p class="muted" id="cap-usage">${esc(usageLine())}</p>
    </section>`;
  }

  // Aberta ou fechada agora (18/10). Sem horário no mapa: horário comercial.
  function hoursBadge(lead) {
    if (!lead.hoursLabel) return "";
    if (lead.hoursGuessed) return `<p class="hours-badge hours-unknown">🕘 Horário não informado${lead.openNow ? "" : " · fora do horário comercial"}</p>`;
    return `<p class="hours-badge ${lead.openNow ? "hours-open" : "hours-closed"}">● ${esc(lead.hoursLabel)}</p>`;
  }
  const closedNow = lead => lead.hoursLabel && !lead.openNow && lead.nextOpenAt;
  const whenText = iso => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", hour: "2-digit", minute: "2-digit" });
  };

  function leadActions(lead) {
    const move = (to, label, cls = "btn-soft") => `<button type="button" class="btn ${cls}" data-cap-move="${to}" data-id="${esc(lead.id)}">${label}</button>`;
    // Sem telefone no mapa (23/10): abre no Maps para pegar o número; a mensagem fica pronta para copiar.
    if (!lead.phone && ["novo", "hoje"].includes(lead.status)) {
      const direct = lead.direct ? `<a class="btn btn-soft" href="${esc(lead.direct)}" target="_blank" rel="noopener" data-cap-direct="${esc(lead.id)}">Copiar e abrir Direct</a>` : "";
      return `<a class="btn btn-primary" href="${esc(lead.maps_url)}" target="_blank" rel="noopener">Ver no Maps (telefone)</a>
        ${direct}
        <button type="button" class="btn btn-soft" data-cap-copy="${esc(lead.id)}">Copiar mensagem</button>
        ${lead.status === "hoje" ? move("nao-quer", "Não serve", "btn-ghost") : `<button type="button" class="btn btn-ghost" data-cap-skip="${esc(lead.id)}">Não serve</button>`}`;
    }
    if (lead.status === "novo" && closedNow(lead)) return `<button type="button" class="btn btn-primary" data-cap-later="${esc(lead.id)}">${lead.hoursGuessed ? "Lembrar no horário comercial" : "Lembrar quando abrir"}</button>
      <a class="btn btn-soft" href="${esc(withMedia(lead) ? lead.whatsappWithMedia : lead.whatsapp)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">Mandar mesmo assim</a>
      <button type="button" class="btn btn-ghost" data-cap-skip="${esc(lead.id)}">Não serve</button>`;
    if (lead.status === "hoje") {
      const link = withMedia(lead) ? lead.whatsappWithMedia : lead.whatsapp;
      const direct = lead.direct ? `<a class="btn btn-soft" href="${esc(lead.direct)}" target="_blank" rel="noopener" data-cap-direct="${esc(lead.id)}">Copiar e abrir Direct</a>` : "";
      return `${lead.mobile ? `<a class="btn btn-whats" href="${esc(link)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">${withMedia(lead) ? "1. Abrir conversa" : "Abrir no WhatsApp"}</a>` : ""}
        ${withMedia(lead) ? `<button type="button" class="btn btn-primary" data-cap-share="${esc(lead.id)}">${lead.mobile ? "2. " : ""}Mandar meu material</button>` : ""}
        ${direct}
        <button type="button" class="btn btn-soft" data-cap-copy="${esc(lead.id)}">Copiar mensagem</button>
        ${move("nao-quer", "Não serve", "btn-ghost")}`;
    }
    if (lead.status === "depois") {
      const link = withMedia(lead) ? lead.whatsappWithMedia : lead.whatsapp;
      return `<a class="btn ${lead.remindDue ? "btn-whats" : "btn-soft"}" href="${esc(link)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">${lead.remindDue ? "1. Abrir conversa" : "Mandar agora mesmo assim"}</a>
        ${withMedia(lead) ? `<button type="button" class="btn btn-primary" data-cap-share="${esc(lead.id)}">2. Mandar meu material</button>` : ""}
        ${move("nao-quer", "Não serve", "btn-ghost")}`;
    }
    if (lead.status === "novo" && withMedia(lead)) return `<a class="btn btn-whats" href="${esc(lead.whatsappWithMedia)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">1. Abrir conversa</a>
      <button type="button" class="btn btn-primary" data-cap-share="${esc(lead.id)}">2. Mandar meu material</button>
      <button type="button" class="btn btn-ghost" data-cap-skip="${esc(lead.id)}">Não serve</button>`;
    if (lead.status === "novo") return `<a class="btn btn-whats" href="${esc(lead.whatsapp)}" target="_blank" rel="noopener" data-cap-sent="${esc(lead.id)}">Abrir no WhatsApp</a>
      <button type="button" class="btn btn-soft" data-cap-copy="${esc(lead.id)}">Copiar mensagem</button>
      <button type="button" class="btn btn-ghost" data-cap-skip="${esc(lead.id)}">Não serve</button>`;
    const share = hasMaterial() && canShareFiles() && ["enviado", "respondeu"].includes(lead.status)
      ? `<button type="button" class="btn btn-soft" data-cap-share="${esc(lead.id)}">Mandar meu material</button>` : "";
    if (lead.status === "enviado") return share + move("respondeu", "Respondeu", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost") + move("novo", "Não cheguei a mandar", "btn-ghost");
    if (lead.status === "respondeu") return share + move("reuniao", "Está fechando", "btn-primary") + move("nao-quer", "Não quer", "btn-ghost");
    return "";
  }

  function leadCard(lead) {
    const bits = [!lead.phone ? "Sem telefone no mapa" : lead.mobile ? "Celular" : "Telefone fixo (pode não ter WhatsApp)", lead.has_site ? "Tem site" : "Sem site"];
    if (lead.instagram) bits.push("Instagram @" + esc(lead.instagram));
    const stars = Number(lead.reviews) ? `<p>Nota ${esc(String(Number(lead.rating || 0).toFixed(1)).replace(".", ","))} · ${Number(lead.reviews)} avaliações no Google</p>` : "";
    return `<article class="cap-lead">
      <header><strong>${esc(lead.name)}</strong><span class="cap-score" title="Nota de 0 a 10">${Number(lead.score || 0)}/10</span></header>
      <p>${esc((data.niches || []).find(n => n.key === lead.niche)?.label || lead.niche)} · ${esc(lead.city)}</p>
      ${lead.status === "hoje" ? hoursBadge(lead) : ""}
      ${lead.status === "depois" && lead.remindAt ? `<p class="hours-badge ${lead.remindDue ? "hours-open" : "hours-closed"}">${lead.remindDue ? "● Já pode mandar: a empresa abriu" : "⏰ Lembrete: " + esc(whenText(lead.remindAt))}</p>` : (lead.status === "novo" ? hoursBadge(lead) : "")}
      ${lead.address ? `<p>${esc(lead.address)}</p>` : ""}${stars}
      <p>${bits.join(" · ")} · <a href="${esc(lead.maps_url)}" target="_blank" rel="noopener">Ver no Maps</a></p>
      <details><summary>Ver a mensagem</summary><pre>${esc(withMedia(lead) ? lead.messageWithMedia : lead.message)}</pre></details>
      <div class="cap-actions">${leadActions(lead)}</div>
    </article>`;
  }

  function render() {
    const box = $("#captador");
    if (!box) return;
    if (!data?.enabled) { box.innerHTML = promo(); return; }
    const counts = { ...(data.counts || {}), novo: found.length };
    const items = status === "novo" ? found : (data.items || []);
    box.innerHTML = configForm(data.config || {}) + materialBlock() + dailyBlock() + searchForm() + `
      <div class="cap-tabs" role="tablist">${TABS.map(([key, label]) =>
        `<button type="button" role="tab" data-cap-tab="${key}" class="${key === status ? "active" : ""}" aria-selected="${key === status}">${label} (${Number(counts[key] || 0)})</button>`).join("")}</div>
      <div class="cap-list">${items.length ? items.map(leadCard).join("")
        : `<div class="empty"><strong>${status === "novo" ? "Nenhuma empresa na lista" : status === "hoje" ? "Nenhuma empresa separada hoje" : "Nada aqui ainda"}</strong>${status === "hoje" ? 'Ligue a "Busca diária automática" acima. A partir das 9h, as empresas aparecem aqui.' : ""}${status === "novo" ? 'Escolha o tipo de negócio, escreva a cidade e toque em "Buscar empresas". A lista aparece aqui e não fica guardada: só quem você chamar no WhatsApp fica salvo.' : ""}</div>`}</div>
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

  // 1º toque baixa o material; 2º toque abre o compartilhar (o celular exige toque recente).
  // No WhatsApp, a conversa aberta no passo 1 aparece no topo da lista.
  let shareFiles = null;
  async function shareMaterial(button) {
    const label = button.textContent;
    if (!shareFiles) {
      button.disabled = true;
      button.textContent = "Preparando o material…";
      try {
        shareFiles = await Promise.all((data.material.files || []).map(async (f, i) => {
          const response = await fetch(f.url, { credentials: "same-origin" });
          if (!response.ok) throw new Error("arquivo");
          const blob = await response.blob();
          const ext = (String(f.url).split(".").pop() || "jpg").toLowerCase();
          return new File([blob], `material-${i + 1}.${ext}`, { type: blob.type || f.type });
        }));
        if (!navigator.canShare({ files: shareFiles })) throw new Error("share");
        button.textContent = "Pronto: toque para mandar";
        button.dataset.label = label;
      } catch {
        shareFiles = null;
        button.textContent = label;
        window.alert("Não deu para preparar o material neste celular.");
      }
      button.disabled = false;
      return;
    }
    try {
      await navigator.share({ files: shareFiles });
    } catch (error) {
      if (error?.name !== "AbortError") window.alert("Não deu para abrir o compartilhar. Tente de novo.");
    }
    if (button.dataset.label) button.textContent = button.dataset.label;
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id === "cap-material") {
      event.preventDefault();
      const msg = $("#cap-material-msg");
      const button = form.querySelector('button[type="submit"]');
      const files = form.querySelector('input[type="file"]').files;
      if (!files.length) return;
      button.disabled = true;
      if (msg) msg.textContent = "Enviando… vídeo pode demorar um pouco.";
      try {
        const fd = new FormData();
        for (const file of files) fd.append("files", file);
        const response = await fetch("/api/portal/captador/material", { method: "POST", credentials: "same-origin", body: fd });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json.ok === false) throw new Error(json.message || "Não deu para salvar. Tente de novo.");
        shareFiles = null;
        found = found.map(item => ({ ...item, whatsappWithMedia: "" })); // busca nova já vem com o texto do material
        note = "Material salvo. Faça uma busca para mandar com as próximas mensagens.";
        await load();
      } catch (error) {
        if (msg) msg.textContent = error.message;
        button.disabled = false;
      }
      return;
    }
    if (form.id === "cap-daily") {
      event.preventDefault();
      const fd = new FormData(form);
      try {
        const cities = [...fd.getAll("regionCities").map(String), ...String(fd.get("cities") || "").split(";").map(c => c.trim()).filter(Boolean)];
        await call("/api/portal/captador/daily", { enabled: fd.get("enabled") === "on", niches: fd.getAll("niches"), cities, target: Number(fd.get("target")) });
        note = "Busca diária salva.";
        await load();
      } catch (error) { alertLine(error.message); }
      return;
    }
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
      lastArea = String(fd.get("area") || "").trim();
      alertLine("Buscando…");
      try {
        const result = await call("/api/portal/captador/search", { niche: lastNiche, city: lastCity, area: lastArea && data?.region?.areaCity === lastCity ? lastArea : "" });
        const seen = new Set(found.map(item => item.id));
        let added = 0;
        for (const item of result.items || []) if (!seen.has(item.id)) { seen.add(item.id); found.push(item); added++; }
        found.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
        status = "novo";
        const noPhone = (result.items || []).filter(item => !item.phone).length;
        note = `${added} empresas novas na lista${noPhone ? ` (${noPhone} sem telefone no mapa: toque em "Ver no Maps")` : ""}. Fonte: ${result.source === "google" ? "Google Maps" : "mapa grátis"}. Buscas este mês: ${result.usedMonth} de ${result.monthlyLimit}.`;
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
      const lead = found.find(item => item.id === sent.dataset.capSent) || (data?.items || []).find(item => item.id === sent.dataset.capSent && ["depois", "hoje"].includes(item.status));
      if (lead) call("/api/portal/captador/contacted", lead)
        .then(() => { found = found.filter(item => item.id !== lead.id); setTimeout(load, 800); }).catch(() => {});
      return;
    }
    const later = target.closest("[data-cap-later]");
    if (later) {
      const lead = found.find(item => item.id === later.dataset.capLater);
      if (!lead) return;
      later.disabled = true;
      try {
        const out = await call("/api/portal/captador/later", lead);
        found = found.filter(item => item.id !== lead.id);
        note = `${lead.name} foi para "Mandar depois". ${out.when && !/Aberta/.test(out.when) ? "Lembro quando " + String(out.when).replace(/^.*· /, "") + "." : ""}`;
        await load();
      } catch (error) { later.disabled = false; later.textContent = error.message; }
      return;
    }
    const direct = target.closest("[data-cap-direct]");
    if (direct) {
      // Copia o texto antes de abrir: no Direct, é só colar. Fica salvo como "mandei mensagem".
      const lead = (data?.items || []).find(item => item.id === direct.dataset.capDirect);
      if (lead) {
        try { await navigator.clipboard.writeText(hasMaterial() && lead.messageWithMedia ? lead.messageWithMedia : lead.message); } catch { /* segue abrindo */ }
        call("/api/portal/captador/contacted", lead).then(() => setTimeout(load, 800)).catch(() => {});
      }
      return;
    }
    if (target.closest("[data-cap-daily-run]")) {
      const btn = target.closest("[data-cap-daily-run]");
      btn.disabled = true; btn.textContent = "Buscando…";
      try {
        const out = await call("/api/portal/captador/daily/run", {});
        status = "hoje";
        note = out.skipped === "not_configured" ? "Escolha os tipos de negócio e as cidades e salve antes." : `${(out.added || []).length} empresas separadas agora. Hoje: ${Number(out.picked || 0)} de ${Number(out.target || 10)}.`;
        await load();
      } catch (error) { btn.disabled = false; btn.textContent = error.message; }
      return;
    }
    const shareBtn = target.closest("[data-cap-share]");
    if (shareBtn) { await shareMaterial(shareBtn); return; }
    if (target.closest("[data-cap-material-clear]")) {
      if (!window.confirm("Tirar o seu material? As mensagens voltam a ir só com texto.")) return;
      try { await call("/api/portal/captador/material/clear", {}); shareFiles = null; note = "Material retirado."; await load(); } catch (error) { alertLine(error.message); }
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
      try { await navigator.clipboard.writeText((lead && withMedia(lead) ? lead.messageWithMedia : lead?.message) || ""); copy.textContent = "Copiada!"; } catch { copy.textContent = "Não deu para copiar"; }
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
