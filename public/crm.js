// CRM no painel Master (pedido de 17/10/2026).
// Contato manual pelo Instagram da empresa; nenhuma mensagem é enviada automaticamente.
(() => {
  "use strict";
  // 22/10: o CRM mudou para o painel da Flow Arts (cliente), que define window.NEXUS_API = "/api/portal/flow".
  const API = window.NEXUS_API || "/api/master";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const STAGES = [
    ["", "Todos"], ["chamar", "Para chamar"], ["contato", "Mandei mensagem"], ["conversando", "Conversando"],
    ["proposta", "Proposta enviada"], ["cliente", "Clientes"], ["nao-quer", "Não querem agora"]
  ];
  const STAGE_NAME = Object.fromEntries(STAGES.filter(s => s[0]));
  STAGE_NAME.cliente = "Virou cliente";
  const INTEREST = { "": "", pacote: "Pacote de Instagram", site: "Site", "pacote-site": "Pacote + site", outro: "Outro" };
  const NICHES = [["cafeteria","Cafeteria"],["restaurante","Restaurante"],["lanchonete","Lanchonete"],["padaria","Padaria"],["bar","Bar"],["salao","Salão de beleza e barbearia"],["academia","Academia"],["pet","Pet shop"],["racao","Loja de ração"],["agropecuaria","Agropecuária"],["veterinario","Veterinário"],["dentista","Dentista"],["clinica","Clínica e consultório"],["farmacia","Farmácia"],["mercado","Mercado"],["roupas","Loja de roupas"],["oficina","Oficina mecânica"],["hotel","Hotel e pousada"],["imobiliaria","Imobiliária"],["contabilidade","Contabilidade"],["material","Material de construção"]];
  const NICHE_NAME = Object.fromEntries(NICHES);
  const FOLLOW = [["7", "7 dias"], ["3", "3 dias"], ["1", "Amanhã"], ["15", "15 dias"], ["30", "30 dias"], ["0", "Não marcar"]];

  function savedChannel() {
    try { return localStorage.getItem("nexus-crm-contact-channel") === "whatsapp" ? "whatsapp" : "instagram"; }
    catch { return "instagram"; }
  }
  const messageDrafts = new Map();
  let state = { channel: savedChannel(), stage: "", q: "", data: null, open: new Set(), settings: { via: "pessoal", templateName: "", templateUsesName: true }, sendMsg: "" };

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Login do painel não aceito. Recarregue a página.");
    if (!response.ok || data.ok === false) throw new Error(data.message || "Não deu certo. Tente de novo.");
    return data;
  }


  // Com exemplo: texto sem o link (a mídia vai no passo 2). 19/10: vale também no computador (baixa as imagens).
  const withMedia = c => Boolean(c.example && c.messageWithMedia);
  function instagramLink(c) {
    const value = String(c.instagram || "").trim().replace(/^@/, "");
    const match = value.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?(?:[?#].*)?$/);
    const user = match ? match[1] : value;
    return /^[a-zA-Z0-9._]{1,30}$/.test(user) && !["p", "reel", "reels", "stories", "explore", "direct", "accounts", "about", "developer", "legal"].includes(user.toLowerCase())
      ? "https://www.instagram.com/" + encodeURIComponent(user) + "/" : "";
  }
  const directLink = c => {
    const profile = instagramLink(c);
    return profile ? "https://ig.me/m/" + profile.split("/")[3] : "";
  };
  const directMessage = c => {
    const base = String(c.instagramMessage || c.message || "");
    const draft = messageDrafts.get(c.id);
    return draft?.base === base ? draft.text : base;
  };
  const whatsappLink = (c, text = directMessage(c)) => /^55\d{10,11}$/.test(String(c.phone || ""))
    ? "https://wa.me/" + c.phone + "?text=" + encodeURIComponent(text) : "";
  const channelLink = c => state.channel === "whatsapp" ? whatsappLink(c) : directLink(c);
  function contactActions(c) {
    const url = channelLink(c);
    const action = state.channel === "whatsapp"
      ? `<a class="primary crm-wa" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open-wa="${esc(c.id)}">Abrir WhatsApp com mensagem</a>`
      : `<a class="primary crm-instagram" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open-dm="${esc(c.id)}">Copiar mensagem e abrir Direct</a>`;
    return (url ? `${action}
      <button type="button" class="ghost" data-copy-message="${esc(c.id)}">Copiar mensagem</button>`
      : `<span class="muted">${state.channel === "whatsapp" ? "WhatsApp não cadastrado ou inválido. Confira o número em Detalhes." : "Instagram não cadastrado. Adicione o perfil em Detalhes."}</span>`)
      + (withMedia(c) ? `<button type="button" class="ghost" data-share-example="${esc(c.id)}">Baixar modelo de ${esc(NICHE_NAME[c.niche] || "negócio local")} (${esc(exampleWord(c))})</button>` : "");
  }
  const exampleWord = c => c.example?.kind === "image" ? "arte" : c.example?.kind === "carousel" ? "carrossel" : "vídeo";

  function prettyPhone(p) {
    const d = String(p || "").replace(/^55/, "");
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
  }

  function dayLabel(day, today) {
    if (!day) return "Sem retorno marcado";
    const diff = Math.round((Date.parse(day + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000);
    if (diff === 0) return "Falar hoje";
    if (diff === 1) return "Falar amanhã";
    if (diff === -1) return "Atrasado 1 dia";
    if (diff < 0) return `Atrasado ${-diff} dias`;
    const [y, m, d] = day.split("-");
    return `Falar em ${d}/${m}`;
  }

  function sinceLabel(iso) {
    if (!iso) return "";
    const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
    return days <= 0 ? "Último contato: hoje" : days === 1 ? "Último contato: ontem" : `Último contato: há ${days} dias`;
  }

  const options = (list, current) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(current) ? " selected" : ""}>${esc(l)}</option>`).join("");

  // Aberta ou fechada agora (só quando o mapa informa o horário).
  function hoursBadge(c) {
    if (!c.hoursLabel) return "";
    return `<span class="hours-badge ${c.openNow ? "hours-open" : "hours-closed"}">● ${esc(c.hoursLabel)}</span>`;
  }

  function card(c, today) {
    const open = state.open.has(c.id);
    const when = dayLabel(c.nextFollowAt, today) + (c.followTime && !c.late ? " às " + c.followTime : "");
    const tone = c.late ? "late" : c.due ? "due" : "";
    const sub = [c.business && c.business !== c.name ? c.business : "", NICHE_NAME[c.niche] || "", INTEREST[c.interest] || "", prettyPhone(c.phone)].filter(Boolean).join(" · ");
    const history = (c.history || []).map(h => {
      const d = new Date(h.at);
      const label = h.type === "etapa" ? "Etapa: " + (STAGE_NAME[h.text] || h.text) : h.text;
      return `<li><span>${d.toLocaleDateString("pt-BR")}</span> ${esc(label)}</li>`;
    }).join("");
    return `<article class="crm-card ${tone}" data-id="${esc(c.id)}">
      <div class="crm-card-main">
        <div class="crm-card-text">
          <h3>${esc(c.name)}</h3>
          <p>${esc(sub)}</p>
          <p class="crm-meta"><span class="crm-stage s-${esc(c.stage)}">${esc(STAGE_NAME[c.stage] || c.stage)}</span><span class="crm-when ${tone}">${esc(when)}</span>${hoursBadge(c)}</p>
        </div>
        <div class="crm-actions">
          ${contactActions(c)}
          ${c.hoursLabel && !c.openNow && c.nextOpenDay && !(c.nextFollowAt === c.nextOpenDay && c.followTime === c.nextOpenTime)
            ? `<button type="button" class="ghost" data-when-open="${esc(c.id)}">Lembrar quando abrir</button>` : ""}
          <button type="button" class="ghost" data-done="${esc(c.id)}">Já falei</button>
          ${c.stage === "chamar" ? `<button type="button" class="ghost danger-text" data-archive="${esc(c.id)}">Não serve</button>` : ""}
          <button type="button" class="ghost crm-more" data-toggle="${esc(c.id)}" aria-expanded="${open}">${open ? "Fechar" : "Detalhes"}</button>
        </div>
      </div>
      ${channelLink(c) ? `<details class="crm-note">
        <summary>Mensagem para ${state.channel === "whatsapp" ? "WhatsApp" : "Direct"} · ${esc(NICHE_NAME[c.niche] || "negócio local")}</summary>
        <label>Confira ou ajuste antes de enviar<textarea data-dm-message="${esc(c.id)}" rows="5" aria-label="Mensagem para ${state.channel === "whatsapp" ? "WhatsApp" : "Direct"} de ${esc(c.name)}">${esc(directMessage(c))}</textarea></label>
        <p class="muted">${state.channel === "whatsapp" ? "O WhatsApp abre com o texto preenchido. Confira, anexe o modelo baixado e envie manualmente." : "O botão copia o texto e abre o Direct. Cole a mensagem (Ctrl + V no computador), confira e envie. Se o Instagram abrir o perfil, toque em “Enviar mensagem”."} ${instagramLink(c) ? `<a href="${esc(instagramLink(c))}" target="_blank" rel="noopener noreferrer">Ver perfil</a>` : ""}</p>
      </details><p class="crm-note" role="status" data-dm-status hidden></p>` : ""}
      <div class="crm-done" data-done-box="${esc(c.id)}" hidden>
        <label>Voltar a falar em<select data-done-days>${options(FOLLOW, "7")}</select></label>
        <label class="wide">O que conversaram (opcional)<input data-done-note maxlength="300" placeholder="Ex.: Pediu para falar depois do dia 20"></label>
        <button type="button" class="primary" data-done-save="${esc(c.id)}">Salvar</button>
      </div>
      ${open ? `<form class="crm-edit" data-edit="${esc(c.id)}">
        <label>Nome<input name="name" maxlength="80" value="${esc(c.name)}" required></label>
        <label>Negócio<input name="business" maxlength="80" value="${esc(c.business)}"></label>
        <label>Instagram da empresa<input name="instagram" maxlength="100" placeholder="@empresa ou link do perfil" value="${esc(c.instagram || "")}"></label>
        <label>WhatsApp<input name="phone" inputmode="tel" maxlength="20" value="${esc(prettyPhone(c.phone))}" required></label>
        <label>Tipo de negócio<select name="niche">${options([["", "Não sei / outro"], ...NICHES], c.niche || "")}</select></label>
        <label>Interesse<select name="interest">${options(Object.entries(INTEREST).map(([v, l]) => [v, l || "Ainda não sei"]), c.interest)}</select></label>
        <label>Etapa<select name="stage">${options(STAGES.filter(s => s[0]).map(([v]) => [v, STAGE_NAME[v]]), c.stage)}</select></label>
        <label>Voltar a falar em<input type="date" name="nextFollowAt" value="${esc(c.nextFollowAt || "")}"></label>
        <label class="wide">Anotação<textarea name="notes" rows="3" maxlength="1000">${esc(c.notes)}</textarea></label>
        <div class="wide crm-edit-actions"><button type="submit" class="primary">Salvar mudanças</button><button type="button" class="ghost danger-text" data-archive="${esc(c.id)}">Tirar do CRM</button><span class="muted" data-edit-msg></span></div>
        <p class="wide muted">${esc(sinceLabel(c.lastContactAt))}${c.followCount ? ` · ${c.followCount} retorno(s) feito(s)` : ""}</p>
        ${history ? `<ul class="wide crm-history">${history}</ul>` : ""}
      </form>` : (c.notes ? `<p class="crm-note">${esc(c.notes)}</p>` : "")}
    </article>`;
  }

  function renderSummary(d) {
    const box = $("#crm-summary");
    if (!box) return;
    const items = [
      ["Falar hoje", d.due.length, d.due.length ? "hot" : ""],
      ["Próximos 7 dias", d.week, ""],
      ["Em conversa", (d.counts.contato || 0) + (d.counts.conversando || 0) + (d.counts.proposta || 0), ""],
      ["Clientes", d.counts.cliente || 0, "ok"]
    ];
    box.innerHTML = items.map(([l, n, t]) => `<article class="${t}"><strong>${n}</strong><span>${l}</span></article>`).join("");
  }

  function renderTabs(d) {
    const box = $("#crm-tabs");
    if (!box) return;
    box.innerHTML = STAGES.map(([v, l]) => {
      const n = v ? d.counts[v] || 0 : d.total;
      return `<button type="button" role="tab" class="${state.stage === v ? "active" : ""}" data-stage="${esc(v)}">${esc(l)} <b>${n}</b></button>`;
    }).join("");
  }

  function renderToday(d) {
    const n = d.due.length;
    const badge = $("#crm-nav-count");
    if (badge) { badge.textContent = String(n); badge.hidden = !n; }
    const sub = $("#today-sub"), list = $("#today-list");
    if (!sub || !list) return;
    sub.textContent = n ? (n === 1 ? `1 empresa para contatar no ${state.channel === "whatsapp" ? "WhatsApp" : "Instagram"}.` : `${n} empresas para contatar no ${state.channel === "whatsapp" ? "WhatsApp" : "Instagram"}.`) : "Ninguém para chamar hoje. Tudo em dia.";
    list.innerHTML = d.due.slice(0, 5).map(c => `<div class="today-item">
        <div><strong>${esc(c.name)}</strong><small>${esc(c.business && c.business !== c.name ? c.business : INTEREST[c.interest] || prettyPhone(c.phone))} · ${esc(dayLabel(c.nextFollowAt, d.today))}</small></div>
        <button type="button" class="primary" data-go-crm>Abrir no CRM</button>
      </div>`).join("") + (n > 5 ? `<p class="muted">E mais ${n - 5}. Abra o CRM para ver todos.</p>` : "");
  }

  const REASONS = {
    needs_template: "precisa da mensagem modelo (passou de 24 h)",
    hourly_limit: "limite de envios por hora; tente daqui a pouco",
    not_found: "contato não encontrado",
    new_contact_personal: "empresa nova: envie pelo seu WhatsApp"
  };

  function renderVia(d) {
    const box = $("#crm-via");
    if (!box) return;
    box.innerHTML = `<div class="crm-via-row"><span class="crm-via-label">Contato manual por</span>
      <div class="crm-switch" role="radiogroup" aria-label="Canal de contato">
        <button type="button" role="radio" aria-checked="${state.channel === "instagram"}" class="${state.channel === "instagram" ? "active" : ""}" data-channel="instagram">Instagram</button>
        <button type="button" role="radio" aria-checked="${state.channel === "whatsapp"}" class="${state.channel === "whatsapp" ? "active" : ""}" data-channel="whatsapp">WhatsApp</button>
      </div></div>
      <p class="muted crm-via-help">${state.channel === "whatsapp" ? "O WhatsApp abre com a mensagem do nicho preenchida. Você confere, anexa o modelo baixado e envia." : "O botão copia a mensagem do nicho e abre o Direct. Você cola o texto, anexa o modelo baixado e envia."} Nenhuma mensagem é enviada automaticamente.</p>`;
    const tpl = $("#crm-template-form");
    if (tpl && !tpl.dataset.filled) {
      tpl.templateName.value = state.settings.templateName || "";
      tpl.templateUsesName.checked = state.settings.templateUsesName !== false;
      tpl.dataset.filled = "1";
    }
  }

  async function sendFlow(ids) {
    state.sendMsg = "Enviando…";
    render();
    try {
      const out = await call(API + "/crm/send", { method: "POST", body: JSON.stringify({ ids, confirmed: true, followDays: 7 }) });
      const fails = out.results.filter(r => !r.ok);
      state.sendMsg = `<strong>${out.sent} enviada(s).</strong>` + (fails.length
        ? `<ul>${fails.map(r => `<li>${esc(r.name || "Contato")}: ${esc(REASONS[r.reason] || r.reason)}</li>`).join("")}</ul>` : "");
    } catch (error) {
      state.sendMsg = esc(error.message);
    }
    await load();
  }

  function render() {
    const d = state.data;
    if (!d) return;
    renderVia(d);
    renderSummary(d);
    renderTabs(d);
    renderToday(d);
    const due = $("#crm-due");
    if (due) due.innerHTML = d.due.length ? d.due.map(c => card(c, d.today)).join("") : `<p class="crm-empty">Ninguém para chamar hoje. 👍</p>`;
    const list = $("#crm-list");
    if (list) {
      list.innerHTML = d.contacts.length ? d.contacts.map(c => card(c, d.today)).join("")
        : `<p class="crm-empty">${d.total ? "Nenhum contato aqui." : "Ainda não tem contatos. Toque em “Novo contato” para salvar o primeiro."}</p>`;
    }
  }

  async function load() {
    try {
      const qs = new URLSearchParams();
      if (state.stage) qs.set("stage", state.stage);
      if (state.q) qs.set("q", state.q);
      const [data, cfg] = await Promise.all([
        call(API + "/crm" + (qs.toString() ? "?" + qs : "")),
        call(API + "/crm/settings").catch(() => null)
      ]);
      state.data = data;
      if (cfg?.settings) state.settings = cfg.settings;
      render();
    } catch (error) {
      const list = $("#crm-list");
      if (list) list.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      const sub = $("#today-sub");
      if (sub) sub.textContent = "Não consegui carregar o CRM agora.";
    }
  }

  function formBody(form) {
    const body = Object.fromEntries(new FormData(form).entries());
    return body;
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id === "crm-form") {
      event.preventDefault();
      const msg = $("#crm-form-msg");
      msg.textContent = "Salvando…";
      try {
        const body = formBody(form);
        body.followDays = Number(body.followDays);
        await call(API + "/crm", { method: "POST", body: JSON.stringify(body) });
        form.reset();
        msg.textContent = "Contato salvo. ✔";
        await load();
      } catch (error) { msg.textContent = error.message; }
      return;
    }
    if (form.id === "crm-template-form") {
      event.preventDefault();
      const msg = $("#crm-template-msg");
      msg.textContent = "Salvando…";
      try {
        const out = await call(API + "/crm/settings", { method: "POST", body: JSON.stringify({ templateName: form.templateName.value, templateUsesName: form.templateUsesName.checked }) });
        state.settings = out.settings;
        msg.textContent = "Salvo. ✔";
        render();
      } catch (error) { msg.textContent = error.message; }
      return;
    }
    if (form.matches?.("[data-edit]")) {
      event.preventDefault();
      const msg = form.querySelector("[data-edit-msg]");
      msg.textContent = "Salvando…";
      try {
        await call(API + "/crm/" + encodeURIComponent(form.dataset.edit), { method: "POST", body: JSON.stringify(formBody(form)) });
        state.open.delete(form.dataset.edit);
        await load();
      } catch (error) { msg.textContent = error.message; }
    }
  });

  // Baixa os exemplos para anexar manualmente no Direct do Instagram.
  const shareCache = new Map();
  async function exampleFiles(c) {
    if (shareCache.has(c.id)) return shareCache.get(c.id);
    const modelName = [c.niche || "modelo", c.business || c.name || "empresa"].join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
    const files = await Promise.all(c.example.files.map(async (u, i) => {
      const path = new URL(u, location.href).pathname;
      const response = await fetch(path, { credentials: "same-origin" });
      if (!response.ok) throw new Error("arquivo");
      const blob = await response.blob();
      const video = c.example.kind === "video";
      return new File([blob], video ? `exemplo-flowarts-${modelName}.mp4` : `exemplo-flowarts-${modelName}-${i + 1}.jpg`, { type: blob.type || (video ? "video/mp4" : "image/jpeg") });
    }));
    shareCache.set(c.id, files);
    return files;
  }
  function downloadFiles(files) {
    files.forEach((file, i) => setTimeout(() => {
      const url = URL.createObjectURL(file);
      const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, i * 400));
  }
  async function shareExample(button) {
    const c = [...(state.data?.contacts || []), ...(state.data?.due || [])].find(x => x.id === button.dataset.shareExample);
    if (!c?.example) return;
    const ready = shareCache.has(c.id);
    if (!ready) { button.disabled = true; button.textContent = "Preparando…"; }
    let files;
    try { files = await exampleFiles(c); }
    catch { button.disabled = false; button.textContent = "Não deu. Toque de novo"; return; }
    button.disabled = false;
    downloadFiles(files);
    button.textContent = "Baixado ✔";
    const box = button.closest(".crm-card");
    if (box && !box.querySelector(".crm-share-help")) box.insertAdjacentHTML("beforeend",
      `<p class="muted crm-share-help">Arquivos salvos em Downloads. No ${state.channel === "whatsapp" ? "WhatsApp" : "Direct do Instagram"}, anexe os arquivos <b>exemplo-flowarts</b> e confira antes de enviar.</p>`);
  }

  document.addEventListener("click", async event => {
    const t = event.target.closest?.("[data-channel],[data-open-wa],[data-open-dm],[data-copy-message],[data-stage],[data-toggle],[data-done],[data-done-save],[data-archive],[data-wa],[data-via],[data-send],[data-send-all],[data-go-crm],[data-share-example],[data-when-open]");
    if (!t) return;
    if (t.matches("[data-channel]")) {
      if (!["instagram", "whatsapp"].includes(t.dataset.channel)) return;
      state.channel = t.dataset.channel;
      try { localStorage.setItem("nexus-crm-contact-channel", state.channel); } catch { /* keep current session choice */ }
      render();
      return;
    }
    if (t.matches("[data-open-wa]")) {
      const c = [...(state.data?.contacts || []), ...(state.data?.due || [])].find(c => c.id === t.dataset.openWa);
      if (!c) { event.preventDefault(); return; }
      const text = t.closest(".crm-card")?.querySelector("[data-dm-message]")?.value ?? directMessage(c);
      const url = whatsappLink(c, text);
      if (!url) { event.preventDefault(); return; }
      t.href = url;
      return;
    }
    if (t.matches("[data-open-dm],[data-copy-message]")) {
      // Keep the anchor's native navigation within this click; awaiting before opening loses user activation.
      const id = t.dataset.openDm || t.dataset.copyMessage;
      const c = [...(state.data?.contacts || []), ...(state.data?.due || [])].find(c => c.id === id);
      if (!c) return;
      const card = t.closest(".crm-card");
      const text = card?.querySelector("[data-dm-message]")?.value ?? directMessage(c);
      const status = card?.querySelector("[data-dm-status]");
      try {
        await navigator.clipboard.writeText(text);
        if (status) { status.hidden = false; status.textContent = state.channel === "whatsapp" ? "Mensagem copiada. Confira no WhatsApp antes de enviar." : "Mensagem copiada. No Direct, cole (Ctrl + V), confira e envie."; }
        if (!t.dataset.openDm) t.textContent = "Mensagem copiada";
      } catch {
        if (status) { status.hidden = false; status.textContent = "Não foi possível copiar automaticamente. Abra a prévia da mensagem e copie o texto manualmente."; }
        if (!t.dataset.openDm) t.textContent = "Copie o texto na prévia da mensagem";
      }
      return;
    }
    if (t.matches("[data-when-open]")) {
      t.disabled = true;
      try { await call(API + "/crm/" + encodeURIComponent(t.dataset.whenOpen) + "/when-open", { method: "POST", body: "{}" }); await load(); }
      catch (error) { t.disabled = false; t.textContent = error.message; }
      return;
    }
    if (t.matches("[data-share-example]")) { await shareExample(t); return; }
    if (t.matches("[data-go-crm]")) { document.querySelector('.nav-item[data-view="crm"]')?.click(); return; }
    if (t.matches("[data-via]")) {
      const via = t.dataset.via;
      state.settings.via = via;
      state.sendMsg = "";
      render();
      call(API + "/crm/settings", { method: "POST", body: JSON.stringify({ via }) }).catch(() => {});
      return;
    }
    if (t.matches("[data-send]")) {
      // Segundo toque confirma (sem janela do navegador).
      if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Toque de novo para enviar"; return; }
      t.disabled = true;
      await sendFlow([t.dataset.send]);
      return;
    }
    if (t.matches("[data-send-all]")) {
      const ids = (state.data?.due || []).filter(c => c.stage !== "chamar").map(c => c.id);
      if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = `Confirmar: enviar para ${ids.length}`; return; }
      t.disabled = true;
      await sendFlow(ids.slice(0, 25));
      return;
    }
    if (t.matches("[data-stage]")) { state.stage = t.dataset.stage; await load(); return; }
    if (t.matches("[data-toggle]")) {
      const id = t.dataset.toggle;
      state.open.has(id) ? state.open.delete(id) : state.open.add(id);
      render();
      return;
    }
    if (t.matches("[data-wa]")) {
      // Depois de abrir o WhatsApp, já mostra o "Já falei" para marcar a próxima volta.
      const box = t.closest(".crm-card")?.querySelector("[data-done-box]");
      if (box) box.hidden = false;
      return;
    }
    if (t.matches("[data-done]")) {
      const box = t.closest(".crm-card")?.querySelector("[data-done-box]");
      if (box) box.hidden = !box.hidden;
      return;
    }
    if (t.matches("[data-done-save]")) {
      const box = t.closest("[data-done-box]");
      t.disabled = true;
      try {
        await call(API + "/crm/" + encodeURIComponent(t.dataset.doneSave) + "/contacted", {
          method: "POST",
          body: JSON.stringify({ followDays: Number(box.querySelector("[data-done-days]").value), note: box.querySelector("[data-done-note]").value })
        });
        await load();
      } catch (error) { t.disabled = false; t.textContent = error.message; }
      return;
    }
    if (t.matches("[data-archive]")) {
      if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Toque de novo para tirar"; return; }
      try {
        await call(API + "/crm/" + encodeURIComponent(t.dataset.archive) + "/archive", { method: "POST", body: "{}" });
        state.open.delete(t.dataset.archive);
        await load();
      } catch (error) { t.textContent = error.message; }
    }
  });

  let searchTimer;
  document.addEventListener("input", event => {
    if (event.target.matches?.("[data-dm-message]")) {
      const id = event.target.dataset.dmMessage;
      const c = [...(state.data?.contacts || []), ...(state.data?.due || [])].find(c => c.id === id);
      if (c) {
        messageDrafts.set(id, {base: String(c.instagramMessage || c.message || ""), text: event.target.value});
        document.querySelectorAll?.("[data-dm-message]").forEach(field => {
          if (field !== event.target && field.dataset.dmMessage === id) field.value = event.target.value;
        });
        const link = event.target.closest(".crm-card")?.querySelector("[data-open-wa]");
        if (link) link.href = whatsappLink(c, event.target.value);
      }
      return;
    }
    if (event.target.id !== "crm-search") return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = event.target.value.trim(); load(); }, 300);
  });

  document.addEventListener("nexus:view", event => {
    if (event.detail === "crm" || event.detail === "dashboard") load();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
