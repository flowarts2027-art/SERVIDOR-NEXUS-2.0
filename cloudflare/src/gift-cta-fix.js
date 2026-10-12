// Coloca o "Comente QUERO" (brinde) nos posts que já estavam prontos e ainda não saíram.
// Roda no cron de 15 minutos; só mexe em post não publicado de cliente com brinde configurado.
import { clientBrand } from "./client-brand.js";
import { ensureGiftCta, QUERO_PATTERN } from "./caption-polish.js";

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
       ORDER BY scheduled_for ASC LIMIT ?2`
    ).bind(String(row.id), limit).all().catch(() => ({ results: [] }));
    for (const post of posts?.results || []) {
      const caption = String(post.caption || "");
      if (!caption.trim() || QUERO_PATTERN.test(caption)) continue;
      const next = ensureGiftCta(caption, cta);
      if (next === caption) continue;
      await env.DB.prepare("UPDATE post_ledger SET caption = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND COALESCE(media_id,'') = ''")
        .bind(next, String(post.id)).run().catch(() => null);
      updated += 1;
    }
  }
  return { updated, statuses: OPEN_STATUSES };
}
