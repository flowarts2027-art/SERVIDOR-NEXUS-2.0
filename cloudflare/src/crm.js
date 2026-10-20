// CRM do Rodrigo (pedido de 17/10/2026): contatos que ele chamou no WhatsApp pessoal,
// etapa da conversa e data para voltar a falar (padrão: 7 dias).
// Nada é enviado sozinho: o painel só lembra e abre o WhatsApp com a mensagem pronta.

import { readShowcase, showcaseLine, showcaseEntry, canonicalNiche } from "./showcase-store.js";
import { hoursStatus, readWeek } from "./business-hours.js";

export const CRM_STAGES = ["chamar", "contato", "conversando", "proposta", "cliente", "nao-quer"];
export const CRM_INTERESTS = ["", "pacote", "site", "pacote-site", "outro"];
const FOLLOW_DAYS = [0, 1, 3, 7, 15, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (value, max) => String(value ?? "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const cleanNotes = value => String(value ?? "").replace(/[\u0000-\u0009\u000b-\u001f<>]/g, " ").trim().slice(0, 1000);

// Dia de hoje no horário de Brasília (UTC-3), no formato AAAA-MM-DD.
export function brasiliaDay(now = new Date(), plusDays = 0) {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000 + plusDays * DAY_MS).toISOString().slice(0, 10);
}

// Celular brasileiro → só números com 55 na frente (ex.: 5522999998888).
export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  if (!/^55\d{10,11}$/.test(digits)) return "";
  return digits;
}

// Perfil confirmado: nunca transforme um telefone, nome comercial ou URL externa em perfil.
export function normalizeInstagram(value) {
  let handle = String(value ?? "").trim();
  if (/^(?:https?:\/\/|(?:www\.)?instagram\.com\/)/i.test(handle)) {
    let url;
    try { url = new URL(/^https?:\/\//i.test(handle) ? handle : "https://" + handle); } catch { return ""; }
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return "";
    const match = url.pathname.match(/^\/([a-z0-9._]{1,30})\/?$/i);
    if (!match) return "";
    handle = match[1];
  } else handle = handle.replace(/^@/, "");
  if (!/^[a-z0-9._]{1,30}$/i.test(handle) || /^(?:p|reel|reels|stories|explore|direct|accounts|about|developer|legal)$/i.test(handle)) return "";
  return handle.toLowerCase();
}

function savedInstagram(row) {
  // Compatibilidade com contatos importados antes da coluna dedicada.
  return row.instagram != null ? normalizeInstagram(row.instagram) : normalizeInstagram(String(row.notes || "").match(/(?:^|[·\n])\s*Instagram\s+(@[a-z0-9._]{1,30})(?=\s|$|·)/i)?.[1]);
}

function followDate(days, now) {
  const n = Number(days);
  if (!FOLLOW_DAYS.includes(n) || n === 0) return null;
  return brasiliaDay(now, n);
}

export async function ensureCrmSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      interest TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'contato',
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      source_id TEXT NOT NULL DEFAULT '',
      last_contact_at TEXT,
      next_follow_at TEXT,
      follow_count INTEGER NOT NULL DEFAULT 0,
      history_json TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS crm_contacts_follow ON crm_contacts(archived, next_follow_at)").run();
  try { await env.DB.prepare("ALTER TABLE crm_contacts ADD COLUMN niche TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
  try { await env.DB.prepare("ALTER TABLE crm_contacts ADD COLUMN instagram TEXT DEFAULT NULL").run(); } catch { /* já existe */ }
  // Primeira mensagem pronta (empresa achada pelo Nexus, etapa "chamar").
  try { await env.DB.prepare("ALTER TABLE crm_contacts ADD COLUMN draft TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
  // Horário da empresa e hora para chamar (pedido de 18/10: empresa fechada → lembrar quando abrir).
  try { await env.DB.prepare("ALTER TABLE crm_contacts ADD COLUMN follow_time TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
  try { await env.DB.prepare("ALTER TABLE crm_contacts ADD COLUMN hours_json TEXT NOT NULL DEFAULT ''").run(); } catch { /* já existe */ }
}

// Minutos do dia em Brasília.
function brasiliaClock(now = new Date()) {
  const t = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return String(t.getUTCHours()).padStart(2, "0") + ":" + String(t.getUTCMinutes()).padStart(2, "0");
}
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "")) ? String(value) : "";

function parseHistory(raw) {
  try { const list = JSON.parse(raw || "[]"); return Array.isArray(list) ? list : []; } catch { return []; }
}

function addHistory(raw, entry) {
  return JSON.stringify([...parseHistory(raw), entry].slice(-30));
}

const firstName = name => String(name || "").trim().split(/\s+/)[0] || "";

// Mensagem de retorno: curta, sem promessa e sem número inventado.
const NICHE_PLURAL = {
  cafeteria: "cafeterias", restaurante: "restaurantes", lanchonete: "lanchonetes", padaria: "padarias", bar: "bares",
  salao: "salões de beleza", academia: "academias", pet: "pet shops", racao: "lojas de ração",
  agropecuaria: "agropecuárias", veterinario: "clínicas veterinárias", dentista: "dentistas", clinica: "clínicas",
  farmacia: "farmácias", mercado: "mercados", roupas: "lojas de roupas", oficina: "oficinas mecânicas",
  hotel: "hotéis e pousadas", imobiliaria: "imobiliárias", contabilidade: "escritórios de contabilidade", material: "lojas de material de construção"
};
export const CRM_NICHES = Object.keys(NICHE_PLURAL);

// Texto do Direct sempre calculado com os dados atuais, sem reaproveitar o rascunho do WhatsApp.
const INSTAGRAM_FOCUS = {
  cafeteria: "cafés, lanches e novidades do cardápio", restaurante: "pratos e novidades do cardápio",
  lanchonete: "lanches e novidades do cardápio", padaria: "pães e produtos do dia", bar: "bebidas e programação",
  salao: "serviços de beleza e cuidados pessoais", academia: "treinos e modalidades", pet: "produtos e cuidados com os pets",
  racao: "rações e produtos para os animais", agropecuaria: "produtos e orientações para o campo",
  veterinario: "cuidados e orientações para a saúde dos animais", dentista: "cuidados e orientações sobre saúde bucal",
  clinica: "serviços e orientações de saúde", farmacia: "cuidados de saúde e serviços da farmácia",
  mercado: "produtos e ofertas", roupas: "peças e sugestões de looks", oficina: "serviços e dicas de manutenção",
  hotel: "acomodações e informações para quem planeja uma hospedagem", imobiliaria: "imóveis e informações para quem busca um novo lar",
  contabilidade: "serviços e orientações contábeis", material: "produtos e dicas para obras e reformas"
};

export function instagramMessage(c, showcase = null) {
  const business = clean(c.business || c.name, 80) || "sua empresa";
  const niche = canonicalNiche(c.niche);
  const plural = NICHE_PLURAL[niche];
  const focus = INSTAGRAM_FOCUS[niche] || "produtos, serviços e novidades do negócio";
  const lines = [
    `Oi, equipe da ${business}! Tudo bem? Aqui é o Rodrigo, da Flow Arts.`,
    `Tenho uma proposta de conteúdo para o Instagram${plural ? " de " + plural : " do seu negócio"}: posts sobre ${focus}, com textos e visual pensados para o público de vocês.`
  ];
  // Só apresentar exemplo se há uma vitrine real cadastrada para o nicho atual.
  const example = plural && showcase ? showcaseLine(showcase, niche, plural) : "";
  if (example) lines.push(example);
  lines.push(`Posso te mostrar como ficaria para ${business}?`);
  lines.push("Se preferir não receber mensagens, é só me avisar.");
  return lines.join("\n\n");
}

export function followMessage(c, showcase = null) {
  const base = followText(c);
  const example = showcase && c.niche && c.stage !== "cliente" ? showcaseLine(showcase, c.niche, NICHE_PLURAL[c.niche]) : "";
  return example ? base + "\n\n" + example : base;
}

function followText(c) {
  const name = firstName(c.name);
  const biz = c.business && c.business !== c.name ? ` da ${c.business}` : "";
  const what = { pacote: "o pacote de Instagram", site: "o site", "pacote-site": "o pacote de Instagram e o site" }[c.interest] || "o Instagram do seu negócio";
  if (c.stage === "cliente") return `Oi, ${name}! Tudo bem? Aqui é o Rodrigo, da Flow Arts. Passando para saber se está tudo certo com o Instagram${biz}. Precisa de alguma coisa?`;
  if (Number(c.followCount || c.follow_count || 0) >= 1) return `Oi, ${name}! Rodrigo da Flow Arts de novo. Ainda faz sentido a gente conversar sobre ${what}? Se agora não for o momento, sem problema, é só me avisar.`;
  return `Oi, ${name}! Tudo bem? Aqui é o Rodrigo, da Flow Arts. Passando para saber se você pensou sobre ${what}. Quer que eu te mostre um exemplo de como ficaria${biz}?`;
}

// Celular brasileiro aparece com e sem o 9 na Meta: devolve as duas formas.
export function phoneVariants(phone) {
  const p = normalizePhone(phone) || String(phone || "").replace(/\D/g, "");
  const out = new Set([p]);
  if (/^55\d{2}9\d{8}$/.test(p)) out.add(p.slice(0, 4) + p.slice(5));
  if (/^55\d{2}[6-9]\d{7}$/.test(p)) out.add(p.slice(0, 4) + "9" + p.slice(4));
  return [...out].filter(Boolean);
}

function view(row, today, showcase = null, now = new Date()) {
  const instagram = savedInstagram(row);
  const out = {
    id: row.id, name: row.name, business: row.business, phone: row.phone, niche: canonicalNiche(row.niche),
    interest: row.interest, stage: row.stage, notes: row.notes, source: row.source,
    instagram, instagramUrl: instagram ? "https://www.instagram.com/" + instagram + "/" : "",
    lastContactAt: row.last_contact_at || null, nextFollowAt: row.next_follow_at || null,
    followCount: Number(row.follow_count || 0),
    followTime: validTime(row.follow_time),
    // Com hora marcada (empresa que estava fechada), hoje só conta depois dessa hora.
    due: Boolean(row.next_follow_at && (row.next_follow_at < today
      || (row.next_follow_at === today && (!validTime(row.follow_time) || brasiliaClock(now) >= validTime(row.follow_time))))),
    late: Boolean(row.next_follow_at && row.next_follow_at < today),
    history: parseHistory(row.history_json).slice(-10).reverse(),
    createdAt: row.created_at, updatedAt: row.updated_at
  };
  out.instagramMessage = instagramMessage(out, showcase);
  out.message = out.stage === "chamar" && row.draft ? row.draft : followMessage(out, showcase);
  // Aberta ou fechada agora (só para quem ainda não virou cliente).
  if (["chamar", "contato", "conversando", "proposta"].includes(out.stage)) {
    const week = readWeek(row.hours_json);
    if (week) {
      const st = hoursStatus(week, now);
      Object.assign(out, { openNow: st.openNow, hoursLabel: st.label, hoursGuessed: st.guessed, nextOpenDay: st.nextOpenDay || null, nextOpenTime: st.nextOpenTime || null });
    }
  }
  const example = out.stage !== "cliente" ? exampleMedia(showcaseEntry(showcase, out.niche)) : null;
  if (example) {
    out.example = example;
    out.messageWithMedia = mediaMessage(out.message, example.kind);
  }
  return out;
}

// Pedido de 18/10: a pessoa não abre link, quer ver o resultado. Quando o nicho tem exemplo,
// o painel manda o carrossel ou o vídeo de verdade no WhatsApp, e o texto vai sem o link.
export function exampleMedia(entry) {
  const ok = u => /^https:\/\//i.test(String(u || ""));
  if (entry?.kind === "carousel" && Array.isArray(entry.images)) {
    const files = entry.images.filter(ok).slice(0, 10);
    if (files.length) return { kind: "carousel", files };
  }
  if (ok(entry?.videoUrl)) return { kind: "video", files: [entry.videoUrl] };
  return null;
}

export function mediaMessage(message, kind) {
  const what = kind === "carousel" ? "um carrossel" : "um vídeo";
  const text = String(message || "");
  const replaced = text.replace(/Veja (um carrossel|um vídeo) que fizemos para ([^:\n]+):\s*https?:\/\/\S+/i,
    (_, item, who) => `Vou te mandar aqui embaixo ${item} que fizemos para ${who}.`);
  if (replaced !== text) return replaced;
  const clean = text.replace(/\s*https?:\/\/flowarts\.com\.br\/exemplo\/\S+/gi, "").trim();
  return clean + `\n\nVou te mandar aqui embaixo ${what} que fizemos, para você ver como fica.`;
}

function readFields(body, { partial = false } = {}) {
  const out = {};
  if (!partial || "name" in body) {
    out.name = clean(body.name, 80);
    if (!out.name) throw new Error("name_required");
  }
  if (!partial || "phone" in body) {
    out.phone = normalizePhone(body.phone);
    if (!out.phone) throw new Error("phone_invalid");
  }
  if (!partial || "business" in body) out.business = clean(body.business, 80);
  if (!partial || "interest" in body) {
    out.interest = CRM_INTERESTS.includes(String(body.interest ?? "")) ? String(body.interest ?? "") : "";
  }
  if (!partial || "stage" in body) {
    const stage = String(body.stage || "contato");
    if (!CRM_STAGES.includes(stage)) throw new Error("stage_invalid");
    out.stage = stage;
  }
  if (!partial || "instagram" in body) {
    out.instagram = normalizeInstagram(body.instagram);
    if (String(body.instagram ?? "").trim() && !out.instagram) throw new Error("instagram_invalid");
  }
  if (!partial || "notes" in body) out.notes = cleanNotes(body.notes);
  if (!partial || "niche" in body) { const n = canonicalNiche(body.niche); out.niche = CRM_NICHES.includes(n) ? n : ""; }
  return out;
}

export async function createContact(env, body = {}, now = new Date()) {
  await ensureCrmSchema(env);
  const fields = readFields(body);
  if (!("instagram" in body)) fields.instagram = savedInstagram({ notes: fields.notes });
  const existing = await findByPhone(env, fields.phone);
  if (existing) {
    const error = new Error("phone_exists");
    error.id = existing.id;
    throw error;
  }
  const id = "crm-" + crypto.randomUUID();
  const days = "followDays" in body ? body.followDays : 7;
  const next = followDate(days, now);
  const iso = now.toISOString();
  const history = JSON.stringify([{ at: iso, type: "criado", text: "Contato salvo" }]);
  await env.DB.prepare(
    `INSERT INTO crm_contacts(id,name,business,phone,interest,stage,notes,source,source_id,last_contact_at,next_follow_at,history_json,created_at,updated_at,niche,draft,follow_time,hours_json,instagram)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?13,?14,?15,?16,?17,?18)`
  ).bind(id, fields.name, fields.business, fields.phone, fields.interest, fields.stage, fields.notes,
    clean(body.source || "manual", 20), clean(body.sourceId || "", 300), fields.stage === "chamar" ? null : iso,
    "followAt" in body ? body.followAt : next, history, iso, fields.niche, String(body.draft || "").slice(0, 2000),
    validTime(body.followTime), readWeek(body.hours) ? JSON.stringify(readWeek(body.hours)) : "", fields.instagram).run();
  return { ok: true, contact: await getContact(env, id, now) };
}

export async function getContact(env, id, now = new Date()) {
  await ensureCrmSchema(env);
  const row = await env.DB.prepare("SELECT * FROM crm_contacts WHERE id=?1 LIMIT 1").bind(String(id || "")).first();
  return row ? view(row, brasiliaDay(now), row.niche ? await readShowcase(env) : null, now) : null;
}

export async function updateContact(env, id, body = {}, now = new Date()) {
  await ensureCrmSchema(env);
  const row = await env.DB.prepare("SELECT * FROM crm_contacts WHERE id=?1 AND archived=0 LIMIT 1").bind(String(id || "")).first();
  if (!row) throw new Error("not_found");
  const fields = readFields(body, { partial: true });
  if (fields.phone && fields.phone !== row.phone) {
    const other = await env.DB.prepare("SELECT id FROM crm_contacts WHERE phone=?1 AND archived=0 AND id<>?2 LIMIT 1").bind(fields.phone, row.id).first();
    if (other) throw new Error("phone_exists");
  }
  const merged = { ...row, ...fields };
  let next = row.next_follow_at;
  if ("followDays" in body) next = followDate(body.followDays, now);
  if ("nextFollowAt" in body) {
    const value = String(body.nextFollowAt || "");
    next = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }
  let history = row.history_json;
  if (fields.stage && fields.stage !== row.stage) {
    history = addHistory(history, { at: now.toISOString(), type: "etapa", text: fields.stage });
  }
  const time = next === row.next_follow_at ? validTime(row.follow_time) : "";
  await env.DB.prepare(
    `UPDATE crm_contacts SET name=?2,business=?3,phone=?4,interest=?5,stage=?6,notes=?7,next_follow_at=?8,history_json=?9,updated_at=?10,niche=?11,follow_time=?12,instagram=?13 WHERE id=?1`
  ).bind(row.id, merged.name, merged.business, merged.phone, merged.interest, merged.stage, merged.notes, next, history, now.toISOString(), merged.niche || "", time, "instagram" in fields ? fields.instagram : savedInstagram(row)).run();
  return { ok: true, contact: await getContact(env, row.id, now) };
}

// "Já falei": registra o contato de hoje e marca a próxima volta.
export async function markContacted(env, id, body = {}, now = new Date()) {
  await ensureCrmSchema(env);
  const row = await env.DB.prepare("SELECT * FROM crm_contacts WHERE id=?1 AND archived=0 LIMIT 1").bind(String(id || "")).first();
  if (!row) throw new Error("not_found");
  const days = "followDays" in body ? body.followDays : 7;
  const next = followDate(days, now);
  const note = cleanNotes(body.note || "").slice(0, 300);
  const history = addHistory(row.history_json, { at: now.toISOString(), type: "falei", text: note || "Mensagem enviada" });
  await env.DB.prepare(
    `UPDATE crm_contacts SET last_contact_at=?2,next_follow_at=?3,follow_time='',follow_count=follow_count+CASE WHEN stage='chamar' THEN 0 ELSE 1 END,
       stage=CASE WHEN stage='chamar' THEN 'contato' ELSE stage END,history_json=?4,updated_at=?2 WHERE id=?1`
  ).bind(row.id, now.toISOString(), next, history).run();
  return { ok: true, contact: await getContact(env, row.id, now) };
}

// "Lembrar quando abrir": a volta fica para o próximo horário em que a empresa abre.
export async function remindWhenOpen(env, id, now = new Date()) {
  await ensureCrmSchema(env);
  const row = await env.DB.prepare("SELECT * FROM crm_contacts WHERE id=?1 AND archived=0 LIMIT 1").bind(String(id || "")).first();
  if (!row) throw new Error("not_found");
  const st = hoursStatus(readWeek(row.hours_json), now);
  const day = st.openNow ? brasiliaDay(now) : st.nextOpenDay;
  const time = st.openNow ? "" : st.nextOpenTime || "";
  const history = addHistory(row.history_json, { at: now.toISOString(), type: "lembrete", text: st.openNow ? "Aberta agora" : "Lembrar quando abrir: " + st.label.replace(/^.*· /, "") });
  await env.DB.prepare("UPDATE crm_contacts SET next_follow_at=?2,follow_time=?3,history_json=?4,updated_at=?5 WHERE id=?1")
    .bind(row.id, day || brasiliaDay(now, 1), time, history, now.toISOString()).run();
  return { ok: true, contact: await getContact(env, row.id, now) };
}

// Caçador do Master: empresa fechada agora → entra no CRM em "Para chamar", na hora em que abre.
export async function addProspectLater(env, prospect = {}, message = "", now = new Date()) {
  const phone = normalizePhone(prospect.phone);
  if (!phone) throw new Error("phone_invalid");
  await ensureCrmSchema(env);
  const existing = await findByPhone(env, phone);
  if (existing) { await remindWhenOpen(env, existing.id, now).catch(() => null); return { ok: true, id: existing.id, existed: true }; }
  const week = readWeek(prospect.hours);
  const st = hoursStatus(week, now);
  const created = await createContact(env, {
    name: prospect.name, business: prospect.name, phone, stage: "chamar", interest: "", niche: prospect.niche || "",
    notes: "Achado pelo Caçador" + (prospect.city ? " · " + clean(prospect.city, 60) : "") + " · estava fechada",
    source: "cacador", sourceId: prospect.id || "", instagram: normalizeInstagram(prospect.instagram), draft: message,
    followAt: st.openNow ? brasiliaDay(now) : st.nextOpenDay || brasiliaDay(now, 1),
    followTime: st.openNow ? "" : st.nextOpenTime || "", hours: week
  }, now);
  return { ok: true, id: created.contact.id, when: st.label };
}

// Arquivar (não apaga de vez): some da lista, mas o histórico fica guardado.
export async function archiveContact(env, id, now = new Date()) {
  await ensureCrmSchema(env);
  const result = await env.DB.prepare("UPDATE crm_contacts SET archived=1,updated_at=?2 WHERE id=?1 AND archived=0")
    .bind(String(id || ""), now.toISOString()).run();
  if (!Number(result?.meta?.changes || 0)) throw new Error("not_found");
  return { ok: true, id: String(id) };
}

export async function listContacts(env, { stage = "", q = "" } = {}, now = new Date()) {
  await ensureCrmSchema(env);
  const today = brasiliaDay(now);
  const rows = (await env.DB.prepare(
    "SELECT * FROM crm_contacts WHERE archived=0 ORDER BY CASE WHEN next_follow_at IS NULL THEN 1 ELSE 0 END, next_follow_at ASC, updated_at DESC LIMIT 500"
  ).all())?.results || [];
  const showcase = rows.some(row => row.niche) ? await readShowcase(env) : null;
  const all = rows.map(row => view(row, today, showcase, now));
  const counts = Object.fromEntries(CRM_STAGES.map(s => [s, 0]));
  for (const c of all) counts[c.stage] = (counts[c.stage] || 0) + 1;
  const term = clean(q, 60).toLowerCase();
  const digits = term.replace(/\D/g, "");
  const filtered = all.filter(c => (!stage || c.stage === stage) && (!term ||
    c.name.toLowerCase().includes(term) || c.business.toLowerCase().includes(term) || (digits.length >= 4 && c.phone.includes(digits))));
  return {
    ok: true, today, total: all.length, counts,
    due: all.filter(c => c.due),
    week: all.filter(c => c.nextFollowAt && !c.due && c.nextFollowAt <= brasiliaDay(now, 7)).length,
    contacts: filtered
  };
}

async function findByPhone(env, phone) {
  const list = phoneVariants(phone);
  const marks = list.map((_, i) => "?" + (i + 1)).join(",");
  return env.DB.prepare(`SELECT * FROM crm_contacts WHERE archived=0 AND phone IN (${marks}) LIMIT 1`).bind(...list).first();
}

// Quem escreve para o número da Flow (Meta): entra no CRM; se já estava em "mandei mensagem", vira "conversando".
// Já está no CRM (pelo número ou pelo código do mapa)?
export async function crmKnows(env, { phone = "", sourceId = "" } = {}) {
  await ensureCrmSchema(env);
  if (sourceId) {
    const bySource = await env.DB.prepare("SELECT id FROM crm_contacts WHERE source_id=?1 LIMIT 1").bind(String(sourceId)).first();
    if (bySource) return true;
  }
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const list = phoneVariants(normalized);
  const marks = list.map((_, i) => "?" + (i + 1)).join(",");
  return Boolean(await env.DB.prepare(`SELECT id FROM crm_contacts WHERE phone IN (${marks}) LIMIT 1`).bind(...list).first());
}

export async function addFromWhatsApp(env, { phone, name } = {}, now = new Date()) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, skipped: "phone_invalid" };
  await ensureCrmSchema(env);
  const row = await findByPhone(env, normalized);
  if (row) {
    if (row.stage === "contato") {
      const history = addHistory(row.history_json, { at: now.toISOString(), type: "respondeu", text: "Respondeu no WhatsApp da Flow" });
      await env.DB.prepare("UPDATE crm_contacts SET stage='conversando',history_json=?2,updated_at=?3 WHERE id=?1").bind(row.id, history, now.toISOString()).run();
    }
    return { ok: true, id: row.id, existed: true };
  }
  const created = await createContact(env, {
    name: clean(name, 80) || "Contato do WhatsApp", phone: normalized, stage: "conversando",
    notes: "Chamou no WhatsApp da Flow", source: "whatsapp-flow", followDays: 7
  }, now);
  return { ok: true, id: created.contact.id };
}

// Configuração do CRM: por qual número mandar e a mensagem modelo da Meta.
const SETTINGS_DEFAULT = { via: "pessoal", templateName: "", templateLang: "pt_BR", templateUsesName: true };
export async function getCrmSettings(env) {
  await ensureCrmSchema(env);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_settings (id TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const row = await env.DB.prepare("SELECT value_json FROM crm_settings WHERE id='main'").first();
  let saved = {};
  try { saved = JSON.parse(row?.value_json || "{}"); } catch {}
  return { ...SETTINGS_DEFAULT, ...saved };
}

export async function saveCrmSettings(env, body = {}) {
  const current = await getCrmSettings(env);
  const next = { ...current };
  if ("via" in body) next.via = body.via === "flow" ? "flow" : "pessoal";
  if ("templateName" in body) {
    const name = String(body.templateName || "").trim().toLowerCase();
    if (name && !/^[a-z0-9_]{1,512}$/.test(name)) throw new Error("template_name_invalid");
    next.templateName = name;
  }
  if ("templateLang" in body) next.templateLang = /^[a-z]{2}(_[A-Z]{2})?$/.test(String(body.templateLang || "")) ? String(body.templateLang) : "pt_BR";
  if ("templateUsesName" in body) next.templateUsesName = Boolean(body.templateUsesName);
  await env.DB.prepare(
    "INSERT INTO crm_settings(id,value_json,updated_at) VALUES('main',?1,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP"
  ).bind(JSON.stringify(next)).run();
  return { ok: true, settings: next };
}

// Quem o Rodrigo chamou pelo Caçador entra no CRM sozinho, com volta em 7 dias.
export async function addFromProspect(env, prospect = {}, now = new Date()) {
  const phone = normalizePhone(prospect.phone);
  if (!phone) return { ok: false, skipped: "phone_invalid" };
  await ensureCrmSchema(env);
  const existing = await findByPhone(env, phone);
  if (existing) return { ok: true, id: existing.id, existed: true };
  const created = await createContact(env, {
    name: prospect.name, business: prospect.name, phone, stage: "contato", interest: "",
    notes: prospect.city ? "Achado pelo Caçador · " + clean(prospect.city, 60) : "Achado pelo Caçador",
    source: "cacador", sourceId: prospect.id || "", instagram: normalizeInstagram(prospect.instagram), followDays: 7, niche: prospect.niche || ""
  }, now);
  return { ok: true, id: created.contact.id };
}

export const CRM_MESSAGES = {
  name_required: "Escreva o nome.",
  instagram_invalid: "Informe o @ ou o link do perfil da empresa no Instagram.",
  phone_invalid: "Confira o número do WhatsApp (com DDD).",
  phone_exists: "Esse número já está no CRM.",
  stage_invalid: "Escolha a etapa.",
  not_found: "Contato não encontrado. Atualize a página.",
  template_name_invalid: "O nome do modelo só pode ter letras minúsculas, números e _ (igual aparece na Meta)."
};

// Rotas do Master. Quem chama já conferiu o login do Master.
export async function handleCrmRoute(request, env, url) {
  const send = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
  try {
    if (url.pathname === "/api/master/crm" && request.method === "GET") {
      return send(await listContacts(env, { stage: url.searchParams.get("stage") || "", q: url.searchParams.get("q") || "" }));
    }
    if (url.pathname === "/api/master/crm" && request.method === "POST") {
      return send(await createContact(env, await request.json().catch(() => ({}))));
    }
    if (url.pathname === "/api/master/crm/settings") {
      if (request.method === "GET") return send({ ok: true, settings: await getCrmSettings(env) });
      if (request.method === "POST") return send(await saveCrmSettings(env, await request.json().catch(() => ({}))));
    }
    const match = url.pathname.match(/^\/api\/master\/crm\/([^/]+)(?:\/(contacted|archive|when-open))?$/);
    if (match && request.method === "POST") {
      const id = decodeURIComponent(match[1]);
      const body = await request.json().catch(() => ({}));
      if (match[2] === "contacted") return send(await markContacted(env, id, body));
      if (match[2] === "archive") return send(await archiveContact(env, id));
      if (match[2] === "when-open") return send(await remindWhenOpen(env, id));
      return send(await updateContact(env, id, body));
    }
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, id: error?.id, message: CRM_MESSAGES[code] || "Não deu certo. Tente de novo." }, code === "not_found" ? 404 : 400);
  }
  return null;
}
