// Agente "Texto nas artes" (pedido do Rodrigo, 29/10/2026: "não quero ficar pedindo todo dia").
// Passa em TODOS os painéis, nos posts que ainda não saíram. Imagem sem texto ganha a moldura do cliente
// (logo, título, vantagens e botão), escrita pelo Nexus, sem cortar a foto. Imagem que já tem texto fica.
// Vídeo e capa de Reels não mudam. Post que já saiu ou está saindo não muda.
//
// v3 (29/10 22h20): o cron de 1 minuto tem pouco tempo. Conferir + escrever tudo de uma vez estourava o
// limite e nada era salvo (o mesmo post travava a fila). Agora cada rodada faz UM passo só e salva:
//   passo "conferir" (IA: já tem texto?) de uma imagem, ou passo "escrever" (moldura) de uma imagem.
// O progresso fica em formatBuild.artSteps. Post que falha 4 vezes é marcado e a fila anda.

import { loadFrames, hasFrames, pickFrame, composeFramed, imageHasText, TEXT_CHECK_VERSION } from "./art-frame.js";

const MAX_TRIES = 4;

const OPEN_POSTS_SQL = `SELECT id, client_id, scheduled_for, payload_json FROM post_ledger
  WHERE COALESCE(status,'') NOT IN ('published','publishing') AND COALESCE(status,'') NOT LIKE 'cancel%'
  AND COALESCE(approval_status,'') <> 'rejected'
  AND (scheduled_for IS NULL OR scheduled_for >= ?1)
  AND COALESCE(json_extract(payload_json,'$.formatBuild.artCheckVersion'),0) < ${TEXT_CHECK_VERSION}
  AND NOT (json_extract(payload_json,'$.formatBuild.artChecked') = 1 AND json_extract(payload_json,'$.formatBuild.artText') IS NULL)
  AND instr(COALESCE(json_extract(payload_json,'$.formatBuild.artText'),''),'texto-do-nexus') = 0
  AND json_extract(payload_json,'$.formatBuild.videoUrl') IS NULL
  AND json_extract(payload_json,'$.formatBuild.kind') IN ('post','carousel','story')
  ORDER BY COALESCE(json_extract(payload_json,'$.formatBuild.artTries'),0) ASC, scheduled_for ASC LIMIT ?2`;

function mediaKey(url) {
  const i = String(url || "").indexOf("/media/");
  return i >= 0 ? String(url).slice(i + 7) : "";
}

async function save(env, id, payload) {
  await env.DB.prepare(
    "UPDATE post_ledger SET payload_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND COALESCE(status,'') NOT IN ('published','publishing')"
  ).bind(JSON.stringify(payload), String(id)).run();
}

function finish(payload, report) {
  const build = { ...(payload.formatBuild || {}) };
  delete build.artSteps;
  delete build.artTries;
  payload.formatBuild = { ...build, artChecked: true, artCheckVersion: TEXT_CHECK_VERSION, ...(report.length ? { artText: report } : {}) };
  return payload;
}

// Um passo por post. Devolve o que fez: "conferido", "escrito", "pronto" ou "erro".
async function step(env, frames, row, payload) {
  const build = payload.formatBuild || {};
  const urls = build.kind === "carousel" && Array.isArray(build.carouselUrls) ? build.carouselUrls : [payload.imageUrl || build.imageUrl];
  const steps = Array.isArray(build.artSteps) && build.artSteps.length === urls.length ? build.artSteps : urls.map(() => "");
  const tries = Number(build.artTries || 0);

  if (!frames || !hasFrames(frames, row.client_id) || tries >= MAX_TRIES) {
    const report = tries >= MAX_TRIES ? steps.map(s => s === "texto-do-nexus" || s === "ja-tinha-texto" ? s : "sem-texto-erro") : [];
    await save(env, row.id, finish(payload, report));
    return tries >= MAX_TRIES ? "erro" : "pronto";
  }

  // Marca a tentativa ANTES do trabalho: se a rodada for cortada no meio, a fila anda na próxima.
  payload.formatBuild = { ...build, artSteps: steps, artTries: tries + 1 };
  await save(env, row.id, payload);

  const toCheck = steps.findIndex(s => !s);
  const toFrame = steps.findIndex(s => s === "precisa");
  const i = toCheck >= 0 ? toCheck : toFrame;
  if (i < 0) {
    await save(env, row.id, finish(payload, steps));
    return "pronto";
  }
  const key = mediaKey(urls[i]);
  const obj = key ? await env.MEDIA.get(key).catch(() => null) : null;
  if (!obj) {
    steps[i] = "sem-arquivo";
  } else if (toCheck >= 0) {
    const bytes = new Uint8Array(await obj.arrayBuffer());
    steps[i] = (await imageHasText(env, bytes)) ? "ja-tinha-texto" : "precisa";
  } else {
    const story = build.kind === "story";
    const seed = (Number(String(row.id).replace(/\D/g, "").slice(0, 6)) || 0) + i;
    const frame = pickFrame(frames, row.client_id, story, seed);
    const out = await composeFramed(env, new Uint8Array(await obj.arrayBuffer()), frame, { story, numero: build.kind === "carousel" && i < 5 ? i + 1 : null });
    const newKey = key.replace(/\.jpg$/i, "") + "-texto-" + Date.now().toString(36) + ".jpg";
    await env.MEDIA.put(newKey, out, {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { clientId: String(row.client_id), postId: String(row.id), kind: "art-text-fix" }
    });
    payload = JSON.parse(JSON.stringify(payload).split("/media/" + key).join("/media/" + newKey));
    steps[i] = "texto-do-nexus";
  }
  // Passo feito: zera as tentativas e salva o progresso.
  payload.formatBuild = { ...payload.formatBuild, artSteps: steps, artTries: 0 };
  const done = steps.every(s => s && s !== "precisa");
  await save(env, row.id, done ? finish(payload, steps) : payload);
  return toCheck >= 0 ? "conferido" : "escrito";
}

export async function fixArtTextInOpenPosts(env, { now = new Date(), limit = 1 } = {}) {
  const result = { steps: [] };
  if (!env?.DB || !env?.MEDIA || !env?.IMAGES) return result;
  const frames = await loadFrames(env).catch(() => null);
  const rows = (await env.DB.prepare(OPEN_POSTS_SQL).bind(now.toISOString(), limit).all().catch(() => ({ results: [] })))?.results || [];
  for (const row of rows) {
    let payload;
    try { payload = JSON.parse(row.payload_json || "{}"); } catch { continue; }
    try {
      result.steps.push(await step(env, frames, row, payload));
    } catch (error) {
      console.error("art_text_fix_failed", { post: row.id, error: String(error?.message || error) });
      result.steps.push("erro");
    }
  }
  return result;
}
