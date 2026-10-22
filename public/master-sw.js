// Aviso do painel Master no celular (17/10/2026). O aviso chega sem texto;
// aqui o celular busca o resumo no painel (com o login do Rodrigo) e mostra a notificação.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let body = "Tem gente para chamar hoje. Toque para abrir o CRM.";
    try {
      // 22/10: o CRM fica no painel da Flow Arts; o Master continua como reserva.
      let response = await fetch("/api/portal/flow/crm", { credentials: "include", cache: "no-store" });
      if (!response.ok) response = await fetch("/api/master/crm", { credentials: "include", cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const novos = (data.due || []).filter(c => c.stage === "chamar").length;
        const retornos = (data.due || []).length - novos;
        const partes = [];
        if (novos) partes.push(novos === 1 ? "1 empresa nova para chamar" : `${novos} empresas novas para chamar`);
        if (retornos) partes.push(retornos === 1 ? "1 retorno" : `${retornos} retornos`);
        if (partes.length) body = partes.join(" e ") + ". Toque para enviar.";
      }
    } catch { /* usa o texto padrão */ }
    await self.registration.showNotification("Nexus · Falar hoje", {
      body, tag: "nexus-crm-hoje", renotify: true,
      icon: "/assets/app-master-192.png", badge: "/assets/app-master-192.png",
      data: { url: "/portal.html?tab=crm" }
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/portal.html?tab=crm";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      if (new URL(client.url).pathname.startsWith("/portal")) {
        await client.focus();
        client.postMessage({ type: "open-tab", tab: "crm" });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
