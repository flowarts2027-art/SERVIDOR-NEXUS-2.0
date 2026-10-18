// Cadastro público de cliente (link /cadastro).
// O cliente preenche os mesmos dados do "Novo cliente" do Master e escolhe usuário e senha.
// O pedido fica "pendente" e só vira cliente + login quando o Rodrigo aprova no Master.
// A senha é guardada só protegida (hash), nunca em texto.

import {
  createPortalPasswordRecord,
  insertPortalUserRecord,
  portalUsernameTaken,
  loginRateLimitStatus,
  recordLoginFailure
} from "./auth.js";
import { getClient, upsertClient } from "./clients.js";
import { THEME_COLORS, newManagedClientConfig, slugify } from "./client-create.js";

export const SIGNUP_RATE_SCOPE = "signup";
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

// Tabela criada na primeira chamada (o deploy não roda migrações). Uma vez por banco.
const signupSchemaReady = new WeakSet();
async function ensureSignupSchema(env) {
  if (!env?.DB) throw new Error("d1_not_configured");
  if (signupSchemaReady.has(env.DB)) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS signup_requests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      niche TEXT,
      instagram TEXT,
      whatsapp TEXT,
      theme TEXT,
      username TEXT NOT NULL COLLATE NOCASE,
      password_algo TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      client_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TEXT
    )`
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests(status, created_at)"
  ).run();
  signupSchemaReady.add(env.DB);
}

function clean(value, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizeSignupUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeInstagramHandle(value) {
  const raw = String(value || "").trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(raw) ? "@" + raw.toLowerCase() : "";
}

export function normalizeWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
  return ("55" + digits).slice(0, 13);
}

// Confere o formulário. Devolve { ok, data } ou { ok:false, error, message }.
export function validateSignup(body = {}) {
  const fail = (error, message) => ({ ok: false, error, message });
  const name = clean(body.name, 80);
  const niche = clean(body.niche, 80);
  const instagram = normalizeInstagramHandle(body.instagram);
  const whatsapp = normalizeWhatsapp(body.whatsapp);
  const theme = Object.hasOwn(THEME_COLORS, String(body.theme || "")) ? String(body.theme) : "green-black";
  const username = normalizeSignupUsername(body.username);
  const password = String(body.password || "");
  const confirm = body.passwordConfirm === undefined ? password : String(body.passwordConfirm);

  if (name.length < 2) return fail("name_required", "Escreva o nome da empresa.");
  if (niche.length < 2) return fail("niche_required", "Escreva o nicho (ex.: pet shop, salão).");
  if (!instagram) return fail("instagram_invalid", "Escreva o @ do Instagram. Ex.: @minhaloja");
  if (!whatsapp) return fail("whatsapp_invalid", "Escreva o WhatsApp com DDD. Ex.: 22 99999-8888");
  if (!USERNAME_PATTERN.test(username)) {
    return fail("username_invalid", "Usuário: de 3 a 30 letras ou números, sem espaço e sem acento. Pode usar ponto.");
  }
  if (password.length < 8) return fail("password_too_short", "A senha precisa ter pelo menos 8 caracteres.");
  if (password.length > 128) return fail("password_too_long", "A senha está muito longa.");
  if (password !== confirm) return fail("password_mismatch", "As duas senhas estão diferentes.");
  return { ok: true, data: { name, niche, instagram, whatsapp, theme, username, password } };
}

async function usernameUnavailable(env, username) {
  if (await portalUsernameTaken(env, username)) return true;
  const pending = await env.DB.prepare(
    "SELECT id FROM signup_requests WHERE username = ?1 COLLATE NOCASE AND status = 'pending' LIMIT 1"
  ).bind(username).first();
  return Boolean(pending);
}

export async function createSignupRequest(env, body) {
  await ensureSignupSchema(env);
  const checked = validateSignup(body);
  if (!checked.ok) return checked;
  const data = checked.data;
  if (await usernameUnavailable(env, data.username)) {
    return { ok: false, error: "username_taken", message: "Este usuário já existe. Escolha outro." };
  }
  const record = await createPortalPasswordRecord(env, data.password);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO signup_requests(id, name, niche, instagram, whatsapp, theme, username,
       password_algo, password_salt, password_hash, status, created_at)
     VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending', CURRENT_TIMESTAMP)`
  ).bind(id, data.name, data.niche, data.instagram, data.whatsapp, data.theme, data.username,
    record.algorithm, record.salt, record.hash).run();
  return { ok: true, id };
}

function signupView(row) {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    niche: String(row.niche || ""),
    instagram: String(row.instagram || ""),
    whatsapp: String(row.whatsapp || ""),
    theme: String(row.theme || "green-black"),
    username: String(row.username || ""),
    status: String(row.status || "pending"),
    clientId: row.client_id ? String(row.client_id) : null,
    createdAt: row.created_at || null,
    decidedAt: row.decided_at || null
  };
}

export async function listSignupRequests(env, status = "pending") {
  await ensureSignupSchema(env);
  const result = await env.DB.prepare(
    `SELECT id, name, niche, instagram, whatsapp, theme, username, status, client_id, created_at, decided_at
     FROM signup_requests WHERE status = ?1 ORDER BY created_at DESC LIMIT 50`
  ).bind(status).all();
  return (result?.results || []).map(signupView);
}

async function freeClientId(env, name) {
  const base = slugify(name) || "cliente";
  for (let n = 1; n <= 50; n++) {
    const id = n === 1 ? base : base + "-" + n;
    if (!await getClient(env, id)) return id;
  }
  return base + "-" + crypto.randomUUID().slice(0, 8);
}

export async function approveSignupRequest(env, id) {
  await ensureSignupSchema(env);
  const row = await env.DB.prepare(
    "SELECT * FROM signup_requests WHERE id = ?1 LIMIT 1"
  ).bind(String(id)).first();
  if (!row) return { ok: false, status: 404, error: "signup_not_found", message: "Cadastro não encontrado." };
  if (row.status !== "pending") {
    return { ok: false, status: 409, error: "signup_already_decided", message: "Este cadastro já foi decidido." };
  }
  if (await portalUsernameTaken(env, row.username)) {
    return { ok: false, status: 409, error: "username_taken", message: "O usuário escolhido já está em uso. Recuse e peça um novo cadastro." };
  }

  const clientId = await freeClientId(env, row.name);
  const [primaryColor, secondaryColor] = THEME_COLORS[row.theme] || THEME_COLORS["green-black"];
  const config = newManagedClientConfig(clientId, { theme: row.theme, primaryColor, secondaryColor }, {
    contact: { instagramHandle: String(row.instagram || ""), whatsapp: String(row.whatsapp || "") },
    signup: { requestId: String(row.id), source: "cadastro-publico" }
  });
  const client = await upsertClient(env, {
    id: clientId,
    name: String(row.name),
    niche: String(row.niche || "Outro"),
    instagram: "",
    status: "setup",
    config
  });
  await insertPortalUserRecord(env, clientId, String(row.username), {
    algorithm: row.password_algo, salt: row.password_salt, hash: row.password_hash
  });
  // A senha protegida já foi para o login do cliente; não fica guardada no pedido.
  await env.DB.prepare(
    `UPDATE signup_requests SET status = 'approved', client_id = ?2, decided_at = CURRENT_TIMESTAMP,
       password_salt = '', password_hash = '' WHERE id = ?1`
  ).bind(String(row.id), clientId).run();
  return { ok: true, clientId, username: String(row.username), client };
}

export async function rejectSignupRequest(env, id) {
  await ensureSignupSchema(env);
  const result = await env.DB.prepare(
    `UPDATE signup_requests SET status = 'rejected', decided_at = CURRENT_TIMESTAMP,
       password_salt = '', password_hash = '' WHERE id = ?1 AND status = 'pending'`
  ).bind(String(id)).run();
  const changed = Number(result?.meta?.changes || 0);
  return changed
    ? { ok: true }
    : { ok: false, status: 404, error: "signup_not_pending", message: "Cadastro não encontrado ou já decidido." };
}

// Rota pública: POST /api/signup
export async function handlePublicSignup(request, env, url) {
  if (url.pathname !== "/api/signup") return null;
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const body = await request.json().catch(() => ({}));
  // Campo escondido: robôs preenchem, pessoas não.
  if (String(body?.website || "").trim()) return json({ ok: true });

  const rate = await loginRateLimitStatus(env, request, SIGNUP_RATE_SCOPE);
  if (!rate.allowed) {
    return json({
      ok: false, error: "too_many_signups",
      message: "Muitas tentativas. Espere alguns minutos e tente de novo."
    }, 429, { "retry-after": String(rate.retryAfter) });
  }
  await recordLoginFailure(env, request, SIGNUP_RATE_SCOPE);

  const result = await createSignupRequest(env, body);
  if (!result.ok) return json(result, result.error === "username_taken" ? 409 : 400);
  return json({ ok: true, message: "Cadastro enviado. Você recebe a liberação pelo WhatsApp." }, 201);
}

// Rotas do Master (já protegidas pelo login do Master em handleMaster).
export async function handleMasterSignups(request, env, url) {
  if (url.pathname === "/api/master/signups" && request.method === "GET") {
    const status = ["pending", "approved", "rejected"].includes(url.searchParams.get("status"))
      ? url.searchParams.get("status") : "pending";
    return json({ ok: true, signups: await listSignupRequests(env, status) });
  }
  const match = url.pathname.match(/^\/api\/master\/signups\/([^/]+)\/(approve|reject)$/);
  if (match && request.method === "POST") {
    const id = decodeURIComponent(match[1]);
    const result = match[2] === "approve"
      ? await approveSignupRequest(env, id)
      : await rejectSignupRequest(env, id);
    if (!result.ok) return json(result, result.status || 400);
    const { client, ...rest } = result;
    return json(rest);
  }
  return null;
}
