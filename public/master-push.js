// Busca diária do Caçador e aviso no celular (17/10/2026).
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const msg = text => { const el = $("#crm-daily-msg"); if (el) el.textContent = text; };

  async function call(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "Não deu certo. Tente de novo.");
    return data;
  }

  const b64ToBytes = text => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4)), c => c.charCodeAt(0));
  const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  async function refreshPush() {
    const enable = $("#push-enable"), testBtn = $("#push-test");
    if (!enable) return;
    if (!supported()) { enable.disabled = true; enable.textContent = "Este navegador não aceita aviso"; return; }
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    const on = Boolean(sub) && Notification.permission === "granted";
    enable.textContent = on ? "Aviso ligado neste celular ✔" : "Ativar aviso neste celular";
    enable.classList.toggle("primary", !on);
    enable.classList.toggle("ghost", on);
    if (testBtn) testBtn.hidden = !on;
  }

  async function enablePush() {
    if (!supported()) return;
    msg("Ligando o aviso…");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("O celular não deixou mostrar aviso. Libere as notificações do navegador para o painel.");
      const reg = await navigator.serviceWorker.register("/master-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const { publicKey } = await call("/api/master/push/key");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
      const json = sub.toJSON();
      await call("/api/master/push/subscribe", { method: "POST", body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, label: navigator.userAgent.slice(0, 80) }) });
      msg("Aviso ligado. Toque em “Testar aviso” para ver como chega.");
    } catch (error) {
      msg(error.message);
    }
    refreshPush();
  }

  async function loadDaily() {
    try {
      const d = await call("/api/master/crm/daily");
      const on = $("#crm-daily-on"), target = $("#crm-daily-target"), sub = $("#crm-daily-sub");
      if (on) on.checked = d.enabled;
      if (target) target.value = String(d.target);
      if (sub) sub.textContent = d.enabled ? `Ligada · ${d.target} empresas por dia · hoje: ${d.today}` : "Desligada";
    } catch { /* fica o texto padrão */ }
    refreshPush().catch(() => {});
  }

  document.addEventListener("click", async event => {
    const t = event.target.closest?.("#push-enable,#push-test,#crm-daily-run,#crm-daily-clean");
    if (!t) return;
    if (t.id === "push-enable") { await enablePush(); return; }
    if (t.id === "push-test") {
      msg("Mandando o aviso…");
      try { const out = await call("/api/master/push/test", { method: "POST", body: "{}" }); msg(out.sent ? "Aviso enviado. Deve chegar em alguns segundos." : "Nenhum celular recebeu. Ative o aviso de novo."); }
      catch (error) { msg(error.message); }
      return;
    }
    // 19/10: tira do CRM quem já recebeu mensagem e não respondeu (fica arquivado e não é chamado de novo).
    if (t.id === "crm-daily-clean") {
      if (!confirm("Tirar do CRM quem já recebeu mensagem e não respondeu? Quem está conversando, com proposta ou é cliente fica.")) return;
      t.disabled = true;
      try {
        const out = await call("/api/master/crm/daily/clean", { method: "POST", body: "{}" });
        msg(out.archived ? `Pronto: ${out.archived} contatos saíram da lista.` : "Não tinha ninguém para limpar.");
        document.dispatchEvent(new CustomEvent("nexus:view", { detail: "crm" }));
      } catch (error) { msg(error.message); }
      t.disabled = false;
      return;
    }
    if (t.id === "crm-daily-run") {
      t.disabled = true;
      msg("Procurando empresas… pode levar até 1 minuto.");
      try {
        const out = await call("/api/master/crm/daily/run", { method: "POST", body: "{}" });
        msg(out.skipped === "done" ? `A lista de hoje já está completa (${out.picked}).` : out.added?.length
          ? `Achei ${out.added.length}: ${out.added.map(a => a.name).join(", ")}. Já estão em “Para chamar”.`
          : "Não achei empresa nova agora (o mapa grátis pode estar ocupado). Tente de novo em alguns minutos.");
        document.dispatchEvent(new CustomEvent("nexus:view", { detail: "crm" }));
        loadDaily();
      } catch (error) { msg(error.message); }
      t.disabled = false;
    }
  });

  document.addEventListener("change", async event => {
    if (!["crm-daily-on", "crm-daily-target"].includes(event.target.id)) return;
    try {
      await call("/api/master/crm/daily", { method: "POST", body: JSON.stringify({ enabled: $("#crm-daily-on").checked, target: Number($("#crm-daily-target").value) }) });
      msg("Salvo. ✔");
      loadDaily();
    } catch (error) { msg(error.message); }
  });

  document.addEventListener("nexus:view", event => { if (event.detail === "crm") loadDaily(); });
})();
