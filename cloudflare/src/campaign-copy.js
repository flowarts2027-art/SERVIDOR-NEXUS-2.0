// Legenda escrita pela IA para cada post da campanha de uma marca com perfil próprio (ex.: Flow Arts).
// Antes, todo post da campanha usava um modelo fixo ("A Flow Arts ajuda com isso: ...") sem nenhuma dica real.
// Agora a IA escreve o corpo com dicas práticas sobre o tema; a chamada (QUERO) e as hashtags entram depois.

import { openAIResponses } from "./openai.js";
import { clientBrand } from "./client-brand.js";
import { ROBOT_PHRASES } from "./caption-polish.js";
import { reachRulesText } from "./reach-playbook.js";
import { hookFormulasText } from "./hook-formulas.js";
import { viralHooksText } from "./viral-radar.js";

function extractText(response) {
  if (response?.output_text) return String(response.output_text);
  return (response?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === "output_text")
    .map(item => String(item?.text || ""))
    .join("");
}

export function campaignCopyPrompt(client, item = {}) {
  const brand = clientBrand(client);
  return [
    "Você escreve legendas de Instagram para " + brand.brandName + " (" + (brand.niche || "marketing") + ").",
    "Público: " + (brand.audience || "donos de pequenos negócios no Brasil") + ".",
    "Escreva em português do Brasil, frases curtas, tom humano e direto, como um especialista que ajuda de graça.",
    "Estrutura: 1ª linha = gancho curto (até 90 caracteres) sobre ESTE tema, que nomeia uma dor real ou cria curiosidade. O gancho tem que combinar com as dicas que vêm depois.",
    "Seja específico: cite situações reais de pequeno comércio (padaria, salão, loja de roupa, barbearia, lanchonete), números e exemplos concretos. Nada de frases genéricas como 'você está perdendo cliente' ou 'o segredo que ninguém conta'.",
    "Depois: 3 dicas práticas e específicas sobre o tema, numeradas (1., 2., 3.), cada uma com uma ação que o dono do negócio consegue fazer hoje.",
    "Feche com uma frase curta que conecta a dica ao resultado (mais clientes, menos tempo), sem vender diretamente.",
    "Não escreva chamada para ação nem hashtags (elas são adicionadas depois). Não use travessão (—).",
    "Máximo 600 caracteres no total.",
    reachRulesText(),
    hookFormulasText(String(item.theme || "") + "|" + String(item.angle || "") + "|" + String(item.niche || "")),
    "Regras da marca: " + (brand.avoidRules || ""),
    "Nunca use estas frases de robô: " + ROBOT_PHRASES.join(", ") + ".",
    item.niche ? "Exemplo principal deste post: um(a) " + item.niche + " (use nas dicas quando o tema permitir; nunca padaria ou café, a menos que seja este o exemplo)." : "Varie o tipo de negócio nos exemplos; evite repetir padaria e café.",
    "Tema do post: " + String(item.theme || ""),
    "Ângulo: " + String(item.angle || ""),
    "Gancho sugerido (pode melhorar): " + String(item.hook || item.theme || "")
  ].join("\n");
}

// Retorna { hook, body } ou null (aí o Nexus usa o texto de reserva).
export async function writeCampaignCaption(env, client, item = {}, options = {}) {
  const first = await writeCampaignCaptionOnce(env, client, item, options);
  if (first) return first;
  return writeCampaignCaptionOnce(env, client, item, options);
}

async function writeCampaignCaptionOnce(env, client, item = {}, { request = openAIResponses } = {}) {
  try {
    const viral = await viralHooksText(env, client);
    const response = await request(env, client.id, {
      nexusPurpose: "caption",
      model: env.NEXUS_COPY_MODEL || env.NEXUS_GROWTH_MODEL || "gpt-5.6-luna",
      max_output_tokens: 2500,
      input: campaignCopyPrompt(client, item) + (viral ? "\n" + viral : ""),
      text: {
        format: {
          type: "json_schema",
          name: "campaign_caption",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { hook: { type: "string" }, body: { type: "string" } },
            required: ["hook", "body"]
          }
        }
      }
    });
    const parsed = JSON.parse(extractText(response));
    const hook = String(parsed?.hook || "").replace(/\s+/g, " ").trim().slice(0, 125);
    const body = String(parsed?.body || "").trim().slice(0, 700);
    if (hook.length < 8 || body.length < 60) return null;
    return { hook, body };
  } catch {
    return null;
  }
}
