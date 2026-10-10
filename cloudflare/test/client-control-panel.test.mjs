import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("client portal exposes minimal video, Instagram and logo navigation", async () => {
  const [html, js, portal, index, wrangler] = await Promise.all([
    readFile(new URL("../../public/portal.html", import.meta.url), "utf8"),
    readFile(new URL("../../public/client-lite.js", import.meta.url), "utf8"),
    readFile(new URL("../src/portal.js", import.meta.url), "utf8"),
    readFile(new URL("../src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);

  assert.match(html, /data-tab="videos"/);
  assert.match(html, /data-tab="instagram"/);
  assert.match(html, /data-tab="logo"/);
  assert.doesNotMatch(html, /data-tab="overview"/);
  assert.doesNotMatch(html, /data-tab="posts"/);
  assert.doesNotMatch(html, /data-tab="agents"/);
  assert.doesNotMatch(html, /data-tab="campaigns"/);
  assert.doesNotMatch(html, /data-tab="performance"/);
  assert.equal((html.match(/id="logo-form"/g) || []).length, 1);
  assert.match(html, /id="media-upload-form"/);
  assert.match(html, /id="video-job-list"/);
  assert.doesNotMatch(html, /id="upload-title"/);
  assert.doesNotMatch(html, /id="upload-overview"/);
  assert.doesNotMatch(js, /Informe título e sinopse para aplicar o modelo/);
  assert.doesNotMatch(js, /Informe título e sinopse para aplicar o card/);
  assert.match(portal, /inferCatalogMetadataFromUpload/);
  assert.match(js, /async function loadVideoJobs\(/);
  assert.match(js, /Gerar vídeo agora/);
  assert.match(js, /AGUARDANDO AÇÃO/);
  assert.match(js, /MP4 original salvo\. Clique em Gerar vídeo agora para iniciar o 9:16\./);
  assert.doesNotMatch(js, /PRONTO PARA GERAR/);
  assert.match(js, /Baixar vídeo 9:16/);
  assert.match(js, /let pendingUploadMetadata = null/);
  assert.match(js, /pendingUploadMetadata \|\| selectedCatalog/);
  assert.match(js, /MAX_VIDEO_UPLOAD_BYTES = 90 \* 1024 \* 1024/);
  assert.match(html, /class="video-status-dock"/);
  assert.match(html, /id="video-render-profile"/);
  assert.match(html, /id="video-mode-switch"/);
  assert.match(html, /data-video-mode="auto"/);
  assert.match(html, /data-video-mode="edit"/);
  assert.match(html, /id="video-editor-panel"/);
  assert.match(html, /id="video-trim-start"/);
  assert.match(html, /id="video-trim-end"/);
  assert.match(html, /id="video-custom-text"/);
  assert.match(js, /function setVideoCreationMode\(mode\)/);
  // Editable preview and draggable cut strip must remain live and wired.
  assert.match(html, /id="video-text-preview"/);
  assert.match(html, /data-logo-nudge="left"/);
  assert.match(html, /data-logo-nudge="right"/);
  assert.match(html, /data-logo-nudge="up"/);
  assert.match(html, /data-logo-nudge="down"/);
  assert.match(js, /function refreshTextPreview\(\)/);
  assert.match(js, /function adjustLogoFine\(direction\)/);
  assert.match(js, /video-trim-handle/);
  assert.match(js, /setPointerCapture/);
  assert.match(js, /logoOffsetX/);
  assert.match(js, /logoOffsetY/);
  assert.match(portal, /logoOffsetX:/);
  assert.match(portal, /logoOffsetY:/);

  // A single-element querySelector result has no .forEach(); this used to crash
  // DOMContentLoaded and prevent upload, editor and Instagram handlers binding.
  assert.doesNotMatch(js, /\$\("\[data-logo-position\]",\s*\$\("#video-logo-position"\)\)\.forEach/);
  assert.ok((js.match(/\$\$\("#video-logo-position \[data-logo-position\]"\)\.forEach/g) || []).length >= 1);
  assert.match(js, /VIDEO_FRAME_SECONDS = 1 \/ 30/);
  assert.doesNotMatch(html, /id="video-render-duration"/);
  assert.match(js, /video-progress-row/);
  assert.match(js, /renderProfile/);
  assert.match(js, /TRAILER COMPLETO/);
  assert.match(js, /generate\.textContent = "Gerar vídeo"/);
  assert.match(js, /action: useLocalHelper \? "local_generate" : "server_generate"/);
  assert.doesNotMatch(js, /window\.open\(/);
  assert.match(js, /fetch\("http:\/\/127\.0\.0\.1:8765\/handoff"/);
  assert.match(js, /Assistir trailer no YouTube/);
  assert.match(js, /AbortSignal\.timeout\(30000\)/);
  assert.match(js, /function trailerContentFallback\(\)/);
  assert.match(js, /lastTrailerQuery/);
  assert.match(js, /youtube-action-status/);
  assert.doesNotMatch(js, /Selecione o filme ou série na lista de títulos antes de gerar o vídeo/);
  assert.doesNotMatch(js, /Selecione o filme ou série na lista de títulos antes de baixar/);
  assert.match(portal, /downloadOnly: action === "download"/);
  assert.match(portal, /const directSourceUrl = catalogPreviewUrl\(metadata\.previewUrl\)/);
  assert.match(portal, /const sourceProvider = directSourceUrl \? "catalog-preview" : "youtube"/);
  assert.match(portal, /const sourceUrl = directSourceUrl \|\| youtubeSourceUrl/);
  assert.doesNotMatch(portal, /youtubeBlocked: true/);
  assert.match(portal, /videoSourceDownloadMatch/);
  assert.match(portal, /sourceDownloadUrl/);
  assert.match(js, /function formatBrazilWhatsapp\(value\)/);
  assert.match(js, /local\.slice\(0, -4\) \+ "-" \+ local\.slice\(-4\)/);
  assert.match(portal, /function normalizeBrazilWhatsapp\(value\)/);
  assert.match(portal, /Informe um WhatsApp brasileiro com DDD/);
  assert.match(portal, /renderProfile/);
  assert.ok(html.indexOf('id="video-job-list"') < html.indexOf('id="trailer-search-form"'));
  assert.match(html, /class="video-status-dock"[\s\S]*id="video-job-list"[\s\S]*id="trailer-search-form"/);
  assert.match(html, /Buscar vídeo no YouTube/);
  assert.match(js, /trailerContentFallback/);
  assert.match(js, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(portal, /trailer oficial selecionado no YouTube/);
  assert.match(portal, /SET status='failed',result_json=\?3,updated_at=CURRENT_TIMESTAMP WHERE id=\?1 AND client_id=\?2/);
  assert.match(portal, /Pôster oficial ainda indisponível\. O MP4 original foi preservado/);
  assert.match(js, /Acompanhe aqui\. Não precisa rolar a página\./);
  assert.match(portal, /const maxBytes = 90 \* 1024 \* 1024/);
  assert.match(portal, /env\.MEDIA\.put\(key, file\.stream\(\)/);
  assert.match(index, /"\/portal", "\/portal\.html"/);
  assert.match(index, /no-store, no-cache, must-revalidate/);
  assert.match(wrangler, /"\/portal\*"/);
  assert.match(wrangler, /"\/client-lite\.js"/);
  assert.match(portal, /postDecisionMatch/);
  assert.match(portal, /postRevisionMatch/);
  assert.equal(portal.includes("/decision"), true);
  assert.equal(portal.includes("/revision"), true);
  assert.match(portal, /pendingApproval/);
  assert.match(portal, /correctionRequested/);
});

test("render draws WhatsApp once per scene, and respects fine logo offsets", async () => {
  const [promo, workflow] = await Promise.all([
    readFile(new URL("../../scripts/build_promo_card.py", import.meta.url), "utf8"),
    readFile(new URL("../../.github/workflows/video-template-render.yml", import.meta.url), "utf8")
  ]);
  // The watermark overlay owns the single badge during the trailer.
  // Final CTA covers the body and owns its own single contact badge.
  const launch = promo.split("def draw_launch_scene(")[1].split("def initials_avatar(")[0];
  const reviews = promo.split("def draw_reviews_scene(")[1].split("def draw_related_scene(")[0];
  const watermark = promo.split("def draw_watermark_scene(")[1].split("def draw_cta_scene(")[0];
  const cta = promo.split("def draw_cta_scene(")[1].split("def main(")[0];
  assert.doesNotMatch(launch, /draw_contact_badge\(/);
  assert.doesNotMatch(reviews, /draw_contact_badge\(/);
  assert.equal((watermark.match(/draw_contact_badge\(/g) || []).length, 1);
  assert.equal((cta.match(/draw_contact_badge\(/g) || []).length, 1);
  assert.match(workflow, /LOGO_X_OFFSET/);
  assert.match(workflow, /LOGO_Y_OFFSET/);
});
