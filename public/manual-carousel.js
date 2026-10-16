// Master → Postagens → "Enviar carrossel pronto" (16/10).
// Imagens na ordem + legenda. O post vai para o painel do cliente sem data; ele escolhe o dia e aprova.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);

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
