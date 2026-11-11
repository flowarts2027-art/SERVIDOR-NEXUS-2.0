// Direct e comentários feitos pelo próprio cliente (aba "Conta" do painel, 11/11/2026).
// Criado para o App Review da Meta: o revisor precisa ver o envio saindo do app e chegando no Instagram.
// Rótulos em português e inglês (a Meta pede a interface em inglês no vídeo).
// Só age quando o cliente clica. Nada é automático.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const DEMO = new URLSearchParams(location.search).get("demo") === "1";
  const when = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); };

  const state = { direct: null, comments: null, directNote: "", commentNote: "", busy: false, selected: "" };

  async function call(path, body) {
    const response = await fetch(path, body === undefined
      ? { credentials: "same-origin", cache: "no-store" }
      : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      const error = new Error(json.message || "Não deu certo. Tente de novo. / It didn't work. Try again.");
      error.code = json.error;
      throw error;
    }
    return json;
  }

  // ---------- Direct ----------
  function renderDirect() {
    const box = $("#ig-direct-box");
    if (!box || !state.direct) return;
    box.hidden = false;
    const list = state.direct.conversations || [];
    const options = list.map(c => `<option value="${esc(c.recipientId)}" ${c.recipientId === state.selected ? "selected" : ""}>@${esc(c.username || c.recipientId)}${c.lastText ? " — " + esc(c.lastText.slice(0, 40)) : ""}</option>`).join("");
    box.innerHTML = `<h2>Direct do Instagram <span class="muted">/ Instagram Direct</span></h2>
      <p class="muted">Conta / Account: <strong>@${esc(state.direct.account)}</strong></p>
      <p class="muted">Escolha a conversa e envie a mensagem. Ela chega no Direct do Instagram da pessoa. / Choose a conversation and send a message. It is delivered to the person's Instagram Direct.</p>
      ${list.length ? `<form id="ig-direct-form" class="cap-search">
        <label>Conversa / Conversation<select name="recipientId">${options}</select></label>
        <label>Mensagem / Message<textarea name="text" rows="3" maxlength="900" required></textarea></label>
        <button class="btn btn-primary" type="submit" ${state.busy ? "disabled" : ""}>Enviar mensagem / Send message</button>
      </form>` : `<p class="muted">Nenhuma conversa ainda. Peça para alguém mandar uma mensagem para a conta. / No conversations yet. Ask someone to message the account first.</p>`}
      <button class="btn btn-ghost" type="button" data-ig-refresh="direct">Atualizar / Refresh</button>
      <p class="muted" role="status">${esc(state.directNote)}</p>`;
  }

  async function loadDirect() {
    const box = $("#ig-direct-box");
    if (!box || DEMO) return;
    try { state.direct = await call("/api/portal/ig/conversations"); renderDirect(); }
    catch (error) { if (error.code === "instagram_not_connected") box.hidden = true; else { state.direct = { account: "", conversations: [] }; state.directNote = error.message; renderDirect(); } }
  }

  // ---------- Comentários ----------
  function commentRow(c, mediaId, isReply = false) {
    return `<div class="ig-comment" style="border-top:1px solid var(--line);padding:10px 0;${isReply ? "margin-left:24px" : ""}">
      <p style="margin:0"><strong>@${esc(c.username)}</strong> <span class="muted">${esc(when(c.timestamp))}</span> ${c.hidden ? '<span class="tag">Oculto / Hidden</span>' : ""}</p>
      <p style="margin:4px 0 8px;font-size:1.05em">${esc(c.text)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${isReply ? "" : `<button class="btn" type="button" data-ig-reply="${esc(c.id)}">Responder / Reply</button>`}
        <button class="btn" type="button" data-ig-hide="${esc(c.id)}" data-hidden="${c.hidden ? "1" : "0"}">${c.hidden ? "Mostrar / Unhide" : "Ocultar / Hide"}</button>
        <button class="btn" type="button" data-ig-delete="${esc(c.id)}">Apagar / Delete</button>
      </div>
      ${isReply ? "" : `<form data-ig-reply-form="${esc(c.id)}" hidden style="margin-top:8px"><input name="text" maxlength="300" placeholder="Sua resposta / Your reply" required> <button class="btn btn-primary" type="submit">Enviar / Send</button></form>`}
      ${(c.replies || []).map(r => commentRow(r, mediaId, true)).join("")}
    </div>`;
  }

  function renderComments() {
    const box = $("#ig-comments-box");
    if (!box || !state.comments) return;
    box.hidden = false;
    const posts = state.comments.posts || [];
    box.innerHTML = `<h2>Comentários <span class="muted">/ Comments</span></h2>
      <p class="muted">Comente, responda, oculte ou apague comentários dos seus posts. O Instagram não permite editar comentário. / Comment, reply, hide or delete comments on your posts. Instagram does not allow editing a comment.</p>
      <p class="muted" role="status">${esc(state.commentNote)}</p>
      ${posts.length ? posts.map(p => `<article class="ig-post" style="border:1px solid var(--line);border-radius:12px;padding:12px;margin:12px 0">
        <div style="display:flex;gap:10px;align-items:center">
          ${p.image ? `<img src="${esc(p.image)}" alt="" width="64" height="64" style="object-fit:cover;border-radius:8px">` : ""}
          <div><p style="margin:0">${esc(p.caption || "Post")}</p>${p.permalink ? `<a href="${esc(p.permalink)}" target="_blank" rel="noopener">Ver no Instagram / View on Instagram</a>` : ""}</div>
        </div>
        <form data-ig-comment-form="${esc(p.id)}" style="margin-top:10px"><input name="text" maxlength="300" placeholder="Escreva um comentário / Write a comment" required> <button class="btn btn-primary" type="submit">Comentar / Comment</button></form>
        ${p.comments.length ? p.comments.map(c => commentRow(c, p.id)).join("") : '<p class="muted">Sem comentários. / No comments.</p>'}
      </article>`).join("") : '<p class="muted">Nenhum post encontrado. / No posts found.</p>'}
      <button class="btn btn-ghost" type="button" data-ig-refresh="comments">Atualizar / Refresh</button>`;
  }

  async function loadComments() {
    const box = $("#ig-comments-box");
    if (!box || DEMO) return;
    try { state.comments = await call("/api/portal/ig/comments"); renderComments(); }
    catch (error) { if (error.code === "instagram_not_connected") box.hidden = true; else { state.comments = { posts: [] }; state.commentNote = error.message; renderComments(); } }
  }

  async function commentAction(body, okNote) {
    if (state.busy) return;
    state.busy = true;
    try { await call("/api/portal/ig/comment", body); state.commentNote = okNote; }
    catch (error) { state.commentNote = error.message; }
    state.busy = false;
    await loadComments();
  }

  document.addEventListener("submit", async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "ig-direct-form") {
      event.preventDefault();
      if (state.busy) return;
      const fd = new FormData(form);
      state.selected = String(fd.get("recipientId") || "");
      state.busy = true; renderDirect();
      try { await call("/api/portal/ig/send", { recipientId: state.selected, text: fd.get("text") }); state.directNote = "Mensagem enviada. Confira no Instagram. / Message sent. Check it on Instagram."; }
      catch (error) { state.directNote = error.message; }
      state.busy = false;
      await loadDirect();
      return;
    }
    if (form.dataset.igCommentForm) {
      event.preventDefault();
      await commentAction({ action: "comment", mediaId: form.dataset.igCommentForm, text: new FormData(form).get("text") }, "Comentário publicado. / Comment posted.");
      return;
    }
    if (form.dataset.igReplyForm) {
      event.preventDefault();
      await commentAction({ action: "reply", commentId: form.dataset.igReplyForm, text: new FormData(form).get("text") }, "Resposta publicada. / Reply posted.");
    }
  });

  document.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-tab="conta"]')) { state.directNote = ""; state.commentNote = ""; loadDirect(); loadComments(); return; }
    const refresh = target.closest("[data-ig-refresh]");
    if (refresh) { refresh.dataset.igRefresh === "direct" ? loadDirect() : loadComments(); return; }
    const reply = target.closest("[data-ig-reply]");
    if (reply) { const form = document.querySelector(`[data-ig-reply-form="${CSS.escape(reply.dataset.igReply)}"]`); if (form) { form.hidden = !form.hidden; form.querySelector("input")?.focus(); } return; }
    const hide = target.closest("[data-ig-hide]");
    if (hide) { const hidden = hide.dataset.hidden === "1"; await commentAction({ action: hidden ? "unhide" : "hide", commentId: hide.dataset.igHide }, hidden ? "Comentário visível. / Comment unhidden." : "Comentário oculto. / Comment hidden."); return; }
    const del = target.closest("[data-ig-delete]");
    if (del) {
      if (!confirm("Apagar este comentário? Não dá para desfazer. / Delete this comment? This cannot be undone.")) return;
      await commentAction({ action: "delete", commentId: del.dataset.igDelete }, "Comentário apagado. / Comment deleted.");
    }
  });

  // Se o painel já abrir na aba Conta.
  if (new URLSearchParams(location.search).get("tab") === "conta") { loadDirect(); loadComments(); }
})();
