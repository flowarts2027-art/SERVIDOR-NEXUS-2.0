// Aviso no celular do Rodrigo (pedido de 17/10/2026): notificação do painel Master (Web Push).
// O aviso vai sem conteúdo (só um "toque"); o celular abre e busca o resumo no painel com o login dele.
// A chave do aviso (VAPID) é criada pelo próprio servidor na primeira vez e fica no D1.

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = text => Uint8Array.from(atob(String(text).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(text).length + 3) % 4)), c => c.charCodeAt(0));
const enc = new TextEncoder();

export async function ensurePushSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    keys_json TEXT NOT NULL DEFAULT '{}',
    label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ok_at TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_keys (id TEXT PRIMARY KEY, jwk_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
}

async function vapid(env) {
  await ensurePushSchema(env);
  const row = await env.DB.prepare("SELECT jwk_json FROM push_keys WHERE id='vapid'").first();
  let jwk = null;
  try { jwk = row ? JSON.parse(row.jwk_json) : null; } catch { jwk = null; }
  if (!jwk?.d) {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    await env.DB.prepare("INSERT OR IGNORE INTO push_keys(id,jwk_json) VALUES('vapid',?1)").bind(JSON.stringify(jwk)).run();
    // Se dois pedidos criaram ao mesmo tempo, fica a primeira chave gravada.
    const saved = await env.DB.prepare("SELECT jwk_json FROM push_keys WHERE id='vapid'").first();
    jwk = JSON.parse(saved.jwk_json);
  }
  const publicRaw = new Uint8Array([4, ...fromB64url(jwk.x), ...fromB64url(jwk.y)]);
  const privateKey = await crypto.subtle.importKey("jwk", { ...jwk, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { publicKey: b64url(publicRaw), privateKey };
}

export async function pushPublicKey(env) {
  return (await vapid(env)).publicKey;
}

async function vapidHeader(endpoint, keys, now) {
  const aud = new URL(endpoint).origin;
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(now.getTime() / 1000) + 12 * 3600, sub: "https://flowarts.com.br" })));
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, enc.encode(header + "." + claims));
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${keys.publicKey}`;
}

const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//i;

export async function saveSubscription(env, body = {}) {
  await ensurePushSchema(env);
  const endpoint = String(body?.endpoint || "");
  if (!PUSH_HOSTS.test(endpoint) || endpoint.length > 1000) throw new Error("subscription_invalid");
  const keys = body?.keys && typeof body.keys === "object" ? { p256dh: String(body.keys.p256dh || "").slice(0, 200), auth: String(body.keys.auth || "").slice(0, 100) } : {};
  await env.DB.prepare(
    "INSERT INTO push_subscriptions(endpoint,keys_json,label) VALUES(?1,?2,?3) ON CONFLICT(endpoint) DO UPDATE SET keys_json=excluded.keys_json,label=excluded.label"
  ).bind(endpoint, JSON.stringify(keys), String(body?.label || "").slice(0, 80)).run();
  return { ok: true };
}

export async function removeSubscription(env, endpoint) {
  await ensurePushSchema(env);
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?1").bind(String(endpoint || "")).run();
  return { ok: true };
}

// Manda o "toque" para todos os celulares cadastrados. Celular que saiu (404/410) é tirado da lista.
export async function sendPushToAll(env, now = new Date(), fetcher = fetch) {
  await ensurePushSchema(env);
  const subs = (await env.DB.prepare("SELECT endpoint FROM push_subscriptions LIMIT 20").all())?.results || [];
  if (!subs.length) return { ok: true, sent: 0, devices: 0 };
  const keys = await vapid(env);
  let sent = 0;
  for (const { endpoint } of subs) {
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { authorization: await vapidHeader(endpoint, keys, now), ttl: "43200", urgency: "high", "content-length": "0" },
        signal: AbortSignal.timeout(10000)
      });
      if (response.status === 404 || response.status === 410) {
        await removeSubscription(env, endpoint);
      } else if (response.ok) {
        sent += 1;
        await env.DB.prepare("UPDATE push_subscriptions SET last_ok_at=?2 WHERE endpoint=?1").bind(endpoint, now.toISOString()).run();
      }
    } catch { /* tenta de novo no próximo aviso */ }
  }
  return { ok: true, sent, devices: subs.length };
}

// Master: /api/master/push/key (GET), /subscribe, /unsubscribe, /test (POST).
export async function handlePushRoute(request, env, url) {
  if (!url.pathname.startsWith("/api/master/push/")) return null;
  const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  try {
    if (url.pathname === "/api/master/push/key" && request.method === "GET") {
      await ensurePushSchema(env);
      const devices = Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").first())?.n || 0);
      return send({ ok: true, publicKey: await pushPublicKey(env), devices });
    }
    if (request.method !== "POST") return null;
    const body = await request.json().catch(() => ({}));
    if (url.pathname === "/api/master/push/subscribe") return send(await saveSubscription(env, body));
    if (url.pathname === "/api/master/push/unsubscribe") return send(await removeSubscription(env, body.endpoint));
    if (url.pathname === "/api/master/push/test") return send(await sendPushToAll(env));
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: code === "subscription_invalid" ? "Este navegador não aceitou o aviso." : "Não deu certo. Tente de novo." }, 400);
  }
  return null;
}
