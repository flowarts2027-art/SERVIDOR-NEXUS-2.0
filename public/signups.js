// Master › Clientes › "Cadastros novos": aprova ou recusa quem se cadastrou pelo link /cadastro.
(function () {
  const SIGNUP_LINK = "https://painel.flowarts.com.br/cadastro";
  const THEMES = { "green-black": "Preto + Verde", "red-black": "Preto + Vermelho", "blue-white": "Azul + Branco", "gold-black": "Preto + Dourado" };
  const $ = selector => document.querySelector(selector);

  function esc(value) { const el = document.createElement("span"); el.textContent = String(value ?? ""); return el.innerHTML; }

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    if (response.status === 401) { location.href = "/api/master/access"; throw new Error("Sessão expirada"); }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.message || "Erro " + response.status);
    return body;
  }

  function when(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function setCount(count) {
    ["#signup-nav-count", "#signup-more-count", "#signup-sheet-count"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.textContent = String(count);
      el.hidden = !count;
    });
  }

  function whatsLink(phone, name, username) {
    const text = "Olá! Seu acesso ao painel Flow Arts foi liberado. Entre em painel.flowarts.com.br com o usuário " + username + " e a senha que você escolheu.";
    return "https://wa.me/" + encodeURIComponent(phone) + "?text=" + encodeURIComponent(text);
  }

  function render(signups) {
    const box = $("#signup-list");
    if (!box) return;
    if (!signups.length) { box.innerHTML = `<p class="muted">Nenhum cadastro esperando.</p>`; return; }
    box.innerHTML = signups.map(item => `
      <div class="signup-item" data-signup-id="${esc(item.id)}">
        <div class="signup-info">
          <strong>${esc(item.name)}</strong>
          <small>${esc(item.niche)} · ${esc(item.instagram)} · WhatsApp ${esc(item.whatsapp)}</small>
          <small>Usuário: <b>${esc(item.username)}</b> · ${esc(THEMES[item.theme] || item.theme)} · ${esc(when(item.createdAt))}</small>
          ${item.planName ? `<p class="signup-plan"><b>Plano ${esc(item.planName)}</b>${item.founder ? " (fundador)" : ""} · Pix de <b>${esc(item.amountLabel)}</b> · ${item.paidClaimed ? "o cliente disse que já pagou" : "sem aviso de pagamento"}</p>
          <p class="signup-check">Antes de aprovar, confira no app do banco se entrou o Pix de ${esc(item.amountLabel)}.</p>` : `<p class="signup-check">Sem plano escolhido (cadastro antigo).</p>`}
        </div>
        <div class="signup-actions">
          <button class="primary" type="button" data-signup-action="approve">Aprovar</button>
          <button class="ghost" type="button" data-signup-action="reject">Recusar</button>
        </div>
        <p class="signup-status muted" hidden></p>
      </div>`).join("");
  }

  async function load() {
    try {
      const data = await call("/api/master/signups");
      const signups = data.signups || [];
      setCount(signups.length);
      render(signups);
    } catch (error) {
      const box = $("#signup-list");
      if (box) box.innerHTML = `<p class="muted">Não foi possível carregar os cadastros agora.</p>`;
    }
  }

  document.addEventListener("click", async event => {
    if (event.target.closest("#signup-copy-link")) {
      const button = event.target.closest("#signup-copy-link");
      try { await navigator.clipboard.writeText(SIGNUP_LINK); button.textContent = "Link copiado ✓"; }
      catch { prompt("Copie o link:", SIGNUP_LINK); }
      setTimeout(() => { button.textContent = "Copiar link"; }, 2500);
      return;
    }
    const button = event.target.closest("[data-signup-action]");
    if (!button) return;
    const item = button.closest("[data-signup-id]");
    const id = item.dataset.signupId;
    const action = button.dataset.signupAction;
    const name = item.querySelector("strong")?.textContent || "este cliente";
    if (action === "reject" && !confirm("Recusar o cadastro de " + name + "?")) return;
    item.querySelectorAll("button").forEach(b => { b.disabled = true; });
    const status = item.querySelector(".signup-status");
    status.hidden = false;
    status.textContent = action === "approve" ? "Aprovando…" : "Recusando…";
    try {
      const result = await call("/api/master/signups/" + encodeURIComponent(id) + "/" + action, { method: "POST", body: "{}" });
      if (action === "approve") {
        const phone = (item.querySelector("small")?.textContent.match(/WhatsApp (\d+)/) || [])[1] || "";
        item.querySelector(".signup-actions").innerHTML = phone
          ? `<a class="primary link-button" target="_blank" rel="noopener" href="${esc(whatsLink(phone, name, result.username))}">Avisar no WhatsApp</a>`
          : "";
        status.textContent = "Aprovado. O cliente já pode entrar com o usuário " + result.username + ".";
      } else {
        item.remove();
      }
      setCount(document.querySelectorAll("#signup-list [data-signup-action=approve]").length);
      // load() do app.js atualiza a tabela "Todos os clientes".
      if (action === "approve" && typeof window.load === "function") window.load();
    } catch (error) {
      status.textContent = error.message;
      item.querySelectorAll("button").forEach(b => { b.disabled = false; });
    }
  });

  document.addEventListener("nexus:view", event => { if (event.detail === "clients") load(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
