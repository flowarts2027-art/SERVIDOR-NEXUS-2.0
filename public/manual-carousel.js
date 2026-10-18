// Master → Postagens → "Enviar carrossel pronto" (16/10).
// Imagens na ordem + legenda. O post vai para o painel do cliente sem data; ele escolhe o dia e aprova.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);

  // Lista de clientes (18/10): o Rodrigo gera as fotos no ChatGPT e sobe para qualquer cliente ativo.
  const ARCHIVED = new Set(["ragnar-one", "globalplay-streaming", "global-play-streaming", "demo-cafe"]);
  async function fillClients() {
    const select = $("#manual-carousel-client");
    if (!select) return;
    try {
      const response = await fetch("/api/clients", { credentials: "same-origin" });
      if (!response.ok) return;
      const data = await response.json();
      const list = (Array.isArray(data) ? data : data.clients || []).filter(c => c && c.id && !ARCHIVED.has(String(c.id)) && String(c.status || "online") !== "archived");
      if (!list.length) return;
      const current = select.value || "primeiro-teste";
      select.innerHTML = list.map(c => `<option value="${String(c.id).replace(/"/g, "&quot;")}">${String(c.name || c.id).replace(/[<>&]/g, "")}</option>`).join("");
      if (list.some(c => c.id === current)) select.value = current;
    } catch { /* fica só a Flow Arts */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillClients); else fillClients();

  document.addEventListener("change", event => {
    if (event.target?.id !== "manual-carousel-images") return;
    const box = $("#manual-carousel-preview");
    if (!box) return;
    box.innerHTML = "";
    [...event.target.files].forEach((file, index) => {
      const fig = document.createElement("figure");
      fig.style.margin = "0";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = "";
      img.style.cssText = "width:110px;border-radius:8px;display:block";
      const cap = document.createElement("figcaption");
      cap.textContent = (index + 1) + ". " + file.name;
      cap.style.fontSize = "12px";
      fig.append(img, cap);
      box.append(fig);
    });
  });

  document.addEventListener("submit", async event => {
    if (event.target?.id !== "manual-carousel-form") return;
    event.preventDefault();
    const form = event.target;
    const status = $("#manual-carousel-status");
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Enviando…";
    try {
      const response = await fetch("/api/master/manual-carousel", { method: "POST", credentials: "same-origin", body: new FormData(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "Não deu para enviar.");
      status.textContent = "Pronto! " + data.cards + " imagens enviadas para o painel de " + data.clientName + ". Falta escolher o dia e aprovar no painel.";
      form.reset();
      $("#manual-carousel-preview").innerHTML = "";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
