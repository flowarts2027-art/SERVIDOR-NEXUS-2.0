// Agente "Texto nas artes" (pedido do Rodrigo, 29/10/2026: "não quero ficar pedindo todo dia").
// A cada minuto (1 post por vez, para caber no tempo do cron) passa em TODOS os painéis, nos posts que ainda não saíram. Imagem sem texto
// ganha a moldura do cliente (logo, título, vantagens e botão), escrita pelo Nexus, sem cortar a foto.
// Imagem que já tem texto fica como está. Cada post é conferido uma vez só (formatBuild.artChecked).
// Vídeo e capa de Reels não mudam. Post que já saiu ou está saindo não muda.

import { loadFrames, hasFrames, pickFrame, composeFramed, imageHasText, TEXT_CHECK_VERSION } from "./art-frame.js";

const OPEN_POSTS_SQL = `SELECT id, client_id, scheduled_for, payload_json FROM post_ledger
  WHERE COALESCE(status,'') NOT IN ('published','publishing') AND COALESCE(status,'') NOT LIKE 'cancel%'
  AND COALESCE(approval_status,'') <> 'rejected'
  AND (scheduled_for IS NULL OR scheduled_for >= ?1)
  AND COALESCE(json_extract(payload_json,'$.formatBuild.artCheckVersion'),0) < ${TEXT_CHECK_VERSION}
  AND NOT (json_extract(payload_json,'$.formatBuild.artChecked') = 1 AND json_extract(payload_json,'$.formatBuild.artText') IS NULL)
  AND instr(payload_json,'texto-do-nexus') = 0
  AND json_extract(payload_json,'$.formatBuild.videoUrl') IS NULL
  AND json_extract(payload_json,'$.formatBuild.kind') IN ('post','carousel','story')
  ORDER BY scheduled_for ASC LIMIT ?2`;

function mediaKey(url) {
  const i = String(url || "").indexOf("/media/");
  return i >= 0 ? String(url).slice(i + 7) : "";
}

async function markChecked(env, row, payload, report) {
  payload.formatBuild = { ...(payload.formatBuild || {}), artChecked: true, artCheckVersion: TEXT_CHECK_VERSION, ...(report.length ? { artText: report } : {}) };
  await env.DB.prepare(
    "UPDATE post_ledger SET payload_json=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2 AND COALESCE(status,'') NOT IN ('published','publishing')"
  ).bind(JSON.stringify(payload), String(row.id)).run();
}

export async function fixArtTextInOpenPosts(env, { now = new Date(), limit = 1 } = {}) {
  const result = { checked: 0, framed: 0, keptText: 0, failed: 0 };
  if (!env?.DB || !env?.MEDIA || !env?.IMAGES) return result;
  const frames = await loadFrames(env).catch(() => null);
  const rows = (await env.DB.prepare(OPEN_POSTS_SQL).bind(now.toISOString(), limit).all().catch(() => ({ results: [] })))?.results || [];
  for (const row of rows) {
    let payload;
    try { payload = JSON.parse(row.payload_json || "{}"); } catch { continue; }
    const build = payload.formatBuild || {};
    const report = [];
    result.checked++;
    if (!frames || !hasFrames(frames, row.client_id)) { await markChecked(env, row, payload, report); continue; }
    const story = build.kind === "story";
    const urls = build.kind === "carousel" && Array.isArray(build.carouselUrls) ? build.carouselUrls : [payload.imageUrl || build.imageUrl];
    let text = JSON.stringify(payload);
    let seed = Number(String(row.id).replace(/\D/g, "").slice(0, 6)) || 0;
    for (let i = 0; i < urls.length; i++) {
      const key = mediaKey(urls[i]);
      const obj = key ? await env.MEDIA.get(key).catch(() => null) : null;
      if (!obj) { report.push("sem-arquivo"); continue; }
      const bytes = new Uint8Array(await obj.arrayBuffer());
      if (await imageHasText(env, bytes)) { report.push("ja-tinha-texto"); result.keptText++; continue; }
      try {
        const frame = pickFrame(frames, row.client_id, story, seed++);
        const out = await composeFramed(env, bytes, frame, { story, numero: build.kind === "carousel" && i < 5 ? i + 1 : null });
        const newKey = key.replace(/\.jpg$/i, "") + "-texto-" + Date.now().toString(36) + ".jpg";
        await env.MEDIA.put(newKey, out, {
          httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" },
          customMetadata: { clientId: String(row.client_id), postId: String(row.id), kind: "art-text-fix" }
        });
        text = text.split("/media/" + key).join("/media/" + newKey);
        report.push("texto-do-nexus");
        result.framed++;
      } catch (error) {
        console.error("art_text_fix_failed", { post: row.id, error: String(error?.message || error) });
        report.push("sem-texto-erro");
        result.failed++;
      }
    }
    await markChecked(env, row, JSON.parse(text), report);
  }
  return result;
}
