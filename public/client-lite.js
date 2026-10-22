// Painel do cliente — automação de Instagram.
// Blocos: início, posts (aprovar / pedir ajuste), números do Instagram,
// contatos e conta. Usa só rotas /api/portal/* já protegidas por sessão.

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

// Demonstração pública (/demo): negócio fictício, só leitura.
const DEMO = new URLSearchParams(window.location.search).get("demo") === "1";
const DEMO_BLOCKED = "Isto é uma demonstração. No painel de verdade, este botão funciona.";

const state = {
  client: null,
  posts: [],
  insights: null,
  leads: [],
  connection: null,
  contact: "",
  tab: "inicio",
  filter: "aprovar",
  calMonth: "",
  calDay: "",
  plans: {}
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

// Texto e arte precisam ter passado na revisão automática antes de o cliente poder aprovar.
function autoReviewed(post) {
  const g = post.qualityGates;
  if (!g || typeof g !== "object") return true; // post antigo, sem revisão registrada
  return g.copyChief === "approved" && g.designer === "approved";
}

// Carrossel ainda sem todas as imagens (os agentes criam a cada ~15 minutos).
function carouselIncomplete(post) {
  if (String(post.creativeFeatures?.requestedFormat || "") !== "carousel") return false;
  return (post.formatBuild?.carouselUrls || []).map(safeUrl).filter(Boolean).length < 2;
}

function formatName(post) {
  const format = String(post.creativeFeatures?.requestedFormat || post.formatBuild?.kind || "post");
  return format === "reel" ? "Reels" : format === "carousel" ? "Carrossel" : format === "story" ? "Stories" : "Post";
}

function mediaHtml(post, cls) {
  const image = postImage(post);
  // Reel pronto (feito no Flow): o cliente assiste antes de aprovar.
  const video = String(post.creativeFeatures?.requestedFormat || "") === "reel" ? safeUrl(post.formatBuild?.videoUrl) : "";
  // Carrossel: todas as imagens, com setas para passar.
  const cards = (post.formatBuild?.carouselUrls || []).map(safeUrl).filter(Boolean);
  if (cards.length >= 2) {
    return `<div class="${cls} carousel" data-carousel>
      <div class="car-track" tabindex="0" aria-label="Imagens do carrossel">${cards.map((url, i) =>
        `<img src="${escapeHtml(url)}" alt="Imagem ${i + 1} de ${cards.length} do carrossel" loading="lazy">`).join("")}</div>
      <button type="button" class="car-btn car-prev" data-car="-1" aria-label="Imagem anterior" disabled>‹</button>
      <button type="button" class="car-btn car-next" data-car="1" aria-label="Próxima imagem">›</button>
      <span class="car-count" aria-live="polite">1 / ${cards.length}</span>
    </div>`;
  }
  if (video) {
    return `<div class="${cls} is-video"><video src="${escapeHtml(video)}" ${image ? `poster="${escapeHtml(image)}"` : ""} controls playsinline preload="none" aria-label="Vídeo do Reel"></video></div>`;
  }
  const building = image && carouselIncomplete(post) && !["published", "cancelled", "expired"].includes(String(post.status))
    ? `<p class="car-building">As outras imagens do carrossel estão sendo criadas. Volte em alguns minutos.</p>` : "";
  return building + `<div class="${cls}${image ? "" : " is-waiting"}">${image
    ? `<img src="${escapeHtml(image)}" alt="Imagem do post" loading="lazy">`
    : `<div class="media-wait">A imagem deste post está sendo criada.<br>Volte daqui a pouco.</div>`}</div>`;
}

// Post em que o cliente escolhe o dia (carrossel pronto enviado pela Flow Arts).
function needsDate(post) {
  return post.dateChoice === "client" && !["published", "publishing", "cancelled", "expired"].includes(String(post.status));
}

function saoPauloParts(iso) {
  const date = new Date(String(iso || ""));
  if (!Number.isFinite(date.getTime())) return { day: "", hour: "19:00" };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
  const hour = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return { day, hour };
}

function scheduleFormHtml(post) {
  if (!needsDate(post)) return "";
  const id = escapeHtml(post.id);
  const { day, hour } = saoPauloParts(post.scheduledFor);
  return `<form class="schedule-form" data-schedule-form="${id}">
      <p class="muted">${post.scheduledFor ? "Quer mudar o dia? Escolha outro e salve." : "Escolha o dia e a hora em que este post vai sair."}</p>
      <label>Dia <input type="date" name="date" value="${escapeHtml(day)}" required></label>
      <label>Hora <input type="time" name="time" value="${escapeHtml(hour)}" required></label>
      <button type="submit" class="btn btn-soft">Salvar dia</button>
    </form>`;
}

function actionsHtml(post) {
  return scheduleFormHtml(post) + actionsButtonsHtml(post);
}

function actionsButtonsHtml(post) {
  // Aprovado e ainda não publicado: dá para cancelar antes do horário.
  if (postGroup(post) === "agendados" && !["published", "publishing"].includes(String(post.status))) {
    const id = escapeHtml(post.id);
    return `<div class="actions">
      <button type="button" class="btn btn-ok" data-publish-now="${id}">Publicar agora</button>
      <button type="button" class="btn btn-soft" data-revise="${id}">Pedir ajuste</button>
      <button type="button" class="btn btn-soft btn-cancel" data-cancel-post="${id}">Cancelar esta postagem</button>
    </div>
    <form class="revision" data-revision-form="${id}" hidden>
      <label for="rev-${id}">O que você quer mudar?</label>
      <textarea id="rev-${id}" name="instructions" required placeholder="Ex.: na imagem 2, a agenda está fechada; ela precisa estar aberta."></textarea>
      <p class="muted">O post volta para "esperando aprovação" e só sai depois que você aprovar de novo.</p>
      <button type="submit" class="btn btn-primary">Enviar pedido de ajuste</button>
    </form>`;
  }
  if (postGroup(post) !== "aprovar") return "";
  const id = escapeHtml(post.id);
  const reviewed = autoReviewed(post);
  const dateMissing = post.dateChoice === "client" && !post.scheduledFor;
  const ready = Boolean(postImage(post)) && !carouselIncomplete(post) && reviewed && !dateMissing;
  const waitMsg = dateMissing ? "Escolha o dia primeiro" : reviewed ? "Espere todas as imagens ficarem prontas" : "Espere a revisão automática terminar";
  return `<div class="actions">
      <button type="button" class="btn btn-ok" data-approve="${id}" ${ready ? "" : `disabled title="${waitMsg}"`}>Aprovar</button>
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
  if (group === "aprovar" && !autoReviewed(post)) return `<span class="tag tag-blue">Em revisão automática</span>`;
  if (group === "aprovar") return `<span class="tag tag-wait">Esperando sua aprovação</span>`;
  if (group === "agendados" && post.stuck) return `<span class="tag tag-wait">Não saiu no horário · toque em Publicar agora</span>`;
  if (group === "agendados") return `<span class="tag tag-blue">Aprovado · será publicado</span>`;
  return `<span class="tag tag-ok">Publicado</span>`;
}

// Aviso do Revisor automático: só aparece em post que ainda não foi publicado.
function reviewHtml(post) {
  const list = Array.isArray(post.reviewWarnings) ? post.reviewWarnings : [];
  if (!list.length || post.status === "published") return "";
  const items = list.map(w => `<li><b>${escapeHtml(w.label)}</b>: “${escapeHtml(w.trecho)}”</li>`).join("");
  return `<div class="review-warn" role="note"><p>⚠️ Revisor: confira antes de aprovar</p><ul>${items}</ul></div>`;
}

function postCardHtml(post) {
  const when = post.status === "published" ? (post.publishedAt || post.updatedAt) : post.scheduledFor;
  return `<article class="post">
    ${mediaHtml(post, "post-media")}
    <div class="post-body">
      ${tagHtml(post)}
      ${reviewHtml(post)}
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

/* ---------- Calendário do mês ---------- */

const SP_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const FORMAT_LABEL = { reel: "Reels", carousel: "Carrossel", post: "Post", story: "Stories" };

function capitalize(text) {
  const value = String(text || "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDate(value) {
  if (!value) return null;
  const raw = String(value);
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function postDayKey(post) {
  const date = toDate(post.status === "published" ? (post.publishedAt || post.updatedAt) : post.scheduledFor);
  return date ? SP_DAY.format(date) : "";
}

function todayKey() {
  return SP_DAY.format(new Date());
}

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

async function loadPlan(month) {
  if (state.plans[month]) return;
  try {
    const data = await api("/api/portal/calendar?month=" + encodeURIComponent(month));
    state.plans[month] = data.campaign ? Object.fromEntries((data.days || []).map(day => [day.date, day.items || []])) : {};
  } catch {
    state.plans[month] = {};
  }
  if (state.filter === "calendario" && state.calMonth === month) renderCalendar();
}

function calendarPostsByDay() {
  const map = {};
  for (const post of state.posts) {
    if (!postGroup(post)) continue;
    const key = postDayKey(post);
    if (key) (map[key] = map[key] || []).push(post);
  }
  return map;
}

function dayCellHtml(key, posts, plan, today) {
  const day = Number(key.slice(8));
  const cover = posts.map(postImage).find(Boolean);
  const groups = new Set(posts.map(postGroup));
  const status = groups.has("aprovar") ? "wait" : groups.has("agendados") ? "sched" : groups.has("publicados") ? "done" : plan.length ? "plan" : "empty";
  const label = day + " — " + (posts.length
    ? posts.length + (posts.length === 1 ? " post" : " posts")
    : plan.length ? "planejado: " + plan.map(item => FORMAT_LABEL[item.format] || "Post").join(" e ") : "sem post");
  const classes = ["cal-day", "is-" + status, key === today ? "is-today" : "", key === state.calDay ? "is-selected" : ""].filter(Boolean).join(" ");
  return `<button type="button" class="${classes}" data-cal-day="${key}" aria-label="${escapeHtml(label)}" ${key === state.calDay ? 'aria-pressed="true"' : 'aria-pressed="false"'}>
      ${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy">` : ""}
      <span class="cal-num">${day}</span>
      ${posts.length ? `<span class="cal-count">${posts.length}</span>` : ""}
    </button>`;
}

function dayDetailHtml(key, posts, plan) {
  const [y, m, d] = key.split("-").map(Number);
  const title = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  const real = posts.length ? `<div class="post-list">${sortPosts(posts, "agendados").map(postCardHtml).join("")}</div>` : "";
  const planned = !posts.length && plan.length
    ? `<ul class="plan-list">${plan.map(item => `<li>
        <span class="plan-time">${escapeHtml(item.time)}</span>
        <div><strong>${escapeHtml(item.theme)}</strong>
        <p>${escapeHtml(FORMAT_LABEL[item.format] || "Post")} · objetivo: ${escapeHtml(item.goal)}</p></div>
      </li>`).join("")}</ul>
      <p class="note">Plano da campanha. Os agentes criam este post perto do dia, e ele aparece aqui para você aprovar.</p>`
    : "";
  const empty = !real && !planned ? `<div class="empty"><strong>Nada neste dia</strong>Nenhum post criado ou planejado.</div>` : "";
  return `<section class="cal-detail" aria-live="polite"><h2>${escapeHtml(capitalize(title))}</h2>${real}${planned}${empty}</section>`;
}

function renderCalendar() {
  const box = $("#calendar");
  if (!state.calMonth) state.calMonth = todayKey().slice(0, 7);
  const month = state.calMonth;
  if (!state.calDay || state.calDay.slice(0, 7) !== month) {
    state.calDay = todayKey().slice(0, 7) === month ? todayKey() : month + "-01";
  }
  const plans = state.plans[month];
  if (!plans) loadPlan(month);
  const byDay = calendarPostsByDay();
  const [y, m] = month.split("-").map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const today = todayKey();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(`<span class="cal-pad" aria-hidden="true"></span>`);
  for (let day = 1; day <= total; day += 1) {
    const key = month + "-" + String(day).padStart(2, "0");
    cells.push(dayCellHtml(key, byDay[key] || [], key >= today ? (plans || {})[key] || [] : [], today));
  }
  const monthPosts = Object.entries(byDay).filter(([key]) => key.startsWith(month)).flatMap(([, list]) => list);
  const count = group => monthPosts.filter(post => postGroup(post) === group).length;
  box.innerHTML = `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-cal-move="-1" aria-label="Mês anterior">‹</button>
      <h2>${capitalize(MONTH_NAMES[m - 1])} de ${y}</h2>
      <button type="button" class="cal-nav" data-cal-move="1" aria-label="Próximo mês">›</button>
    </div>
    <p class="cal-summary">${count("publicados")} publicados · ${count("agendados")} agendados · ${count("aprovar")} para aprovar</p>
    <div class="cal-week" aria-hidden="true"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
    <div class="cal-grid">${cells.join("")}</div>
    <div class="cal-legend">
      <span><i class="lg lg-done"></i>Publicado</span>
      <span><i class="lg lg-sched"></i>Agendado</span>
      <span><i class="lg lg-wait"></i>Para aprovar</span>
      <span><i class="lg lg-plan"></i>Planejado</span>
    </div>
    ${dayDetailHtml(state.calDay, byDay[state.calDay] || [], state.calDay >= today ? (plans || {})[state.calDay] || [] : [])}`;
}

function renderPosts() {
  const calendar = state.filter === "calendario";
  $("#calendar").hidden = !calendar;
  $("#post-list").hidden = calendar;
  if (calendar) {
    renderCalendar();
  } else {
    const list = sortPosts(state.posts.filter(post => postGroup(post) === state.filter), state.filter);
    const empty = {
      aprovar: ["Nada para aprovar agora", "Quando os agentes criarem um post novo, ele aparece aqui."],
      agendados: ["Nenhum post agendado", "Aprove um post e ele entra na fila de publicação."],
      publicados: ["Nenhum post publicado ainda", "Os posts publicados ficam guardados aqui."]
    }[state.filter] || ["Nada aqui", ""];
    $("#post-list").innerHTML = list.length
      ? list.map(postCardHtml).join("")
      : `<div class="empty"><strong>${empty[0]}</strong>${empty[1]}</div>`;
  }
  $$(".segmented [data-filter]").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === state.filter));
  const pending = state.posts.filter(post => postGroup(post) === "aprovar" && String(post.approvalStatus) !== "correction_requested" && autoReviewed(post)).length;
  const badge = $("#badge-posts");
  badge.textContent = String(pending);
  badge.hidden = pending === 0;
}

/* ---------- Início ---------- */

function renderHome() {
  const name = String(state.client?.displayName || state.client?.contact?.name || state.client?.name || "").trim();
  $("#hello").textContent = name ? "Olá, " + name : "Olá";
  const connected = Boolean(state.connection?.connected);
  const loading = state.connection === null;
  const status = $("#agent-status");
  status.className = "status " + (loading ? "" : connected ? "on" : "off");
  status.lastElementChild.textContent = loading ? "Carregando…" : connected
    ? "Seus agentes estão trabalhando"
    : "Conecte o Instagram para começar";
  if (loading) {
    $("#next-post").innerHTML = `<article class="hero hero-empty"><h2>Carregando seu painel…</h2><p class="muted">Só um instante.</p></article>`;
    return;
  }

  const waiting = sortPosts(state.posts.filter(post => postGroup(post) === "aprovar" && String(post.approvalStatus) !== "correction_requested" && autoReviewed(post)), "aprovar");
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
        ${waiting.length > 1 ? `<button type="button" class="link" data-go="posts">${waiting.length === 2 ? "Ver o outro post para aprovar" : "Ver os outros " + (waiting.length - 1) + " posts para aprovar"}</button>` : ""}
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
    [insights?.totals?.reach ?? "—", "alcance recente"],
    [published, "posts publicados"]
  ].map(([value, label]) => `<div class="stat"><strong>${escapeHtml(typeof value === "number" ? formatNumber(value) : value)}</strong><span>${label}</span></div>`).join("");

  $("#home-leads").innerHTML = state.leads.length
    ? state.leads.slice(0, 3).map(leadHtml).join("")
    : DEMO
      ? `<p class="muted">No painel de verdade, quem comenta pedindo informação aparece aqui, pronto para você chamar no WhatsApp.</p>`
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

// Relatório FORJA: quais posts trouxeram seguidores.
function followerReportHtml(data) {
  const byId = new Map((data.posts || []).map(post => [post.id, post]));
  const top = (data.followerPosts || []).map(id => byId.get(id)).filter(Boolean);
  const total = Number(data.totals?.follows || 0);
  const body = top.length
    ? `<ol class="follow-rank">${top.map(post => `<li>
        <a href="${escapeHtml(safeUrl(post.permalink) || "#")}" target="_blank" rel="noopener">${escapeHtml((post.caption || "Post sem legenda").split("\n")[0].slice(0, 70))}</a>
        <span><b>${formatNumber(post.follows)}</b> ${post.follows === 1 ? "seguidor" : "seguidores"} · <b>${formatNumber(post.profileVisits)}</b> visitas ao perfil</span>
      </li>`).join("")}</ol>
      <p class="note">Os agentes usam esta lista para fazer mais posts parecidos com os que trazem seguidores.</p>`
    : `<p class="muted">Ainda nenhum post trouxe seguidor que a Meta tenha contado. A lista aparece assim que isso acontecer.</p>`;
  return `<section class="block follow-report">
      <h2>Posts que trouxeram seguidores</h2>
      <p class="muted" style="margin:2px 0 10px">${formatNumber(total)} ${total === 1 ? "seguidor ganho" : "seguidores ganhos"} nos últimos posts medidos.</p>
      ${body}
    </section>`;
}

function renderInsights() {
  const box = $("#insights");
  const data = state.insights;
  if (!data) { box.innerHTML = `<p class="muted">Carregando números…</p>`; return; }
  if (!data.ok && data.error === "demo") {
    box.innerHTML = `<div class="empty"><strong>Números reais aparecem aqui</strong>No painel de verdade, você vê seguidores, alcance, curtidas e salvamentos de cada post, direto da Meta.</div>`;
    return;
  }
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
    ${followerReportHtml(data)}
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
                <span><b>${formatNumber(post.follows || 0)}</b> ${Number(post.follows) === 1 ? "seguidor" : "seguidores"}</span>
              </div>
            </div>
          </a>`).join("") : `<p class="muted">Ainda não há posts publicados para medir.</p>`}
      </div>
    </section>
    <p class="note">Atualizado ${escapeHtml(formatDate(data.updatedAt))}. A Meta libera os números aos poucos; alguns aparecem horas depois do post.</p>`;
}

/* ---------- Contatos ---------- */

// Contato que veio da página de captura (/exemplo): nome, WhatsApp e próxima ação.
function landingLeadHtml(lead) {
  const c = lead.contact || {};
  const digits = String(c.whatsapp || "").replace(/\D/g, "");
  const next = lead.nextAction || {};
  const due = next.due ? formatDate(next.due, false) : "";
  return `<div class="lead lead-landing">
    <strong>${escapeHtml(c.name || "Contato")}</strong>
    <span class="temp temp-hot">Pediu exemplo</span>
    <p>${escapeHtml(c.business || "")}${c.segment ? " · " + escapeHtml(c.segment) : ""}</p>
    ${next.text ? `<p class="next-action">Próximo passo: ${escapeHtml(next.text)}${due ? " · até " + escapeHtml(due) : ""}</p>` : ""}
    ${digits ? `<a class="btn btn-whats lead-whats" href="https://wa.me/${escapeHtml(digits)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>` : ""}
    ${removeLeadButton(lead)}
  </div>`;
}

function removeLeadButton(lead) {
  return lead.id ? `<button type="button" class="link lead-remove" data-discard-lead="${escapeHtml(lead.id)}">Remover contato</button>` : "";
}

// Remover contato em dois toques (o visualizador não mostra confirm()).
async function discardLeadClick(button) {
  if (button.dataset.armed !== "1") {
    button.dataset.armed = "1";
    button.textContent = "Toque de novo para remover";
    setTimeout(() => { if (button.isConnected) { button.dataset.armed = ""; button.textContent = "Remover contato"; } }, 5000);
    return;
  }
  button.disabled = true;
  try {
    await api("/api/portal/lead-hunter/leads/" + encodeURIComponent(button.dataset.discardLead) + "/discard", { method: "POST" });
    toast("Contato removido.");
    await loadAll();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

function leadHtml(lead) {
  if (lead.contact && lead.source === "landing") return landingLeadHtml(lead);
  const temp = ["hot", "warm", "cold"].includes(lead.temperature) ? lead.temperature : "cold";
  const label = { hot: "Quente", warm: "Morno", cold: "Frio" }[temp];
  const user = String(lead.instagramUsername || "").replace(/^@/, "");
  return `<div class="lead">
    <strong>${user ? `<a href="https://www.instagram.com/${encodeURIComponent(user)}/" target="_blank" rel="noopener">@${escapeHtml(user)}</a>` : "Contato"}</strong>
    <span class="temp temp-${temp}">${label}</span>
    <p>${escapeHtml(lead.lastMessage || lead.intent || "Mostrou interesse")}${lead.lastContactAt || lead.updatedAt ? " · " + escapeHtml(formatDate(lead.lastContactAt || lead.updatedAt)) : ""}</p>
    ${removeLeadButton(lead)}
  </div>`;
}

function renderLeads() {
  $("#lead-list").innerHTML = state.leads.length
    ? state.leads.map(leadHtml).join("")
    : DEMO
      ? `<div class="empty"><strong>Seus contatos aparecem aqui</strong>Quem comentar nos posts pedindo informação vira um contato, com o próximo passo para você responder.</div>`
      : `<div class="empty"><strong>Nenhum contato ainda</strong>Quando alguém comentar nos seus posts pedindo informação, a pessoa aparece aqui.</div>`;
}

/* ---------- Conta ---------- */

function renderAccount() {
  const ig = state.connection || {};
  if (ig.demo) {
    $("#instagram-box").innerHTML = `<h2>Instagram</h2>
      <p class="muted" style="margin:8px 0 0">Conta de exemplo. Na demonstração, nada é publicado no Instagram.</p>`;
    const demoLink = $("#support-link");
    if (state.contact) { demoLink.href = state.contact; demoLink.hidden = false; } else { demoLink.hidden = true; }
    return;
  }
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
  if (DEMO) { await loadDemo(); return; }
  const results = await Promise.allSettled([
    api("/api/portal/posts"),
    api("/api/portal/connections"),
    api("/api/portal/leads"),
    api("/api/portal/contact"),
    api("/api/portal/insights")
  ]);
  const [posts, connections, leads, contact, insights] = results.map(result => result.status === "fulfilled" ? result.value : null);
  if (posts) state.posts = Array.isArray(posts.posts) ? posts.posts : [];
  state.connection = connections?.connections?.instagram || { connected: false };
  if (leads) state.leads = Array.isArray(leads.leads) ? leads.leads : [];
  if (contact) state.contact = safeUrl(contact.whatsapp);
  state.insights = insights || { ok: false, error: "instagram_unavailable" };
  renderAll();
}

function renderAll() {
  // Um bloco com dado inesperado não pode travar o painel inteiro.
  for (const render of [renderHome, renderPosts, renderInsights, renderLeads, renderAccount]) {
    try { render(); } catch (error) { console.error("painel:", render.name, error); }
  }
}

function showTab(tab) {
  state.tab = ["inicio", "posts", "numeros", "contatos", "buscar", "campanha", "negocio", "conta", ...(state.flowCrm ? ["crm"] : [])].includes(tab) ? tab : "inicio";
  $$(".tab").forEach(section => { section.hidden = section.id !== "tab-" + state.tab; });
  $$(".tabbar [data-tab]").forEach(btn => {
    const active = btn.dataset.tab === state.tab;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
  });
  // No celular, "Mais" fica marcado quando a aba aberta está dentro dele.
  $("#more-btn")?.classList.toggle("active", ["numeros", "contatos", "negocio", "conta"].includes(state.tab));
  toggleMore(false);
  window.scrollTo({ top: 0 });
  // CRM da Flow Arts (22/10): os scripts do CRM carregam quando a aba abre.
  if (state.tab === "crm") for (const view of ["crm", "odin"]) document.dispatchEvent(new CustomEvent("nexus:view", { detail: view }));
}

// 22/10: o CRM que era do Master agora fica no painel da Flow Arts (só ela vê esta aba).
// Toque no aviso do celular com o painel já aberto: vai para a aba CRM.
navigator.serviceWorker?.addEventListener?.("message", event => {
  if (event.data?.type === "open-tab" && event.data.tab === "crm" && state.flowCrm) showTab("crm");
});

function enableFlowCrm() {
  if (state.flowCrm) return;
  state.flowCrm = true;
  window.NEXUS_API = "/api/portal/flow";
  document.body.classList.add("flow-crm");
  $$(".flow-only").forEach(el => { el.hidden = false; });
  for (const src of ["/crm.js?v=12", "/prospects-ui.js?v=15", "/examples.js?v=3", "/master-push.js?v=2"]) {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }
}

function toggleMore(open) {
  const sheet = $("#more-sheet");
  const button = $("#more-btn");
  if (!sheet || !button) return;
  const show = open === undefined ? sheet.hidden : Boolean(open);
  sheet.hidden = !show;
  button.setAttribute("aria-expanded", String(show));
}

function showLogin(message = "") {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#login-error").textContent = message;
}

function showApp(client) {
  state.client = client || state.client;
  if (state.client?.flowCrm === true && !DEMO) enableFlowCrm();
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

async function publishNow(id, button) {
  if (!window.confirm("Publicar este post no Instagram agora?")) return;
  button.disabled = true;
  try {
    await api("/api/portal/posts/" + encodeURIComponent(id) + "/publish-now", { method: "POST" });
    toast("Pronto. O post sai no Instagram em até 15 minutos.");
    await loadAll();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

async function cancelPost(id, button) {
  if (!window.confirm("Cancelar esta postagem? Ela não vai sair no Instagram.")) return;
  button.disabled = true;
  try {
    await api("/api/portal/posts/" + encodeURIComponent(id) + "/cancel", { method: "POST" });
    toast("Postagem cancelada. Ela não vai sair no Instagram.");
    await loadAll();
  } catch (error) {
    toast(error.message);
    button.disabled = false;
  }
}

async function saveSchedule(form) {
  const id = form.dataset.scheduleForm;
  const data = new FormData(form);
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await api("/api/portal/posts/" + encodeURIComponent(id) + "/schedule", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: String(data.get("date") || ""), time: String(data.get("time") || "") })
    });
    toast("Dia salvo. Agora é só aprovar.");
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
  if (DEMO && target.closest("[data-approve], [data-revise], [data-cancel-post], [data-publish-now], [data-connect], [data-discard-lead], #logout")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toast(DEMO_BLOCKED);
    return;
  }
  if (target.closest("#more-btn")) { toggleMore(); return; }
  const tabBtn = target.closest(".tabbar [data-tab]");
  if (tabBtn) { showTab(tabBtn.dataset.tab); return; }
  if (!target.closest("#more-sheet")) toggleMore(false);
  const go = target.closest("[data-go]");
  if (go) { showTab(go.dataset.go); return; }
  const discard = target.closest("[data-discard-lead]");
  if (discard) { discardLeadClick(discard); return; }
  const calDay = target.closest("[data-cal-day]");
  if (calDay) {
    state.calDay = calDay.dataset.calDay;
    renderCalendar();
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    $(".cal-detail")?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    return;
  }
  const calMove = target.closest("[data-cal-move]");
  if (calMove) {
    state.calMonth = shiftMonth(state.calMonth || todayKey().slice(0, 7), Number(calMove.dataset.calMove));
    state.calDay = "";
    renderCalendar();
    return;
  }
  const filter = target.closest("[data-filter]");
  if (filter) { state.filter = filter.dataset.filter; renderPosts(); return; }
  const approve = target.closest("[data-approve]");
  if (approve) { decide(approve.dataset.approve, approve); return; }
  const carBtn = target.closest("[data-car]");
  if (carBtn) {
    const track = carBtn.closest("[data-carousel]")?.querySelector(".car-track");
    if (track) track.scrollBy({ left: Number(carBtn.dataset.car) * track.clientWidth, behavior: "smooth" });
    return;
  }
  const publishBtn = target.closest("[data-publish-now]");
  if (publishBtn) { publishNow(publishBtn.dataset.publishNow, publishBtn); return; }
  const cancel = target.closest("[data-cancel-post]");
  if (cancel) { cancelPost(cancel.dataset.cancelPost, cancel); return; }
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
  if (DEMO) { event.preventDefault(); toast(DEMO_BLOCKED); return; }
  if (form instanceof HTMLFormElement && form.dataset.revisionForm) {
    event.preventDefault();
    sendRevision(form);
  }
  if (form instanceof HTMLFormElement && form.dataset.scheduleForm) {
    event.preventDefault();
    saveSchedule(form);
  }
});

async function bootDemo() {
  document.title = "Demonstração · Painel Flow Arts";
  const banner = document.createElement("p");
  banner.className = "demo-banner";
  banner.textContent = "Demonstração com um café fictício. Os posts foram criados pelos agentes de IA da Flow Arts.";
  $(".top-inner")?.after(banner);
  if ($("#logout")) $("#logout").hidden = true;
  showApp({ displayName: "Café Brisa" });
  await loadDemo();
  const link = $("#support-link");
  if (link) link.textContent = "Quero isso no meu negócio";
  const help = link?.previousElementSibling;
  if (help) help.textContent = "Gostou? Fale com a Flow Arts pelo WhatsApp e peça um exemplo grátis.";
  const title = help?.previousElementSibling;
  if (title) title.textContent = "Quer isso no seu negócio?";
  showTab("inicio");
}

async function loadDemo() {
  try {
    const data = await api("/api/demo/panel");
    state.posts = Array.isArray(data.posts) ? data.posts : [];
    state.contact = safeUrl(data.whatsapp);
    if (data.client) state.client = data.client;
  } catch {
    toast("Não foi possível carregar a demonstração. Tente de novo.");
  }
  state.connection = { connected: true, username: "cafebrisa", demo: true };
  state.insights = { ok: false, error: "demo" };
  state.leads = [];
  renderAll();
}

async function boot() {
  if (DEMO) { bootDemo(); return; }
  try {
    const data = await api("/api/portal/session", { signal: AbortSignal.timeout(8000) });
    showApp(data.client || data);
    const params = new URLSearchParams(window.location.search);
    showTab(params.get("tab") === "instagram" ? "conta" : params.get("tab") === "crm" ? "crm" : "inicio");
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
  try { if (savePassword && localStorage.getItem("nexusPortalRemember") === "1") savePassword.checked = true; } catch {}
  // Navegador: preenche com a senha guardada no gerenciador de senhas (se o cliente pediu para lembrar).
  if (!desktopStore && loginForm && window.PasswordCredential && navigator.credentials?.get) {
    navigator.credentials.get({ password: true, mediation: "optional" }).then(cred => {
      const user = loginForm.elements.namedItem("username");
      const pass = loginForm.elements.namedItem("password");
      if (cred?.type === "password" && cred.password && user && pass && !pass.value) {
        user.value = cred.id; pass.value = cred.password; if (savePassword) savePassword.checked = true;
      }
    }).catch(() => {});
  }
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
    try { localStorage.setItem("nexusPortalRemember", remember ? "1" : "0"); } catch {}
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

// Contador do carrossel (1 / 4) ao passar as imagens, pelas setas ou com o dedo.
document.addEventListener("scroll", event => {
  const track = event.target instanceof Element && event.target.classList.contains("car-track") ? event.target : null;
  if (!track) return;
  const total = track.children.length;
  const index = Math.min(total, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)) + 1);
  const count = track.parentElement.querySelector(".car-count");
  if (count) count.textContent = index + " / " + total;
  const box = track.parentElement;
  box.querySelector(".car-prev").disabled = index <= 1;
  box.querySelector(".car-next").disabled = index >= total;
}, true);
