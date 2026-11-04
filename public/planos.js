// Planos no painel do cliente (24/10/2026, pedido do Rodrigo): o cliente vê todos os planos,
// escolhe, paga no Pix pelo próprio painel e toca em "Já paguei". A Flow Arts confere e aprova no Master.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const GROUPS = [["base", "Planos de Instagram"], ["adicional", "Adicionais"], ["unico", "Serviços avulsos (pagamento único)"]];
  let data = null;
  let loading = false;

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("login");
    if (!response.ok || json.ok === false) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  function box() {
    let el = $("#plans-upgrade");
    const anchor = $("#plan-box");
    if (!el && anchor) { el = document.createElement("section"); el.className = "block"; el.id = "plans-upgrade"; anchor.after(el); }
    return el;
  }

  function card(p) {
    const badge = p.current ? `<span class="tag tag-ok">Seu plano</span>` : p.owned ? `<span class="tag tag-ok">Você já tem</span>`
      : p.highlight ? `<span class="tag tag-wait">➕ Mais vantagem</span>` : "";
    const combo = p.id === "postador" ? (data?.plans || []).find(x => x.id === "combo") : null;
    const offer = combo ? `<div class="up-combo-offer">
      <strong>Inclua o Autoresponder com desconto</strong>
      <p>Postador R$ 97,00 + Autoresponder R$ 39,99 = <s>R$ 136,99</s></p>
      <p class="up-combo-total">Combo R$ 119,99/mês · Economize R$ 17,00/mês</p>
      <p>2 posts e 2 stories por dia + respostas automáticas no Instagram.</p>
      ${combo.owned ? '<span class="tag tag-ok">Combo contratado</span>' : `<button type="button" class="btn btn-primary" data-plan-pick="${esc(combo.id)}">Quero o combo por R$ 119,99</button>`}
    </div>` : "";
    const action = p.owned && p.group !== "unico" ? "" : `<button type="button" class="btn ${p.highlight ? "btn-primary" : "btn-soft"}" data-plan-pick="${esc(p.id)}">${p.group === "base" ? "Mudar para este" : "Quero este"}</button>`;
    return `<article class="up-card${p.highlight ? " up-hot" : ""}${p.current ? " up-current" : ""}" data-plan-card="${esc(p.id)}">
      ${badge}
      <h3>${esc(p.name)}</h3>
      <p class="up-price">${esc(p.priceLine)}</p>
      <p class="muted">${esc(p.summary)}</p>
      ${p.upgradeNote ? `<p class="up-note">${esc(p.upgradeNote)}</p>` : ""}
      <details><summary>O que vem no plano</summary><ul>${p.includes.map(i => `<li>${esc(i)}</li>`).join("")}</ul></details>
      ${action}
      ${offer}
    </article>`;
  }

  // Comparativo tipo planilha (pedido do Rodrigo, 03/11/2026): 3 colunas coloridas, legível no celular,
  // e botão "Solicitar este plano" que abre o WhatsApp comercial da Flow Arts com o plano já escrito.
  const FLOW_WHATS = "https://wa.me/5521964816185?text=";
  const COMPARE = [
    { id: "resposta", color: "c-resp" },
    { id: "postador", color: "c-post" },
    { id: "combo", color: "c-combo" }
  ];
  const COMPARE_ROWS = [
    ["Posts no feed", { resposta: "—", postador: "2 por dia", combo: "2 por dia" }],
    ["Stories", { resposta: "—", postador: "2 por dia", combo: "2 por dia" }],
    ["Comentou QUERO, recebe no Direct", { resposta: "✓", postador: "—", combo: "✓" }],
    ["Painel para aprovar no celular", { resposta: "—", postador: "✓", combo: "✓" }]
  ];

  function askLink(p) {
    return FLOW_WHATS + encodeURIComponent("Olá! Quero solicitar o plano " + p.name + " (" + p.priceLine + ") pelo painel do Nexus.");
  }

  function compareHtml() {
    const cols = COMPARE.map(c => ({ ...c, plan: (data?.plans || []).find(p => p.id === c.id) })).filter(c => c.plan);
    if (cols.length < 2) return "";
    const head = cols.map(c => `<th scope="col" class="${c.color}">${esc(c.plan.name)}${c.id === "combo" ? '<span class="cmp-save">Economize R$ 17,00/mês</span>' : ""}</th>`).join("");
    const rows = COMPARE_ROWS.map(([label, vals]) => `<tr><th scope="row">${esc(label)}</th>${cols.map(c => {
      const v = vals[c.id] || "—";
      return `<td class="${c.color}${v === "—" ? " cmp-no" : ""}">${v === "—" ? '<span aria-label="Não inclui">—</span>' : esc(v)}</td>`;
    }).join("")}</tr>`).join("");
    const price = `<tr class="cmp-price"><th scope="row">Valor</th>${cols.map(c => `<td class="${c.color}"><b>${esc(c.plan.priceLine)}</b></td>`).join("")}</tr>`;
    const ask = `<tr class="cmp-ask"><th scope="row"><span class="sr-only">Pedir</span></th>${cols.map(c => `<td class="${c.color}">${c.plan.current
      ? '<span class="tag tag-ok">Seu plano</span>'
      : `<a class="btn btn-primary cmp-btn" href="${esc(askLink(c.plan))}" target="_blank" rel="noopener">Solicitar este plano</a>`}</td>`).join("")}</tr>`;
    return `<h3 class="up-group">Compare os planos</h3>
      <div class="cmp-wrap" tabindex="0" aria-label="Tabela comparando os planos">
        <table class="cmp-table"><thead><tr><th scope="col"><span class="sr-only">O que vem</span></th>${head}</tr></thead>
        <tbody>${rows}${price}${ask}</tbody></table>
      </div>
      <p class="muted">O botão abre o WhatsApp da Flow Arts com o plano já escrito. Separados, os dois custam R$ 136,99; no combo, R$ 119,99.</p>`;
  }

  function render() {
    const el = box();
    if (!el || !data) return;
    const pending = (data.pending || []).map(p => `<p class="up-pending">⏳ ${esc(p.name)} (${esc(p.amountLabel)}): esperando a Flow Arts confirmar o Pix.</p>`).join("");
    el.innerHTML = `<h2 id="planos">Planos e upgrade</h2>
      <p class="muted">Escolha, pague no Pix aqui mesmo e toque em "Já paguei". A Flow Arts confere e libera.</p>
      ${pending}
      ${compareHtml()}
      ${GROUPS.map(([g, title]) => {
        const list = data.plans.filter(p => p.group === g);
        return list.length ? `<h3 class="up-group">${title}</h3><div class="up-list">${list.filter(p => p.id !== "combo").map(card).join("")}</div>` : "";
      }).join("")}`;
  }

  function payHtml(p) {
    return `<div class="up-pay" data-plan-pay="${esc(p.id)}">
      <p><b>Pague ${esc(p.amountLabel)} no Pix</b>${p.kind === "mensal" ? " (1º mês)" : ""}</p>
      <ol>
        <li>Toque em "Copiar Pix".</li>
        <li>Abra o app do seu banco › Pix › Pix copia e cola. O valor já vem preenchido.</li>
        <li>Depois de pagar, volte aqui e toque em "Já paguei".</li>
      </ol>
      <textarea readonly rows="3" aria-label="Pix copia e cola">${esc(p.pix)}</textarea>
      <button type="button" class="btn btn-soft" data-plan-copy>Copiar Pix</button>
      <button type="button" class="btn btn-ok" data-plan-paid="${esc(p.id)}">Já paguei</button>
      <p class="muted">Chave Pix: ${esc(data.pixKey)} · FLOW ARTS</p>
      <p class="up-msg" role="status"></p>
    </div>`;
  }

  async function load(force = false) {
    if (loading || (data && !force)) return;
    loading = true;
    try { data = await call("/api/portal/plans"); render(); }
    catch { /* antes do login: tenta de novo no próximo toque */ }
    finally { loading = false; }
  }

  document.addEventListener("click", async event => {
    const t = event.target instanceof Element ? event.target : null;
    if (!t) return;
    if (t.closest('.tabbar, .more-menu, [data-tab="conta"]')) load(t.closest('[data-tab="conta"]') ? true : false);
    if (t.closest("[data-plans-open]")) { document.querySelector('.tabbar [data-tab="conta"]')?.click(); setTimeout(() => $("#plans-upgrade")?.scrollIntoView({ behavior: "smooth" }), 300); return; }
    const pick = t.closest("[data-plan-pick]");
    if (pick) {
      const id = pick.dataset.planPick;
      document.querySelectorAll("[data-plan-pay]").forEach(el => { if (el.dataset.planPay !== id) el.remove(); });
      const open = document.querySelector(`[data-plan-pay="${CSS.escape(id)}"]`);
      if (open) { open.remove(); return; }
      pick.insertAdjacentHTML("afterend", payHtml(data.plans.find(p => p.id === id)));
      return;
    }
    const copy = t.closest("[data-plan-copy]");
    if (copy) {
      const area = copy.parentElement.querySelector("textarea");
      try { await navigator.clipboard.writeText(area.value); } catch { area.select(); document.execCommand?.("copy"); }
      copy.textContent = "Pix copiado ✓";
      return;
    }
    const paid = t.closest("[data-plan-paid]");
    if (paid) {
      const msg = paid.parentElement.querySelector(".up-msg");
      paid.disabled = true;
      try {
        await call("/api/portal/plans/request", { planId: paid.dataset.planPaid, paidClaimed: true });
        msg.textContent = "✓ Recebido! Assim que a Flow Arts confirmar o Pix, o plano é liberado aqui no painel.";
        setTimeout(() => load(true), 1500);
      } catch (error) { msg.textContent = error.message; paid.disabled = false; }
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => load()); else load();
})();
