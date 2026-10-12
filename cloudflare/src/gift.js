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
    intent: "Seguiu o perfil e pegou o brinde",
    needsHuman: true,
    lastMessage: lead.name + (username ? " · @" + username : "") + " · pegou o guia",
    lastContactAt: at,
    source: "instagram-brinde",
    sourceUrl: "/b/",
    contact: { name: lead.name, email: lead.email, whatsapp: lead.whatsapp, instagram: username ? "@" + username : "" },
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
:root{--bg:#070D1A;--panel:#0E1729;--panel-2:#13203A;--line:#22314F;--ink:#EEF2FA;--muted:#9AA8C4;--accent:#4F86FF;--accent-2:#7FA8FF;--accent-soft:rgba(79,134,255,.14);--ok:#3DD68C;--warn:#FFB547;--whats:#1FAF5F;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:17px;line-height:1.6}
a{color:var(--accent-2)}.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--accent-soft);color:var(--accent-2);font-weight:700;font-size:.85rem;padding:5px 12px;border-radius:999px}
h1{margin:14px 0 0;font-size:clamp(1.7rem,6.4vw,2.5rem);line-height:1.15;text-wrap:balance}h1 em{font-style:normal;color:var(--accent-2)}
h2{font-size:1.35rem;line-height:1.25;margin:0 0 6px}.sub{color:var(--muted);margin:12px 0 0}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px 18px}
.btn{min-height:52px;border:0;border-radius:12px;background:var(--accent);color:#fff;font:inherit;font-weight:700;font-size:1.02rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;padding:0 22px}
.btn.block{width:100%}.btn:disabled{opacity:.6;cursor:wait}.btn-ghost{background:transparent;color:var(--accent-2);border:1.5px solid var(--accent)}.btn-whats{background:var(--whats)}
form{display:grid;gap:14px}label{display:grid;gap:6px;font-weight:700;font-size:.95rem}
input{font:inherit;color:var(--ink);background:var(--bg);min-height:50px;border:1.5px solid var(--line);border-radius:12px;padding:0 14px;width:100%}
input::placeholder{color:#5D6B88}.phone{display:grid;grid-template-columns:auto 1fr;gap:8px}.ddi{display:flex;align-items:center;padding:0 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--bg);color:var(--muted);font-weight:700}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
input:focus-visible,a:focus-visible,.btn:focus-visible,button:focus-visible{outline:3px solid var(--accent-2);outline-offset:2px}
.msg{margin:0;min-height:1.2em;font-weight:700}.msg.ok{color:var(--ok)}.msg.warn{color:var(--warn)}
.note{color:var(--muted);font-size:.85rem;text-align:center;margin:0}
footer{padding:28px 16px calc(28px + env(safe-area-inset-bottom));color:var(--muted);font-size:.85rem;text-align:center}
`;

function page(title, inner, extraStyle = "") {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#070D1A"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"><style>${BASE_STYLE}${extraStyle}</style></head><body>${inner}<footer>Flow Arts · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a></footer></body></html>`;
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

// Uma janela só: Nome, E-mail e WhatsApp. A conferência de "segue?" roda escondida;
// a tela de seguir só aparece para quem ainda não segue.
export function giftPageHtml(handle = "@flowarts2026", code = "") {
  const h = escapeHtml(handle);
  return page("Material gratuito · Flow Arts", `
<main class="wrap" style="padding-top:calc(36px + env(safe-area-inset-top));max-width:480px;text-align:center">
<span class="pill">⚡ Material gratuito</span>
<h1><em>${escapeHtml(GIFT_TITLE)}</em></h1>
<p class="sub">O guia com 10 ideias prontas, legendas para copiar e um plano de 10 dias para o Instagram do seu negócio.</p>
<section class="panel" style="margin-top:24px;text-align:left">
<form id="lead" novalidate>
<p class="note" style="font-size:.95rem">Preencha seus dados para acessar o guia completo.</p>
<label>Nome<input name="nome" autocomplete="given-name" placeholder="Seu nome" required></label>
<label>E-mail<input name="email" type="email" inputmode="email" autocomplete="email" placeholder="seu@email.com" required></label>
<label>WhatsApp<span class="phone"><span class="ddi">🇧🇷 +55</span><input name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(21) 98888-7777" required></span></label>
<div class="hp" aria-hidden="true"><label>Site<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn block" type="submit">Acessar guia completo</button>
<p id="msg" class="msg" role="status"></p>
<p class="note">Seus dados estão seguros e não serão compartilhados. Ao continuar, você aceita receber o guia e mensagens da Flow Arts no WhatsApp. <a href="/privacidade" target="_blank" rel="noopener">Privacidade</a>.</p>
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
.then(function(d){if(d.ok&&d.url){say(m,"Tudo certo! Abrindo o seu guia…","ok");location.href=d.url;return;}
say(m,d.message||"Não deu certo. Tente de novo.","warn");s.disabled=false;s.textContent="Acessar guia completo";})
.catch(function(){say(m,"Sem conexão. Tente de novo.","warn");s.disabled=false;s.textContent="Acessar guia completo";});});})();
</script>`);
}

// Ideia, como fazer e a legenda pronta para copiar (troque o que está entre colchetes).
const GUIDE_IDEAS = [
  ["Bastidores de 15 segundos", "Grave algo sendo feito: o café saindo, o corte acontecendo, a embalagem sendo fechada. Gente gosta de ver o processo.", "Ninguém vê essa parte, mas é aqui que o [PRODUTO] fica bom de verdade.\n\nCada [PEDIDO/CLIENTE] passa por isso antes de chegar até você.\n\nQuer um? Chama no direct."],
  ["Antes e depois", "Uma foto do problema e outra do resultado. Funciona para salão, reforma, limpeza, roupa e comida.", "Antes 👉 depois.\n\n[O QUE FOI FEITO] em [TEMPO].\n\nQuer esse resultado também? Comente QUERO."],
  ["Pergunta do cliente", "Pegue uma dúvida que você ouve toda semana e responda em um post.", "\"[PERGUNTA QUE VOCÊ MAIS OUVE]?\"\n\nResposta curta: [RESPOSTA EM UMA FRASE].\n\nTem outra dúvida? Comenta aqui que eu respondo."],
  ["O mais pedido", "Mostre o campeão de vendas e diga por que as pessoas voltam para comprar.", "Esse é o mais pedido da casa: [PRODUTO].\n\nO motivo: [O QUE ELE TEM DE ESPECIAL].\n\nSalve para lembrar na próxima vez."],
  ["Quem está por trás", "Apresente você ou alguém da equipe com nome e uma curiosidade. Pessoas compram de pessoas.", "Prazer, eu sou [NOME] 👋\n\nCuido do [NEGÓCIO] há [TEMPO] e o que eu mais gosto é [CURIOSIDADE].\n\nMe conta: há quanto tempo você acompanha a gente?"],
  ["Prova de cliente", "Print de um elogio (com permissão) ou foto do cliente usando. Uma prova vale mais que dez promessas.", "Recebemos essa mensagem hoje e precisávamos mostrar 🥹\n\nObrigado, [NOME DO CLIENTE]!\n\nQuer ser o próximo? Chama no direct."],
  ["Erro comum", "\"3 erros que as pessoas cometem ao…\" ensina e mostra que você entende do assunto.", "3 erros que quase todo mundo comete com [ASSUNTO]:\n\n1. [ERRO 1]\n2. [ERRO 2]\n3. [ERRO 3]\n\nSalve para não esquecer."],
  ["Oferta com prazo", "Uma condição real com data para acabar. Diga o que é, até quando e como pedir.", "Só até [DIA]: [OFERTA].\n\nPara pedir, é só [COMO PEDIR].\n\nDepois disso, volta ao normal."],
  ["Enquete nos stories", "Duas opções simples. Quem vota já está conversando com você.", "Story com enquete: \"Qual você prefere?\" [OPÇÃO A] ou [OPÇÃO B].\n\nNo dia seguinte, poste o resultado e marque quem votou."],
  ["Chamada clara", "Todo post termina com um próximo passo. Escolha um só por post.", "Comente QUERO que eu te mando [O QUE A PESSOA GANHA] no direct."]
];

const GUIDE_STYLE = `
.top{padding-top:calc(28px + env(safe-area-inset-top))}
.bonus{text-align:center;background:linear-gradient(180deg,var(--panel-2),var(--panel))}
.bonus h2{margin:10px 0 8px;font-size:1.3rem}.bonus h2 em{font-style:normal;color:var(--accent-2)}
.jump{display:flex;gap:14px;align-items:center;text-decoration:none;color:var(--ink);border:1.5px solid var(--accent);background:var(--accent-soft);border-radius:16px;padding:16px;margin-top:22px}
.jump .ico{flex:none;width:44px;height:44px;border-radius:12px;background:var(--accent);display:grid;place-items:center;font-size:1.2rem}
.jump b{display:block;color:var(--ink)}.jump span{color:var(--muted);font-size:.92rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 8px;text-align:center}
.stat b{display:block;font-size:1.5rem;color:var(--accent-2)}.stat span{color:var(--muted);font-size:.82rem;line-height:1.3;display:block}
.progress{position:sticky;top:0;z-index:2;background:var(--bg);padding:12px 0}
.bar{height:8px;border-radius:999px;background:var(--panel-2);overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .3s}
.step{display:grid;grid-template-columns:40px 1fr;gap:12px;margin-top:16px}
.num{width:40px;height:40px;border-radius:12px;background:var(--panel-2);border:1px solid var(--line);display:grid;place-items:center;font-weight:700;color:var(--accent-2)}
.step.done .num{background:var(--ok);color:#06231A;border-color:var(--ok)}
.step h3{margin:6px 0 4px;font-size:1.1rem}.step p{margin:0;color:var(--muted)}
.copy{margin-top:12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.copy header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);font-size:.78rem;font-weight:700;color:var(--muted);letter-spacing:.04em}
.copy button,.mark{font:inherit;font-size:.88rem;font-weight:700;cursor:pointer;border-radius:8px}
.copy button{background:var(--panel-2);color:var(--ink);border:1px solid var(--line);padding:4px 10px}
.copy pre{margin:0;padding:12px;white-space:pre-wrap;font-family:inherit;font-size:.95rem;color:var(--ink)}
.mark{margin-top:12px;background:transparent;color:var(--accent-2);border:1.5px solid var(--line);padding:8px 14px}
.step.done .mark{color:var(--ok);border-color:var(--ok)}
.tip{border-left:4px solid var(--accent);margin-top:28px}
@media print{body{background:#fff;color:#000}.noprint,.progress,.btn,.mark,.copy button,.jump,.bonus,footer{display:none!important}.panel,.copy{border-color:#ccc;background:#fff}.step p,.copy pre{color:#000}}
`;

export function guideHtml(client = {}) {
  const brand = clientBrand(client);
  const name = escapeHtml(brand.brandName);
  const whats = whatsappLink(client, "Olá! Baixei o guia de ideias de post da " + brand.brandName + " e quero o meu post de exemplo grátis.");
  const steps = GUIDE_IDEAS.map(([title, how, caption], i) => `
<article class="step" data-step="${i + 1}">
<div class="num">${i + 1}</div>
<div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(how)}</p>
<div class="copy"><header><span>LEGENDA PRONTA</span><button type="button" data-copy>Copiar</button></header><pre>${escapeHtml(caption)}</pre></div>
<button type="button" class="mark" data-mark>Marcar como feito</button></div>
</article>`).join("");
  return page(GIFT_TITLE + " · " + brand.brandName, `
<main class="wrap top">
${whats ? `<section class="panel bonus"><span class="pill">🎁 Bônus liberado</span>
<h2>Um <em>post de exemplo grátis</em>, feito para o seu negócio</h2>
<p class="sub" style="margin:0 0 16px">A ${name} cria um post com a cara da sua marca para você ver como fica, sem compromisso.</p>
<a class="btn btn-whats" href="${escapeHtml(whats)}" target="_blank" rel="noopener">Quero o meu exemplo</a></section>` : ""}
<div style="margin-top:28px"><span class="pill">⚡ Guia exclusivo</span>
<h1><em>10 ideias de post</em> que trazem clientes para pequenos negócios</h1>
<p class="sub">Cada ideia vem com a legenda pronta para copiar. Faça uma por dia: em 10 dias o seu perfil já parece outro.</p></div>
<a class="jump" href="#passos"><span class="ico">⚡</span><span><b>Ir direto para as ideias</b><span>As 10 ideias, uma por uma, com legenda pronta</span></span></a>
<p style="margin:14px 0 0"><a class="btn" href="${GIFT_PDF}" download="guia-10-ideias-flowarts.pdf">⬇ Baixar PDF</a></p>
<div class="stats"><div class="stat"><b>10</b><span>ideias com legenda pronta</span></div><div class="stat"><b>5 min</b><span>para montar cada post</span></div><div class="stat"><b>R$ 0</b><span>para colocar em prática</span></div></div>
<h2 id="passos" style="margin-top:34px">Do primeiro post ao décimo</h2>
<p class="sub noprint" style="margin:0">Vá marcando conforme faz. Fica salvo neste celular.</p>
<div class="progress"><b id="ptext">Seu progresso: 0 de 10</b><div class="bar"><i id="pbar"></i></div></div>
${steps}
<section class="panel tip"><b>Dica da ${name}</b><p class="sub" style="margin-top:6px">Poste no mesmo horário por uma semana e veja nos números qual ideia trouxe mais seguidores. Depois repita a que funcionou. Se quiser que isso rode sozinho, a ${name} faz os posts e você só aprova.</p></section>
</main>
<script>
(function(){var KEY="flowarts-guia-10";var done={};try{done=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){done={};}
var steps=[].slice.call(document.querySelectorAll(".step"));
function paint(){var n=0;steps.forEach(function(s){var on=!!done[s.dataset.step];if(on)n++;s.classList.toggle("done",on);s.querySelector("[data-mark]").textContent=on?"✓ Feito":"Marcar como feito";});
document.getElementById("ptext").textContent="Seu progresso: "+n+" de "+steps.length;document.getElementById("pbar").style.width=(n*100/steps.length)+"%";}
steps.forEach(function(s){s.querySelector("[data-mark]").addEventListener("click",function(){done[s.dataset.step]=!done[s.dataset.step];try{localStorage.setItem(KEY,JSON.stringify(done));}catch(e){}paint();});
s.querySelector("[data-copy]").addEventListener("click",function(e){var t=s.querySelector("pre").textContent,btn=e.currentTarget;
(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){btn.textContent="Copiado ✓";setTimeout(function(){btn.textContent="Copiar";},1500);}).catch(function(){btn.textContent="Segure o texto";});});});
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
    if (!gift) return html(page("Link vencido · Flow Arts", `<main class="wrap" style="padding-top:60px;text-align:center"><h1>Este link venceu</h1><p class="sub">Comente QUERO de novo no post para receber outro.</p></main>`), 404);
    const conn = await resolveInstagramCredentials(env, gift.c).catch(() => null);
    return html(giftPageHtml("@" + String(conn?.username || "flowarts2026").replace(/^@/, ""), code));
  }
  if (url.pathname === GIFT_GUIDE) {
    const key = await readGift(env, url.searchParams.get("k"), options.now || new Date());
    if (!key || key.g !== 1) {
      return html(page("Link vencido · Flow Arts", `<main class="wrap" style="padding-top:60px;text-align:center"><h1>Este link venceu</h1><p class="sub">Abra de novo o link do seu direct.</p></main>`), 403);
    }
    const row = await env.DB.prepare("SELECT id, name, niche, instagram, status, config_json FROM clients WHERE id=?1 LIMIT 1").bind(String(key.c)).first().catch(() => null);
    let config = {};
    try { config = JSON.parse(String(row?.config_json || "{}")) || {}; } catch { config = {}; }
    return html(guideHtml({ ...(row || { id: key.c }), config }));
  }
  return null;
}
