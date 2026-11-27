// Cota grátis do Workers AI (pedido do Rodrigo, 27/11/2026): "na Cloudflare não pode ser pago nada".
// O plano grátis dá 10.000 neurônios por dia, zerando às 00:00 UTC (21h de Brasília).
// As imagens só podem usar uma parte dessa cota. O resto fica reservado para as checagens
// da moldura ("já tem texto?", "é sobrancelha?", canto da logo) e para as legendas.
// Sem isso, um dia de muitas imagens deixaria as artes sem moldura (caso da Daniela, 27/11).

export const FREE_DAILY_NEURONS = 10000;
export const DEFAULT_IMAGE_NEURONS = 5500;
export const QUOTA_ERROR = "cota_gratis_imagens";

// Preços da página oficial (developers.cloudflare.com/workers-ai/platform/pricing, 27/11/2026).
// Contas para cima, com folga: o tamanho é medido em pedaços de 512x512.
const tiles = (w, h) => Math.ceil(Number(w || 1024) / 512) * Math.ceil(Number(h || 1024) / 512);

export function imageNeurons(model, width, height, steps = 8) {
  const m = String(model || "");
  if (m.includes("flux-2-klein-4b")) return Math.ceil(tiles(width, height) * 26.05);
  if (m.includes("flux-1-schnell")) return Math.ceil(tiles(1024, 1024) * 4.8 + Number(steps || 4) * 9.6);
  if (m.includes("flux-2-klein-9b")) {
    const mp = (Number(width || 1024) * Number(height || 1024)) / (1024 * 1024);
    return Math.ceil(1363.64 + Math.max(0, Math.ceil(mp) - 1) * 181.82);
  }
  // Modelo desconhecido: conta como caro para não estourar.
  return 1500;
}

export function imageNeuronCap(env) {
  const n = Number(env?.NEXUS_AI_IMAGE_NEURONS);
  // Nunca deixa as imagens passarem de 70% da cota grátis, mesmo se alguém mudar a variável.
  const cap = Number.isFinite(n) && n > 0 ? n : DEFAULT_IMAGE_NEURONS;
  return Math.min(cap, Math.floor(FREE_DAILY_NEURONS * 0.7));
}

export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

async function readUsed(env, day) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace = 'ai-neurons' AND item_key = ?1 AND client_id = '*'"
  ).bind(day).first().catch(() => null);
  try { return Number(JSON.parse(String(row?.value_json || "{}")).images || 0); } catch { return 0; }
}

async function writeUsed(env, day, images, count) {
  await env.DB.prepare(
    `INSERT INTO nexus_state(namespace, item_key, client_id, value_json, updated_at)
     VALUES('ai-neurons', ?1, '*', ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(namespace, item_key, client_id) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(day, JSON.stringify({ images, count })).run();
}

// Quanto ainda cabe hoje (para a fila decidir quantas imagens pedir).
export async function imageNeuronsLeft(env, now = new Date()) {
  if (!env?.DB) return 0;
  return Math.max(0, imageNeuronCap(env) - await readUsed(env, utcDay(now)));
}

// Reserva antes de pedir a imagem. Sem banco, não gera (melhor sem imagem do que pagar).
export async function reserveImageNeurons(env, neurons, now = new Date()) {
  if (!env?.DB) throw new Error(QUOTA_ERROR);
  const day = utcDay(now);
  const used = await readUsed(env, day);
  if (used + neurons > imageNeuronCap(env)) {
    const error = new Error(QUOTA_ERROR);
    error.code = QUOTA_ERROR;
    throw error;
  }
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace = 'ai-neurons' AND item_key = ?1 AND client_id = '*'"
  ).bind(day).first().catch(() => null);
  let count = 0;
  try { count = Number(JSON.parse(String(row?.value_json || "{}")).count || 0); } catch { count = 0; }
  await writeUsed(env, day, used + neurons, count + 1);
  return { day, used: used + neurons, cap: imageNeuronCap(env) };
}

export function isQuotaError(error) {
  const msg = String(error?.message || error || "");
  return msg.includes(QUOTA_ERROR) || /\b4006\b|daily free allocation|neurons/i.test(msg);
}
