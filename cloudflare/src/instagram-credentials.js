import { decryptSecret, encryptSecret } from "./secrets.js";

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function coreSecretPair(env, clientId) {
  const id = String(clientId || "");
  if (id === "ragnar-one") {
    // @ragnarplay1: keep the verified professional Instagram account ID only
    // as a legacy fallback. A valid OAuth connection stored in D1 is the
    // source of truth and must not be shadowed by a stale Cloudflare secret.
    const verifiedRagnarIgUserId = "28486848374301373";
    return {
      accessToken: String(env.INSTAGRAM_ACCESS_TOKEN_RAGNAR || "").trim(),
      igUserId: verifiedRagnarIgUserId,
      source: "cloudflare-secret"
    };
  }
  if (id === "globalplay-streaming") {
    return {
      accessToken: String(env.INSTAGRAM_ACCESS_TOKEN_GLOBALPLAY || "").trim(),
      igUserId: String(env.INSTAGRAM_ACCOUNT_ID_GLOBALPLAY || "").trim(),
      source: "cloudflare-secret"
    };
  }
  return { accessToken: "", igUserId: "", source: "" };
}

async function d1OAuthPair(env, clientId) {
  const row = await env.DB.prepare(
    `SELECT provider, payload_json, connected_at, updated_at
     FROM connections
     WHERE client_id = ?1 AND provider IN ('meta','instagram')
     ORDER BY CASE provider WHEN 'meta' THEN 0 ELSE 1 END
     LIMIT 1`
  ).bind(String(clientId)).first();

  if (!row) return null;

  const payload = parseJson(row.payload_json, {});
  const accessToken = payload?.accessToken
    ? await decryptSecret(env, payload.accessToken).catch(() => "")
    : "";
  const igUserId = String(payload?.igUserId || "").trim();
  const expiresAt = payload?.expiresAt || null;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const expired = Boolean(expiresMs && Number.isFinite(expiresMs) && expiresMs <= Date.now());

  return {
    connected: Boolean(accessToken && igUserId && !expired),
    accessToken,
    igUserId,
    source: "d1-oauth",
    expiresAt,
    expired,
    username: String(payload?.username || ""),
    label: String(payload?.label || ""),
    accountType: String(payload?.accountType || ""),
    scopes: Array.isArray(payload?.scopes) ? payload.scopes : [],
    connectedAt: row.connected_at || row.updated_at || null
  };
}

export async function resolveInstagramCredentials(env, clientId) {
  // Prefer the connection most recently authorized by the client. This keeps
  // Nexus aligned with the current Meta/Instagram login and avoids a stale
  // legacy Worker secret silently overriding a valid OAuth connection.
  let oauth = null;
  try {
    oauth = await d1OAuthPair(env, clientId);
  } catch {
    // D1 quota/outage must not disable publishing when a verified Cloudflare
    // secret fallback exists for the managed account.
    oauth = null;
  }
  if (oauth?.connected) return oauth;

  const core = coreSecretPair(env, clientId);
  if (core.accessToken && core.igUserId) {
    return {
      ...core,
      connected: true,
      expiresAt: null,
      expired: false,
      username: "",
      accountType: "",
      scopes: [],
      fallbackReason: oauth ? (oauth.expired ? "oauth_expired" : "oauth_incomplete") : "oauth_missing"
    };
  }

  if (oauth) return oauth;

  return {
    connected: false,
    accessToken: "",
    igUserId: "",
    source: "none",
    expiresAt: null,
    expired: false,
    username: "",
    accountType: "",
    scopes: [],
    connectedAt: null
  };
}


export async function instagramCredentialStatus(env, clientId) {
  const credentials = await resolveInstagramCredentials(env, clientId);
  const status = {
    connected: Boolean(credentials?.connected),
    source: String(credentials?.source || "none"),
    expired: Boolean(credentials?.expired),
    expiresAt: credentials?.expiresAt || null,
    fallbackReason: String(credentials?.fallbackReason || ""),
    tokenValid: false,
    accountMatches: false,
    validation: "not_connected"
  };

  if (!credentials?.connected || !credentials?.accessToken || !credentials?.igUserId) {
    return status;
  }

  try {
    const url = new URL("https://graph.instagram.com/me");
    url.searchParams.set("fields", "id");
    url.searchParams.set("access_token", credentials.accessToken);
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });

    if (!response.ok) {
      return { ...status, validation: `http_${response.status}` };
    }

    const profile = await response.json().catch(() => ({}));
    const tokenValid = Boolean(profile?.id);
    const accountMatches = tokenValid && String(profile.id) === String(credentials.igUserId);

    return {
      ...status,
      tokenValid,
      accountMatches,
      validation: !tokenValid ? "invalid_response" : accountMatches ? "ok" : "account_mismatch"
    };
  } catch {
    return { ...status, validation: "transport_error" };
  }
}


// Renova o token de login do Instagram (válido por ~60 dias) quando faltam
// menos de 10 dias para vencer. Uma única chamada externa, só quando necessário.
export async function refreshInstagramTokenIfNeeded(env, clientId, now = new Date(), request = fetch) {
  const row = await env.DB.prepare(
    `SELECT provider, payload_json FROM connections
     WHERE client_id = ?1 AND provider IN ('meta','instagram')
     ORDER BY CASE provider WHEN 'meta' THEN 0 ELSE 1 END LIMIT 1`
  ).bind(String(clientId)).first();
  if (!row) return { refreshed: false, reason: "no_connection" };
  const payload = parseJson(row.payload_json, {});
  const expiresMs = payload?.expiresAt ? new Date(payload.expiresAt).getTime() : 0;
  if (!payload?.accessToken || !Number.isFinite(expiresMs) || !expiresMs) {
    return { refreshed: false, reason: "no_expiry" };
  }
  const left = expiresMs - now.getTime();
  if (left <= 0) return { refreshed: false, reason: "already_expired" };
  if (left > 10 * 24 * 3600 * 1000) return { refreshed: false, reason: "not_due" };
  const token = await decryptSecret(env, payload.accessToken).catch(() => "");
  if (!token) return { refreshed: false, reason: "decrypt_failed" };
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  try {
    const response = await request(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
      return { refreshed: false, reason: "http_" + response.status };
    }
    const next = {
      ...payload,
      accessToken: await encryptSecret(env, String(data.access_token)),
      expiresAt: new Date(now.getTime() + Math.max(3600, Number(data.expires_in || 0)) * 1000).toISOString(),
      refreshedAt: now.toISOString()
    };
    await env.DB.prepare(
      "UPDATE connections SET payload_json = ?3, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?1 AND provider = ?2"
    ).bind(String(clientId), String(row.provider), JSON.stringify(next)).run();
    return { refreshed: true, reason: "ok", expiresAt: next.expiresAt };
  } catch {
    return { refreshed: false, reason: "transport_error" };
  }
}
