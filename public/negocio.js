// Aba "Meu negócio" do portal do cliente: o cliente conta o que vende,
// para quem e onde. Os agentes usam isso para criar os posts dele.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  const FIELDS = [
    ["brandName", "Nome da empresa", "input", 80, "Ex.: Padaria Sol Nascente", true],
    ["niche", "Ramo do negócio", "input", 80, "Ex.: Padaria e confeitaria", true],
    ["offer", "O que você vende (1 ou 2 frases)", "textarea", 400, "Ex.: Pães, bolos e salgados feitos na hora, com entrega no bairro.", true],
    ["services", "Produtos ou serviços principais", "textarea", 600, "Ex.: Pão francês, bolos de festa, salgados para eventos.", false],
    ["audience", "Para quem você vende", "input", 300, "Ex.: Famílias do bairro e empresas que fazem eventos", false],
    ["region", "Cidade ou região que atende", "input", 120, "Ex.: Centro e zona sul da cidade", false],
    ["differentials", "Por que comprar com você", "textarea", 400, "Ex.: Receitas da família e entrega em até 1 hora.", false],
    ["whatsapp", "WhatsApp do negócio (com DDD)", "input", 20, "Ex.: 11 99999-1111", false]
  ];
  let loaded = false;

  async function call(body) {
    const response = await fetch("/api/portal/business", body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Sua sessão terminou. Entre novamente.");
    if (!response.ok) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  function field([key, label, kind, max, placeholder, required], value) {
    const attrs = `name="${key}" maxlength="${max}" placeholder="${esc(placeholder)}" ${required ? "required" : ""}`;
    const input = kind === "textarea"
      ? `<textarea ${attrs} rows="3">${esc(value)}</textarea>`
      : `<input ${attrs} value="${esc(value)}" ${key === "whatsapp" ? 'inputmode="tel"' : ""}>`;
    return `<label>${esc(label)}${required ? "" : ' <span class="muted">(opcional)</span>'}${input}</label>`;
  }

  function render(data) {
    const box = $("#negocio");
    if (!box) return;
    const profile = data?.profile || {};
    box.innerHTML = `<section class="block">
      <h2>Conte sobre o seu negócio</h2>
      <p class="muted">Os agentes usam essas informações para criar os seus posts e as suas mensagens.</p>
      <form id="negocio-form" class="negocio-form">
        ${FIELDS.map(f => field(f, profile[f[0]] || "")).join("")}
        <button class="btn btn-primary" type="submit" ${DEMO ? "disabled" : ""}>Salvar perfil</button>
        <p class="muted" id="negocio-status" role="status">${DEMO ? "Na demonstração, nada é salvo." : data?.submittedAt ? "Perfil salvo. Você pode mudar quando quiser." : ""}</p>
      </form>
    </section>`;
  }

  async function load() {
    const box = $("#negocio");
    if (!box) return;
    if (DEMO) { render({}); loaded = true; return; }
    try {
      render(await call());
      loaded = true;
    } catch (error) {
      box.innerHTML = `<div class="empty"><strong>Não consegui abrir o perfil</strong>${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (form.id !== "negocio-form" || DEMO) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = $("#negocio-status");
    button.disabled = true;
    status.textContent = "Salvando…";
    try {
      const body = Object.fromEntries(FIELDS.map(([key]) => [key, String(new FormData(form).get(key) || "")]));
      const result = await call(body);
      render(result);
      $("#negocio-status").textContent = result.message || "Perfil salvo.";
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.tabbar [data-tab="negocio"]') && !loaded) load();
  });
})();
