import { getClient } from "./clients.js";

// Lápis do Master (05/11/2026): troca só o nome que aparece. O id não muda, porque agenda,
// postagens, minuto de publicação e Instagram dependem dele. O nome salvo em clients.name
// também fica, porque alimenta marca e legendas.
const NAME_MIN = 2;
const NAME_MAX = 60;

export function cleanPanelName(value) {
  const name = String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : "";
}

export async function handleClientName(request, env) {
  const headers = { "content-type": "application/json; charset=utf-8" };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  const body = await request.json().catch(() => ({}));
  const client = await getClient(env, String(body.clientId || "").trim());
  if (!client) return reply({ error: "not_found", message: "Não achei este cliente." }, 404);
  const name = cleanPanelName(body.name);
  if (!name) return reply({ error: "invalid_name", message: "O nome precisa ter de 2 a 60 letras." }, 400);
  await env.DB.prepare(
    `UPDATE clients SET config_json=json_set(CASE WHEN json_valid(config_json) THEN config_json ELSE '{}' END,'$.displayName',?2),
       updated_at=CURRENT_TIMESTAMP WHERE id=?1`
  ).bind(client.id, name).run();
  return reply({ ok: true, id: client.id, name });
}
