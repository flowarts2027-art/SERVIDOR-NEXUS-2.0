// Painel do cliente — automação de Instagram.
// Blocos: início, posts (aprovar / pedir ajuste), números do Instagram,
// contatos e conta. Usa só rotas /api/portal/* já protegidas por sessão.

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

const state = {
  client: null,
  posts: [],
  insights: null,
  leads: [],
  connection: null,
  contact: "",
  tab: "inicio",
  filter: "aprovar"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function safeUrl(value) {
  const url = String(value || "");
  return /^https:\/\//i.test(url) ? url : "";
}

function formatDate(value, withTime = true) {
  if (!value) return "";
  const raw = String(value);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T12:00:00Z"
    : raw.includes("T") ? raw
    : raw.replace(" ", "T") + "Z";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: number >= 10000 ? "compact" : "standard" }).format(number);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    showLogin("Sua sessão terminou. Entre novamente.");
    throw new Error("Sessão expirada");
  }
  if (!response.ok) throw new Error(data?.message || "Não foi possível falar com o servidor. Tente de novo.");
  return data && typeof data === "object" ? data : {};
}

let toastTimer = 0;
function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
  clearTimeout(toastTimer);
  if (message) toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
}

/* ---------- Posts ---------- */

const DONE = new Set(["expired", "cancelled"]);

function postGroup(post) {
  const status = String(post.status || "");
  const approval = String(post.approvalStatus || "");
  if (DONE.has(status)) return "";
  if (status === "published") return "publicados";
  if (approval === "approved") return "agendados";
  if (approval === "rejected") return "";
  return "aprovar";
}

function postImage(post) {
  return safeUrl(post.imageUrl || post.publicImageUrl || post.formatBuild?.imageUrl || (post.formatBuild?.carouselUrls || [])[0]);
}

function formatName(post) {
  const format = String(post.creativeFeatures?.requestedFormat || post.formatBuild?.kind || "post");
  return format === "reel" ? "Reels" : format === "carousel" ? "Carrossel" : "Post";
}

function mediaHtml(post, cls) {
  const image = postImage(post);
  return `<div class="${cls}${image ? "" : " is-waiting"}">${image
    ? `<img src="${escapeHtml(image)}" alt="Imagem do post" loading="lazy">`
    : `<div class="media-wait">A imagem deste post está sendo criada.<br>Volte daqui a pouco.</div>`}</div>`;
}

function actionsHtml(post) {
  if (postGroup(post) !== "aprovar") return "";
  const id = escapeHtml(post.id);
  const ready = Boolean(postImage(post));
  return `<div class="actions">
      <button type="button" class="btn btn-ok" data-approve="${id}" ${ready ? "" : "disabled title=\"Espere a imagem ficar pronta\""}>Aprovar</button>
      <button type="button" class="btn btn-soft" data-revise="${id}">Pedir ajuste</button>
    </div>
    <form class="revision" data-revision-form="${id}" hidden>
      <label for="rev-${id}">O que você quer mudar?</label>
      <textarea id="rev-${id}" name="instructions" required placeholder="Ex.: use uma foto mais clara e fale do nosso horário de sábado."></textarea>
      <button type="submit" class="btn btn-primary">Enviar pedido de ajuste</button>
    </form>`;
}

function tagHtml(post) {
  const group = postGroup(post);
  if (String(post.approvalStatus) === "correction_requested") return `<span class="tag tag-blue">Ajuste pedido · sendo refeito</span>`;
  if (group === "aprovar") return `<span class="tag tag-wait">Esperando sua aprovação</span>`;
  if (group === "agendados") return `<span class="tag tag-blue">Aprovado · será publicado</span>`;
  return `<span class="tag tag-ok">Publicado</span>`;
}

function postCardHtml(post) {
  const when = post.status === "published" ? (post.publishedAt || post.updatedAt) : post.scheduledFor;
  return `<article class="post">
    ${mediaHtml(post, "post-media")}
    <div class="post-body">
      ${tagHtml(post)}
      <p class="when">${formatName(post)} · ${escapeHtml(formatDate(when) || "data a definir")}</p>
      <p class="caption short">${escapeHtml(post.caption || "Legenda sendo escrita.")}</p>
      ${String(post.caption || "").length > 180 ? `<button type="button" class="more" data-more>Ler legenda inteira</button>` : ""}
      ${actionsHtml(post)}
    </div>
  </article>`;
}

function sortPosts(list, group) {
  return [...list].sort((a, b) => {
    const da = Date.parse(String(a.scheduledFor || a.updatedAt || "")) || 0;
    const db = Date.parse(String(b.scheduledFor || b.updatedAt || "")) || 0;
    return group === "publicados" ? db - da : da - db;
  });
}

function renderPosts() {
  const list = sortPosts(state.posts.filter(post => postGroup(post) === state.filter), state.filter);
  const empty = {
    aprovar: ["Nada para aprovar agora", "Quando os agentes criarem um post novo, ele aparece aqui."],
    agendados: ["Nenhum post agendado", "Aprove um post e ele entra na fila de publicação."],
    publicados: ["Nenhum post publicado ainda", "Os posts publicados ficam guardados aqui."]
  }[state.filter];
  $("#post-list").innerHTML = list.length
    ? list.map(postCardHtml).join("")
    : `<div class="empty"><strong>${empty[0]}</strong>${empty[1]}</div>`;
  $$(".segmented [data-filter]").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === state.filter));
  const pending = state.posts.filter(post => postGroup(post) === "aprovar" && String(post.approvalStatus) !== "correction_requested").length;
  const badge = $("#badge-posts");
  badge.textContent = String(pending);
  badge.hidden = pending === 0;
}

/* ---------- Início ---------- */

function renderHome() {
  const name = String(state.client?.displayName || state.client?.contact?.name || state.client?.name || "").trim();
  $("#hello").textContent = name ? "Olá, " + name : "Olá";
  const connected = Boolean(state.connection?.connected);
  const status = $("#agent-status");
  status.className = "status " + (connected ? "on" : "off");
  status.lastElementChild.textContent = connected
    ? "Seus agentes estão trabalhando"
    : "Conecte o Instagram para começar";

  const waiting = sortPosts(state.posts.filter(post => postGroup(post) === "aprovar" && String(post.approvalStatus) !== "correction_requested"), "aprovar");
  const next = waiting.find(postImage) || waiting[0];
  const scheduled = sortPosts(state.posts.filter(post => postGroup(post) === "agendados"), "agendados")[0];
  if (next) {
    $("#next-post").innerHTML = `<article class="hero">
      <p class="hero-label">Esperando você</p>
      <h1 class="hero-title">Seu próximo post está pronto para olhar</h1>
      ${mediaHtml(next, "hero-media")}
      <div class="hero-body">
        <p class="when">${formatName(next)} · ${escapeHtml(formatDate(next.scheduledFor) || "data a definir")}</p>
        <p class="caption short">${escapeHtml(next.caption || "")}</p>
        ${actionsHtml(next)}
        ${waiting.length > 1 ? `<button type="button" class="link" data-go="posts">Ver os outros ${waiting.length - 1} posts para aprovar</button>` : ""}
      </div>
    </article>`;
  } else {
    $("#next-post").innerHTML = `<article class="hero hero-empty">
      <h2>${connected ? "Tudo em dia por aqui" : "Falta só um passo"}</h2>
      <p class="muted">${connected
        ? (scheduled ? "O próximo post sai " + escapeHtml(formatDate(scheduled.scheduledFor)) + "." : "Os agentes estão preparando os próximos posts.")
        : "Conecte o seu Instagram para os agentes começarem a criar os posts."}</p>
      ${connected ? "" : `<button type="button" class="btn btn-primary" data-connect>Conectar Instagram</button>`}
    </article>`;
  }

  const published = state.posts.filter(post => post.status === "published").length;
  const insights = state.insights?.ok ? state.insights : null;
  $("#home-stats").innerHTML = [
    [insights?.followers ?? "—", "seguidores"],
    [insights ? insights.totals.reach : "—", "alcance recente"],
    [published, "posts publicados"]
  ].map(([value, label]) => `<div class="stat"><strong>${escapeHtml(typeof value === "number" ? formatNumber(value) : value)}</strong><span>${label}</span></div>`).join("");

  $("#home-leads").innerHTML = state.leads.length
    ? state.leads.slice(0, 3).map(leadHtml).join("")
    : `<p class="muted">Ainda não chegou nenhum contato. Quando alguém comentar nos seus posts pedindo informação, aparece aqui.</p>`;
}

/* ---------- Números ---------- */

function sparkline(points) {
  if (!Array.isArray(points) || points.length < 2) return "";
  const values = points.map(point => Number(point.followers) || 0);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = 300 / (values.length - 1);
  const path = values.map((value, index) => `${index ? "L" : "M"}${(index * step).toFixed(1)},${(56 - ((value - min) / span) * 48).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label="Seguidores nos últimos dias"><path d="${path}" fill="none" stroke="#7EA2FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderInsights() {
  const box = $("#insights");
  const data = state.insights;
  if (!data) { box.innerHTML = `<p class="muted">Carregando números…</p>`; return; }
  if (!data.ok) {
    box.innerHTML = `<div class="empty"><strong>${data.error === "instagram_not_connected" ? "Instagram não conectado" : "Números indisponíveis agora"}</strong>${
      data.error === "instagram_not_connected"
        ? "Conecte o Instagram na aba Conta para ver seus números."
        : "A Meta não respondeu. Tente de novo em alguns minutos."}</div>`;
    return;
  }
  const t = data.totals || {};
  const history = Array.isArray(data.followersHistory) ? data.followersHistory : [];
  const first = history[0]?.followers;
  const growth = history.length > 1 && Number.isFinite(first) ? data.followers - first : null;
  box.innerHTML = `
    <section class="followers">
      <p>Seguidores${data.username ? " de @" + escapeHtml(data.username) : ""}</p>
      <strong>${formatNumber(data.followers ?? 0)}</strong>
      <p>${growth == null ? "O gráfico aparece a partir de amanhã." : (growth >= 0 ? "+" : "") + formatNumber(growth) + " desde " + escapeHtml(formatDate(history[0].day, false))}</p>
      ${sparkline(history)}
    </section>
    <div class="metric-grid">
      ${[["reach", "pessoas alcançadas"], ["views", "visualizações"], ["likes", "curtidas"], ["comments", "comentários"], ["saved", "salvamentos"], ["shares", "compartilhamentos"]]
        .map(([key, label]) => `<div class="metric"><strong>${formatNumber(t[key] || 0)}</strong><span>${label}</span></div>`).join("")}
    </div>
    <section class="block">
      <h2>Cada post</h2>
      <div class="post-metrics">
        ${(data.posts || []).length ? data.posts.map(post => `
          <a class="pm" href="${escapeHtml(safeUrl(post.permalink) || "#")}" target="_blank" rel="noopener">
            ${safeUrl(post.mediaUrl) ? `<img src="${escapeHtml(post.mediaUrl)}" alt="" loading="lazy">` : `<span class="pm-ph"></span>`}
            <div>
              <p>${escapeHtml(formatDate(post.timestamp, false))} · ${escapeHtml((post.caption || "Sem legenda").slice(0, 70))}</p>
              <div class="pm-nums">
                <span><b>${formatNumber(post.reach)}</b> alcance</span>
                <span><b>${formatNumber(post.likes)}</b> curtidas</span>
                <span><b>${formatNumber(post.comments)}</b> comentários</span>
                <span><b>${formatNumber(post.saved)}</b> salvos</span>
              </div>
            </div>
          </a>`).join("") : `<p class="muted">Ainda não há posts publicados para medir.</p>`}
      </div>
    </section>
    <p class="note">Atualizado ${escapeHtml(formatDate(data.updatedAt))}. A Meta libera os números aos poucos; alguns aparecem horas depois do post.</p>`;
}

/* ---------- Contatos ---------- */

function leadHtml(lead) {
  const temp = ["hot", "warm", "cold"].includes(lead.temperature) ? lead.temperature : "cold";
  const label = { hot: "Quente", warm: "Morno", cold: "Frio" }[temp];
  const user = String(lead.instagramUsername || "").replace(/^@/, "");
  return `<div class="lead">
    <strong>${user ? `<a href="https://www.instagram.com/${encodeURIComponent(user)}/" target="_blank" rel="noopener">@${escapeHtml(user)}</a>` : "Contato"}</strong>
    <span class="temp temp-${temp}">${label}</span>
    <p>${escapeHtml(lead.lastMessage || lead.intent || "Mostrou interesse")}${lead.lastContactAt || lead.updatedAt ? " · " + escapeHtml(formatDate(lead.lastContactAt || lead.updatedAt)) : ""}</p>
  </div>`;
}

function renderLeads() {
  $("#lead-list").innerHTML = state.leads.length
    ? state.leads.map(leadHtml).join("")
    : `<div class="empty"><strong>Nenhum contato ainda</strong>Quando alguém comentar nos seus posts pedindo informação, a pessoa aparece aqui.</div>`;
}

/* ---------- Conta ---------- */

function renderAccount() {
  const ig = state.connection || {};
  $("#instagram-box").innerHTML = `<h2>Instagram</h2>
    <div class="ig-row">
      <div>
        <strong>${ig.connected ? "@" + escapeHtml(ig.username || String(state.client?.instagram || "").replace(/^@/, "")) : "Não conectado"}</strong>
        <p class="muted" style="margin:2px 0 0">${ig.connected
          ? (ig.expiresAt ? "Conexão válida até " + escapeHtml(formatDate(ig.expiresAt, false)) : "Conectado")
          : "Conecte para os agentes postarem por você."}</p>
      </div>
      <button type="button" class="btn ${ig.connected ? "btn-soft" : "btn-primary"}" data-connect>${ig.connected ? "Reconectar" : "Conectar Instagram"}</button>
    </div>`;
  const link = $("#support-link");
  if (state.contact) { link.href = state.contact; link.hidden = false; } else { link.hidden = true; }
}

/* ---------- Carregar e navegar ---------- */

async function loadAll() {
  const results = await Promise.allSettled([
    api("/api/portal/posts"),
    api("/api/portal/connections"),
    api("/api/portal/leads"),
    api("/api/portal/contact"),
    api("/api/portal/insights")
  ]);
  const [posts, connections, leads, contact, insights] = results.map(result => result.status === "fulfilled" ? result.value : null);
  if (posts) state.posts = Array.isArray(posts.posts) ? posts.posts : [];
  if (connections) state.connection = connections.connections?.instagram || null;
  if (leads) state.leads = Array.isArray(leads.leads) ? leads.leads : [];
  if (contact) state.contact = safeUrl(contact.whatsapp);
  state.insights = insights || { ok: false, error: "instagram_unavailable" };
  renderAll();
}

function renderAll() {
  renderHome();
  renderPosts();
  renderInsights();
  renderLeads();
  renderAccount();
}

function showTab(tab) {
  state.tab = ["inicio", "posts", "numeros", "contatos", "conta"].includes(tab) ? tab : "inicio";
  $$(".tab").forEach(section => { section.hidden = section.id !== "tab-" + state.tab; });
  $$(".tabbar [data-tab]").forEach(btn => {
    const active = btn.dataset.tab === state.tab;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0 });
}

function showLogin(message = "") {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#login-error").textContent = message;
}

function showApp(client) {
  state.client = client || state.client;
  $("#login").hidden = true;
  $("#app").hidden = false;
  renderHome();
}

/* ---------- Ações ---------- */

async function decide(id, button) {
  button.disabled = true;
  try {
    await api("/api/portal/posts/" + encodeURIComponent(id) + "/decision", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "approved" })
    });
    toast("Aprovado. O post será publicado no horário marcado.");
    await loadAll();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

async function sendRevision(form) {
  const id = form.dataset.revisionForm;
  const text = String(new FormData(form).get("instructions") || "").trim();
  if (!text) { toast("Escreva o que você quer mudar."); return; }
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await api("/api/portal/posts/" + encodeURIComponent(id) + "/revision", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ instructions: text })
    });
    toast("Pedido de ajuste enviado. Os agentes vão refazer este post.");
    await loadAll();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

async function connectInstagram(button) {
  button.disabled = true;
  try {
    const data = await api("/api/portal/instagram/start");
    if (safeUrl(data.url)) window.location.href = data.url;
    else throw new Error("Não foi possível abrir o Instagram. Tente de novo.");
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const tabBtn = target.closest(".tabbar [data-tab]");
  if (tabBtn) { showTab(tabBtn.dataset.tab); return; }
  const go = target.closest("[data-go]");
  if (go) { showTab(go.dataset.go); return; }
  const filter = target.closest("[data-filter]");
  if (filter) { state.filter = filter.dataset.filter; renderPosts(); return; }
  const approve = target.closest("[data-approve]");
  if (approve) { decide(approve.dataset.approve, approve); return; }
  const revise = target.closest("[data-revise]");
  if (revise) {
    const form = revise.closest(".post-body, .hero-body")?.querySelector("[data-revision-form]");
    if (form) { form.hidden = !form.hidden; if (!form.hidden) form.querySelector("textarea")?.focus(); }
    return;
  }
  const more = target.closest("[data-more]");
  if (more) { more.previousElementSibling?.classList.remove("short"); more.remove(); return; }
  const connect = target.closest("[data-connect]");
  if (connect) connectInstagram(connect);
});

document.addEventListener("submit", event => {
  const form = event.target;
  if (form instanceof HTMLFormElement && form.dataset.revisionForm) {
    event.preventDefault();
    sendRevision(form);
  }
});

async function boot() {
  try {
    const data = await api("/api/portal/session", { signal: AbortSignal.timeout(8000) });
    showApp(data.client || data);
    const params = new URLSearchParams(window.location.search);
    showTab(params.get("tab") === "instagram" ? "conta" : "inicio");
    if (params.get("oauth") === "success") toast("Instagram conectado com sucesso.");
    else if (params.get("oauth")) toast("A conexão com o Instagram não terminou. Tente de novo.");
    if (params.has("oauth") || params.has("tab")) history.replaceState({}, "", window.location.pathname);
    await loadAll();
  } catch {
    showLogin();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("#login-form");
  const savePassword = $("#login-save-password");
  // NEXUS Windows: senha guardada com proteção do Windows (nexusWindowsCredentials).
  const desktopStore = window.nexusWindowsCredentials;
  if (desktopStore?.load && loginForm) {
    desktopStore.load().then(saved => {
      const user = loginForm.elements.namedItem("username");
      const pass = loginForm.elements.namedItem("password");
      if (saved && user && pass && !user.value && !pass.value) {
        user.value = saved.username; pass.value = saved.password; savePassword.checked = true;
      }
    }).catch(() => {});
  }
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(loginForm).entries());
    const remember = savePassword?.checked === true;
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const data = await api("/api/portal/login", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      if (desktopStore) {
        if (remember) await desktopStore.save(String(body.username || ""), String(body.password || "")).catch(() => false);
        else await desktopStore.clear?.().catch(() => {});
      } else if (remember && window.PasswordCredential && navigator.credentials?.store) {
        try {
          await navigator.credentials.store(new PasswordCredential({ id: String(body.username || ""), password: String(body.password || ""), name: String(body.username || "") }));
        } catch (_) { /* o navegador pode salvar pelo próprio aviso */ }
      }
      showApp(data.client || data);
      showTab("inicio");
      await loadAll();
    } catch (error) {
      $("#login-error").textContent = error.message === "Sessão expirada" ? "" : (error.message || "Usuário ou senha incorretos.");
    } finally {
      button.disabled = false;
    }
  });
  $("#logout")?.addEventListener("click", async () => {
    try { await api("/api/portal/logout", { method: "POST" }); } catch {}
    showLogin();
  });
  $("#refresh")?.addEventListener("click", () => { toast("Atualizando…"); loadAll().then(() => toast("Tudo atualizado.")); });
  boot();
});
