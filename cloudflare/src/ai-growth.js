import { openAIResponses } from "./openai.js";

const VERSION = "openai-growth-brain-v2-memory";
const TZ = "America/Sao_Paulo";

function localDay(value=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(value instanceof Date?value:new Date(value));
}

export function shouldRefreshGrowthAI(previous=null,invalidateReason="",now=new Date()){
  if(String(invalidateReason||"").trim())return true;
  if(previous?.version!==VERSION)return true;
  return String(previous?.dayKey||"")!==localDay(now);
}

function extractText(response) {
  if (response?.output_text) return String(response.output_text);
  return (response?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === "output_text")
    .map(item => String(item?.text || ""))
    .join("");
}

function brandRules(client) {
  const id = String(client?.id || "");
  if (id === "globalplay-streaming") {
    return [
      "GLOBAL PLAY: usar sistema visual auditado, realista e premium, orientado a descoberta, interação, salvamento, compartilhamento e conversão.",
      "Priorizar cenas contemporâneas e críveis de entretenimento em casa, uma ideia por peça, gancho forte, composição limpa e CTA discreto.",
      "Reels devem ser verticais 9:16 com 10 segundos; carrosséis devem desenvolver uma ideia em 4 a 6 cards coerentes; posts devem ter storytelling visual simples.",
      "Não usar campanhas sazonais antigas, personagens ou logos de terceiros, collages, split-screen, poluição visual ou promessas absolutas."
    ].join(" ");
  }
  if (id === "ragnar-one") {
    return [
      "RAGNAR ONE é marca própria. Usar o sistema visual auditado do NEXUS, com conteúdo contemporâneo, realista e premium para cliente final.",
      "Uma ideia clara por peça, composição limpa, pessoas e ambientes atuais, sem direção temática legada.",
      "Reels devem ser verticais 9:16 com 10 segundos; carrosséis devem desenvolver uma ideia em 4 a 6 cards coerentes; posts devem ter storytelling visual simples.",
      "Evitar repetição, referências protegidas, collages, split-screen, excesso de texto e promessas absolutas."
    ].join(" ");
  }
  return "Criar conteúdo original, útil, claro e não repetitivo, respeitando a identidade da marca.";
}

export async function consultGrowthAI(env, client, signals = {}, previous = null) {
  const invalidateReason=String(signals?.invalidateReason||"").trim();
  if (!shouldRefreshGrowthAI(previous,invalidateReason)) {
    return { ...previous, cached: true };
  }

  const recentCaptions = Array.isArray(signals.recentCaptions) ? signals.recentCaptions.slice(0, 10) : [];
  const topMedia = Array.isArray(signals.topMedia) ? signals.topMedia.slice(0, 5) : [];
  const payload = {
    client: {
      id: String(client?.id || ""),
      name: String(client?.name || ""),
      niche: String(client?.niche || "")
    },
    metrics: signals.metrics || {},
    followers: {
      current: Number(signals.followersCount || 0),
      delta: Number(signals.followersDelta || 0)
    },
    recommendedPostTimes: Array.isArray(signals.recommendedPostTimes) ? signals.recommendedPostTimes.slice(0, 3) : [],
    topMedia,
    recentCaptions,
    leadSummary: signals.leadSummary || {},
    currentProfile: signals.profile || {},
    persistentGuidance: signals.masterGuidance || { directives: [], campaigns: [] },
    recentCreativeHistory: Array.isArray(signals.recentCreativeHistory) ? signals.recentCreativeHistory.slice(0, 20) : [],
    brandRules: brandRules(client)
  };

  try {
    const response = await openAIResponses(env, client.id, {
      nexusPurpose: "strategy",
      model: env.NEXUS_GROWTH_MODEL || "gpt-5.6-luna",
      // 1100 cortava a resposta no meio (JSON incompleto) e a IA nunca era usada.
      max_output_tokens: 7000,
      instructions: [
        "Você é o cérebro de crescimento do NEXUS para Instagram.",
        "Analise SOMENTE os sinais reais fornecidos. Não invente alcance, views, curtidas, tendências ou resultados.",
        "O objetivo é melhorar alcance, retenção, compartilhamentos, salvamentos, comentários e crescimento de seguidores.",
        "Se views/reach/engajamento estiverem baixos ou zerados, mude de abordagem: não repita a mesma legenda, ângulo, imagem ou promessa.",
        "Evite texto genérico como 'Descoberta, entretenimento, utilidade e motivo claro para seguir o perfil'.",
        "Crie 3 pautas realmente diferentes entre si, com ganchos naturais em português do Brasil.",
        "Para cada pauta descreva scene, composition, characters, palette, action e prop; não repita a mesma combinação.",
        "Escolha format entre image, carousel e reel pelo potencial de alcance; Reels devem ter prioridade quando os sinais reais indicarem descoberta por não seguidores.",
        "As legendas devem soar humanas, específicas para a marca e ter no máximo 650 caracteres.",
        "Nunca prometa resultado garantido. CTA principal pode usar QUERO, mas varie a frase.",
        "Respeite integralmente as regras da marca enviadas no JSON.",
        "Trate persistentGuidance como memória operacional: decisões ativas já aprovadas devem ser aplicadas antes de criar qualquer pauta.",
        "Use recentCreativeHistory para evitar repetir estrutura, cenário, personagens, hook ou solução visual recente.",
        "Quando o calendário já trouxer formato fixo, sua função é criar a melhor ideia dentro desse formato, nunca trocar o formato por conta própria.",
        "Crie com autonomia: não copie um roteiro fixo. Varie narrativa, cenário, emoção e mecanismo, mantendo coerência de marca e objetivo.",
        "Retorne apenas o JSON exigido pelo schema."
      ].join(" "),
      input: JSON.stringify(payload),
      text: {
        format: {
          type: "json_schema",
          name: "nexus_growth_brain",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              diagnosis: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 5
              },
              strategyChanges: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 5
              },
              researchOpportunities: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 8
              },
              decisionMode: {
                type: "string",
                enum: ["explore", "test-and-learn", "scale-winner"]
              },
              creativeBatch: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    theme: { type: "string" },
                    hook: { type: "string" },
                    caption: { type: "string" },
                    cta: { type: "string" },
                    hashtags: { type: "string" },
                    visualBrief: { type: "string" },
                    scene: { type: "string" },
                    composition: { type: "string" },
                    characters: { type: "string" },
                    palette: { type: "string" },
                    action: { type: "string" },
                    prop: { type: "string" },
                    format: { type: "string", enum: ["image","carousel","reel"] }
                  },
                  required: ["theme", "hook", "caption", "cta", "hashtags", "visualBrief","scene","composition","characters","palette","action","prop","format"]
                }
              }
            },
            required: ["diagnosis", "strategyChanges", "researchOpportunities", "decisionMode", "creativeBatch"]
          }
        }
      }
    });

    const text = extractText(response);
    const parsed = JSON.parse(text);
    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      dayKey: localDay(),
      model: String(env.NEXUS_GROWTH_MODEL || "gpt-5.6-luna"),
      cached: false,
      ...parsed
    };
  } catch (error) {
    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      model: String(env.NEXUS_GROWTH_MODEL || "gpt-5.6-luna"),
      cached: false,
      error: String(error?.message || error).slice(0, 160),
      diagnosis: [],
      strategyChanges: [],
      researchOpportunities: [],
      decisionMode: "explore",
      creativeBatch: []
    };
  }
}
