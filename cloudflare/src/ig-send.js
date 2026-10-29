// Envio de mensagens no direct do Instagram (28/10/2026, pedido do Rodrigo).
// Ideia trazida do ChatbotX (MIT, github.com/ChatbotXIO/ChatbotX, integrations/instagram):
// com login pelo Instagram (graph.instagram.com), o direct sai por "me/messages",
// usando o token da própria conta. Assim não depende do id guardado no login, que
// pode ser diferente do id que a Meta usa no aviso (webhook) — causa provável do
// "comentou QUERO e não recebeu nada no direct".
// O caminho antigo ("{id da conta}/messages") continua como reserva.
// Só tenta a reserva quando a Meta RESPONDE com erro: em falha de rede ou tempo
// esgotado a mensagem pode ter saído, então não repete (evita direct duplicado).

const GRAPH = "https://graph.instagram.com/";

async function post(request, token, path, body) {
  let response;
  try {
    response = await request(GRAPH + path, {
      method: "POST",
      headers: { authorization: "Bearer " + token, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });
  } catch (cause) {
    const error = new Error(String(cause?.message || cause || "instagram_network").slice(0, 200));
    error.network = true;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.error?.message || "instagram_" + response.status).slice(0, 200));
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

export function messagePaths(igUserId = "") {
  const id = String(igUserId || "").trim();
  return id && id !== "me" ? ["me/messages", encodeURIComponent(id) + "/messages"] : ["me/messages"];
}

// recipient: { comment_id } (resposta privada a um comentário) ou { id } (pessoa no direct).
export async function sendInstagramMessage({ request = fetch, token, igUserId = "", recipient, message }) {
  let lastError = null;
  for (const path of messagePaths(igUserId)) {
    try {
      return await post(request, token, path, { recipient, message });
    } catch (error) {
      lastError = error;
      if (error.network) break;
    }
  }
  throw lastError || new Error("instagram_send_failed");
}
