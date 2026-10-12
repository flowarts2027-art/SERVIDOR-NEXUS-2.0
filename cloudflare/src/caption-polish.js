// Acabamento da legenda antes de ir para aprovação (ideias do pacote instagram-agent, licença MIT):
// - no máximo 5 hashtags (limite do Instagram desde dez/2025);
// - sem caracteres invisíveis e sem travessão (marcas comuns de texto de IA);
// - primeira linha com até 125 caracteres (o que aparece antes do "mais").

export const MAX_HASHTAGS = 5;
export const FIRST_LINE_MAX = 125;

// Frases de "texto de robô" em português, para os agentes evitarem.
export const ROBOT_PHRASES = Object.freeze([
  "no mundo de hoje", "no cenário atual", "nos dias de hoje", "vale ressaltar", "é importante destacar",
  "em suma", "em resumo", "mergulhe", "desbloqueie", "potencialize", "alavanque", "jornada",
  "transforme sua vida", "não é apenas", "mais do que nunca", "revolucione", "eleve o seu"
]);

const INVISIBLE = /[​-‍⁠﻿­]/g;

export function limitHashtags(text = "", max = MAX_HASHTAGS) {
  let count = 0;
  return String(text).replace(/(^|\s)#[\p{L}\p{N}_]+/gu, (match) => {
    count += 1;
    return count <= max ? match : "";
  }).replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ");
}

// Se a 1ª linha passa de 125 caracteres, quebra no fim da 1ª frase que caiba.
export function shortenFirstLine(text = "", max = FIRST_LINE_MAX) {
  const lines = String(text).split("\n");
  const first = lines[0] || "";
  if (first.length <= max) return String(text);
  let cut = -1;
  const re = /[.!?…](?=\s)/g;
  let m;
  while ((m = re.exec(first)) && m.index < max) cut = m.index + 1;
  if (cut <= 0) return String(text);
  return [first.slice(0, cut).trim(), "", first.slice(cut).trim(), ...lines.slice(1)].join("\n");
}

export function polishCaption(text = "") {
  let out = String(text || "").replace(INVISIBLE, "");
  out = out.replace(/\s*[—–]\s*/g, (dash, offset, all) => {
    // Travessão entre palavras vira vírgula; no começo da linha, some.
    const before = all.slice(0, offset);
    return before === "" || before.endsWith("\n") ? "" : ", ";
  });
  out = limitHashtags(out);
  out = shortenFirstLine(out);
  return out.replace(/\n{3,}/g, "\n\n").trim().slice(0, 2200);
}

export const QUERO_PATTERN = /coment[ae]\s+["“']?quero/i;

// Outras chamadas que competem com o QUERO (uma chamada só por post).
export const OTHER_ASK_LINE = /^\s*(responda nos coment[áa]rios|salve (?:para|este post)|envie para|siga (?:a|o) |comente ["“']?exemplo|marque quem|compartilhe com)[^\n]{0,140}$/i;

// Garante a chamada "Comente QUERO" (brinde), única, antes das hashtags do fim.
export function ensureGiftCta(text = "", cta = "") {
  let value = String(text || "").trim();
  if (!cta) return value;
  value = value.split("\n").filter(line => !OTHER_ASK_LINE.test(line)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (QUERO_PATTERN.test(value)) return value;
  const lines = value.split("\n");
  let i = lines.length;
  while (i > 0 && (/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(lines[i - 1]) || !lines[i - 1].trim())) i -= 1;
  const body = lines.slice(0, i).join("\n").trim();
  const tags = lines.slice(i).join("\n").trim();
  return [body, cta, tags].filter(Boolean).join("\n\n").slice(0, 2200);
}
