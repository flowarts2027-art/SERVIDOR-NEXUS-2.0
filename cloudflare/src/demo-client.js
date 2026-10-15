// Cliente de demonstração "Café Brisa" (negócio fictício) para o painel público /demo.
// - Criado uma única vez, pelo cron, se ainda não existir.
// - Nunca publica (BLOCKED_PUBLISH_CLIENTS em publisher.js).
// - Pausa sozinho ao juntar DEMO_MAX_POSTS posts, para não gastar o saldo da OpenAI.
//   Para gerar mais, o Master volta o status para "online".
import { getClient, upsertClient } from "./clients.js";
import { DEMO_CLIENT_ID } from "./client-brand.js";

export const DEMO_MAX_POSTS = 8;

export function demoClientRecord() {
  return {
    id: DEMO_CLIENT_ID,
    name: "Café Brisa (demonstração)",
    niche: "Cafeteria de bairro",
    instagram: "",
    status: "online",
    config: {
      demo: true,
      odin: false,
      postTimes: [],
      adaptiveTiming: false,
      aiMode: "shared",
      openaiKeySource: "shared",
      openaiDailyTokenLimit: 150000,
      managedInfrastructure: true,
      setupMode: "managed",
      agentProfile: { brandName: "Café Brisa", niche: "Cafeteria de bairro" }
    }
  };
}

export async function ensureDemoClient(env) {
  // A demonstração nunca fica ligada a um Instagram de verdade (15/10: a conta da
  // Flow Arts foi conectada nela por engano pelo Master). Remove a cada ciclo.
  await env.DB.prepare("DELETE FROM connections WHERE client_id = ?1 AND provider IN ('meta','instagram')")
    .bind(DEMO_CLIENT_ID).run().catch(() => null);
  const existing = await getClient(env, DEMO_CLIENT_ID).catch(() => null);
  if (!existing) {
    await upsertClient(env, demoClientRecord());
    return { created: true, paused: false };
  }
  if (String(existing.status) !== "online") return { created: false, paused: false };
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM post_ledger WHERE client_id = ?1 AND status NOT IN ('expired','cancelled') AND COALESCE(approval_status,'') <> 'rejected'"
  ).bind(DEMO_CLIENT_ID).first().catch(() => null);
  if (Number(row?.total || 0) >= DEMO_MAX_POSTS) {
    await env.DB.prepare("UPDATE clients SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ?1")
      .bind(DEMO_CLIENT_ID).run();
    return { created: false, paused: true };
  }
  return { created: false, paused: false };
}
