// Revisor automático (regras do agente Revisor dentro do Nexus).
// Não apaga nem bloqueia: devolve avisos que aparecem no post do painel, e quem decide é o dono.
// Só conferência de palavras: sem IA e sem custo por post.

import { clientBrand, brandProfileVersion } from "./client-brand.js";
import { hookProblems } from "./hook-formulas.js";

const RULES = [
  {
    code: "promessa",
    label: "promessa de resultado",
    test: /\b(garantid[oa]s?|garantimos|resultado certo|100\s?% (?:garantido|certo|de resultado)|sem risco|(?:dobr|tripl)(?:ar|e|amos)\s+(?:as\s+|suas\s+)?vendas|\d[\d.]*\s*(?:mil\s+)?(?:novos\s+)?seguidores\s+(?:em|por)\s+\d+)/i
  },
  {
    code: "preco",
    label: "preço no post",
    test: /R\$\s?\d|\b\d+(?:[.,]\d+)?\s?reais\b|\bpor\s+(?:apenas|só)\s+\d/i,
    when: brand => /pre[çc]o/i.test(brand.avoidRules || "")
  },
  {
    code: "marca_antiga",
    label: "cita Global Play ou Ragnar",
    test: /global\s?play|ragnar/i
  },
  {
    code: "pressa_falsa",
    label: "pressa que pode ser falsa",
    test: /\b(s[óo]\s+hoje|somente\s+hoje|acaba\s+hoje|[úu]ltimas?\s+(?:vagas?|horas|unidades)|vou\s+apagar|corre\s+que|antes\s+que\s+acabe|n[ãa]o\s+perca\s+tempo)\b/i
  },
  {
    code: "prova_inventada",
    label: "prova ou depoimento que pode ser inventado",
    test: /\b(\d[\d.]*\s*clientes?\s+(?:satisfeitos|atendidos|felizes)|nossos\s+clientes\s+(?:dizem|aprovam)|mais\s+de\s+\d[\d.]*\s+(?:clientes|empresas|negócios))\b/i
  }
];

// Retorna [{ code, label, trecho }] para a legenda. Vazio = nada a apontar.
export function reviewCopy(client = {}, text = "") {
  const id = String(client?.id || client || "");
  if (!brandProfileVersion(id)) return [];
  const brand = clientBrand(typeof client === "object" ? client : { id });
  const value = String(text || "");
  const out = [];
  for (const rule of RULES) {
    if (rule.when && !rule.when(brand)) continue;
    const match = value.match(rule.test);
    if (match) out.push({ code: rule.code, label: rule.label, trecho: match[0].slice(0, 60) });
  }
  // Gancho (1ª linha): regras do hookscore do pacote instagram-agent (MIT), em português.
  const hook = hookProblems(value);
  if (hook.length) out.push({ code: "gancho", label: "gancho fraco", trecho: hook.join("; ").slice(0, 60) });
  return out;
}
