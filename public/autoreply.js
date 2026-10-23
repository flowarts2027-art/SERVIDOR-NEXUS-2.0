// Respostas automáticas no Instagram (aba "Conta" do painel do cliente, 22/10/2026).
// Quem comentar uma das palavras recebe UMA mensagem no direct (com o WhatsApp do cliente)
// e uma resposta curta no comentário. A Flow Arts usa o funil próprio e não vê este bloco.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  let data = null;
  let note = "";

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) throw new Error(json.message || "Não deu certo. Tente de novo.");
    return json;
  }

  function render() {
    const box = $("#autoreply-box");
    if (!box || !data) return;
    const c = data.config;
    box.hidden = false;
    box.innerHTML = `<h2>Respostas automáticas ${c.enabled ? '<span class="tag tag-ok">Ligadas</span>' : '<span class="tag">Desligadas</span>'}</h2>
      <p class="muted">Quem comentar uma destas palavras nos seus posts recebe uma mensagem no direct, uma vez só, e uma resposta curta no comentário.</p>
      ${data.hasWhatsapp ? "" : '<p class="form-error">Cadastre o seu WhatsApp na aba "Meu negócio" para o link funcionar.</p>'}
      <form id="autoreply-form" class="cap-search">
        <label class="cap-check"><input type="checkbox" name="enabled" ${c.enabled ? "checked" : ""}> Ligar as respostas automáticas</label>
        <label>Palavras (separe com vírgula)<textarea name="keywords" rows="2" maxlength="600">${esc(c.keywords.join(", "))}</textarea></label>
        <label>Mensagem do direct ({whatsapp} vira o botão "Chamar no WhatsApp")<textarea name="dm" rows="4" maxlength="900">${esc(c.dm)}</textarea></label>
        <label>Resposta no comentário<input name="publicReply" maxlength="150" value="${esc(c.publicReply)}"></label>
        <label>Texto que chega no seu WhatsApp quando a pessoa toca no botão<input name="waText" maxlength="300" value="${esc(c.waText || "")}"></label>
        <button class="btn btn-primary" type="submit">Salvar respostas</button>
      </form>
      <details><summary>Ver como a mensagem chega</summary><pre class="autoreply-preview">${esc(data.preview)}</pre></details>
      <p class="muted" id="autoreply-msg" role="status">${esc(note)}</p>`;
  }

  async function load() {
    const box = $("#autoreply-box");
    if (!box || DEMO) return;
    try {
      data = await call("/api/portal/autoreply");
      if (data.hidden) { box.hidden = true; return; }
      render();
    } catch { box.hidden = true; }
  }

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "autoreply-form") return;
    event.preventDefault();
    const fd = new FormData(event.target);
    try {
      const out = await call("/api/portal/autoreply", { enabled: fd.get("enabled") === "on", keywords: fd.get("keywords"), dm: fd.get("dm"), publicReply: fd.get("publicReply"), waText: fd.get("waText") });
      data = { ...data, config: out.config, preview: out.preview, hasWhatsapp: out.hasWhatsapp };
      note = out.config.enabled ? "Salvo. As respostas começam nos próximos minutos." : "Salvo. As respostas estão desligadas.";
    } catch (error) { note = error.message; }
    render();
  });

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-tab="conta"]')) { note = ""; load(); }
  });
})();
