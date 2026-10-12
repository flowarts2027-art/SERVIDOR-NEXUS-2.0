// Método "alcance com perfil zero" (adaptado de um prompt enviado pelo Rodrigo em 2026-10-12).
// Conta nova: o Instagram testa o post com poucas pessoas que não seguem o perfil;
// se elas param, assistem até o fim, salvam ou compartilham, ele mostra para mais gente.
// Estas regras entram em toda IA que escreve gancho, legenda ou pauta das marcas.

export const REACH_RULES = [
  "Escreva para quem NUNCA viu o perfil: o gancho tem que fazer sentido sozinho, sem depender de autoridade ou de posts anteriores.",
  "Gancho: curiosidade imediata nos primeiros 2 segundos e uma promessa específica e observável (ex.: '3 frases que...', 'o erro que...', 'faça este teste...').",
  "Retenção: sem enrolação no começo; cada linha abre uma pequena curiosidade para a próxima; o melhor fica perto do fim.",
  "Peça um sinal simples que faz o Instagram mostrar para mais gente: salvar para usar depois, mandar para um amigo dono de negócio ou comentar uma palavra.",
  "Linguagem para desconhecidos: palavras do dia a dia do dono de um pequeno negócio, sem jargão (nada de 'funil', 'lead', 'engajamento orgânico').",
  "Nada genérico e nada de trend sem motivo: cada post resolve um problema concreto do público.",
  "Nunca prometa número de visualizações, seguidores ou vendas."
];

export function reachRulesText() {
  return "Método de alcance para perfil novo: " + REACH_RULES.join(" ");
}
