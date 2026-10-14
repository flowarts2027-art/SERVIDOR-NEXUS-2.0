// Tela de conversas do WhatsApp no painel Master.
// Usa escapeHtml() do app.js (carregado antes).
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  // Chamada própria: um erro aqui nunca tira o Rodrigo do painel Master.
  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, credentials: "same-origin",
      headers: { "content-type": "application/json", ...(options.headers || {}) } });
    if (!response.ok) throw new Error(response.status === 401 ? "Login do painel não aceito nesta aba. Recarregue a página." : `Erro ${response.status}`);
    return response.json();
  }
  const wa = { items: [], phone: "", contact: null, timer: null, autoReply: false, sending: false };

  const when = value => {
    if (!value) return "";
    const date = new Date(String(value).includes("T") ? value : String(value).replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date().toDateString() === date.toDateString();
    return new Intl.DateTimeFormat("pt-BR", today ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" }).format(date);
  };
  const phoneLabel = digits => {
    const d = String(digits || "");
    const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
    return m ? `(${m[1]}) ${m[2]}-${m[3]}` : "+" + d;
  };
  const active = () => document.getElementById("whatsapp")?.classList.contains("active");

  async function loadStatus() {
    try {
      const status = await api("/api/whatsapp/status");
      wa.autoReply = Boolean(status.autoReply);
      renderSwitch();
      const missing = Object.entries(status.required || {}).filter(([, ok]) => !ok).map(([key]) => key);
      const names = { verifyToken: "token de verificação", accessToken: "token de acesso", phoneNumberId: "ID do número", appSecret: "chave secreta do app", graphVersion: "versão da API", clientId: "cliente" };
      $("#wa-config").textContent = missing.length
        ? "Falta configurar na Cloudflare: " + missing.map(key => names[key] || key).join(", ") + "."
        : `Conectado. Limite: ${status.sendLimitPerHour} mensagens por hora.`;
    } catch (error) {
      $("#wa-config").textContent = "Não consegui ler a configuração do WhatsApp. " + error.message;
    }
  }

  function renderSwitch() {
    $("#wa-auto").checked = wa.autoReply;
    $("#wa-auto-label").textContent = wa.autoReply ? "Robô respondendo" : "Robô desligado";
    $("#wa-auto-help").textContent = wa.autoReply
      ? "A IA responde sozinha. Ela pausa e te chama quando precisar de você."
      : "A IA só escreve rascunhos. Ninguém recebe nada sozinho.";
  }

  async function loadInbox() {
    try {
      const data = await api("/api/whatsapp/inbox?limit=100");
      wa.items = data.items || [];
      renderList();
      const waiting = wa.items.filter(item => Number(item.needs_human) || Number(item.unread_count)).length;
      const badge = $("#wa-nav-count");
      badge.textContent = String(waiting);
      badge.hidden = !waiting;
    } catch {
      $("#wa-list").innerHTML = '<p class="muted">Não consegui carregar as conversas.</p>';
    }
  }

  function renderList() {
    $("#wa-list-count").textContent = wa.items.length ? `${wa.items.length}` : "";
    if (!wa.items.length) {
      $("#wa-list").innerHTML = '<p class="muted">Nenhuma conversa ainda. Quando alguém mandar mensagem, aparece aqui.</p>';
      return;
    }
    $("#wa-list").innerHTML = wa.items.map(item => {
      const human = Number(item.needs_human) === 1;
      const unread = Number(item.unread_count) || 0;
      const prefix = item.last_direction === "outbound" ? "Você/robô: " : "";
      return `<button type="button" class="wa-item${human ? " human" : ""}${item.wa_id === wa.phone ? " active" : ""}" data-phone="${escapeHtml(item.wa_id)}">
        <span class="wa-item-top"><strong>${escapeHtml(item.display_name || phoneLabel(item.wa_id))}</strong><small>${escapeHtml(when(item.updated_at || item.last_message_at))}</small></span>
        <p>${escapeHtml(prefix + (item.last_text || "(mídia)"))}</p>
        <span class="wa-tags">${human ? '<span class="wa-tag human">Precisa de você</span>' : ""}${unread ? `<span class="wa-tag unread">${unread} nova${unread > 1 ? "s" : ""}</span>` : ""}${Number(item.bot_paused) ? '<span class="wa-tag">Robô pausado</span>' : ""}</span>
      </button>`;
    }).join("");
  }

  async function openThread(phone, { quiet = false } = {}) {
    wa.phone = phone;
    wa.contact = wa.items.find(item => item.wa_id === phone) || null;
    $(".wa-layout").classList.add("open");
    $("#wa-empty").hidden = true;
    $("#wa-thread-wrap").hidden = false;
    $("#wa-name").textContent = wa.contact?.display_name || phoneLabel(phone);
    $("#wa-phone").textContent = phoneLabel(phone);
    renderContactState();
    renderList();
    try {
      const data = await api("/api/whatsapp/messages?limit=100&phone=" + encodeURIComponent(phone));
      if (wa.phone !== phone) return;
      const box = $("#wa-thread");
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.innerHTML = (data.items || []).map(msg => {
        const out = msg.direction === "outbound";
        const auto = msg.status === "sent_auto";
        const label = out ? (auto ? "Robô" : "Você") : "Cliente";
        return `<div class="wa-msg ${out ? "out" : "in"}${auto ? " auto" : ""}">${escapeHtml(msg.text || "(" + (msg.message_type || "mídia") + ")")}<small>${label} · ${escapeHtml(when(msg.created_at))}</small></div>`;
      }).join("") || '<p class="muted">Sem mensagens.</p>';
      if (!quiet || nearBottom) box.scrollTop = box.scrollHeight;
      if (Number(wa.contact?.unread_count)) {
        await api("/api/whatsapp/contact", { method: "POST", body: JSON.stringify({ phone, read: true }) });
        wa.contact.unread_count = 0;
        renderList();
      }
    } catch {
      $("#wa-thread").innerHTML = '<p class="muted">Não consegui carregar esta conversa.</p>';
    }
  }

  function renderContactState() {
    const paused = Number(wa.contact?.bot_paused) === 1;
    const human = Number(wa.contact?.needs_human) === 1;
    $("#wa-handoff").hidden = !human;
    const toggle = $("#wa-bot-toggle");
    toggle.textContent = paused ? "Religar robô aqui" : "Pausar robô aqui";
    toggle.title = paused ? "O robô volta a responder esta pessoa" : "Você assume esta conversa";
  }

  async function setBot(paused) {
    if (!wa.phone) return;
    try {
      await api("/api/whatsapp/contact", { method: "POST", body: JSON.stringify({ phone: wa.phone, botPaused: paused }) });
      if (wa.contact) { wa.contact.bot_paused = paused ? 1 : 0; if (!paused) wa.contact.needs_human = 0; }
      renderContactState();
      await loadInbox();
    } catch (error) {
      alert("Não consegui mudar o robô: " + error.message);
    }
  }

  async function send(event) {
    event.preventDefault();
    const text = $("#wa-text").value.trim();
    const msg = $("#wa-form-msg");
    if (!text || !wa.phone || wa.sending) return;
    wa.sending = true;
    msg.textContent = "Enviando…";
    try {
      await api("/api/whatsapp/send", { method: "POST", body: JSON.stringify({ to: wa.phone, text, confirmed: true }) });
      $("#wa-text").value = "";
      msg.textContent = "Enviado. O robô ficou pausado nesta conversa.";
      await loadInbox();
      await openThread(wa.phone);
    } catch (error) {
      msg.textContent = error.message.includes("429")
        ? "Limite de mensagens por hora atingido. Tente daqui a pouco."
        : error.message.includes("Erro 4")
          ? "A Meta recusou. Se a pessoa não escreveu nas últimas 24 horas, só dá para responder depois que ela mandar mensagem."
          : "Não consegui enviar: " + error.message;
    } finally {
      wa.sending = false;
    }
  }

  async function refresh() {
    clearTimeout(wa.timer);
    if (!active()) return;
    await loadInbox();
    if (wa.phone) await openThread(wa.phone, { quiet: true });
    wa.timer = setTimeout(refresh, 6000);
  }

  async function start() {
    $("#page-title").textContent = "WhatsApp";
    await loadStatus();
    await refresh();
  }

  $("#wa-list").addEventListener("click", event => {
    const item = event.target.closest(".wa-item");
    if (item) openThread(item.dataset.phone);
  });
  $("#wa-back").addEventListener("click", () => {
    wa.phone = "";
    $(".wa-layout").classList.remove("open");
    $("#wa-thread-wrap").hidden = true;
    $("#wa-empty").hidden = false;
    renderList();
  });
  $("#wa-bot-toggle").addEventListener("click", () => setBot(Number(wa.contact?.bot_paused) !== 1));
  // Respostas prontas: preenchem a caixa; o Rodrigo confere e aperta Enviar.
  const QUICK = {
    planos: "Aqui estão todos os planos e preços da Flow Arts: https://flowarts.com.br/#pacotes\n\nSe me contar qual é o seu negócio, eu te digo qual plano combina mais com você.",
    contrato: "Que bom que você quer fechar o site! Este é o contrato para você ler com calma: https://flowarts.com.br/contrato-site\n\nSe estiver tudo certo, me responda \"de acordo\" que eu te mando o Pix da primeira parte (R$ 248,50). O prazo de até 5 dias começa quando você me enviar fotos, logo, serviços, horário e endereço."
  };
  document.addEventListener("click", event => {
    const quick = event.target.closest?.("[data-wa-quick]");
    if (!quick) return;
    const box = $("#wa-text");
    box.value = QUICK[quick.dataset.waQuick] || "";
    box.focus();
    $("#wa-form-msg").textContent = "Confira o texto e aperte Enviar.";
  });

  $("#wa-form").addEventListener("submit", send);
  $("#wa-text").addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) $("#wa-form").requestSubmit();
  });
  $("#wa-auto").addEventListener("change", async event => {
    const next = event.target.checked;
    if (next && !confirm("Ligar o robô? A IA vai responder sozinha todas as pessoas que mandarem mensagem.")) {
      event.target.checked = false;
      return;
    }
    try {
      await api("/api/whatsapp/settings", { method: "POST", body: JSON.stringify({ autoReply: next }) });
      wa.autoReply = next;
    } catch (error) {
      alert("Não consegui mudar: " + error.message);
    }
    renderSwitch();
  });

  document.querySelectorAll('[data-view="whatsapp"]').forEach(button => button.addEventListener("click", start));
  if (new URLSearchParams(location.search).get("view") === "whatsapp") setTimeout(start, 600);
  // Contador do menu mesmo fora da tela.
  setTimeout(() => loadInbox().catch(() => {}), 1500);
})();
