import { clientBrand } from "./client-brand.js";

// Título das artes criado na hora, lendo a ficha do cliente. A IA grátis só escreve a frase:
// quem desenha as letras é o Nexus, e a frase é conferida antes de ir para a arte.
const TEXT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_LINE = 22;

export function cleanTitle(answer) {
  const lines = String(answer || "").split("\n").map(line => line.replace(/^[\s\-*•\d.)"']+|["'\s]+$/g, "").trim()).filter(Boolean).slice(0, 3);
  if (lines.length !== 3) throw new Error("title_invalid");
  // Sem número: preço, prazo e desconto nunca são inventados.
  if (lines.some(line => line.length < 2 || line.length > MAX_LINE || /[0-9%$]/.test(line))) throw new Error("title_invalid");
  return lines;
}

export async function writeArtTitle(env, client) {
  if (!env?.AI) throw new Error("workers_ai_unavailable");
  const brand = clientBrand(client);
  const profile = client.config?.agentProfile || {};
  const facts = [
    "Empresa: " + (brand.brandName || client.name),
    "Nicho: " + (brand.niche || client.niche || ""),
    "O que vende: " + (brand.offer || profile.offer || ""),
    "Produtos oficiais: " + (profile.services || "")
  ].join("\n");
  const out = await env.AI.run(TEXT_MODEL, {
    messages: [{ role: "user", content: "Escreva um título de anúncio em português do Brasil, em exatamente 3 linhas curtas, com até 20 letras por linha. "
      + "Use só o que está na ficha. Não cite produto que não esteja na ficha. Sem números, preços ou promessas. Responda só as 3 linhas.\n\n" + facts }],
    max_tokens: 60
  });
  return cleanTitle(out?.response ?? out?.result?.response ?? "");
}
