// Nomes mostrados nas telas (pedido do Rodrigo, 04/11/2026).
// Só exibição: o id e o nome salvo no banco não mudam. O nome salvo continua alimentando
// marca e legendas, e o id é usado no código e nos testes.
const SCREEN_NAMES = Object.freeze({ "primeiro-teste": "Flow Arts" });
const PORTAL_GREETINGS = Object.freeze({ "quatree-dog": "Quatree Dog — Vendedor Ericsson", giltec: "GILTEC — Vendedora Rose" });

export function clientScreenName(client) {
  return SCREEN_NAMES[String(client?.id || "")] || String(client?.name || "");
}

// Nome depois do "Olá," no topo do painel do cliente. Vazio: vale o nome normal.
export function portalGreetingName(client) {
  return PORTAL_GREETINGS[String(client?.id || "")] || "";
}
