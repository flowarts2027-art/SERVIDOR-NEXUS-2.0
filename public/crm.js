// CRM no painel Master (pedido de 17/10/2026).
// Contatos do WhatsApp pessoal do Rodrigo, etapa e dia de voltar a falar (padrão 7 dias).
// Nada é enviado sozinho: o botão abre o WhatsApp com a mensagem pronta e o Rodrigo envia.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const STAGES = [
    ["", "Todos"], ["contato", "Mandei mensagem"], ["conversando", "Conversando"],
    ["proposta", "Proposta enviada"], ["cliente", "Clientes"], ["nao-quer", "Não querem agora"]
  ];
  const STAGE_NAME = Object.fromEntries(STAGES.filter(s => s[0]));
  STAGE_NAME.cliente = "Virou cliente";
  const INTEREST = { "": "", pacote: "Pacote de Instagram", site: "Site", "pacote-site": "Pacote + site", outro: "Outro" };
  const NICHES = [["cafeteria","Cafeteria"],["restaurante","Restaurante"],["lanchonete","Lanchonete"],["padaria","Padaria"],["bar","Bar"],["salao","Salão de beleza e barbearia"],["academia","Academia"],["pet","Pet shop"],["racao","Loja de ração"],["casa_racao","Casa de ração"],["agropecuaria","Agropecuária"],["veterinario","Veterinário"],["dentista","Dentista"],["clinica","Clínica e consultório"],["farmacia","Farmácia"],["mercado","Mercado"],["roupas","Loja de roupas"],["oficina","Oficina mecânica"],["hotel","Hotel e pousada"],["imobiliaria","Imobiliária"],["contabilidade","Contabilidade"],["material","Material de construção"]];
  const NICHE_NAME = Object.fromEntries(NICHES);
  const FOLLOW = [["7", "7 dias"], ["3", "3 dias"], ["1", "Amanhã"], ["15", "15 dias"], ["30", "30 dias"], ["0", "Não marcar"]];

  let state = { stage: "", q: "", data: null, open: new Set(), settings: { via: "pessoal", templateName: "", templateUsesName: true }, sendMsg: "" };

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Login do painel não aceito. Recarregue a página.");
    if (!response.ok || data.ok === false) throw new Error(data.message || "Não deu certo. Tente de novo.");
    return data;
  }

  const waLink = c => "https://wa.me/" + encodeURIComponent(c.phone) + "?text=" + encodeURIComponent(c.message || "");

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

  function card(c, today) {
    const open = state.open.has(c.id);
    const when = dayLabel(c.nextFollowAt, today);
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
          <p class="crm-meta"><span class="crm-stage s-${esc(c.stage)}">${esc(STAGE_NAME[c.stage] || c.stage)}</span><span class="crm-when ${tone}">${esc(when)}</span></p>
        </div>
        <div class="crm-actions">
          ${state.settings.via === "flow"
            ? `<button type="button" class="primary crm-wa" data-send="${esc(c.id)}">Enviar pela Flow</button>`
            : `<a class="primary crm-wa" href="${esc(waLink(c))}" target="_blank" rel="noopener" data-wa="${esc(c.id)}">Abrir WhatsApp</a>`}
          <button type="button" class="ghost" data-done="${esc(c.id)}">Já falei</button>
          <button type="button" class="ghost crm-more" data-toggle="${esc(c.id)}" aria-expanded="${open}">${open ? "Fechar" : "Detalhes"}</button>
        </div>
      </div>
      <div class="crm-done" data-done-box="${esc(c.id)}" hidden>
        <label>Voltar a falar em<select data-done-days>${options(FOLLOW, "7")}</select></label>
        <label class="wide">O que conversaram (opcional)<input data-done-note maxlength="300" placeholder="Ex.: Pediu para falar depois do dia 20"></label>
        <button type="button" class="primary" data-done-save="${esc(c.id)}">Salvar</button>
      </div>
      ${open ? `<form class="crm-edit" data-edit="${esc(c.id)}">
        <label>Nome<input name="name" maxlength="80" value="${esc(c.name)}" required></label>
        <label>Negócio<input name="business" maxlength="80" value="${esc(c.business)}"></label>
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
    sub.textContent = n ? (n === 1 ? "1 pessoa para chamar no WhatsApp." : `${n} pessoas para chamar no WhatsApp.`) : "Ninguém para chamar hoje. Tudo em dia.";
    list.innerHTML = d.due.slice(0, 5).map(c => `<div class="today-item">
        <div><strong>${esc(c.name)}</strong><small>${esc(c.business && c.business !== c.name ? c.business : INTEREST[c.interest] || prettyPhone(c.phone))} · ${esc(dayLabel(c.nextFollowAt, d.today))}</small></div>
        ${state.settings.via === "flow" ? `<button type="button" class="primary" data-go-crm>Abrir no CRM</button>` : `<a class="primary" href="${esc(waLink(c))}" target="_blank" rel="noopener">WhatsApp</a>`}
      </div>`).join("") + (n > 5 ? `<p class="muted">E mais ${n - 5}. Abra o CRM para ver todos.</p>` : "");
  }

  const REASONS = {
    needs_template: "precisa da mensagem modelo (passou de 24 h)",
    hourly_limit: "limite de envios por hora; tente daqui a pouco",
    not_found: "contato não encontrado"
  };

  function renderVia(d) {
    const box = $("#crm-via");
    if (!box) return;
    const flow = state.settings.via === "flow";
    const n = d.due.length;
    box.innerHTML = `<div class="crm-via-row">
        <span class="crm-via-label">Enviar por</span>
        <div class="crm-switch" role="radiogroup">
          <button type="button" role="radio" aria-checked="${!flow}" class="${!flow ? "active" : ""}" data-via="pessoal">Seu WhatsApp</button>
          <button type="button" role="radio" aria-checked="${flow}" class="${flow ? "active" : ""}" data-via="flow">Número da Flow</button>
        </div>
      </div>
      <p class="muted crm-via-help">${flow
        ? "Sai pelo (21) 99855-9965, direto daqui. As respostas chegam na aba WhatsApp." + (state.settings.templateName ? "" : " Para quem não falou com a Flow nas últimas 24 h, falta cadastrar a mensagem modelo (abaixo).")
        : "Abre o WhatsApp do seu celular com a mensagem pronta. Você confere e envia."}</p>
      ${flow && n ? `<button type="button" class="primary crm-send-all" data-send-all>Enviar para todos de hoje (${n})</button>` : ""}
      ${state.sendMsg ? `<div class="crm-send-msg">${state.sendMsg}</div>` : ""}`;
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
      const out = await call("/api/master/crm/send", { method: "POST", body: JSON.stringify({ ids, confirmed: true, followDays: 7 }) });
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
        call("/api/master/crm" + (qs.toString() ? "?" + qs : "")),
        call("/api/master/crm/settings").catch(() => null)
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
        await call("/api/master/crm", { method: "POST", body: JSON.stringify(body) });
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
        const out = await call("/api/master/crm/settings", { method: "POST", body: JSON.stringify({ templateName: form.templateName.value, templateUsesName: form.templateUsesName.checked }) });
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
        await call("/api/master/crm/" + encodeURIComponent(form.dataset.edit), { method: "POST", body: JSON.stringify(formBody(form)) });
        state.open.delete(form.dataset.edit);
        await load();
      } catch (error) { msg.textContent = error.message; }
    }
  });

  document.addEventListener("click", async event => {
    const t = event.target.closest?.("[data-stage],[data-toggle],[data-done],[data-done-save],[data-archive],[data-wa],[data-via],[data-send],[data-send-all],[data-go-crm]");
    if (!t) return;
    if (t.matches("[data-go-crm]")) { document.querySelector('.nav-item[data-view="crm"]')?.click(); return; }
    if (t.matches("[data-via]")) {
      const via = t.dataset.via;
      state.settings.via = via;
      state.sendMsg = "";
      render();
      call("/api/master/crm/settings", { method: "POST", body: JSON.stringify({ via }) }).catch(() => {});
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
      const ids = (state.data?.due || []).map(c => c.id);
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
        await call("/api/master/crm/" + encodeURIComponent(t.dataset.doneSave) + "/contacted", {
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
        await call("/api/master/crm/" + encodeURIComponent(t.dataset.archive) + "/archive", { method: "POST", body: "{}" });
        state.open.delete(t.dataset.archive);
        await load();
      } catch (error) { t.textContent = error.message; }
    }
  });

  let searchTimer;
  document.addEventListener("input", event => {
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
