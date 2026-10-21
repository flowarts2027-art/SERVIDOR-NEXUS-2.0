// Brinde com "siga para liberar" (funil QUERO).
// 1) A pessoa comenta QUERO. O direct tem UMA frase e um link curto pessoal (/b/CODIGO).
// 2) Na página, ela segue o perfil e toca em "Já segui". O NEXUS pergunta ao Instagram se ela segue.
// 3) Se segue: aparece o formulário (nome + WhatsApp). Ao enviar, vira contato quente no painel
//    e o guia é liberado (/brinde/guia?k=...). Se não segue: pede para seguir.
// O código do link fica no banco; as chaves seguintes são assinadas (NEXUS_SECRET_KEY).

import { resolveInstagramCredentials } from "./instagram-credentials.js";
import { clientBrand, whatsappLink } from "./client-brand.js";
import { upsertLead } from "./leads.js";
import { giftMaterial, GIFT_MATERIALS } from "./gift-materials.js";

export const GIFT_PAGE = "/b/";
export const GIFT_CHECK = "/api/public/brinde/check";
export const GIFT_LEAD = "/api/public/brinde/lead";
export const GIFT_GUIDE = "/brinde/guia";
export const GIFT_PDF = "/downloads/guia-10-ideias-flowarts.pdf";
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
export async function giftLink(env, { clientId, igsid, commentId = "", username = "", topic = "" }, now = new Date()) {
  if (!env?.DB) throw new Error("gift_db_missing");
  const code = randomCode();
  const value = { c: String(clientId), u: String(igsid), m: String(commentId).slice(0, 40), n: String(username).slice(0, 40), t: GIFT_MATERIALS[topic] ? topic : "guia", e: Math.floor(now.getTime() / 1000) + LINK_DAYS * 86400 };
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
  if (!gift) return json({ ok: false, error: "invalid", message: "Este link venceu. Comente de novo no post para receber outro." }, 400);
  const conn = await resolveInstagramCredentials(env, gift.c).catch(() => null);
  const token = String(conn?.accessToken || "");
  const handle = "@" + String(conn?.username || "").replace(/^@/, "");
  if (!token) return json({ ok: false, error: "unavailable", message: "Não consegui conferir agora. Tente de novo em alguns minutos." }, 503);
  const result = await checkFollows({ request: fetchImpl, token, igsid: gift.u }).catch(error => ({ follows: null, error: String(error?.message || error).slice(0, 160) }));
  const at = now.toISOString();
  if (result.follows === true) {
    // Segue: libera o formulário do WhatsApp (chave assinada vale 1 dia).
    const key = await signGift(env, { c: gift.c, u: gift.u, n: String(result.username || gift.n || "").replace(/^@/, "").slice(0, 40), f: 1, t: gift.t || "guia", e: Math.floor(now.getTime() / 1000) + 86400 });
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
  const name = String(body.nome || "").trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, 60);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  let phone = String(body.whatsapp || "").replace(/\D/g, "");
  if (phone.length >= 12 && phone.startsWith("55")) phone = phone.slice(2);
  if (String(body.website || "").trim()) return { error: "spam" };
  if (name.length < 2) return { error: "nome", message: "Escreva o seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "email", message: "Confira o seu e-mail." };
  if (phone.length < 10 || phone.length > 11) return { error: "whatsapp", message: "Confira o WhatsApp com DDD." };
  return { lead: { name, email, whatsapp: "55" + phone } };
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
    intent: giftMaterial(key.t).leadIntent,
    needsHuman: true,
    lastMessage: lead.name + (username ? " · @" + username : "") + " · pegou: " + giftMaterial(key.t).title,
    lastContactAt: at,
    source: "instagram-brinde",
    sourceUrl: "/b/",
    contact: { name: lead.name, email: lead.email, whatsapp: lead.whatsapp, instagram: username ? "@" + username : "" },
    nextAction: { text: "Chamar no WhatsApp e perguntar se o guia ajudou", due: new Date(now.getTime() + 24 * 3600000).toISOString() }
  });
  const guide = await signGift(env, { c: key.c, u: key.u, g: 1, t: key.t || "guia", e: Math.floor(now.getTime() / 1000) + GUIDE_HOURS * 3600 });
  await writeGiftState(env, key.c, { lastCheck: { at, result: "unlocked" }, unlocked: true });
  return json({ ok: true, url: GIFT_GUIDE + "?k=" + guide });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

const BASE_STYLE = `
:root{--bg:#050B1F;--panel:#0A1636;--panel-2:#0F1E46;--line:#1C2B57;--ink:#F2F5FA;--chrome:#C9D1DE;--muted:#93A0BB;--accent:#1F6BFF;--accent-2:#49A3FF;--accent-soft:rgba(31,107,255,.14);--ok:#3DD68C;--warn:#FFB547;--whats:#1FAF5F;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:radial-gradient(900px 520px at 85% -10%,rgba(31,107,255,.22),transparent 60%),radial-gradient(700px 480px at -10% 30%,rgba(73,163,255,.10),transparent 60%),var(--bg);background-attachment:fixed;color:var(--chrome);font:400 17px/1.6 "Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--accent-2)}.wrap{max-width:760px;margin:0 auto;padding:0 18px}
h1,h2,h3,.disp{font-family:Fraunces,Georgia,serif;color:var(--ink);letter-spacing:-.015em}
.bar-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 0 14px}
.logo{display:inline-flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font:700 1rem Fraunces,Georgia,serif}.logo img{width:26px;height:32px}
.pill{display:inline-flex;align-items:center;gap:8px;background:var(--accent-soft);color:var(--accent-2);border:1px solid rgba(73,163,255,.28);font-weight:700;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:999px}
h1{margin:16px 0 0;font-size:clamp(1.9rem,7vw,3.1rem);line-height:1.06;font-weight:700;text-wrap:balance}h1 em{font-style:normal;background:linear-gradient(90deg,#fff,var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:clamp(1.3rem,4.6vw,1.8rem);line-height:1.15;margin:0 0 8px;font-weight:700;text-wrap:balance}
.sub{color:var(--muted);margin:14px 0 0;font-size:1.06rem}
.panel{background:linear-gradient(180deg,rgba(15,30,70,.85),rgba(10,22,54,.85));border:1px solid var(--line);border-radius:22px;padding:24px 20px;box-shadow:0 30px 60px -30px rgba(0,0,0,.6)}
.btn{min-height:54px;border:0;border-radius:999px;background:var(--accent);color:#fff;font:inherit;font-weight:700;font-size:1.02rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;padding:0 26px;box-shadow:0 10px 30px -10px rgba(31,107,255,.7);transition:transform .15s}
.btn:active{transform:scale(.98)}.btn.block{width:100%}.btn:disabled{opacity:.6;cursor:wait}.btn-ghost{background:transparent;color:var(--ink);border:1.5px solid #3A4E86;box-shadow:none}.btn-whats{background:var(--whats);box-shadow:0 10px 30px -10px rgba(31,175,95,.7)}
form{display:grid;gap:14px}label{display:grid;gap:6px;font-weight:700;font-size:.95rem;color:var(--ink)}
input{font:inherit;color:var(--ink);background:rgba(5,11,31,.7);min-height:52px;border:1.5px solid var(--line);border-radius:14px;padding:0 14px;width:100%}
input:focus{border-color:var(--accent-2)}input::placeholder{color:#5D6B88}.phone{display:grid;grid-template-columns:auto 1fr;gap:8px}.ddi{display:flex;align-items:center;padding:0 12px;border:1.5px solid var(--line);border-radius:14px;background:rgba(5,11,31,.7);color:var(--muted);font-weight:700}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
input:focus-visible,a:focus-visible,.btn:focus-visible,button:focus-visible{outline:3px solid var(--accent-2);outline-offset:2px}
.msg{margin:0;min-height:1.2em;font-weight:700}.msg.ok{color:var(--ok)}.msg.warn{color:var(--warn)}
.note{color:var(--muted);font-size:.85rem;text-align:center;margin:0}
footer{padding:32px 16px calc(32px + env(safe-area-inset-bottom));color:var(--muted);font-size:.85rem;text-align:center}
`;

const LOGO = `<a class="logo" href="https://flowarts.com.br/" target="_blank" rel="noopener"><img src="/brand/flowarts-symbol.webp" alt="" width="26" height="32">Flow Arts</a>`;

function page(title, inner, extraStyle = "") {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#050B1F"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><link rel="icon" href="/brand/flowarts-icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Fraunces:opsz,wght@9..144,600..800&display=swap"><style>${BASE_STYLE}${extraStyle}</style></head><body>${inner}<footer>Flow Arts · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a></footer></body></html>`;
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

const GIFT_STYLE = `
.cover{display:grid;place-items:center;padding:18px 0 26px;perspective:900px}
.book{position:relative;width:min(230px,62vw);aspect-ratio:3/4;border-radius:10px 18px 18px 10px;padding:22px 18px;display:flex;flex-direction:column;gap:8px;text-align:left;background:radial-gradient(120% 80% at 100% 0%,#49A3FF 0%,transparent 55%),linear-gradient(160deg,#1F6BFF,#0A1636 70%);box-shadow:-10px 0 0 -4px #0F1E46,0 40px 70px -25px rgba(31,107,255,.75),inset 6px 0 0 rgba(255,255,255,.12);transform:rotateY(-14deg) rotateX(4deg);animation:float 6s ease-in-out infinite}
.book-tag{font-size:.7rem;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.75)}
.book b{font-size:1.65rem;line-height:1.02;color:#fff;margin-top:auto}.book-sub{color:rgba(255,255,255,.85);font-weight:700}
.book-foot{display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25);font:700 .8rem Fraunces,Georgia,serif;color:#fff}
@keyframes float{50%{transform:rotateY(-10deg) rotateX(2deg) translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.book{animation:none}}
.gets{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:10px}
.gets li{display:flex;gap:12px;align-items:center;background:rgba(10,22,54,.6);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.gets li::before{content:"✓";flex:none;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;font-size:.85rem}
.gets b{color:var(--ink)}
`;

// Uma janela só: Nome, E-mail e WhatsApp. A conferência de "segue?" roda escondida;
// a tela de seguir só aparece para quem ainda não segue.
export function giftPageHtml(handle = "@flowarts2026", code = "", topic = "guia") {
  const mat = giftMaterial(topic);
  const h = escapeHtml(handle);
  return page(mat.title + " · Flow Arts", `
<main class="wrap" style="max-width:520px">
<div class="bar-top">${LOGO}<span class="pill">Grátis</span></div>
<div class="cover" aria-hidden="true"><div class="book"><span class="book-tag">GUIA · 2026</span><b class="disp">${mat.coverTitle}</b><span class="book-sub">${escapeHtml(mat.coverSub)}</span><span class="book-foot"><img src="/brand/flowarts-symbol.webp" alt="" width="18" height="22">Flow Arts</span></div></div>
<div style="text-align:center"><span class="pill">⚡ Material gratuito</span>
<h1><em>${escapeHtml(mat.title)}</em></h1>
<p class="sub">${escapeHtml(mat.formSub)}</p></div>
<ul class="gets">${mat.gets.map(([b, t]) => `<li><span><b>${escapeHtml(b)}</b> ${escapeHtml(t)}</span></li>`).join("")}</ul>
<section class="panel" style="margin-top:22px;text-align:left">
<form id="lead" novalidate>
<p class="note" style="font-size:.95rem">Preencha seus dados para acessar o material completo.</p>
<label>Nome<input name="nome" autocomplete="given-name" placeholder="Seu nome" required></label>
<label>E-mail<input name="email" type="email" inputmode="email" autocomplete="email" placeholder="seu@email.com" required></label>
<label>WhatsApp<span class="phone"><span class="ddi">🇧🇷 +55</span><input name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(21) 98888-7777" required></span></label>
<div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn block" type="submit">Acessar material completo</button>
<p id="msg" class="msg" role="status"></p>
<p class="note">Seus dados estão seguros e não serão compartilhados. Ao continuar, você aceita receber o material e mensagens da Flow Arts no WhatsApp. <a href="/privacidade" target="_blank" rel="noopener">Privacidade</a>.</p>
</form>
<div id="follow" hidden style="text-align:center">
<p style="margin:0 0 16px;font-weight:700;font-size:1.1rem">Você precisa me seguir primeiro 🙂</p>
<a class="btn btn-ghost block" href="https://www.instagram.com/${h.replace(/^@/, "")}/" target="_blank" rel="noopener">Seguir ${h}</a>
<button id="check" class="btn block" type="button" style="margin-top:12px">Já segui</button>
<p id="fmsg" class="msg" role="status" style="margin-top:12px"></p>
</div>
</section>
</main>
<script>
(function(){var code=${JSON.stringify(String(code))};var key="",waiting=null;
var f=document.getElementById("lead"),m=document.getElementById("msg"),fw=document.getElementById("follow"),b=document.getElementById("check"),fm=document.getElementById("fmsg");
function say(el,t,c){el.textContent=t||"";el.className="msg "+(c||"");}
function post(u,d){return fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return {};});});}
function check(){return post("${GIFT_CHECK}",{code:code}).then(function(d){
if(d.follows===true&&d.key){key=d.key;fw.hidden=true;f.hidden=false;return true;}
f.hidden=true;fw.hidden=false;say(fm,d.follows===false?"":(d.message||""),"warn");return false;});}
if(!code){say(m,"Este link está incompleto. Abra o link que chegou no seu direct.","warn");return;}
waiting=check().catch(function(){return false;});
b.addEventListener("click",function(){b.disabled=true;b.textContent="Conferindo…";say(fm,"");
check().then(function(ok){if(!ok&&!fm.textContent)say(fm,"Ainda não vi você seguindo. Siga e toque de novo.","warn");})
.catch(function(){say(fm,"Sem conexão. Tente de novo.","warn");}).then(function(){b.disabled=false;b.textContent="Já segui";});});
f.addEventListener("submit",function(e){e.preventDefault();var s=f.querySelector("button");s.disabled=true;s.textContent="Enviando…";say(m,"");
Promise.resolve(waiting).then(function(){if(!key)return {ok:false,message:"Confira se você segue ${h} e tente de novo."};
return post("${GIFT_LEAD}",{key:key,nome:f.elements.nome.value,email:f.elements.email.value,whatsapp:f.elements.whatsapp.value,website:f.elements.website.value});})
.then(function(d){if(d.ok&&d.url){say(m,"Tudo certo! Abrindo o seu material…","ok");location.href=d.url;return;}
say(m,d.message||"Não deu certo. Tente de novo.","warn");s.disabled=false;s.textContent="Acessar material completo";})
.catch(function(){say(m,"Sem conexão. Tente de novo.","warn");s.disabled=false;s.textContent="Acessar material completo";});});})();
</script>`, GIFT_STYLE);
}

const GUIDE_STYLE = `
.top-sticky{position:sticky;top:0;z-index:5;background:rgba(5,11,31,.82);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(28,43,87,.7)}
.top-sticky .bar-top{padding-bottom:10px}
.prog{display:flex;align-items:center;gap:10px;padding:0 0 12px;font-size:.85rem;font-weight:700;color:var(--muted)}
.bar{flex:1;height:6px;border-radius:999px;background:var(--panel-2);overflow:hidden}.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .4s}
.hero{padding:34px 0 8px}
.kicker{font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-2)}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.meta span{border:1px solid var(--line);background:rgba(10,22,54,.6);border-radius:999px;padding:6px 12px;font-size:.88rem;color:var(--ink)}
.meta b{color:var(--accent-2)}
.ctas{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.toc{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:30px}
.toc a{display:flex;gap:10px;align-items:center;text-decoration:none;color:var(--ink);font-size:.92rem;line-height:1.25;background:rgba(10,22,54,.6);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
.toc a b{flex:none;font:700 .8rem Fraunces,Georgia,serif;color:var(--accent-2)}
.toc a.done{border-color:var(--ok)}.toc a.done b{color:var(--ok)}
.sec-title{margin:46px 0 4px}
.step{position:relative;margin-top:18px;padding:22px 18px 18px;border-radius:22px;background:linear-gradient(180deg,rgba(15,30,70,.75),rgba(10,22,54,.75));border:1px solid var(--line);scroll-margin-top:110px;overflow:hidden}
.num{position:absolute;right:14px;top:4px;font:700 4.2rem/1 Fraunces,Georgia,serif;color:transparent;-webkit-text-stroke:1.5px rgba(73,163,255,.35);pointer-events:none}
.step.done{border-color:rgba(61,214,140,.55)}.step.done .num{-webkit-text-stroke-color:rgba(61,214,140,.5)}
.tags{display:flex;gap:6px;flex-wrap:wrap}
.tags span{font-size:.75rem;font-weight:700;letter-spacing:.04em;padding:4px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-2)}
.tags span+span{background:rgba(201,209,222,.08);color:var(--chrome)}
.step h3{margin:12px 0 6px;font-size:1.2rem;line-height:1.2;max-width:80%}.step p{margin:0;color:var(--muted)}
.copy{margin-top:16px;background:#fff;color:#111;border-radius:16px;overflow:hidden;box-shadow:0 16px 30px -18px rgba(0,0,0,.7)}
.copy header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #eee}
.who{display:flex;align-items:center;gap:8px;font-size:.85rem;font-weight:700;color:#111}
.who i{width:28px;height:28px;border-radius:50%;background:conic-gradient(#f9ce34,#ee2a7b,#6228d7,#f9ce34);padding:2px;display:block}
.who i::after{content:"";display:block;width:100%;height:100%;border-radius:50%;background:#fff;border:2px solid #fff;box-sizing:border-box;background:#0A1636}
.copy button{font:inherit;font-size:.85rem;font-weight:700;cursor:pointer;border-radius:999px;background:#111;color:#fff;border:0;padding:6px 14px}
.copy pre{margin:0;padding:12px 14px 14px;white-space:pre-wrap;font-family:inherit;font-size:.95rem;color:#111}
.mark{margin-top:14px;font:inherit;font-size:.9rem;font-weight:700;cursor:pointer;border-radius:999px;background:transparent;color:var(--ink);border:1.5px solid #3A4E86;padding:9px 16px}
.step.done .mark{color:var(--ok);border-color:var(--ok)}
.band{margin-top:26px;border-radius:22px;padding:24px 20px;text-align:center;background:radial-gradient(120% 120% at 100% 0%,rgba(73,163,255,.35),transparent 60%),linear-gradient(160deg,#1F6BFF,#0A1636 80%);border:1px solid rgba(73,163,255,.4)}
.band h2{color:#fff}.band p{color:rgba(255,255,255,.85);margin:0 0 18px}
.tip{margin-top:26px;border-left:4px solid var(--accent-2)}
@media (min-width:640px){.toc{grid-template-columns:repeat(5,1fr)}.toc a{flex-direction:column;align-items:flex-start}}
@media print{body{background:#fff;color:#000}.noprint,.top-sticky,.btn,.mark,.copy button,.toc,.band,footer{display:none!important}.step,.panel{border-color:#ccc;background:#fff}.step p,.copy pre{color:#000}h1,h2,h3{color:#000}h1 em{color:#000;-webkit-text-fill-color:#000}}
`;

export function guideHtml(client = {}, topic = "guia") {
  const mat = giftMaterial(topic);
  const brand = clientBrand(client);
  const name = escapeHtml(brand.brandName);
  const fill = text => escapeHtml(String(text || "").replaceAll("{brand}", brand.brandName));
  const whats = whatsappLink(client, String(mat.whatsText).replaceAll("{brand}", brand.brandName));
  const middle = Math.floor(mat.items.length / 2) - 1;
  const band = whats ? `<section class="band noprint"><span class="pill" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3)">🎁 Bônus liberado</span>
<h2 style="margin-top:12px">${fill(mat.bandTitle)}</h2>
<p>${fill(mat.bandText)}</p>
<a class="btn btn-whats" href="${escapeHtml(whats)}" target="_blank" rel="noopener">${fill(mat.bandButton)}</a></section>` : "";
  const steps = mat.items.map(([title, how, caption, format, time], i) => {
    return `
<article class="step" id="ideia-${i + 1}" data-step="${i + 1}">
<span class="num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
<div class="tags"><span>${escapeHtml(format)}</span><span>${escapeHtml(time)}</span></div>
<h3>${escapeHtml(title)}</h3><p>${escapeHtml(how)}</p>
<div class="copy"><header><span class="who"><i></i>seu_negocio</span><button type="button" data-copy>${escapeHtml(mat.blockLabel)}</button></header><pre>${escapeHtml(caption)}</pre></div>
<button type="button" class="mark" data-mark>Marcar como feito</button>
</article>${i === middle ? band : ""}`;
  }).join("");
  const toc = mat.items.map(([title], i) => `<a href="#ideia-${i + 1}" data-toc="${i + 1}"><b>${String(i + 1).padStart(2, "0")}</b>${escapeHtml(title)}</a>`).join("");
  const pdfLink = label => mat.pdf ? `<a class="btn btn-ghost"${label ? "" : ' style="min-height:40px;padding:0 16px;font-size:.9rem"'} href="${mat.pdf}" download>⬇ ${label || "PDF"}</a>` : "";
  return page(mat.title + " · " + brand.brandName, `
<div class="top-sticky noprint"><div class="wrap"><div class="bar-top">${LOGO}${pdfLink("")}</div>
<div class="prog"><span id="ptext">0 de ${mat.items.length}</span><div class="bar"><i id="pbar"></i></div></div></div></div>
<main class="wrap">
<section class="hero"><span class="kicker">Guia ${name} · Edição 2026</span>
<h1>${mat.h1}</h1>
<p class="sub">${escapeHtml(mat.sub)}</p>
<div class="meta">${mat.meta.map(([b, t]) => `<span><b>${escapeHtml(b)}</b> ${escapeHtml(t)}</span>`).join("")}</div>
<div class="ctas"><a class="btn" href="#ideia-1">${escapeHtml(mat.start)}</a>${pdfLink("Baixar PDF")}</div></section>
<h2 class="sec-title noprint" style="font-size:1rem;color:var(--muted);font-family:inherit;letter-spacing:.1em;text-transform:uppercase">Sumário</h2>
<nav class="toc noprint" aria-label="Sumário">${toc}</nav>
<h2 class="sec-title" id="passos">${escapeHtml(mat.section)}</h2>
<p class="sub noprint" style="margin:0">Vá marcando conforme faz. Fica salvo neste celular.</p>
${steps}
<section class="panel tip"><b style="color:var(--ink)">Dica da ${name}</b><p class="sub" style="margin-top:6px">${fill(mat.tip)}</p></section>
${whats ? `<p class="noprint" style="text-align:center;margin-top:22px"><a class="btn btn-whats" href="${escapeHtml(whats)}" target="_blank" rel="noopener">Falar com a ${name} no WhatsApp</a></p>` : ""}
</main>
<script>
(function(){var KEY=${JSON.stringify("flowarts-brinde-" + mat.id)};var done={};try{done=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){done={};}
var steps=[].slice.call(document.querySelectorAll(".step"));
function paint(){var n=0;steps.forEach(function(s){var on=!!done[s.dataset.step];if(on)n++;s.classList.toggle("done",on);s.querySelector("[data-mark]").textContent=on?"✓ Feito":"Marcar como feito";var t=document.querySelector('[data-toc="'+s.dataset.step+'"]');if(t)t.classList.toggle("done",on);});
document.getElementById("ptext").textContent=n+" de "+steps.length;document.getElementById("pbar").style.width=(n*100/steps.length)+"%";}
steps.forEach(function(s){s.querySelector("[data-mark]").addEventListener("click",function(){done[s.dataset.step]=!done[s.dataset.step];try{localStorage.setItem(KEY,JSON.stringify(done));}catch(e){}paint();});
s.querySelector("[data-copy]").addEventListener("click",function(e){var t=s.querySelector("pre").textContent,btn=e.currentTarget;
(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){btn.textContent="Copiado ✓";setTimeout(function(){btn.textContent=${JSON.stringify(mat.blockLabel)};},1500);}).catch(function(){btn.textContent="Segure o texto";});});});
paint();})();
</script>`, GUIDE_STYLE);
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
    if (!gift) return html(page("Link vencido · Flow Arts", `<main class="wrap" style="padding-top:60px;text-align:center"><h1>Este link venceu</h1><p class="sub">Comente de novo no post para receber outro.</p></main>`), 404);
    const conn = await resolveInstagramCredentials(env, gift.c).catch(() => null);
    return html(giftPageHtml("@" + String(conn?.username || "flowarts2026").replace(/^@/, ""), code, gift.t));
  }
  if (url.pathname === GIFT_GUIDE) {
    const key = await readGift(env, url.searchParams.get("k"), options.now || new Date());
    if (!key || key.g !== 1) {
      return html(page("Link vencido · Flow Arts", `<main class="wrap" style="padding-top:60px;text-align:center"><h1>Este link venceu</h1><p class="sub">Abra de novo o link do seu direct.</p></main>`), 403);
    }
    const row = await env.DB.prepare("SELECT id, name, niche, instagram, status, config_json FROM clients WHERE id=?1 LIMIT 1").bind(String(key.c)).first().catch(() => null);
    let config = {};
    try { config = JSON.parse(String(row?.config_json || "{}")) || {}; } catch { config = {}; }
    return html(guideHtml({ ...(row || { id: key.c }), config }, key.t));
  }
  return null;
}
