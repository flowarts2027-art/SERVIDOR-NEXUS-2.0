// Tráfego pago no painel do cliente (24/10/2026, pedido do Rodrigo).
// Botão "Impulsionar" nos posts que já saíram + bloco "Anúncios" na aba Conta.
// A verba é paga no cartão do cliente, direto na Meta. Nada é gasto sem o cliente confirmar o valor.
// Enquanto a Meta não libera a Flow Arts (NEXUS_ADS desligado), o painel mostra tudo pronto e "aguardando liberação".
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const brl = n => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const STATUS = {
    criando: ["tag-blue", "Criando o anúncio…"], em_analise: ["tag-wait", "A Meta está revisando"], ativo: ["tag-ok", "Rodando"],
    parado: ["tag-blue", "Parado"], terminado: ["tag-blue", "Terminou"], erro: ["tag-wait", "Não deu certo"]
  };
  let data = null;
  let loading = false;

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) throw Object.assign(new Error("login"), { login: true });
    if (!response.ok || json.ok === false) throw Object.assign(new Error(json.message || "Não deu certo. Tente de novo."), { code: json.error });
    return json;
  }

  async function load() {
    if (loading) return;
    loading = true;
    try { data = await call("/api/portal/ads"); renderAccount(); addButtons(); }
    catch { /* antes do login: tenta de novo no próximo toque */ }
    finally { loading = false; }
  }

  // ---------- aba Conta ----------
  function box() {
    let el = $("#ads-box");
    const anchor = $("#autoreply-box") || $("#instagram-box");
    if (!el && anchor) { el = document.createElement("section"); el.className = "block"; el.id = "ads-box"; anchor.after(el); }
    return el;
  }

  function renderAccount() {
    const el = box();
    if (!el || !data) return;
    if (!data.access) {
      el.innerHTML = `<h2>🚀 Impulsionar posts</h2>
        <p class="muted">Faça seus posts chegarem em mais gente da sua cidade, com o botão do seu WhatsApp. ${esc(data.price || "")}</p>
        <button type="button" class="btn btn-primary" data-plans-open>Ver o plano Tráfego</button>`;
      return;
    }
    const c = data.connection;
    const conn = !data.live
      ? `<p class="ads-wait">⏳ Tudo pronto. Falta só a Meta liberar a Flow Arts para anúncios. Quando liberar, este botão acende.</p>
         <button type="button" class="btn btn-soft" disabled>Conectar conta de anúncios</button>`
      : c ? `<p class="ok-line">✓ Conectado: ${esc(c.adAccountName || "conta de anúncios")}${c.igUsername ? " · @" + esc(c.igUsername) : ""}</p>
         ${c.needsPayment ? `<p class="ads-wait">⚠️ Falta cadastrar o cartão na sua conta de anúncios da Meta. Sem ele, o anúncio não roda.</p>` : ""}
         <button type="button" class="btn btn-soft" data-ads-connect>Trocar conta</button>`
      : `<p class="muted">Conecte uma vez, pelo login oficial do Facebook. Você escolhe a sua Página e a sua conta de anúncios.</p>
         <button type="button" class="btn btn-primary" data-ads-connect>Conectar conta de anúncios</button>`;
    const list = (data.boosts || []).map(b => {
      const [cls, label] = STATUS[b.status] || ["tag-blue", b.status];
      const stop = ["em_analise", "ativo", "criando"].includes(b.status) ? `<button type="button" class="btn btn-soft" data-ads-stop="${esc(b.id)}">Parar</button>` : "";
      return `<li><span class="tag ${cls}">${esc(label)}</span><b>${brl(b.daily)} por dia · ${Number(b.days)} dias</b>
        <small>${esc(b.city)} e ${Number(b.radiusKm)} km em volta · total até ${brl(b.daily * b.days)}</small>${b.error ? `<small class="ads-err">${esc(b.error)}</small>` : ""}${stop}</li>`;
    }).join("");
    el.innerHTML = `<h2>🚀 Anúncios</h2>
      ${conn}
      <p class="muted ads-note">Para impulsionar, abra um post que já saiu (aba Posts) e toque em "Impulsionar". A Meta cobra no seu cartão; a Flow Arts não recebe a verba.</p>
      ${list ? `<ul class="ads-list">${list}</ul>` : ""}`;
  }

  // ---------- botão nos posts publicados ----------
  function addButtons() {
    if (!data?.access) return;
    document.querySelectorAll('[data-delete-post][data-published="1"]').forEach(del => {
      const actions = del.closest(".actions");
      const card = del.closest(".post");
      if (!actions || !card || actions.querySelector("[data-boost]")) return;
      if (card.querySelector(".format-story")) return; // story não dá para impulsionar por aqui
      const button = document.createElement("button");
      button.type = "button"; button.className = "btn btn-primary"; button.dataset.boost = del.dataset.deletePost;
      button.textContent = "🚀 Impulsionar";
      actions.prepend(button);
    });
  }

  function formHtml(postId) {
    const l = data.limits || { minDaily: 10, maxDaily: 500, maxDays: 30, radius: [5, 10, 20, 40, 80] };
    return `<form class="ads-form" data-ads-form="${esc(postId)}">
      <h3>Impulsionar este post</h3>
      <label>Quanto por dia (R$)<input name="daily" type="number" inputmode="numeric" min="${l.minDaily}" max="${l.maxDaily}" step="1" value="20" required></label>
      <label>Por quantos dias<select name="days">${[3, 5, 7, 15, 30].filter(d => d <= l.maxDays).map(d => `<option value="${d}" ${d === 7 ? "selected" : ""}>${d} dias</option>`).join("")}</select></label>
      <label>Cidade<input name="city" maxlength="60" placeholder="Ex.: Curitiba PR" required></label>
      <label>Distância em volta da cidade<select name="radiusKm">${l.radius.map(r => `<option value="${r}" ${r === 20 ? "selected" : ""}>${r} km</option>`).join("")}</select></label>
      <p class="ads-total">Total: até <b data-ads-total>R$ 140</b>, pago no seu cartão, direto na Meta.</p>
      <p class="muted">Quem vir o anúncio toca no botão e cai no seu WhatsApp.</p>
      <label class="ads-check"><input type="checkbox" name="confirm" required><span>Confirmo: a Meta pode cobrar até <span data-ads-total>R$ 140</span> no meu cartão.</span></label>
      <button type="submit" class="btn btn-ok">Impulsionar agora</button>
      <p class="ads-msg" role="status"></p>
    </form>`;
  }

  function total(form) {
    const t = Number(form.daily.value || 0) * Number(form.days.value || 0);
    form.querySelectorAll("[data-ads-total]").forEach(el => { el.textContent = brl(t); });
  }

  document.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (!data && target.closest(".tabbar, .more-menu")) load();
    if (target.closest('[data-tab="conta"], [data-tab="posts"]')) { data = null; load(); }
    const boost = target.closest("[data-boost]");
    if (boost) {
      const card = boost.closest(".post");
      const open = card.querySelector("[data-ads-form]");
      if (open) { open.remove(); return; }
      boost.closest(".actions").insertAdjacentHTML("afterend", formHtml(boost.dataset.boost));
      total(card.querySelector("[data-ads-form]"));
      return;
    }
    if (target.closest("[data-ads-connect]")) {
      target.disabled = true;
      try { location.href = (await call("/api/portal/ads/connect", {})).url; }
      catch (error) { alert(error.message); target.disabled = false; }
      return;
    }
    const stop = target.closest("[data-ads-stop]");
    if (stop) {
      if (!confirm("Parar este anúncio agora?")) return;
      stop.disabled = true;
      try { await call("/api/portal/ads/" + encodeURIComponent(stop.dataset.adsStop) + "/stop", {}); data = null; load(); }
      catch (error) { alert(error.message); stop.disabled = false; }
    }
  });

  document.addEventListener("input", event => {
    const form = event.target.closest?.("[data-ads-form]");
    if (form) total(form);
  });

  document.addEventListener("submit", async event => {
    const form = event.target.closest?.("[data-ads-form]");
    if (!form) return;
    event.preventDefault();
    const msg = form.querySelector(".ads-msg");
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; msg.textContent = "Enviando para a Meta…";
    try {
      await call("/api/portal/ads/boost", {
        postId: form.dataset.adsForm, daily: Number(form.daily.value), days: Number(form.days.value),
        city: form.city.value, radiusKm: Number(form.radiusKm.value), confirm: form.confirm.checked
      });
      msg.textContent = "✓ Pronto! A Meta vai revisar o anúncio (costuma levar algumas horas). Acompanhe em Conta › Anúncios.";
      data = null; load();
    } catch (error) {
      msg.textContent = error.message;
      button.disabled = false;
    }
  });

  // O painel redesenha os posts: o botão volta sozinho.
  new MutationObserver(() => { if (data?.access) addButtons(); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
