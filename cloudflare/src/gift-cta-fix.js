// Coloca o "Comente QUERO" (brinde) nos posts prontos que ainda não saíram e tira as outras chamadas.
// Roda no cron de 15 minutos; só mexe em post não publicado de cliente com brinde configurado.
import { clientBrand } from "./client-brand.js";
import { ensureGiftCta } from "./caption-polish.js";
import { giftCtaForTopic } from "./gift-materials.js";

const OPEN_STATUSES = ["ready", "scheduled", "failed"];

export async function fixGiftCtaInOpenPosts(env, { limit = 40 } = {}) {
  const rows = await env.DB.prepare("SELECT id FROM clients WHERE status = 'online'").all().catch(() => ({ results: [] }));
  let updated = 0;
  for (const row of rows?.results || []) {
    const cta = clientBrand({ id: row.id }).giftCta;
    if (!cta) continue;
    const posts = await env.DB.prepare(
      `SELECT id, caption FROM post_ledger
       WHERE client_id = ?1 AND status IN ('ready','scheduled','failed')
         AND COALESCE(media_id,'') = '' AND COALESCE(approval_status,'') <> 'rejected'
         -- Conteúdo pronto (Rodrigo ou cliente): a legenda fica como foi escrita.
         AND COALESCE(json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,'$.manual'),0) <> 1
       ORDER BY scheduled_for ASC LIMIT ?2`
    ).bind(String(row.id), limit).all().catch(() => ({ results: [] }));
    for (const post of posts?.results || []) {
      const caption = String(post.caption || "");
      if (!caption.trim()) continue;
      const next = ensureGiftCta(caption, giftCtaForTopic(caption, cta));
      if (next === caption) continue;
      await env.DB.prepare("UPDATE post_ledger SET caption = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND COALESCE(media_id,'') = ''")
        .bind(next, String(post.id)).run().catch(() => null);
      updated += 1;
    }
  }
  return { updated, statuses: OPEN_STATUSES };
}
