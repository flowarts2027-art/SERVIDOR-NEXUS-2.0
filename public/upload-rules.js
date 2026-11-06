// O que cada envio aceita (Rodrigo, 05/11/2026): letras grandes acima de todo botão de enviar arquivo.
// Texto num lugar só. Tela fixa usa data-upload-rules="post story"; tela feita em JS usa html() ou fill().
(() => {
  const RULES = Object.freeze({
    logo: "Logo: PNG transparente, JPG ou SVG. Mínimo 300 px.",
    story: "Story: JPG ou PNG, 1080 x 1920.",
    post: "Post: JPG ou PNG, 1080 x 1350 ou 1080 x 1080.",
    carrossel: "Carrossel: até 10 imagens do mesmo tamanho.",
    reels: "Reels: vídeo MP4, 1080 x 1920."
  });
  const ALIASES = Object.freeze({ feed: "post", carousel: "carrossel", reel: "reels" });
  const lines = kinds => String(kinds || "").split(/\s+/).map(kind => RULES[ALIASES[kind] || kind]).filter(Boolean);
  const html = kinds => `<div class="upload-rules">${lines(kinds).map(line => `<p>${line}</p>`).join("")}</div>`;
  const fill = (box, kinds) => { if (box) box.innerHTML = html(kinds); };

  const style = document.createElement("style");
  style.textContent = ".upload-rules{margin:0 0 10px;padding:10px 14px;border-left:6px solid #000;border-radius:8px;background:#fff4cc;color:#000;font-size:20px;font-weight:800;line-height:1.3;text-align:left}.upload-rules p{margin:0;color:#000}.upload-rules p+p{margin-top:6px}";
  document.head.append(style);
  document.querySelectorAll("[data-upload-rules]").forEach(box => fill(box, box.dataset.uploadRules));

  window.UploadRules = { RULES, html, fill };
})();
