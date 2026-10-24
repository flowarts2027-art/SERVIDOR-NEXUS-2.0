// Mudar ou adicionar plano pelo próprio painel do cliente (24/10/2026, pedido do Rodrigo).
// O cliente escolhe, paga no Pix (chave CNPJ, "copia e cola" com o valor) e toca em "Já paguei".
// O pedido cai no Master; o Rodrigo confere o Pix no banco e aprova. Só aí o plano muda.
// Tipos: base (troca o plano), adicional (soma ao plano: Captador, Tráfego) e único (serviço avulso).

import { PLANS, findPlan, brl, priceLine, pixPayload, planRecord, PIX_KEY_LABEL } from "./plans.js";
import { getClient, upsertClient } from "./clients.js";
import { setCaptadorAccess, captadorAudience } from "./captador.js";
import { setAdsAccess } from "./ads.js";

export const BASE_PLANS = ["essencial", "completo", "completo-trafego"];
export const ADDON_PLANS = ["captador", "trafego"];
export const planGroup = id => BASE_PLANS.includes(id) ? "base" : ADDON_PLANS.includes(id) ? "adicional" : "unico";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function ensureUpgradeSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS plan_upgrades (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_claimed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TEXT
    )`).run();
}

// O que o cliente já tem: plano base, adicionais e o que fica escondido para ele.
export function ownedPlans(client = {}) {
  const config = client?.config || {};
  const owned = new Set();
  if (config.plan?.id) owned.add(String(config.plan.id));
  for (const a of Array.isArray(config.addons) ? config.addons : []) if (a?.id) owned.add(String(a.id));
  if (owned.has("completo-trafego")) { owned.add("trafego"); owned.add("captador"); }
  if (owned.has("completo")) owned.add("captador");
  return owned;
}

export function catalogFor(client, audience = "empresas") {
  const owned = ownedPlans(client);
  const current = String(client?.config?.plan?.id || "");
  return PLANS
    .filter(p => !(audience === "pessoas" && p.id === "captador"))
    .map(p => {
      const group = planGroup(p.id);
      const amount = Number(p.setup || 0) + Number(p.price || 0);
      // Quem já tem o Completo vê o combo como "só a diferença no mês".
      const upgradeNote = current === "completo" && p.id === "completo-trafego"
        ? "Você paga " + brl(p.price - (findPlan("completo")?.price || 0)) + " a mais por mês e ganha o Tráfego (separado sairia " + brl(findPlan("trafego")?.price || 0) + ")." : "";
      return {
        id: p.id, name: p.name, kind: p.kind, group, summary: p.summary, includes: [...p.includes],
        priceLine: priceLine(p), amount, amountLabel: brl(amount),
        owned: owned.has(p.id), current: p.id === current, upgradeNote,
        highlight: p.id === "completo-trafego", pix: pixFor(p.id)
      };
    });
}

async function pendingFor(env, clientId) {
  await ensureUpgradeSchema(env);
  return ((await env.DB.prepare("SELECT * FROM plan_upgrades WHERE client_id=?1 AND status='pending' ORDER BY created_at DESC").bind(clientId).all())?.results || [])
    .map(r => ({ id: r.id, planId: r.plan_id, name: findPlan(r.plan_id)?.name || r.plan_id, amountLabel: brl(r.amount_cents), createdAt: r.created_at }));
}

export async function portalPlansView(env, client) {
  const audience = await captadorAudience(env, client).catch(() => "empresas");
  return { ok: true, pixKey: PIX_KEY_LABEL, plans: catalogFor(client, audience), pending: await pendingFor(env, client.id) };
}

export async function requestUpgrade(env, client, body = {}) {
  const plan = findPlan(body.planId);
  if (!plan) return { ok: false, status: 400, error: "plan_invalid", message: "Escolha um plano da lista." };
  if (ownedPlans(client).has(plan.id) && planGroup(plan.id) !== "unico") return { ok: false, status: 409, error: "plan_owned", message: "Você já tem este plano." };
  await ensureUpgradeSchema(env);
  const dup = await env.DB.prepare("SELECT id FROM plan_upgrades WHERE client_id=?1 AND plan_id=?2 AND status='pending' LIMIT 1").bind(client.id, plan.id).first();
  if (dup) return { ok: true, id: dup.id, already: true };
  const id = "up-" + crypto.randomUUID();
  const amount = Number(plan.setup || 0) + Number(plan.price || 0);
  await env.DB.prepare("INSERT INTO plan_upgrades(id,client_id,plan_id,amount_cents,paid_claimed) VALUES(?1,?2,?3,?4,?5)")
    .bind(id, client.id, plan.id, amount, body.paidClaimed === true ? 1 : 0).run();
  return { ok: true, id };
}

export async function listUpgrades(env) {
  await ensureUpgradeSchema(env);
  const rows = (await env.DB.prepare("SELECT * FROM plan_upgrades WHERE status='pending' ORDER BY created_at ASC LIMIT 100").all())?.results || [];
  const out = [];
  for (const r of rows) {
    const client = await getClient(env, r.client_id).catch(() => null);
    out.push({
      id: r.id, clientId: r.client_id, clientName: client?.name || r.client_id,
      currentPlan: client?.config?.plan?.name || "sem plano", planName: findPlan(r.plan_id)?.name || r.plan_id,
      group: planGroup(r.plan_id), amountLabel: brl(r.amount_cents), paidClaimed: Number(r.paid_claimed) === 1, createdAt: r.created_at
    });
  }
  return out;
}

export async function decideUpgrade(env, id, approve) {
  await ensureUpgradeSchema(env);
  const row = await env.DB.prepare("SELECT * FROM plan_upgrades WHERE id=?1").bind(String(id)).first();
  if (!row) return { ok: false, status: 404, message: "Pedido não encontrado." };
  if (row.status !== "pending") return { ok: false, status: 409, message: "Este pedido já foi decidido." };
  if (approve) {
    const plan = findPlan(row.plan_id);
    const client = await getClient(env, row.client_id);
    if (!plan || !client) return { ok: false, status: 404, message: "Cliente ou plano não encontrado." };
    const config = { ...(client.config || {}) };
    const record = planRecord(plan, { paid: Number(row.amount_cents || 0) });
    const group = planGroup(plan.id);
    if (group === "base") {
      if (config.plan?.id) config.planHistory = [...(Array.isArray(config.planHistory) ? config.planHistory : []), { ...config.plan, endedAt: new Date().toISOString() }].slice(-10);
      config.plan = record;
    } else if (group === "adicional") {
      config.addons = [...(Array.isArray(config.addons) ? config.addons : []).filter(a => a?.id !== plan.id), record];
      if (plan.id === "captador") await setCaptadorAccess(env, client.id, true);
      if (plan.id === "trafego") await setAdsAccess(env, client.id, true);
    } else {
      config.purchases = [...(Array.isArray(config.purchases) ? config.purchases : []), { id: plan.id, name: plan.name, paid: Number(row.amount_cents || 0), at: new Date().toISOString() }].slice(-50);
    }
    await upsertClient(env, { ...client, config });
  }
  await env.DB.prepare("UPDATE plan_upgrades SET status=?2, decided_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id, approve ? "approved" : "rejected").run();
  return { ok: true };
}

export async function handleUpgradesPortal(request, env, url, client) {
  if (url.pathname === "/api/portal/plans" && request.method === "GET") return json(await portalPlansView(env, client));
  if (url.pathname === "/api/portal/plans/request" && request.method === "POST") {
    const result = await requestUpgrade(env, client, await request.json().catch(() => ({})));
    return json(result, result.ok ? 200 : result.status || 400);
  }
  return null;
}

export async function handleUpgradesMaster(request, env, url) {
  if (url.pathname === "/api/master/upgrades" && request.method === "GET") return json({ ok: true, upgrades: await listUpgrades(env) });
  const m = url.pathname.match(/^\/api\/master\/upgrades\/([^/]+)\/(approve|reject)$/);
  if (m && request.method === "POST") {
    const result = await decideUpgrade(env, decodeURIComponent(m[1]), m[2] === "approve");
    return json(result, result.ok ? 200 : result.status || 400);
  }
  return null;
}

// Pix "copia e cola" de cada plano para o painel (o valor já vai preenchido).
export function pixFor(planId) {
  const plan = findPlan(planId);
  if (!plan) return "";
  return pixPayload({ amount: Number(plan.setup || 0) + Number(plan.price || 0), txid: "UP" + plan.id.replace(/[^a-z0-9]/g, "") });
}
