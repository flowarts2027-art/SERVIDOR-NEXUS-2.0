import { clientGroup, getClient } from "./clients.js";
import { findGroup, groupMembers } from "./client-groups.js";
import { clientAutoReplyConfig, saveClientAutoReplyConfig } from "./client-autoreply.js";

// Marca do cliente (Rodrigo, 05/11/2026): logo, cores e palavra do botão, sem precisar de deploy.
// Painel de grupo usa a marca do grupo, a não ser que tenha marca própria.
const LOGO_TYPES = Object.freeze({ "image/png": "png", "image/jpeg": "jpg" });
const LOGO_MAX_BYTES = 3 * 1024 * 1024;
const MIN_CONTRAST = 4.5;
const HEX = /^#[0-9a-f]{6}$/i;

export const BRAND_MESSAGES = Object.freeze({
  brand_target: "Escolha um cliente ou um grupo.",
  brand_logo_type: "A logo precisa ser PNG ou JPG.",
  brand_logo_size: "A logo pode ter no máximo 3 MB.",
  brand_color: "Escolha as três cores.",
  brand_word: "A palavra do botão precisa ser uma palavra só, sem espaço."
});

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex) {
  return [1, 3, 5].map(at => parseInt(String(hex).slice(at, at + 2), 16));
}

function toHex(values) {
  return "#" + values.map(value => Math.round(value).toString(16).padStart(2, "0")).join("");
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Cor clara demais vira uma versão mais escura, até dar para ler no fundo.
export function readableColor(hex, background = "#ffffff") {
  let values = rgb(hex);
  for (let step = 0; step < 40 && contrast(toHex(values), background) < MIN_CONTRAST; step++) values = values.map(value => value * 0.92);
  return toHex(values);
}

// Texto em cima de uma cor: preto ou branco, o que ler melhor.
export function textOn(background) {
  return contrast("#ffffff", background) >= contrast("#000000", background) ? "#ffffff" : "#000000";
}

export function cleanButtonWord(value) {
  const word = String(value || "").trim().toUpperCase();
  if (!word) return "";
  if (!/^[A-ZÀ-Ý0-9]{2,20}$/.test(word)) throw new Error("brand_word");
  return word;
}

export function cleanColors(source = {}) {
  const colors = { primary: String(source.primary || ""), accent: String(source.accent || ""), text: String(source.text || "") };
  if (!Object.values(colors).every(color => HEX.test(color))) throw new Error("brand_color");
  return { ...colors, text: readableColor(colors.text), onPrimary: textOn(colors.primary), onAccent: textOn(colors.accent) };
}

async function readGroupBrand(env, groupId) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM nexus_state WHERE namespace='group-brand' AND item_key=?1 AND client_id='' LIMIT 1"
  ).bind(String(groupId)).first().catch(() => null);
  try { return row ? JSON.parse(row.value_json) : null; } catch { return null; }
}

export async function effectiveBrand(env, client) {
  if (client?.config?.brand?.colors) return client.config.brand;
  const group = clientGroup(client);
  return group ? await readGroupBrand(env, group.id) : null;
}

async function storeLogo(env, ownerId, file) {
  const ext = LOGO_TYPES[String(file.type || "").toLowerCase()];
  if (!ext) throw new Error("brand_logo_type");
  if (!file.size || file.size > LOGO_MAX_BYTES) throw new Error("brand_logo_size");
  const key = "branding/" + ownerId + "/logo-" + crypto.randomUUID() + "." + ext;
  await env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { clientId: ownerId, kind: "brand-logo" }
  });
  return { logoKey: key, logoUrl: String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "") + "/media/" + key };
}

// Ficha no GitHub, para o ChatGPT e os agentes. Se falhar, a marca continua salva e a tela avisa.
export async function updateBrandFile(env, ownerId, brand, fetcher = fetch) {
  const token = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!token) return "sem_token";
  const repo = String(env.GITHUB_INGEST_REPOSITORY || "flowarts2027-art/SERVIDOR-NEXUS-2.0").trim();
  const url = `https://api.github.com/repos/${repo}/contents/docs/nexus-memory/clientes/${encodeURIComponent(ownerId)}/marca.json`;
  const headers = { authorization: "Bearer " + token, accept: "application/vnd.github+json", "user-agent": "nexus-worker" };
  const current = await fetcher(url + "?ref=main", { headers });
  const sha = current.ok ? String((await current.json())?.sha || "") : "";
  const content = JSON.stringify({ logo: brand.logoUrl || "", cores: brand.colors, palavraBotao: brand.buttonWord || "", atualizadoEm: brand.updatedAt }, null, 2) + "\n";
  const saved = await fetcher(url, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ message: `Marca de ${ownerId} atualizada pelo Master [skip ci]`, content: btoa(unescape(encodeURIComponent(content))), branch: "main", ...(sha ? { sha } : {}) })
  });
  return saved.ok ? "atualizada" : "erro_" + saved.status;
}

async function addKeyword(env, client, word) {
  if (!word) return;
  const current = await clientAutoReplyConfig(env, client);
  await saveClientAutoReplyConfig(env, client, { keywords: [...new Set([word, ...current.keywords])] });
}

// Cliente que entra num grupo já responde à palavra do botão do grupo.
export async function inheritBrandWord(env, client) {
  await addKeyword(env, client, (await effectiveBrand(env, client))?.buttonWord);
}

export async function saveBrand(env, form, now = new Date(), fetcher = fetch) {
  const target = String(form.get("target") || "").trim();
  const group = await findGroup(env, target);
  const client = group ? null : await getClient(env, target);
  if (!group && !client) throw new Error("brand_target");
  const ownerId = group ? "grupo-" + group.id : client.id;
  const previous = group ? await readGroupBrand(env, group.id) : client.config?.brand;
  const colors = cleanColors({ primary: form.get("primary"), accent: form.get("accent"), text: form.get("text") });
  const buttonWord = cleanButtonWord(form.get("buttonWord")) || String(previous?.buttonWord || "");
  const logo = form.get("logo");
  const stored = logo && typeof logo.arrayBuffer === "function" ? await storeLogo(env, ownerId, logo) : { logoKey: previous?.logoKey || "", logoUrl: previous?.logoUrl || "" };
  // Logo escura ganha cartão no menu. O navegador mede ao enviar, então só muda com logo nova.
  const logoDark = stored.logoKey === previous?.logoKey ? Boolean(previous?.logoDark) : form.get("logoDark") === "1";
  const brand = { ...stored, logoDark, colors, buttonWord, updatedAt: now.toISOString() };

  if (group) {
    await env.DB.prepare(
      `INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES('group-brand',?1,'',?2,CURRENT_TIMESTAMP)
       ON CONFLICT(namespace,item_key,client_id) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP`
    ).bind(group.id, JSON.stringify(brand)).run();
    for (const member of await groupMembers(env, group)) {
      const memberClient = await getClient(env, member.clientId);
      if (memberClient && !memberClient.config?.brand?.colors) await addKeyword(env, memberClient, buttonWord);
    }
  } else {
    await env.DB.prepare(
      `UPDATE clients SET config_json=json_set(CASE WHEN json_valid(config_json) THEN config_json ELSE '{}' END,'$.brand',json(?2)),updated_at=CURRENT_TIMESTAMP WHERE id=?1`
    ).bind(client.id, JSON.stringify(brand)).run();
    await addKeyword(env, client, buttonWord);
  }
  const ficha = await updateBrandFile(env, ownerId, brand, fetcher).catch(() => "erro");
  return { ok: true, brand, ficha };
}

// GET lê a marca para a aba. POST salva. Quem chama já conferiu o login do Master.
export async function handleBrand(request, env, url) {
  const send = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
  try {
    if (request.method === "GET") {
      const target = String(url.searchParams.get("target") || "");
      const group = await findGroup(env, target);
      if (group) return send({ ok: true, brand: await readGroupBrand(env, group.id) });
      const client = await getClient(env, target);
      if (!client) throw new Error("brand_target");
      return send({ ok: true, brand: client.config?.brand || null, inherited: client.config?.brand ? null : await effectiveBrand(env, client) });
    }
    if (request.method === "POST") return send(await saveBrand(env, await request.formData()));
    return send({ error: "method_not_allowed" }, 405);
  } catch (error) {
    const code = String(error?.message || error).slice(0, 60);
    return send({ ok: false, error: code, message: BRAND_MESSAGES[code] || "Não deu para salvar a marca. Tente de novo." }, 400);
  }
}
