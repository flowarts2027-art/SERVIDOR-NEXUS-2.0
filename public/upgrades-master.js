// Master › Clientes › "Clientes mudando de plano" (24/10): pedidos feitos pelo painel do cliente.
(function () {
  const $ = s => document.querySelector(s);
  const esc = v => { const el = document.createElement("span"); el.textContent = String(v ?? ""); return el.innerHTML; };
  const GROUP = { base: "troca o plano", adicional: "soma ao plano", unico: "serviço avulso" };
  async function call(path, options = {}) {
    const r = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    if (r.status === 401) { location.href = "/api/master/access"; throw new Error("Sessão expirada"); }
    const b = await r.json().catch(() => ({}));
    if (!r.ok || b.ok === false) throw new Error(b.message || "Erro " + r.status);
    return b;
  }
  async function load() {
    const box = $("#upgrade-list");
    if (!box) return;
    try {
      const list = (await call("/api/master/upgrades")).upgrades || [];
      $("#upgrade-panel").hidden = !list.length;
      box.innerHTML = list.map(u => `<div class="signup-item" data-upgrade-id="${esc(u.id)}">
          <div class="signup-info"><strong>${esc(u.clientName)}</strong>
            <small>Hoje: ${esc(u.currentPlan)} → quer <b>${esc(u.planName)}</b> (${esc(GROUP[u.group] || u.group)})</small>
            <p class="signup-plan">Pix de <b>${esc(u.amountLabel)}</b> · ${u.paidClaimed ? "o cliente disse que já pagou" : "sem aviso de pagamento"}</p>
            <p class="signup-check">Antes de aprovar, confira no app do banco se entrou o Pix de ${esc(u.amountLabel)}.</p></div>
          <div class="signup-actions"><button class="primary" type="button" data-upgrade-action="approve">Aprovar</button><button class="ghost" type="button" data-upgrade-action="reject">Recusar</button></div>
        </div>`).join("") || '<p class="muted">Nenhum pedido.</p>';
    } catch { box.innerHTML = '<p class="muted">Não foi possível carregar os pedidos agora.</p>'; }
  }
  document.addEventListener("click", async e => {
    const b = e.target.closest?.("[data-upgrade-action]");
    if (!b) return;
    const item = b.closest("[data-upgrade-id]");
    const approve = b.dataset.upgradeAction === "approve";
    if (!confirm(approve ? "Confirmou o Pix no banco? Aprovar agora?" : "Recusar este pedido?")) return;
    item.querySelectorAll("button").forEach(x => { x.disabled = true; });
    try { await call("/api/master/upgrades/" + encodeURIComponent(item.dataset.upgradeId) + "/" + (approve ? "approve" : "reject"), { method: "POST" }); load(); }
    catch (err) { alert(err.message); item.querySelectorAll("button").forEach(x => { x.disabled = false; }); }
  });
  document.addEventListener("click", e => { if (e.target.closest?.('[data-view="clients"]')) load(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
