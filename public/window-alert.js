// Aviso de janela errada (05/11/2026): letras grandes e um botão para mover. Usado no painel do cliente e no Master.
(() => {
  const style = document.createElement("style");
  style.textContent = ".window-alert{display:block;margin:12px 0;padding:16px;border-radius:12px;background:#c40000;color:#fff!important;font-size:22px;font-weight:800;line-height:1.35}"
    + ".window-alert button{display:block;width:100%;min-height:52px;margin-top:12px;border:0;border-radius:10px;background:#000;color:#fff;font-size:19px;font-weight:800;cursor:pointer}";
  document.head.append(style);
  const NAMES = { story: "Stories", feed: "Post" };
  window.showWindowAlert = (box, message, moveTo, onMove) => {
    box.classList.add("window-alert");
    box.textContent = message;
    if (!NAMES[moveTo]) return;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Mover para " + NAMES[moveTo];
    button.addEventListener("click", () => { box.classList.remove("window-alert"); box.textContent = ""; onMove(moveTo); });
    box.append(button);
  };
  window.clearWindowAlert = box => box.classList.remove("window-alert");
})();
