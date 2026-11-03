// Planos da Flow Arts (nomes curtos, pedido do Rodrigo em 22/10/2026).
// Uma lista só: o cadastro (/cadastro), o Master e o painel do cliente leem daqui.
// Pagamento por Pix na chave CNPJ da Flow Arts (o CNPJ já é público no rodapé do site).
// O Pix é "copia e cola" fixo (sem banco no meio): o Rodrigo confere o valor no banco
// antes de aprovar o cadastro no Master.

export const PIX_KEY = "65299616000150"; // CNPJ 65.299.616/0001-50
export const PIX_KEY_LABEL = "CNPJ 65.299.616/0001-50";
export const PIX_NAME = "FLOW ARTS";
export const PIX_CITY = "NOVA FRIBURGO";

export const FOUNDER = Object.freeze({ until: "2026-11-30", slots: 3, months: 3 });

// Valores em centavos. kind: "mensal" (cobrança todo mês) ou "unico" (paga uma vez).
// Tabela nova (Rodrigo, 02/11/2026): só 3 planos mensais + Site e Logo avulsos.
// Sem Reels, sem Captador à venda (o código do Captador fica guardado, desligado da venda).
export const PLANS = Object.freeze([
  {
    id: "postador", name: "Postador Automático", kind: "mensal", price: 9700, setup: 0,
    summary: "Seu Instagram postando sozinho todo dia.",
    quotas: { feed: 60, stories: 60 },
    includes: [
      "2 posts por dia: um de manhã e um à tarde",
      "2 stories por dia",
      "As artes são feitas para o seu negócio",
      "Painel no celular: você aprova antes de sair"
    ]
  },
  {
    id: "resposta", name: "Resposta Automática", kind: "mensal", price: 3990, setup: 0,
    summary: "Comentou QUERO, recebe a sua mensagem no Direct.",
    includes: [
      "A pessoa comenta a palavra no seu post",
      "Ela recebe a sua mensagem no Direct na hora",
      "Você escreve a mensagem uma vez e pronto"
    ]
  },
  {
    id: "trafego", name: "Tráfego Pago", kind: "mensal", price: 29700, setup: 0,
    summary: "Anúncios do seu Instagram para atrair clientes.",
    includes: [
      "A Flow Arts cuida dos seus anúncios",
      "O anúncio leva a pessoa até você",
      "A verba do anúncio é paga no seu cartão, direto na Meta (não está inclusa)"
    ]
  },
  {
    id: "site", name: "Site", kind: "unico", price: 49700, setup: 0,
    summary: "Site de 1 página do seu negócio.",
    includes: [
      "Fotos, serviços, horário, mapa e botão do WhatsApp",
      "Pronto em até 5 dias",
      "1º ano com domínio .com.br e hospedagem",
      "Depois do 1º ano: R$ 297 por ano (ou R$ 29 por mês)"
    ]
  },
  { id: "logo", name: "Logo", kind: "unico", price: 6700, setup: 0, summary: "3 opções de logo em 24 horas.", includes: ["3 opções de logo"] }
].map(Object.freeze));

export function findPlan(id) {
  return PLANS.find(plan => plan.id === String(id || "").trim().toLowerCase()) || null;
}

export function brl(cents) {
  return "R$ " + (Number(cents || 0) / 100).toFixed(2).replace(".", ",").replace(/,00$/, "");
}

// Primeiro pagamento: entrada + 1º mês (ou o valor único). Fundador só no Essencial.
export function firstPayment(plan, founder = false) {
  if (!plan) return 0;
  const month = founder && plan.founderPrice ? plan.founderPrice : plan.price;
  return Number(plan.setup || 0) + month;
}

export function founderOpen(now = new Date(), used = 0) {
  const day = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // dia em Brasília
  return day <= FOUNDER.until && Number(used || 0) < FOUNDER.slots;
}

export function priceLine(plan, founder = false) {
  if (!plan) return "";
  if (plan.kind === "unico") return brl(plan.price) + " (pagamento único)";
  const month = founder && plan.founderPrice ? brl(plan.founderPrice) + " por mês nos " + FOUNDER.months + " primeiros meses, depois " + brl(plan.price) : brl(plan.price) + " por mês";
  return (plan.setup ? brl(plan.setup) + " de entrada + " : "") + month;
}

// ---------- Pix copia e cola (BR Code, padrão do Banco Central) ----------
function field(id, value) {
  const text = String(value);
  return id + String(text.length).padStart(2, "0") + text;
}

export function crc16(text) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const ascii = (value, max) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().trim().slice(0, max);

export function pixPayload({ amount, txid = "***", key = PIX_KEY, name = PIX_NAME, city = PIX_CITY } = {}) {
  const tx = txid === "***" ? "***" : ascii(txid, 25).replace(/ /g, "") || "***";
  const body = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key)),
    field("52", "0000"),
    field("53", "986"),
    Number(amount) > 0 ? field("54", (Number(amount) / 100).toFixed(2)) : "",
    field("58", "BR"),
    field("59", ascii(name, 25)),
    field("60", ascii(city, 15)),
    field("62", field("05", tx))
  ].join("") + "6304";
  return body + crc16(body);
}

// O que vai para o cadastro (página pública).
export function publicPlans(founderIsOpen = false) {
  return PLANS.map(plan => {
    const founder = Boolean(founderIsOpen && plan.founderPrice);
    const amount = firstPayment(plan, founder);
    return {
      id: plan.id, name: plan.name, kind: plan.kind, summary: plan.summary, includes: [...plan.includes],
      price: plan.price, setup: plan.setup, founder, firstPayment: amount,
      priceLine: priceLine(plan, founder), firstPaymentLabel: brl(amount),
      pix: pixPayload({ amount, txid: "FLOW" + plan.id })
    };
  });
}

// O que fica guardado no cliente quando o Rodrigo aprova (config.plan).
export function planRecord(plan, { founder = false, paid = 0, startedAt = new Date().toISOString() } = {}) {
  if (!plan) return null;
  return {
    id: plan.id, name: plan.name, kind: plan.kind, price: plan.price, setup: plan.setup,
    founder: Boolean(founder && plan.founderPrice), founderPrice: plan.founderPrice || 0,
    founderMonths: plan.founderPrice ? FOUNDER.months : 0,
    quotas: plan.quotas ? { ...plan.quotas } : null, includes: [...plan.includes], gifts: Array.isArray(plan.gifts) ? [...plan.gifts] : [],
    priceLine: priceLine(plan, founder), firstPayment: Number(paid || 0), startedAt
  };
}
