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
export const PLANS = Object.freeze([
  {
    id: "essencial", name: "Essencial", kind: "mensal", price: 19700, setup: 0, founderPrice: 14700,
    summary: "Instagram no automático com as fotos do seu negócio.",
    quotas: { feed: 30, reels: 12, stories: 30 },
    includes: [
      "30 posts no feed por mês (carrosséis e imagens)",
      "12 Reels por mês",
      "30 stories por mês",
      "Resposta automática que leva ao seu WhatsApp",
      "Código de pedido no fim de cada post",
      "Painel no celular: você aprova antes de sair"
    ]
  },
  {
    id: "completo", name: "Completo", kind: "mensal", price: 69700, setup: 0,
    summary: "Tudo do Essencial, com Reels em vídeo de verdade e o Captador de brinde.",
    quotas: { feed: 30, reels: 30, stories: 60 },
    gifts: ["captador"],
    includes: [
      "30 posts no feed por mês",
      "30 Reels por mês com vídeo de verdade",
      "60 stories por mês",
      "Brinde: Captador de clientes (vale R$ 97 por mês) para quem vende para empresas",
      "Resposta automática e código de pedido",
      "Painel no celular: você aprova antes de sair"
    ]
  },
  {
    id: "completo-trafego", name: "Completo + Tráfego", kind: "mensal", price: 89700, setup: 0,
    summary: "Tudo do Completo com o Tráfego junto, mais barato que separado (R$ 1.094).",
    quotas: { feed: 30, reels: 30, stories: 60 },
    gifts: ["captador", "ads"],
    includes: [
      "Tudo do Completo: 30 posts, 30 Reels e 60 stories por mês",
      "Brinde: Captador de clientes para quem vende para empresas",
      "Tráfego: botão Impulsionar nos seus posts, com o seu WhatsApp no anúncio",
      "Economia de R$ 197 por mês em relação aos dois separados",
      "A verba do anúncio é paga no seu cartão, direto na Meta (não está inclusa)"
    ]
  },
  {
    id: "trafego", name: "Tráfego", kind: "mensal", price: 39700, setup: 0,
    summary: "Impulsione seus posts pelo painel e receba clientes no WhatsApp.",
    includes: [
      "Botão Impulsionar nos seus posts, direto no painel",
      "Você escolhe quanto gastar por dia, os dias e a cidade",
      "O anúncio leva a pessoa direto para o seu WhatsApp",
      "Acompanhamento da Flow Arts",
      "A verba do anúncio é paga no seu cartão, direto na Meta (não está inclusa)"
    ]
  },
  {
    id: "captador", name: "Captador", kind: "mensal", price: 9700, setup: 0,
    summary: "Ache empresas da sua cidade para vender.",
    includes: ["100 buscas por mês no painel", "Empresas com telefone e mensagem pronta para o seu WhatsApp"]
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
  {
    id: "responde", name: "Responde", kind: "unico", price: 19700, setup: 0,
    summary: "Resposta automática no Instagram + 10 posts.",
    includes: ["Resposta automática no direct com o botão do seu WhatsApp", "10 posts prontos"]
  },
  { id: "reels5", name: "Reels 5", kind: "unico", price: 14700, setup: 0, summary: "5 Reels com IA, em até 5 dias.", includes: ["5 Reels prontos"] },
  { id: "posts10", name: "Posts 10", kind: "unico", price: 9700, setup: 0, summary: "10 posts prontos em 24 horas.", includes: ["10 posts prontos"] },
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
