// Brinde com "siga para liberar" (funil QUERO).
// 1) A pessoa comenta QUERO. O direct tem UMA frase e um link curto pessoal (/b/CODIGO).
// 2) Na página, ela segue o perfil e toca em "Já segui". O NEXUS pergunta ao Instagram se ela segue.
// 3) Se segue: aparece o formulário (nome + WhatsApp). Ao enviar, vira contato quente no painel
//    e o guia é liberado (/brinde/guia?k=...). Se não segue: pede para seguir.
// O código do link fica no banco; as chaves seguintes são assinadas (NEXUS_SECRET_KEY).

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { clientBrand, whatsappLink } from "./client-brand.js";
import { upsertLead } from "./leads.js";

export const GIFT_PAGE = "/b/";
export const GIFT_CHECK = "/api/public/brinde/check";
export const GIFT_LEAD = "/api/public/brinde/lead";
export const GIFT_GUIDE = "/brinde/guia";
export const GIFT_TITLE = "10 ideias de post que trazem clientes";
const NAMESPACE = "gift";
const LINK_NAMESPACE = "gift-link";
const CODE_RE = /^[A-Za-z0-9]{8,16}$/;
const LINK_DAYS = 30;
const GUIDE_HOURS = 24 * 7;

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(text) {
  const bin = atob(String(text).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmac(env, data) {
  const secret = String(env?.NEXUS_SECRET_KEY || "").trim();
  if (!secret) throw new Error("gift_secret_missing");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("gift:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)))).slice(0, 32);
}

export async function signGift(env, payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return body + "." + await hmac(env, body);
}

export async function readGift(env, token, now = new Date()) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  let expected = "";
  try { expected = await hmac(env, body); } catch { return null; }
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload || typeof payload !== "object") return null;
    if (Number(payload.e || 0) < Math.floor(now.getTime() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function giftBaseUrl(env) {
  return String(env?.PUBLIC_BASE_URL || "https://servidor-nexus.diamantehinode2015.workers.dev").trim().replace(/\/+$/, "");
}

function randomCode(size = 9) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return [...bytes].map(b => chars[b % chars.length]).join("");
}

// Cria o link curto do brinde para quem comentou (vale 30 dias).
export async function giftLink(env, { clientId, igsid, commentId = "", username = "" }, now = new Date()) {
  if (!env?.DB) throw new Error("gift_db_missing");
  const code = randomCode();
  const value = { c: String(clientId), u: String(igsid), m: String(commentId).slice(0, 40), n: String(username).slice(0, 40), e: Math.floor(now.getTime() / 1000) + LINK_DAYS * 86400 };
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)`
  ).bind(LINK_NAMESPACE, code, String(clientId), JSON.stringify(value)).run();
  return giftBaseUrl(env) + GIFT_PAGE + code;
}

export async function readGiftCode(env, code, now = new Date()) {
  if (!CODE_RE.test(String(code || ""))) return null;
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key=?2 LIMIT 1")
    .bind(LINK_NAMESPACE, String(code)).first().catch(() => null);
  try {
    const value = JSON.parse(String(row?.value_json || "null"));
    if (!value || Number(value.e || 0) < Math.floor(now.getTime() / 1000)) return null;
    return value;
  } catch {
    return null;
  }
}

// Uma frase só + botão "Baixar conteúdo" (o link não aparece no texto).
export const GIFT_DM_TEXT = "Me siga para receber o conteúdo 🎁";
export const GIFT_BUTTON = "Baixar conteúdo";

export function giftDmText(client, link, handle = "") {
  return { text: GIFT_DM_TEXT, buttonTitle: GIFT_BUTTON, url: link };
}

// Corpo da mensagem do Instagram: modelo com botão que abre o link.
export function giftButtonMessage(dm) {
  return { attachment: { type: "template", payload: { template_type: "button", text: dm.text, buttons: [{ type: "web_url", url: dm.url, title: dm.buttonTitle }] } } };
}

async function writeGiftState(env, clientId, patch) {
  if (!env?.DB) return;
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1")
    .bind(NAMESPACE, String(clientId)).first().catch(() => null);
  let value = {};
  try { value = JSON.parse(String(row?.value_json || "{}")) || {}; } catch { value = {}; }
  const next = { ...value, ...patch, unlocks: Number(value.unlocks || 0) + (patch.unlocked ? 1 : 0) };
  delete next.unlocked;
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES(?1, 'state', ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).bind(NAMESPACE, String(clientId), JSON.stringify(next)).run().catch(() => null);
}

export async function giftStatus(env, clientId) {
  const row = await env.DB.prepare("SELECT value_json FROM nexus_state WHERE namespace=?1 AND item_key='state' AND client_id=?2 LIMIT 1")
    .bind(NAMESPACE, String(clientId)).first().catch(() => null);
  try { return JSON.parse(String(row?.value_json || "null")); } catch { return null; }
}

// Pergunta ao Instagram se a pessoa (id do Instagram dela) segue o perfil do cliente.
// Retorna true/false, ou null quando o Instagram não deixa ver (ainda sem conversa no direct).
export async function checkFollows({ request = fetch, token, igsid }) {
  const response = await request("https://graph.instagram.com/" + encodeURIComponent(igsid) + "?fields=username,is_user_follow_business", {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.is_user_follow_business !== "boolean") {
    return { follows: null, error: String(payload?.error?.message || "instagram_" + response.status).slice(0, 160) };
  }
  return { follows: payload.is_user_follow_business, username: String(payload.username || "") };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export async function handleGiftCheck(request, env, { fetchImpl = fetch, now = new Date() } = {}) {
  const body = await request.json().catch(() => ({}));
  const gift = await readGiftCode(env, body?.code, now);
  if (!gift) return json({ ok: false, error: "invalid", message: "Este link venceu. Comente QUERO de novo no post para receber outro." }, 400);
  const conn = await resolveInstagramCredentials(env, gift.c).catch(() => null);
  const token = String(conn?.accessToken || "");
  const handle = "@" + String(conn?.username || "").replace(/^@/, "");
  if (!token) return json({ ok: false, error: "unavailable", message: "Não consegui conferir agora. Tente de novo em alguns minutos." }, 503);
  const result = await checkFollows({ request: fetchImpl, token, igsid: gift.u }).catch(error => ({ follows: null, error: String(error?.message || error).slice(0, 160) }));
  const at = now.toISOString();
  if (result.follows === true) {
    // Segue: libera o formulário do WhatsApp (chave assinada vale 1 dia).
    const key = await signGift(env, { c: gift.c, u: gift.u, n: String(result.username || gift.n || "").replace(/^@/, "").slice(0, 40), f: 1, e: Math.floor(now.getTime() / 1000) + 86400 });
    await writeGiftState(env, gift.c, { lastCheck: { at, result: "following" } });
    return json({ ok: true, follows: true, key });
  }
  if (result.follows === false) {
    await writeGiftState(env, gift.c, { lastCheck: { at, result: "not_following" } });
    return json({ ok: true, follows: false, message: "Você precisa me seguir primeiro: siga " + handle + " e toque em \"Já segui\"." });
  }
  await writeGiftState(env, gift.c, { lastCheck: { at, result: "unknown", error: result.error || "" } });
  return json({ ok: true, follows: null, message: "Falta um passo: mande a palavra SEGUI no direct do " + handle + ". Depois toque em \"Já segui\" de novo." });
}

export function validateGiftLead(body = {}) {
  const name = String(body.nome || "").trim().replace(/\s+/g, " ").slice(0, 60);
  let phone = String(body.whatsapp || "").replace(/\D/g, "");
  if (phone.length >= 12 && phone.startsWith("55")) phone = phone.slice(2);
  if (String(body.website || "").trim()) return { error: "spam" };
  if (name.length < 2) return { error: "nome", message: "Escreva o seu nome." };
  if (phone.length < 10 || phone.length > 11) return { error: "whatsapp", message: "Confira o WhatsApp com DDD." };
  if (body.consentimento !== true) return { error: "consentimento", message: "Marque a caixa para receber no WhatsApp." };
  return { lead: { name, whatsapp: "55" + phone } };
}

// Formulário depois de seguir: guarda o WhatsApp como contato quente e libera o guia.
export async function handleGiftLead(request, env, { now = new Date() } = {}) {
  const body = await request.json().catch(() => ({}));
  const key = await readGift(env, body?.key, now);
  if (!key || key.f !== 1) return json({ ok: false, error: "invalid", message: "Toque em \"Já segui\" de novo." }, 400);
  const checked = validateGiftLead(body);
  if (checked.error === "spam") return json({ ok: true });
  if (checked.error) return json({ ok: false, error: checked.error, message: checked.message }, 400);
  const { lead } = checked;
  const at = now.toISOString();
  const username = String(key.n || "").replace(/^@/, "");
  const conn = await resolveInstagramCredentials(env, key.c).catch(() => null);
  const handle = "@" + String(conn?.username || "flowarts2026").replace(/^@/, "");
  await upsertLead(env, { id: key.c, name: "Flow Arts", instagram: handle }, {
    id: key.c + ":brinde:" + key.u,
    instagramUsername: username,
    instagramUserId: key.u,
    temperature: "hot",
    score: 75,
    stage: "new",
    intent: "Seguiu o perfil e pegou o brinde",
    needsHuman: true,
    lastMessage: lead.name + (username ? " · @" + username : "") + " · pegou o guia",
    lastContactAt: at,
    source: "instagram-brinde",
    sourceUrl: "/b/",
    contact: { name: lead.name, whatsapp: lead.whatsapp, instagram: username ? "@" + username : "" },
    nextAction: { text: "Chamar no WhatsApp e perguntar se o guia ajudou", due: new Date(now.getTime() + 24 * 3600000).toISOString() }
  });
  const guide = await signGift(env, { c: key.c, u: key.u, g: 1, e: Math.floor(now.getTime() / 1000) + GUIDE_HOURS * 3600 });
  await writeGiftState(env, key.c, { lastCheck: { at, result: "unlocked" }, unlocked: true });
  return json({ ok: true, url: GIFT_GUIDE + "?k=" + guide });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

const BASE_STYLE = `
:root{--navy:#0F1E3D;--blue:#2B63F0;--bg:#F4F6FA;--card:#fff;--ink:#16233F;--muted:#5B6680;--line:#D5DCE8;--ok:#17895E;--warn:#9A5B00;--whats:#128C4B}
@media (prefers-color-scheme:dark){:root{--bg:#0B1426;--card:#111D35;--ink:#E7ECF7;--muted:#A3AFC7;--line:#24345A;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:17px;line-height:1.55}
.hero{background:var(--navy);color:#fff;padding:calc(24px + env(safe-area-inset-top)) 16px 56px}.wrap{max-width:640px;margin:0 auto}
.eyebrow{margin:0 0 8px;color:#9DB4F5;font-weight:700}h1{margin:0;font-size:clamp(1.6rem,6vw,2.3rem);line-height:1.15;text-wrap:balance}
.lead{margin:12px 0 0;color:#D3DCF2}main{padding:0 16px 40px}.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 18px;margin-top:-34px;box-shadow:0 12px 32px rgba(15,30,61,.12)}
ol.steps{margin:0 0 18px;padding-left:22px;display:grid;gap:8px}
.btn{min-height:54px;border:0;border-radius:999px;background:var(--blue);color:#fff;font:inherit;font-weight:700;font-size:1.05rem;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none;padding:0 22px;width:100%}
.btn:disabled{opacity:.6;cursor:wait}.btn-ghost{background:transparent;color:var(--blue);border:2px solid var(--blue);margin-top:12px}.btn-whats{background:var(--whats);margin-top:12px}
form{display:grid;gap:14px}label{display:grid;gap:6px;font-weight:700}input{font:inherit;color:var(--ink);background:var(--card);min-height:50px;border:1.5px solid var(--line);border-radius:10px;padding:0 14px;width:100%}
.check{display:flex;gap:10px;align-items:flex-start;font-weight:400;color:var(--muted);font-size:.95rem}.check input{width:22px;min-height:22px;height:22px;margin-top:2px;flex:none}.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
input:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.msg{margin:14px 0 0;min-height:1.2em;font-weight:700}.msg.ok{color:var(--ok)}.msg.warn{color:var(--warn)}
a:focus-visible,.btn:focus-visible{outline:3px solid var(--blue);outline-offset:2px}footer{padding:0 16px 28px;color:var(--muted);font-size:.9rem;text-align:center}
`;

function page(title, inner) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0F1E3D"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"><style>${BASE_STYLE}</style></head><body>${inner}<footer>Flow Arts · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a></footer></body></html>`;
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export function giftPageHtml(handle = "@flowarts2026", code = "") {
  const h = escapeHtml(handle);
  return page("Seu brinde · Flow Arts", `
<header class="hero"><div class="wrap"><p class="eyebrow">Brinde da Flow Arts</p><h1>Guia grátis: ${escapeHtml(GIFT_TITLE)}</h1><p class="lead">Ideias simples para o Instagram do seu negócio atrair clientes.</p></div></header>
<main><div class="wrap"><section class="card">
<div id="step1">
<ol class="steps"><li>Siga <b>${h}</b> no Instagram.</li><li>Volte aqui e toque em <b>Já segui</b>.</li></ol>
<a class="btn btn-ghost" href="https://www.instagram.com/${h.replace(/^@/, "")}/" target="_blank" rel="noopener">Abrir ${h}</a>
<button id="check" class="btn" type="button" style="margin-top:12px">Já segui</button>
</div>
<form id="step2" hidden novalidate>
<p style="margin:0 0 14px;font-weight:700">Pronto! Agora diga para onde mandar o seu brinde.</p>
<label>Seu nome<input name="nome" autocomplete="given-name" required></label>
<label>WhatsApp com DDD<input name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" placeholder="21 98888-7777" required></label>
<div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
<label class="check"><input name="consentimento" type="checkbox"> <span>Aceito receber o brinde e mensagens da Flow Arts no WhatsApp. <a href="/privacidade" target="_blank" rel="noopener">Privacidade</a>.</span></label>
<button class="btn" type="submit">Receber meu brinde</button>
</form>
<p id="msg" class="msg" role="status"></p>
</section></div></main>
<script>
(function(){var code=${JSON.stringify(String(code))};var key="";var b=document.getElementById("check"),m=document.getElementById("msg"),f=document.getElementById("step2");
function say(t,c){m.textContent=t||"";m.className="msg "+(c||"");}
function post(u,d){return fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return {};});});}
if(!code){say("Este link está incompleto. Abra o link que chegou no seu direct.","warn");b.disabled=true;return;}
function check(){b.disabled=true;b.textContent="Conferindo…";say("");
post("${GIFT_CHECK}",{code:code}).then(function(d){if(d.follows===true&&d.key){key=d.key;document.getElementById("step1").hidden=true;f.hidden=false;say("");f.elements.nome.focus();return;}
say(d.message||"Não consegui conferir. Tente de novo.","warn");b.disabled=false;b.textContent="Já segui";})
.catch(function(){say("Sem conexão. Tente de novo.","warn");b.disabled=false;b.textContent="Já segui";});}
b.addEventListener("click",check);check();
f.addEventListener("submit",function(e){e.preventDefault();var s=f.querySelector("button");s.disabled=true;s.textContent="Enviando…";say("");
post("${GIFT_LEAD}",{key:key,nome:f.elements.nome.value,whatsapp:f.elements.whatsapp.value,website:f.elements.website.value,consentimento:f.elements.consentimento.checked})
.then(function(d){if(d.ok&&d.url){say("Tudo certo! Abrindo o seu brinde…","ok");location.href=d.url;return;}
say(d.message||"Não deu certo. Tente de novo.","warn");s.disabled=false;s.textContent="Receber meu brinde";})
.catch(function(){say("Sem conexão. Tente de novo.","warn");s.disabled=false;s.textContent="Receber meu brinde";});});})();
</script>`);
}

const GUIDE_IDEAS = [
  ["Bastidores de 15 segundos", "Mostre algo sendo feito: o café saindo, o corte acontecendo, a embalagem sendo fechada. Gente gosta de ver o processo."],
  ["Antes e depois", "Uma foto do problema e outra do resultado. Funciona para salão, reforma, limpeza, roupa, comida."],
  ["Pergunta do cliente", "Pegue uma dúvida que você ouve toda semana e responda em um post. Termine com: “Tem outra dúvida? Comenta aqui.”"],
  ["O produto mais pedido", "Mostre o campeão de vendas e diga em uma frase por que as pessoas voltam para comprar."],
  ["Quem está por trás", "Apresente você ou alguém da equipe com nome e uma curiosidade. Pessoas compram de pessoas."],
  ["Prova de cliente", "Print de uma mensagem elogiando (com permissão) ou foto do cliente usando. Uma prova vale mais que dez promessas."],
  ["Erro comum", "“3 erros que as pessoas cometem ao…” ensina e mostra que você entende do assunto."],
  ["Oferta com prazo", "Uma condição real com data para acabar. Diga o que é, até quando e como pedir."],
  ["Enquete nos stories", "Duas opções simples: “Qual você prefere?”. Quem vota já está conversando com você."],
  ["Chamada clara", "Todo post termina com um próximo passo: “Comente QUERO”, “Chame no WhatsApp” ou “Salve para depois”."]
];

export function guideHtml(client = {}) {
  const brand = clientBrand(client);
  const whats = whatsappLink(client, "Olá! Baixei o guia de ideias de post da " + brand.brandName + " e quero ajuda com o meu Instagram.");
  const items = GUIDE_IDEAS.map(([title, text]) => `<li><b>${escapeHtml(title)}.</b> ${escapeHtml(text)}</li>`).join("");
  return page(GIFT_TITLE + " · " + brand.brandName, `
<header class="hero"><div class="wrap"><p class="eyebrow">Guia grátis · ${escapeHtml(brand.brandName)}</p><h1>${escapeHtml(GIFT_TITLE)}</h1><p class="lead">Escolha uma ideia por dia. Em 10 dias o seu perfil já parece outro.</p></div></header>
<main><div class="wrap"><section class="card">
<ol class="steps" style="gap:14px">${items}</ol>
<p><b>Dica:</b> poste no mesmo horário por uma semana e veja nos números qual ideia trouxe mais seguidores.</p>
<button class="btn" type="button" onclick="window.print()">Salvar em PDF</button>
${whats ? `<a class="btn btn-whats" href="${escapeHtml(whats)}" target="_blank" rel="noopener">Quero ajuda com meus posts</a>` : ""}
</section></div></main>
<style>@media print{.btn,footer{display:none}.hero{background:#fff;color:#000}.hero .eyebrow,.hero .lead{color:#333}.card{box-shadow:none;margin-top:0}}</style>`);
}

// Rotas públicas do brinde. Retorna null quando a URL não é do brinde.
export async function handleGiftRequest(request, env, url, options = {}) {
  if (url.pathname === GIFT_CHECK || url.pathname === GIFT_LEAD) {
    if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
    return url.pathname === GIFT_CHECK ? handleGiftCheck(request, env, options) : handleGiftLead(request, env, options);
  }
  if (!["GET", "HEAD"].includes(request.method)) return null;
  if (url.pathname.startsWith(GIFT_PAGE)) {
    const code = url.pathname.slice(GIFT_PAGE.length);
    const gift = await readGiftCode(env, code, options.now || new Date());
    if (!gift) return html(page("Link vencido · Flow Arts", `<header class="hero"><div class="wrap"><h1>Este link venceu</h1><p class="lead">Comente QUERO de novo no post para receber outro.</p></div></header>`), 404);
    const conn = await resolveInstagramCredentials(env, gift.c).catch(() => null);
    return html(giftPageHtml("@" + String(conn?.username || "flowarts2026").replace(/^@/, ""), code));
  }
  if (url.pathname === GIFT_GUIDE) {
    const key = await readGift(env, url.searchParams.get("k"), options.now || new Date());
    if (!key || key.g !== 1) {
      return html(page("Link vencido · Flow Arts", `<header class="hero"><div class="wrap"><h1>Este link venceu</h1><p class="lead">Abra de novo o link do seu direct e toque em “Já segui”.</p></div></header>`), 403);
    }
    const row = await env.DB.prepare("SELECT id, name, niche, instagram, status, config_json FROM clients WHERE id=?1 LIMIT 1").bind(String(key.c)).first().catch(() => null);
    let config = {};
    try { config = JSON.parse(String(row?.config_json || "{}")) || {}; } catch { config = {}; }
    return html(guideHtml({ ...(row || { id: key.c }), config }));
  }
  return null;
}
