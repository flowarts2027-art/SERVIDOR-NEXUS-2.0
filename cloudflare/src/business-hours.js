// Horário de funcionamento das empresas achadas pelo Caçador e pelo Captador (pedido de 18/10).
// Semana = 7 listas (domingo=0 … sábado=6) de intervalos [início, fim] em minutos do dia, hora de Brasília.
// Fim maior que 1440 = passa da meia-noite. Sem horário conhecido, vale o horário comercial.

const TZ_OFFSET_MIN = -180; // Brasília (sem horário de verão)
const DAY = 1440;
const OSM_DAYS = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Horário comercial: segunda a sábado, 9h às 18h.
export const COMMERCIAL_WEEK = [[], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 1080]], [[540, 1080]]];

const empty = () => [[], [], [], [], [], [], []];
const hm = text => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || "").trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h <= 24 && min < 60 ? h * 60 + min : null;
};

function dayList(spec) {
  const out = [];
  for (const part of spec.split(",")) {
    const range = /^(Su|Mo|Tu|We|Th|Fr|Sa)(?:-(Su|Mo|Tu|We|Th|Fr|Sa))?$/.exec(part.trim());
    if (!range) return null;
    const a = OSM_DAYS[range[1]], b = range[2] ? OSM_DAYS[range[2]] : a;
    for (let d = a; ; d = (d + 1) % 7) { out.push(d); if (d === b) break; }
  }
  return out;
}

// Formato do OpenStreetMap: "Mo-Fr 08:00-18:00; Sa 08:00-12:00", "24/7", "Mo-Su 10:00-14:00,18:00-23:00".
// O que não der para ler devolve null (aí vale o horário comercial).
export function parseOsmHours(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^24\/7$/.test(text)) return Array.from({ length: 7 }, () => [[0, DAY]]);
  const week = empty();
  let any = false;
  for (const rule of text.split(";").map(r => r.trim()).filter(Boolean)) {
    if (/^PH\b/.test(rule)) continue; // feriado: ignora
    const m = /^((?:(?:Su|Mo|Tu|We|Th|Fr|Sa)(?:-(?:Su|Mo|Tu|We|Th|Fr|Sa))?,?)+)\s+(.+)$/.exec(rule);
    const days = m ? dayList(m[1].replace(/,$/, "")) : null;
    const times = m ? m[2].trim() : rule;
    const list = days || (/^\d/.test(rule) ? [0, 1, 2, 3, 4, 5, 6] : null);
    if (!list) return null;
    if (/^(off|closed)$/i.test(times)) { for (const d of list) week[d] = []; continue; }
    const spans = [];
    for (const span of times.split(",")) {
      const [a, b] = span.split("-").map(hm);
      if (a === null || b === null || a === undefined || b === undefined) return null;
      spans.push([a, b <= a ? b + DAY : b]);
    }
    for (const d of list) week[d] = spans.map(s => [...s]);
    any = true;
  }
  return any ? week : null;
}

// Formato do Google (regularOpeningHours.periods): {open:{day,hour,minute}, close:{day,hour,minute}}.
export function googleHours(regular) {
  const periods = Array.isArray(regular?.periods) ? regular.periods : [];
  if (!periods.length) return null;
  const week = empty();
  for (const p of periods) {
    const od = Number(p?.open?.day), oh = Number(p?.open?.hour || 0), om = Number(p?.open?.minute || 0);
    if (!Number.isInteger(od) || od < 0 || od > 6) continue;
    const start = oh * 60 + om;
    if (!p.close) { week[od].push([0, DAY]); continue; } // aberto 24 h
    const cd = Number(p.close.day), end = Number(p.close.hour || 0) * 60 + Number(p.close.minute || 0);
    const span = ((cd - od + 7) % 7) * DAY + end;
    week[od].push([start, span > start ? span : span + 7 * DAY]);
  }
  return week.some(d => d.length) ? week : null;
}

function local(now) {
  const t = new Date(now.getTime() + TZ_OFFSET_MIN * 60000);
  return { day: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes(), midnightUtc: Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - TZ_OFFSET_MIN * 60000 };
}

const two = n => String(n).padStart(2, "0");
const clock = min => two(Math.floor((min % DAY) / 60)) + ":" + two(min % 60);

// Aberta agora? Se não, quando abre (até 7 dias à frente).
export function hoursStatus(week, now = new Date()) {
  const guessed = !Array.isArray(week);
  const w = guessed ? COMMERCIAL_WEEK : week;
  const { day, min, midnightUtc } = local(now);
  // Intervalo de ontem que passa da meia-noite também conta.
  for (const [a, b] of w[(day + 6) % 7] || []) if (b > DAY && min < b - DAY) return { openNow: true, guessed, label: guessed ? "Horário comercial" : "Aberta agora" };
  for (const [a, b] of w[day] || []) if (min >= a && min < b) return { openNow: true, guessed, label: guessed ? "Horário comercial" : "Aberta agora" };
  for (let k = 0; k < 8; k++) {
    const d = (day + k) % 7;
    const starts = (w[d] || []).map(s => s[0]).filter(a => k > 0 || a > min).sort((x, y) => x - y);
    if (!starts.length) continue;
    const at = new Date(midnightUtc + (k * DAY + starts[0]) * 60000);
    const when = k === 0 ? "hoje" : k === 1 ? "amanhã" : DAY_NAMES[d];
    return {
      openNow: false, guessed, nextOpenAt: at.toISOString(),
      nextOpenDay: new Date(at.getTime() + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10),
      nextOpenTime: clock(starts[0]),
      label: (guessed ? "Fora do horário comercial" : "Fechada") + ` · abre ${when} às ${clock(starts[0])}`
    };
  }
  return { openNow: false, guessed, label: "Fechada" };
}

// Liga o status ao contato (para a tela).
export function withHours(item, week, now = new Date()) {
  const status = hoursStatus(week, now);
  return { ...item, hours: Array.isArray(week) ? week : null, openNow: status.openNow, hoursLabel: status.label,
    hoursGuessed: status.guessed, nextOpenAt: status.nextOpenAt || null, nextOpenDay: status.nextOpenDay || null, nextOpenTime: status.nextOpenTime || null };
}

// Semana guardada em JSON (CRM, Captador) volta a ser semana, ou null.
export function readWeek(text) {
  try {
    const w = typeof text === "string" ? JSON.parse(text || "null") : text;
    return Array.isArray(w) && w.length === 7 && w.every(d => Array.isArray(d)) ? w : null;
  } catch { return null; }
}
