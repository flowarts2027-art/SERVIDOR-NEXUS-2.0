// Texto por código nas artes que chegam SEM texto na Biblioteca (pedido do Rodrigo, 28/10/2026).
// O navegador vê que as faixas de cima e de baixo estão vazias e pergunta aqui o assunto da imagem.
// A IA grátis do Cloudflare só diz QUAL é o assunto (uma palavra da lista); quem escreve o texto é o
// Nexus, com os textos revisados abaixo (PADRAO_ARTES.md: texto escrito por código, nunca pela IA).

const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const ZAP = "Orçamento no zap";

// GILTEC aluga todos estes (Rodrigo, 28/10). Marcas que ela trabalha: Buffalo, Toyama, CSM e outras.
// Os 4 primeiros são os mesmos textos de scripts/social/campanha/conteudo.json.
const GILTEC = {
  compactador: {
    nome: "compactador (placa vibratória ou sapo)",
    titulos: [["Compactação", "firme para", "sua obra"], ["Base bem", "compactada", "começa aqui"], ["Solo firme", "antes do", "piso"]],
    vantagens: ["Solo firme", "Menos retrabalho", ZAP]
  },
  betoneira: {
    nome: "betoneira",
    titulos: [["Concreto", "pronto na", "sua obra"], ["Mistura", "por igual", "toda vez"], ["Menos braço,", "mais", "concreto"]],
    vantagens: ["Mistura por igual", "Menos esforço", ZAP]
  },
  martelete: {
    nome: "martelete, rompedor ou britadeira",
    titulos: [["Quebra", "sem parar", "na sua reforma"], ["Reforma", "com mais", "força"], ["Piso velho", "sai mais", "rápido"]],
    vantagens: ["Pisos e lajes", "Mais força", ZAP]
  },
  gerador: {
    nome: "gerador de energia",
    titulos: [["Energia", "para a obra", "não parar"], ["Obra sem", "rede elétrica?", "Tem solução"], ["Ferramenta", "ligada o dia", "todo"]],
    vantagens: ["Obra sem rede", "Ferramentas ligadas", ZAP]
  },
  cortadora: {
    nome: "cortadora de piso ou de asfalto (disco)",
    titulos: [["Corte reto", "no piso e", "no asfalto"], ["Corte", "preciso na", "sua obra"]],
    vantagens: ["Corte preciso", "Piso e asfalto", ZAP]
  },
  alisadora: {
    nome: "alisadora ou acabadora de concreto (helicóptero)",
    titulos: [["Piso de", "concreto", "bem acabado"], ["Acabamento", "liso no", "seu piso"]],
    vantagens: ["Acabamento liso", "Menos esforço", ZAP]
  },
  guincho: {
    nome: "guincho de coluna ou elevador de carga",
    titulos: [["Material", "lá em cima", "sem esforço"], ["Subir carga", "ficou mais", "fácil"]],
    vantagens: ["Sobe material", "Menos esforço", ZAP]
  },
  escoras: {
    nome: "escoras metálicas para laje",
    titulos: [["Laje bem", "escorada,", "obra segura"], ["Escoras", "para sua", "laje"]],
    vantagens: ["Escoras metálicas", "Mais segurança", ZAP]
  },
  iluminacao: {
    nome: "torre de iluminação",
    titulos: [["Iluminação", "para sua", "obra"], ["Obra", "iluminada", "à noite"]],
    vantagens: ["Mais segurança", "Trabalho noturno", ZAP]
  },
  // Obra sem equipamento em destaque (alvenaria, fundação, reboco, vistoria).
  obra: {
    nome: "obra em geral, sem máquina em destaque",
    titulos: [["Sua obra", "no ritmo", "certo"], ["Sua obra", "não pode", "parar"], ["Equipamento", "certo para", "sua obra"], ["Da fundação", "ao", "acabamento"]],
    vantagens: ["Construção", "Reforma", ZAP]
  }
};

const TABLES = { giltec: GILTEC };
// Logo verdadeira de cada cliente (public/brand), a mesma da campanha diária.
const LOGOS = { giltec: "/brand/giltec-logo.png" };

export function textTable(clientId) {
  return TABLES[String(clientId || "")] || null;
}

export function themePrompt(table) {
  const list = Object.entries(table).map(([key, t]) => `${key} = ${t.nome}`).join("; ");
  return [
    "Olhe a foto de obra e diga qual equipamento aparece em destaque.",
    `Responda com UMA palavra desta lista, sem mais nada: ${list}.`,
    "Se não houver máquina em destaque, responda obra."
  ].join(" ");
}

// Texto da arte: título em 3 linhas (maiúsculas), 3 vantagens e o botão.
export function artText(table, theme, seed = 0, story = false) {
  const t = table[theme] || table.obra;
  const titulo = t.titulos[Math.abs(Number(seed) || 0) % t.titulos.length].map(s => s.toUpperCase());
  return { theme: table[theme] ? theme : "obra", titulo, vantagens: t.vantagens.slice(0, 3), botao: story ? "MANDE QUERO NO DIRECT" : "COMENTE QUERO" };
}

export function parseTheme(answer, table) {
  const text = String(answer || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return Object.keys(table).find(key => new RegExp(`\\b${key}\\b`).test(text)) || "obra";
}

// Pergunta o assunto à IA grátis. Sem IA (ou se ela falhar), usa os textos gerais de obra.
export async function pickTheme(env, table, dataUrl) {
  if (!env?.AI || !/^data:image\/(jpeg|png|webp);base64,/.test(String(dataUrl || ""))) return "obra";
  try {
    const out = await Promise.race([
      env.AI.run(String(env.NEXUS_VISION_MODEL || VISION_MODEL), {
        messages: [{ role: "user", content: [
          { type: "text", text: themePrompt(table) },
          { type: "image_url", image_url: { url: dataUrl } }
        ] }],
        max_tokens: 10
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 25000))
    ]);
    return parseTheme(out?.response ?? out?.result?.response ?? "", table);
  } catch {
    return "obra";
  }
}

// POST .../texto  { image: "data:image/jpeg;base64,...", seed, story }
export async function handleArtText(env, client, body) {
  const table = textTable(client?.id);
  if (!table) return { ok: true, text: null };
  const logo = LOGOS[String(client?.id || "")] || "";
  const image = String(body?.image || "");
  if (image.length > 2_000_000) return { ok: true, logo, text: artText(table, "obra", body?.seed, Boolean(body?.story)) };
  const theme = await pickTheme(env, table, image);
  return { ok: true, logo, text: artText(table, theme, body?.seed, Boolean(body?.story)) };
}
