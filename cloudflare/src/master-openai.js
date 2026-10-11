import { getState, putState } from "./storage.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function bytesToB64(bytes) {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out);
}
function b64ToBytes(value) {
  const raw = atob(String(value || ""));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}
async function cryptoKey(env) {
  const secret = String(env.NEXUS_SECRET_KEY || "").trim();
  if (!secret) throw new Error("nexus_secret_not_configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt","decrypt"]);
}
async function encryptSecret(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey(env);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(String(value || ""))
  );
  return { v: 1, iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(cipher)) };
}
async function decryptSecret(env, payload) {
  if (!payload || typeof payload !== "object" || payload.v !== 1) return "";
  try {
    const key = await cryptoKey(env);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(payload.iv) },
      key,
      b64ToBytes(payload.data)
    );
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

async function record(env) {
  return (await getState(env, "master-integrations", "openai", ""))?.value || {};
}
async function projectKey(env, current = null) {
  const fromEnv = String(env.OPENAI_API_KEY_SHARED || "").trim();
  if (fromEnv) return fromEnv;
  const row = current || await record(env);
  return decryptSecret(env, row.apiKey);
}
async function adminKey(env, current = null) {
  const fromEnv = String(env.OPENAI_ADMIN_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const row = current || await record(env);
  return decryptSecret(env, row.adminKey);
}

async function validateProjectKey(key) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { authorization: "Bearer " + key, "user-agent": "Servidor-Nexus/1.0" }
  });
  if (!response.ok) throw new Error("openai_auth_failed_" + response.status);
}
async function validateAdminKey(key) {
  const start = Math.floor(Date.now() / 1000) - 86400;
  const response = await fetch(
    "https://api.openai.com/v1/organization/costs?start_time=" + start + "&bucket_width=1d&limit=1",
    { headers: { authorization: "Bearer " + key, "user-agent": "Servidor-Nexus/1.0" } }
  );
  if (!response.ok) throw new Error("openai_admin_auth_failed_" + response.status);
}
async function fetchCosts(key, startTime, endTime) {
  if (!key) return null;
  let total = 0;
  let page = "";
  let loops = 0;
  do {
    const query = new URLSearchParams({
      start_time: String(Math.max(0, Math.floor(startTime))),
      bucket_width: "1d",
      limit: "180"
    });
    if (endTime) query.set("end_time", String(Math.floor(endTime)));
    if (page) query.set("page", page);
    const response = await fetch("https://api.openai.com/v1/organization/costs?" + query.toString(), {
      headers: { authorization: "Bearer " + key, "user-agent": "Servidor-Nexus/1.0" }
    });
    if (!response.ok) throw new Error("openai_costs_failed_" + response.status);
    const data = await response.json();
    for (const bucket of data.data || []) {
      for (const item of bucket.results || []) {
        const amount = item.amount || {};
        if (String(amount.currency || "").toLowerCase() === "usd") total += Number(amount.value || 0);
      }
    }
    page = data.has_more ? String(data.next_page || "") : "";
    loops += 1;
  } while (page && loops < 12);
  return Number(total.toFixed(6));
}

// Saldo pré-pago: a OpenAI não tem rota oficial (resposta do suporte em 09/2026).
// Tentamos a rota não oficial de créditos; se ela recusar, fica a estimativa.
export async function fetchCreditBalance(keys = [], request = fetch) {
  for (const key of keys.filter(Boolean)) {
    try {
      const response = await request("https://api.openai.com/v1/dashboard/billing/credit_grants", {
        headers: { authorization: "Bearer " + key, "user-agent": "Servidor-Nexus/1.0" },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) continue;
      const data = await response.json().catch(() => ({}));
      const value = Number(data?.total_available);
      if (Number.isFinite(value) && value >= 0) return Number(value.toFixed(6));
    } catch {
      // tenta a próxima chave
    }
  }
  return null;
}

async function summary(env) {
  const current = await record(env);
  const pKey = await projectKey(env, current);
  const aKey = await adminKey(env, current);
  const now = Math.floor(Date.now() / 1000);
  const d = new Date();
  const monthStart = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
  const baselineAt = Number(current.balanceBaselineAt || 0);
  const baselineUsd = Number(current.balanceBaselineUsd);
  const monthlyBudgetUsd = Number(current.monthlyBudgetUsd);
  let monthCostUsd = null;
  let baselineCostUsd = null;
  let error = "";

  if (aKey) {
    try {
      monthCostUsd = await fetchCosts(aKey, monthStart, now);
      if (baselineAt > 0 && Number.isFinite(baselineUsd)) {
        baselineCostUsd = await fetchCosts(aKey, baselineAt, now);
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
  }

  const budgetConfigured = Number.isFinite(monthlyBudgetUsd) && monthlyBudgetUsd > 0;
  const exactBalanceUsd = await fetchCreditBalance([aKey, pKey]).catch(() => null);
  const estimatedFromBaseline =
    Number.isFinite(baselineUsd) && baselineAt > 0 && Number.isFinite(baselineCostUsd)
      ? Math.max(0, Number((baselineUsd - baselineCostUsd).toFixed(6)))
      : null;
  const balanceEstimatedUsd = exactBalanceUsd != null ? exactBalanceUsd : estimatedFromBaseline;
  const budgetRemainingUsd =
    budgetConfigured && Number.isFinite(monthCostUsd)
      ? Math.max(0, Number((monthlyBudgetUsd - monthCostUsd).toFixed(6)))
      : null;
  const budgetPercent =
    budgetConfigured && Number.isFinite(monthCostUsd)
      ? Math.min(100, Math.max(0, Math.round((monthCostUsd / monthlyBudgetUsd) * 100)))
      : null;

  return {
    apiConnected: Boolean(pKey),
    billingConnected: Boolean(aKey),
    connected: Boolean(pKey || aKey),
    monthCostUsd,
    balanceEstimatedUsd,
    balanceBaselineUsd: Number.isFinite(baselineUsd) ? baselineUsd : null,
    balanceBaselineAt: baselineAt || null,
    monthlyBudgetUsd: budgetConfigured ? monthlyBudgetUsd : null,
    budgetRemainingUsd,
    budgetPercent,
    exactPrepaidBalanceAvailable: exactBalanceUsd != null,
    balanceSource: exactBalanceUsd != null ? "openai" : (estimatedFromBaseline != null ? "estimate" : "none"),
    ragnarExcluded: true,
    projectKeySource: String(env.OPENAI_API_KEY_SHARED || "").trim() ? "cloudflare-secret" : "master-panel",
    adminKeySource: String(env.OPENAI_ADMIN_KEY || "").trim() ? "cloudflare-secret" : (aKey ? "master-panel" : "none"),
    error
  };
}

// Custo da IA por cliente: custo real da OpenAI no período (precisa da chave admin)
// dividido pelos posts com imagem que cada cliente gerou. Não inventa preço: sem a
// chave admin, mostra só as contagens.
export function splitCostByPosts(totalCostUsd, rows = [], postsPerMonth = 12) {
  const totalPosts = rows.reduce((sum, row) => sum + Math.max(0, Number(row.posts || 0)), 0);
  const known = Number.isFinite(totalCostUsd) && totalCostUsd != null;
  const costPerPostUsd = known && totalPosts > 0 ? Number((totalCostUsd / totalPosts).toFixed(4)) : null;
  return {
    totalCostUsd: known ? Number(Number(totalCostUsd).toFixed(4)) : null,
    totalPosts,
    costPerPostUsd,
    monthlyPerClientUsd: costPerPostUsd != null ? Number((costPerPostUsd * postsPerMonth).toFixed(2)) : null,
    clients: rows.map(row => ({
      ...row,
      estimatedUsd: costPerPostUsd != null ? Number((costPerPostUsd * Number(row.posts || 0)).toFixed(4)) : null
    }))
  };
}

export async function costReport(env, { days = 7, now = Date.now() } = {}) {
  const span = Math.max(1, Math.min(31, Number(days) || 7));
  const startSec = Math.floor(now / 1000) - span * 86400;
  const sinceSql = new Date(startSec * 1000).toISOString().replace("T", " ").slice(0, 19);
  const sinceDay = new Date(startSec * 1000 - 3 * 3600000).toISOString().slice(0, 10);
  const [posts, tokens] = await Promise.all([
    env.DB.prepare(
      `SELECT client_id, COUNT(*) AS posts FROM post_ledger
       WHERE created_at >= ?1
         AND (json_extract(payload_json,'$.mediaGeneration.status') = 'generated'
              OR COALESCE(json_extract(payload_json,'$.imageUrl'),'') <> '')
       GROUP BY client_id`
    ).bind(sinceSql).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      "SELECT client_id, SUM(used_tokens) AS tokens, SUM(calls) AS calls FROM token_usage WHERE day_key >= ?1 GROUP BY client_id"
    ).bind(sinceDay).all().catch(() => ({ results: [] }))
  ]);
  const byClient = new Map();
  for (const row of posts?.results || []) byClient.set(row.client_id, { clientId: row.client_id, posts: Number(row.posts || 0), tokens: 0, calls: 0 });
  for (const row of tokens?.results || []) {
    const item = byClient.get(row.client_id) || { clientId: row.client_id, posts: 0, tokens: 0, calls: 0 };
    item.tokens = Number(row.tokens || 0);
    item.calls = Number(row.calls || 0);
    byClient.set(row.client_id, item);
  }
  let totalCostUsd = null;
  let error = "";
  try {
    const key = await adminKey(env, await record(env));
    if (key) totalCostUsd = await fetchCosts(key, startSec, Math.floor(now / 1000));
    else error = "admin_key_missing";
  } catch (caught) {
    error = String(caught?.message || caught).slice(0, 120);
  }
  return { days: span, ...splitCostByPosts(totalCostUsd, [...byClient.values()].sort((a, b) => b.posts - a.posts)), error };
}

export async function handleMasterOpenAI(request, env, url) {
  if (url.pathname === "/api/master/openai/cost-report" && request.method === "GET") {
    return json({ ok: true, ...(await costReport(env, { days: url.searchParams.get("days") || 7 })) });
  }
  if (url.pathname !== "/api/master/openai") return null;

  if (request.method === "GET") {
    return json(await summary(env));
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    const suppliedApiKey = String(body.apiKey || "").trim();
    const suppliedAdminKey = String(body.adminKey || "").trim();
    const current = await record(env);

    if (suppliedApiKey) await validateProjectKey(suppliedApiKey);
    if (suppliedAdminKey) await validateAdminKey(suppliedAdminKey);

    const next = { ...current };
    if (suppliedApiKey) next.apiKey = await encryptSecret(env, suppliedApiKey);
    if (suppliedAdminKey) next.adminKey = await encryptSecret(env, suppliedAdminKey);

    if (Object.prototype.hasOwnProperty.call(body, "currentBalanceUsd") && String(body.currentBalanceUsd).trim() !== "") {
      const value = Number(body.currentBalanceUsd);
      if (!Number.isFinite(value) || value < 0 || value > 1000000) return json({ error: "invalid_balance" }, 400);
      next.balanceBaselineUsd = value;
      next.balanceBaselineAt = Math.floor(Date.now() / 1000);
    }
    if (Object.prototype.hasOwnProperty.call(body, "monthlyBudgetUsd") && String(body.monthlyBudgetUsd).trim() !== "") {
      const value = Number(body.monthlyBudgetUsd);
      if (!Number.isFinite(value) || value <= 0 || value > 1000000) return json({ error: "invalid_monthly_budget" }, 400);
      next.monthlyBudgetUsd = value;
    }

    next.updatedAt = new Date().toISOString();
    await putState(env, "master-integrations", "openai", "", next);
    return json(await summary(env));
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : String(caught);
    const status = /_401$|_403$/.test(code) ? 401 : /auth_failed/.test(code) ? 400 : 502;
    return json({ error: code || "openai_connection_failed" }, status);
  }
}
