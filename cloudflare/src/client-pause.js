// Cliente pausado pelo Rodrigo (ex.: falta de pagamento): não gera, não substitui e não publica.
// Para liberar, tirar o id de NEXUS_PAUSED_CLIENTS no wrangler.jsonc. Agenda e postagens ficam guardadas.
export function isClientPaused(env, clientId) {
  return String(env?.NEXUS_PAUSED_CLIENTS || "").split(",").map(id => id.trim()).includes(String(clientId || ""));
}
