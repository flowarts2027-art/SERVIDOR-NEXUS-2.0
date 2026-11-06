// Mensagem pronta do botão "Copiar acesso" (06/11/2026). Texto pedido pelo Rodrigo, para colar no WhatsApp.
const PANEL_URL = "https://painel.flowarts.com.br/";
const TESTER_INVITES_URL = "https://www.instagram.com/accounts/manage_access/";

export function accessMessage({ name, username, password }) {
  return [
    `Olá, ${name}! Seu painel do Nexus está pronto.`,
    `🔗 Painel: ${PANEL_URL}`,
    `👤 Usuário: ${username}`,
    `🔑 Senha: ${password}`,
    "📲 Antes de conectar o Instagram, aceite o convite de testador:",
    TESTER_INVITES_URL,
    'Abra a aba "Convites de testador" e toque em Aceitar.',
    'Depois entre no painel e toque em "Conectar Instagram".'
  ].join("\n");
}
