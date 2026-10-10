// A database key alone is not proof that the uploaded source exists.
export async function confirmedVideoSource(env, clientId, key, expectedSize = 0) {
  if (!env.MEDIA) throw new Error("r2_unavailable");
  const value = String(key || "");
  const client = String(clientId);
  const safeClient = client.replace(/[^a-zA-Z0-9_-]+/g, "-");
  if (!value || value.includes("..") || !(
    value.startsWith("library/" + client + "/") ||
    value.startsWith("videos/" + safeClient + "/sources/")
  )) throw new Error("video_source_missing");
  const object = await env.MEDIA.head(value);
  if (!object || !Number(object.size)) throw new Error("video_source_missing");
  if (expectedSize && Number(object.size) !== Number(expectedSize)) throw new Error("video_source_size_mismatch");
  if (!/^video\/(mp4|webm|quicktime)$/.test(object.httpMetadata?.contentType || "")) throw new Error("video_source_invalid");
  if (object.customMetadata?.clientId && object.customMetadata.clientId !== client) throw new Error("video_source_invalid");
  return object;
}

export function isMp4Header(bytes) {
  const data = new Uint8Array(bytes);
  return data.length >= 12 && String.fromCharCode(...data.slice(4, 8)) === "ftyp";
}

// Dispatch accepted is not runner started. Bound unresponsive GitHub queues
// separately from actual FFmpeg render timeouts.
export function videoRenderQueueExpired(settings = {}, now = Date.now(), limitMs = 12 * 60 * 1000) {
  if (String(settings.githubRenderState || "") !== "dispatched") return false;
  const started = Date.parse(String(settings.githubRenderUpdatedAt || ""));
  return Number.isFinite(started) && now - started > limitMs;
}

export const videoErrorMessages = {
  video_poster_required: "O NEXUS não encontrou o banner/pôster oficial deste título. A geração foi bloqueada para não criar um vídeo incompleto.",
  video_official_poster_required: "O pôster oficial do filme ou série não pôde ser carregado. Selecione novamente o título no catálogo e gere o vídeo. Nenhuma cena do trailer será usada como capa.",
  video_cast_required: "O NEXUS não encontrou o elenco real deste título. A geração foi bloqueada para não criar um vídeo incompleto.",
  video_metadata_required: "O NEXUS não conseguiu confirmar título e sinopse automaticamente. Selecione o título no catálogo ou envie um arquivo com nome identificável.",
  r2_unavailable: "O armazenamento R2 está indisponível. Tente novamente.",
  video_source_missing: "O vídeo original não foi confirmado no R2. Envie um arquivo válido antes de abrir o Laboratório.",
  video_source_invalid: "O arquivo original não é um vídeo válido para esta conta.",
  video_source_size_mismatch: "O arquivo salvo está incompleto. Envie o vídeo novamente.",
  youtube_downloader_not_configured: "O importador do YouTube não está configurado. Use Enviar arquivo.",
  youtube_downloader_timeout: "O importador não respondeu no prazo. Use Enviar arquivo ou tente novamente.",
  youtube_downloader_transport_failed: "Não foi possível conectar ao importador. Use Enviar arquivo.",
  youtube_downloader_invalid_response: "O importador não confirmou o recebimento do trabalho.",
  local_upload_interrupted: "A conexão do PC com a Cloudflare foi interrompida. O MP4 continua salvo no auxiliar Windows; abra-o para verificar o erro e tente novamente.",
  local_upload_stalled: "O upload do PC parou de enviar dados e foi encerrado para não deixar o painel preso em 12%. O MP4 continua no computador. Reinicie o auxiliar e tente novamente.",
  youtube_ingest_timeout: "A importação não confirmou o MP4 no R2 dentro do prazo. Use Enviar arquivo.",
  local_helper_required: "O YouTube bloqueia o download no servidor para este vídeo. Abra ou atualize o Auxiliar NEXUS no Windows e use Gerar pelo meu PC.",
  local_helper_retry_failed: "O Auxiliar NEXUS não recebeu o comando de recuperação. Abra INICIAR.cmd no Windows e tente Gerar pelo meu PC novamente.",
  youtube_authentication_required: "O YouTube bloqueou o download automático no servidor. Use Enviar MP4 e gerar; o NEXUS mantém os dados do filme.",
  youtube_challenge_failed: "O YouTube exigiu uma validação adicional no servidor. Use Enviar MP4 e gerar; o NEXUS mantém os dados do filme.",
  youtube_download_blocked: "O YouTube bloqueou o download automático. Use Enviar MP4 e gerar; o NEXUS mantém os dados do filme.",
  youtube_download_failed: "O download do YouTube falhou. Use Enviar MP4 e gerar; o NEXUS mantém os dados do filme.",
  video_render_in_progress: "Este vídeo já está em processamento. Aguarde o resultado.",
  video_render_queue_timeout: "O GitHub não iniciou o renderizador no prazo. Seu MP4 original está salvo; clique em Gerar vídeo agora para tentar sem baixar novamente.",
  video_render_timeout: "A geração não concluiu no prazo e foi marcada como falha. Tente gerar novamente."
};
