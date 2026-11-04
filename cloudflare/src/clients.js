function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function rowToClient(row) {
  if (!row) return null;
  const storedConfig = parseJson(row.config_json, {});
  const storedAgentProfile = storedConfig.agentProfile && typeof storedConfig.agentProfile === "object"
    ? storedConfig.agentProfile
    : {};
  const configuredAgentName = String(
    storedAgentProfile.agentName || storedConfig.agentName || "NEXUS"
  ).trim() || "NEXUS";
  const config = {
    ...storedConfig,
    agentEngine: "NEXUS",
    agentName: configuredAgentName,
    agentProfile: {
      ...storedAgentProfile,
      agentName: configuredAgentName
    }
  };
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    niche: row.niche ? String(row.niche) : "",
    instagram: row.instagram ? String(row.instagram) : "",
    status: String(row.status || "online"),
    config,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function listClients(env) {
  const result = await env.DB.prepare(
    `SELECT id, name, niche, instagram, status, config_json, created_at, updated_at
     FROM clients
     ORDER BY name COLLATE NOCASE ASC`
  ).all();
  return (result?.results || []).map(rowToClient);
}

export async function getClient(env, clientId) {
  const row = await env.DB.prepare(
    `SELECT id, name, niche, instagram, status, config_json, created_at, updated_at
     FROM clients WHERE id = ?1 LIMIT 1`
  ).bind(String(clientId)).first();
  return rowToClient(row);
}

export async function upsertClient(env, client) {
  const id = String(client?.id || "").trim();
  const name = String(client?.name || "").trim();
  if (!id || !name) throw new Error("client_id_and_name_required");

  const existing = await getClient(env, id);
  const config = {
    ...(existing?.config || {}),
    ...(client?.config && typeof client.config === "object" ? client.config : {})
  };

  if (id === String(env.RAGNAR_CLIENT_ID || "ragnar-one")) {
    config.openaiKeySource = "ragnar-exclusive";
  } else {
    config.openaiKeySource = "shared";
  }
  config.runtime = "cloudflare";

  await env.DB.prepare(
    `INSERT INTO clients(id, name, niche, instagram, status, config_json, created_at, updated_at)
     VALUES(?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       niche = excluded.niche,
       instagram = excluded.instagram,
       status = excluded.status,
       config_json = excluded.config_json,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(
    id,
    name,
    String(client?.niche ?? existing?.niche ?? ""),
    String(client?.instagram ?? existing?.instagram ?? ""),
    String(client?.status ?? existing?.status ?? "online"),
    JSON.stringify(config)
  ).run();

  return getClient(env, id);
}


export function portalClientView(client) {
  if (!client) return null;
  const config = client.config && typeof client.config === "object" ? client.config : {};
  const postingProfile = config.postingProfile && typeof config.postingProfile === "object"
    ? config.postingProfile
    : {};
  const agentProfile = config.agentProfile && typeof config.agentProfile === "object"
    ? config.agentProfile
    : {};
  const agentCore = config.agentCore && typeof config.agentCore === "object"
    ? config.agentCore
    : {};
  return {
    id: client.id,
    name: client.name,
    niche: client.niche,
    instagram: client.instagram,
    contact: {
      name: String(config.contact?.name || client.name || ""),
      phone: String(config.contact?.phone || "")
    },
    videoTemplate: { whatsappNumber: String(config.videoTemplate?.whatsappNumber || "") },
    // Plano contratado (cadastro com Pix, 22/10/2026). Sem plano: null.
    plan: config.plan && typeof config.plan === "object" ? config.plan : null,
    status: client.status,
    theme: config.theme || "nexus",
    primaryColor: config.primaryColor || (client.id === "ragnar-one" ? "#19c563" : "#22c55e"),
    secondaryColor: config.secondaryColor || "#050807",
    odin: config.odin !== false,
    postTimes: [],
    adaptiveTiming: true,
    leads: config.leads && typeof config.leads === "object"
      ? config.leads
      : { total: 0, hot: 0, warm: 0, cold: 0 },
    usage: {
      openaiPercent: Number(config.usage?.openaiPercent || 0)
    },
    aiMode: client.id === "ragnar-one" ? "own-key" : "shared",
    aiMonthlyImageLimit: Number(config.aiMonthlyImageLimit || 0),
    aiImagesUsed: Number(config.aiImagesUsed || 0),
    managedInfrastructure: true,
    onboarding: {
      instagram: Boolean(config.onboarding?.instagram),
      creativeProfile: Boolean(config.onboarding?.creativeProfile),
      supportRequested: Boolean(config.onboarding?.supportRequested)
    },
    setupMode: config.setupMode || "ready",
    integrationState: {
      github: "connected",
      cloudflare: "connected",
      openai: "configured",
      meta: config.integrationState?.meta || "pending"
    },
    postingProfile,
    agentProfile,
    agentCore,
    connections: config.connections && typeof config.connections === "object" ? config.connections : {},
    group: clientGroup(client.id),
    branding: {
      logoKey: String(config.branding?.logoKey || ""),
      logoUpdatedAt: config.branding?.logoUpdatedAt || null
    }
  };
}

// Grupos de clientes (04/11/2026). O 1º vendedor é o cliente que já existia.
// "theme" é o tema de logo e cores do painel, em CLIENT_THEMES (public/client-lite.js).
export const CLIENT_GROUPS = Object.freeze({
  "quatree-dog": Object.freeze({
    name: "Quatree Dog",
    theme: "quatree-dog",
    members: Object.freeze([
      Object.freeze({ clientId: "quatree-dog", vendor: "Ericsson", instagram: "ericsson_quatree" }),
      Object.freeze({ clientId: "quatree-dog-eduardo", vendor: "Eduardo" })
    ])
  })
});

export function clientGroup(clientId) {
  for (const [id, group] of Object.entries(CLIENT_GROUPS)) {
    const member = group.members.find(item => item.clientId === String(clientId || ""));
    if (member) return { id, name: group.name, theme: group.theme, vendor: member.vendor };
  }
  return null;
}
