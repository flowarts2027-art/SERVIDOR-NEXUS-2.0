const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const formatDate = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(date)
    : "—";
};
let client = null;
let activeTab = "videos";
let selectedCatalog = null;
let searchType = "movie";
let lastTrailerQuery = "";
let trailerSearchTimer = null;
let activeTrailerSearchId = 0;
let videoJobTimer = null;
let pendingUploadMetadata = null;
let videoCreationMode = "auto";
let editableSourceJobId = "";
let logoOffsetX = 0;
let logoOffsetY = 0;
const LOGO_EFFECTS = ["none","blink","slide","spin","fade","float","pulse","bounce","zoom","glow"];
const VIDEO_FRAME_SECONDS = 1 / 30;
const MAX_VIDEO_UPLOAD_BYTES = 90 * 1024 * 1024;

function brazilWhatsappDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  return digits.slice(0, 11);
}

function formatBrazilWhatsapp(value) {
  const digits = brazilWhatsappDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return "(" + digits;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return "(" + ddd + ") " + local;
  return "(" + ddd + ") " + local.slice(0, -4) + "-" + local.slice(-4);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    showLogin("Sua sessão terminou. Entre novamente.");
    throw new Error("Sessão expirada");
  }
  if (!response.ok) throw new Error(data?.message || data?.error || "Não foi possível consultar o NEXUS.");
  return data && typeof data === "object" ? data : {};
}

function notice(message) {
  const el = $("#notice");
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function showLogin(message = "") {
  $("#dashboard").hidden = true;
  $("#login").hidden = false;
  $("#login-error").textContent = message;
}

function showDashboard(data) {
  client = data || {};
  $("#login").hidden = true;
  $("#dashboard").hidden = false;
  const raw = String(client.instagram || "").trim();
  const handle = raw ? (raw.startsWith("@") ? raw : "@" + raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "")) : "";
  const label = handle || client.name || "Cliente";
  $("#client-label").textContent = label;
  $("#header-client-name").textContent = label;
  const logo = $("#client-logo");
  const logoKey = String(client.branding?.logoKey || "");
  if (logo && logoKey) { logo.src = "/media/" + logoKey; logo.hidden = false; }
  else if (logo) { logo.hidden = true; logo.removeAttribute("src"); }
  const editorLogo = $("#video-logo-preview");
  if (editorLogo && logoKey) { editorLogo.src = "/media/" + logoKey; editorLogo.hidden = false; }
  else if (editorLogo) { editorLogo.hidden = true; editorLogo.removeAttribute("src"); }
  refreshLogoPreview();
  if ($("#video-whatsapp-number")) $("#video-whatsapp-number").value = formatBrazilWhatsapp(client.videoTemplate?.whatsappNumber || "");
}

// Editable video is intentionally disabled while the experience is under construction.
const VIDEO_EDITABLE_ENABLED = false;

function setVideoCreationMode(mode) {
  videoCreationMode = VIDEO_EDITABLE_ENABLED && mode === "edit" ? "edit" : "auto";
  const panel = $("#video-editor-panel");
  if (panel) panel.hidden = videoCreationMode !== "edit";
  refreshTextPreview();
  $$("#video-mode-switch [data-video-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.videoMode === videoCreationMode);
    btn.setAttribute("aria-pressed", btn.dataset.videoMode === videoCreationMode ? "true" : "false");
  });
}

function videoTimeLabel(value) {
  const seconds = Math.max(0, Number(value || 0) || 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return String(minutes).padStart(2, "0") + ":" + rest.toFixed(3).padStart(6, "0");
}

function updateSelectionDuration() {
  const start = Math.max(0, Number($("#video-trim-start")?.value || 0) || 0);
  const rawEnd = Math.max(0, Number($("#video-trim-end")?.value || 0) || 0);
  const player = $("#video-editor-player");
  const end = rawEnd > start ? rawEnd : (Number.isFinite(player?.duration) ? player.duration : 0);
  const label = $("#video-selection-duration");
  if (label) label.textContent = end > start ? "Trecho: " + videoTimeLabel(end - start) : "Trecho: vídeo inteiro";
}

function syncTrimRanges() {
  const player = $("#video-editor-player");
  if (!player || !Number.isFinite(player.duration)) return;
  const startRange = $("#video-trim-start-range");
  const endRange = $("#video-trim-end-range");
  const start = Math.max(0, Math.min(player.duration, Number($("#video-trim-start")?.value || 0) || 0));
  const rawEnd = Number($("#video-trim-end")?.value || 0) || player.duration;
  const end = Math.max(start + VIDEO_FRAME_SECONDS, Math.min(player.duration, rawEnd));
  if (startRange) { startRange.max = String(player.duration); startRange.value = String(start); startRange.disabled = false; }
  if (endRange) { endRange.max = String(player.duration); endRange.value = String(end); endRange.disabled = false; }
}

function updateFilmstripState() {
  const player = $("#video-editor-player");
  const root = $("#video-filmstrip");
  if (!player || !root) return;
  const now = Number(player.currentTime || 0);
  const start = Number($("#video-trim-start")?.value || 0);
  const end = Number($("#video-trim-end")?.value || 0);
  const duration = Number(player.duration || 0);
  if (duration > 0) {
    const startHandle = root.querySelector('[data-trim-handle="start"]');
    const endHandle = root.querySelector('[data-trim-handle="end"]');
    const selection = root.querySelector(".video-trim-selection");
    const endTime = end > start ? end : duration;
    const left = Math.max(0, Math.min(100, start / duration * 100));
    const right = Math.max(left, Math.min(100, endTime / duration * 100));
    if (startHandle) startHandle.style.left = left + "%";
    if (endHandle) endHandle.style.left = right + "%";
    if (selection) { selection.style.left = left + "%"; selection.style.width = (right - left) + "%"; }
  }
  root.querySelectorAll(".video-frame-thumb").forEach(el => {
    const time = Number(el.dataset.time || 0);
    el.classList.toggle("active", Math.abs(time - now) <= Math.max(.25, Number(player.duration || 0) / 40));
    el.classList.toggle("trim-start", Math.abs(time - start) <= Math.max(.25, Number(player.duration || 0) / 40));
    el.classList.toggle("trim-end", end > start && Math.abs(time - end) <= Math.max(.25, Number(player.duration || 0) / 40));
  });
}

function setLogoPosition(value) {
  const allowed = new Set(["top-left","top-center","top-right","center-left","center","center-right","bottom-left","bottom-center","bottom-right"]);
  const position = allowed.has(String(value || "")) ? String(value) : "top-left";
  $$("#video-logo-position [data-logo-position]").forEach(btn => {
    const active = btn.dataset.logoPosition === position;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  refreshLogoPreview();
}

function adjustLogoFine(direction) {
  if (direction === "reset") { logoOffsetX = 0; logoOffsetY = 0; }
  if (direction === "left") logoOffsetX = Math.max(-40, logoOffsetX - 1);
  if (direction === "right") logoOffsetX = Math.min(40, logoOffsetX + 1);
  if (direction === "up") logoOffsetY = Math.max(-40, logoOffsetY - 1);
  if (direction === "down") logoOffsetY = Math.min(40, logoOffsetY + 1);
  refreshLogoPreview();
}

function refreshTextPreview() {
  const preview = $("#video-text-preview");
  if (!preview) return;
  const message = String($("#video-custom-text")?.value || "").trim();
  preview.textContent = message;
  const color = $("#video-text-color")?.value || "#ffffff";
  const weight = $("#video-text-weight")?.value || "bold";
  const position = $("#video-text-position")?.value || "bottom";
  const offset = Math.max(-35, Math.min(35, Number($("#video-text-offset")?.value || 0)));
  preview.style.color = /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff";
  preview.style.fontWeight = weight === "normal" ? "400" : weight === "heavy" ? "900" : "700";
  const fonts = {sans:'Arial, Helvetica, sans-serif',serif:'Georgia, Times New Roman, serif',cinema:'Impact, Arial Black, sans-serif',mono:'Courier New, monospace',hand:'Comic Sans MS, cursive',rounded:'Trebuchet MS, Arial, sans-serif'};
  preview.style.fontFamily = fonts[$("#video-text-font")?.value] || fonts.sans;
  preview.style.fontStyle = $("#video-text-italic")?.checked ? "italic" : "normal";
  preview.style.textDecoration = $("#video-text-underline")?.checked ? "underline" : "none";
  preview.style.top = position === "top" ? "9%" : position === "center" ? "50%" : "auto";
  preview.style.bottom = position === "bottom" ? "9%" : "auto";
  preview.style.transform = (position === "center" ? "translateY(-50%) " : "") + "translateY(" + offset * -1 + "%)";
  preview.hidden = !message || videoCreationMode !== "edit";
}

function refreshLogoPreview() {
  const preview = $("#video-logo-preview");
  if (!preview) return;
  const active = $("#video-logo-position [data-logo-position].active");
  const position = active?.dataset.logoPosition || "top-left";
  const scale = Math.max(60, Math.min(180, Number($("#video-logo-scale")?.value || 100)));
  const effect = LOGO_EFFECTS.includes($("#video-logo-effect")?.value) ? $("#video-logo-effect").value : "none";
  preview.dataset.position = position;
  preview.style.width = (18 * scale / 100).toFixed(1) + "%";
  preview.classList.remove(...LOGO_EFFECTS.filter(x => x !== "none").map(x => "logo-effect-" + x));
  const container = $("#video-editor-player")?.parentElement;
  preview.style.translate = ((container?.clientWidth || 0) * logoOffsetX / 100).toFixed(1) + "px " + ((container?.clientHeight || 0) * logoOffsetY / 100).toFixed(1) + "px";
  if (effect !== "none") preview.classList.add("logo-effect-" + effect);
  preview.hidden = !preview.getAttribute("src") || $("#video-use-logo")?.checked === false;
  const out = $("#video-logo-scale-value");
  if (out) out.value = Math.round(scale) + "%";
}

async function buildVideoFilmstrip() {
  const player = $("#video-editor-player");
  const root = $("#video-filmstrip");
  if (!player || !root || !Number.isFinite(player.duration) || player.duration <= 0) return;
  root.replaceChildren();
  const duration = player.duration;
  const count = Math.max(16, Math.min(32, Math.ceil(duration / 4)));
  const original = player.currentTime || 0;
  const track = document.createElement("div");
  track.className = "video-filmstrip-track";
  root.append(track);
  for (let i = 0; i < count; i++) {
    const thumb = document.createElement("div");
    thumb.className = "video-frame-thumb";
    const canvas = document.createElement("canvas");
    canvas.width = 160; canvas.height = 90;
    const time = duration * i / (count - 1);
    thumb.dataset.time = String(time);
    await new Promise(resolve => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        player.removeEventListener("seeked", done);
        resolve();
      };
      player.addEventListener("seeked", done, { once: true });
      player.currentTime = Math.max(0, Math.min(time, duration - 0.01));
      setTimeout(done, 350);
    });
    try { canvas.getContext("2d").drawImage(player, 0, 0, canvas.width, canvas.height); } catch {}
    thumb.append(canvas);
    thumb.addEventListener("click", () => {
      player.pause();
      player.currentTime = time;
      updateFilmstripState();
    });
    track.append(thumb);
  }
  const selection = document.createElement("div");
  selection.className = "video-trim-selection";
  track.append(selection);
  for (const edge of ["start","end"]) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "video-trim-handle video-trim-" + edge;
    handle.dataset.trimHandle = edge;
    handle.setAttribute("aria-label", edge === "start" ? "Arraste o início do corte" : "Arraste o fim do corte");
    handle.textContent = "Ⅱ";
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", event => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      const rect = track.getBoundingClientRect();
      const time = Math.max(0, Math.min(duration, (event.clientX - rect.left) / rect.width * duration));
      const start = Number($("#video-trim-start")?.value || 0);
      const end = Number($("#video-trim-end")?.value || duration) || duration;
      const bounded = edge === "start" ? Math.min(time, end - VIDEO_FRAME_SECONDS) : Math.max(time, start + VIDEO_FRAME_SECONDS);
      const target = edge === "start" ? $("#video-trim-start") : $("#video-trim-end");
      if (target) target.value = Math.max(0, bounded).toFixed(3);
      player.currentTime = Math.max(0, bounded);
      syncTrimRanges();
      updateSelectionDuration();
      updateFilmstripState();
    });
    track.append(handle);
  }
  player.currentTime = Math.min(original, duration);
  updateFilmstripState();
}

async function generateEditableVideo() {
  if (!VIDEO_EDITABLE_ENABLED) return;
  const button = $("#video-generate-editable");
  const status = $("#video-editable-action-status");
  if (!editableSourceJobId) {
    if (status) status.textContent = "Selecione um MP4 do computador; depois edite e gere.";
    $("#video-editable-file")?.click();
    return;
  }
  button.disabled = true;
  if (status) status.textContent = "Enviando edição ao NEXUS...";
  try {
    const response = await api("/api/portal/videos/" + encodeURIComponent(editableSourceJobId) + "/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endContact: brazilWhatsappDigits($("#video-whatsapp-number")?.value || ""),
        logoEnabled: $("#video-use-logo")?.checked !== false,
        renderProfile: $("#video-render-profile")?.value === "quality" ? "quality" : "fast",
        creationMode: "edit",
        composition: { ...videoCompositionPayload(), creationMode: "edit" }
      })
    });
    if (status) status.textContent = response?.alreadyProcessing ? "Este vídeo já está sendo processado." : (response?.job?.status === "cutting" ? "Gerando vídeo editável..." : "Comando recebido. Acompanhe o status abaixo.");
    await loadVideoJobs();
    if (!response?.job && !response?.alreadyProcessing) button.disabled = false;
  } catch (error) {
    if (status) status.textContent = "Falhou: " + error.message;
    button.disabled = false;
  }
}

function stepVideoFrame(direction) {
  const player = $("#video-editor-player");
  if (!player || player.hidden || !Number.isFinite(player.duration)) return;
  player.pause();
  player.currentTime = Math.max(0, Math.min(player.duration, player.currentTime + VIDEO_FRAME_SECONDS * direction));
}

function bindEditableSource(job) {
  if (!VIDEO_EDITABLE_ENABLED) return;
  const player = $("#video-editor-player");
  const placeholder = $("#video-editor-placeholder");
  const timeline = $("#video-timeline");
  const play = $("#video-play-toggle");
  const markStart = $("#mark-trim-start");
  const markEnd = $("#mark-trim-end");
  if (!player || !job?.sourceReady || !job?.sourceDownloadUrl) return;
  window.NexusVideoOverlayUI?.setJob(job.id, job.composition?.overlays);

  if (editableSourceJobId !== job.id || !player.getAttribute("src")) {
    editableSourceJobId = job.id;
    setVideoCreationMode("edit");
    const composition = job.composition || {};
    if ($("#video-trim-start")) $("#video-trim-start").value = Number(composition.trimStart || 0).toFixed(3);
    if ($("#video-trim-end")) $("#video-trim-end").value = Number(composition.trimEnd || 0) > 0 ? Number(composition.trimEnd).toFixed(3) : "";
    if ($("#video-custom-text")) $("#video-custom-text").value = composition.customText || "";
    if ($("#video-text-color")) $("#video-text-color").value = /^#[0-9a-f]{6}$/i.test(composition.textColor || "") ? composition.textColor : "#ffffff";
    if ($("#video-text-weight")) $("#video-text-weight").value = ["normal","bold","heavy"].includes(composition.textWeight) ? composition.textWeight : "bold";
    if ($("#video-text-font")) $("#video-text-font").value = ["sans","serif","cinema","mono","hand","rounded"].includes(composition.textFont) ? composition.textFont : "sans";
    if ($("#video-text-italic")) $("#video-text-italic").checked = composition.textItalic === true;
    if ($("#video-text-underline")) $("#video-text-underline").checked = composition.textUnderline === true;
    if ($("#video-text-position")) $("#video-text-position").value = ["top","center","bottom"].includes(composition.textPosition) ? composition.textPosition : "bottom";
    if ($("#video-text-offset")) $("#video-text-offset").value = String(Math.max(-35,Math.min(35,Number(composition.textOffset || 0))));
    // CTA final foi removido do modo editável; o encerramento padrão do NEXUS continua automático.
    if ($("#video-frame-preset")) $("#video-frame-preset").value = composition.framePreset || "nexus";
    if ($("#video-show-poster")) { $("#video-show-poster").checked = true; $("#video-show-poster").disabled = true; }
    if ($("#video-show-overview")) $("#video-show-overview").checked = composition.showOverview !== false;
    if ($("#video-show-cast")) $("#video-show-cast").checked = composition.showCast !== false;
    setLogoPosition(composition.logoPosition || "top-left");
    if ($("#video-logo-scale")) $("#video-logo-scale").value = String(Math.max(60, Math.min(180, Number(composition.logoScale || 100))));
    logoOffsetX = Math.max(-40, Math.min(40, Number(composition.logoOffsetX || 0) || 0));
    logoOffsetY = Math.max(-40, Math.min(40, Number(composition.logoOffsetY || 0) || 0));
    if ($("#video-logo-effect")) $("#video-logo-effect").value = LOGO_EFFECTS.includes(composition.logoEffect) ? composition.logoEffect : "none";
    refreshTextPreview();
    refreshLogoPreview();

    player.src = job.sourceDownloadUrl;
    player.hidden = false;
    if (placeholder) placeholder.hidden = true;
    player.load();
  }
  if (timeline) timeline.disabled = false;
  if (play) play.disabled = false;
  if (markStart) markStart.disabled = false;
  if (markEnd) markEnd.disabled = false;
  if ($("#video-generate-editable")) $("#video-generate-editable").disabled = false;
  if ($("#video-editable-action-status")) $("#video-editable-action-status").textContent = "Ajuste o corte pelas cenas e clique em Gerar vídeo editável.";
  syncTrimRanges();
  updateSelectionDuration();
}

function showTab(name) {
  activeTab = name;
  $$("[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));
  $$(".tab").forEach(section => { section.hidden = section.id !== "tab-" + name; });
  if (name === "videos") loadVideoJobs();
  if (name === "instagram") loadInstagram();
  if (name === "upload") {
    const metadata = pendingUploadMetadata || selectedCatalog;
    const complete = Boolean(metadata?.title && metadata?.overview);
    const summary = $("#upload-content-summary");
    if (summary) {
      summary.hidden = false;
      summary.textContent = complete
        ? "Modelo de " + metadata.title + ". Título e sinopse já estão vinculados."
        : "Envie o vídeo. O NEXUS tenta identificar o título pelo arquivo e busca a sinopse automaticamente.";
    }
  }
}

function renderCatalog(items) {
  const box = $("#catalog-box");
  const list = $("#catalog-list");
  list.replaceChildren();
  if (!items.length) { box.hidden = true; return; }
  box.hidden = false;
  items.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "catalog-card" + (selectedCatalog && selectedCatalog.id === item.id ? " selected" : "");
    if (item.posterUrl) {
      const img = document.createElement("img");
      img.src = item.posterUrl;
      img.alt = item.title || "";
      card.append(img);
    }
    const title = document.createElement("strong");
    title.textContent = item.title || "Título";
    const meta = document.createElement("small");
    meta.textContent = [item.mediaType || "", item.year || ""].filter(Boolean).join(" · ");
    card.append(title, meta);
    card.addEventListener("click", () => {
      selectedCatalog = item;
      pendingUploadMetadata = null;
      renderCatalog(items);
      notice("Título selecionado: " + item.title);
    });
    list.append(card);
  });
  if (selectedCatalog) {
    list.querySelectorAll(".catalog-card").forEach((el, i) => {
      if (items[i] && items[i].id === selectedCatalog.id) el.classList.add("selected");
    });
  }
}

function trailerUrl(item) {
  return item.url || ("https://www.youtube.com/watch?v=" + item.id);
}

function videoCompositionPayload() {
  return {
    creationMode: videoCreationMode,
    trimStart: Math.max(0, Number($("#video-trim-start")?.value || 0) || 0),
    trimEnd: Math.max(0, Number($("#video-trim-end")?.value || 0) || 0),
    customText: String($("#video-custom-text")?.value || "").trim(),
    textColor: $("#video-text-color")?.value || "#ffffff",
    textWeight: $("#video-text-weight")?.value || "bold",
    textFont: $("#video-text-font")?.value || "sans",
    textItalic: $("#video-text-italic")?.checked === true,
    textUnderline: $("#video-text-underline")?.checked === true,
    textPosition: $("#video-text-position")?.value || "bottom",
    textOffset: Math.max(-35, Math.min(35, Number($("#video-text-offset")?.value || 0))),
    cta: "",
    framePreset: $("#video-frame-preset")?.value || "nexus",
    logoPosition: $("#video-logo-position [data-logo-position].active")?.dataset.logoPosition || "top-left",
    logoScale: Math.max(60, Math.min(180, Number($("#video-logo-scale")?.value || 100))),
    logoOffsetX,
    logoOffsetY,
    logoEffect: LOGO_EFFECTS.includes($("#video-logo-effect")?.value) ? $("#video-logo-effect").value : "none",
    showPoster: true,
    showOverview: $("#video-show-overview")?.checked !== false,
    showCast: $("#video-show-cast")?.checked !== false,
    overlays: videoCreationMode === "edit" ? (window.NexusVideoOverlayUI?.getLayers() || []) : []
  };
}

function normalizeSearchLabel(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function catalogMatchesQuery(item) {
  const query = normalizeSearchLabel(lastTrailerQuery || $("#trailer-query")?.value || "");
  const title = normalizeSearchLabel(item?.title || "");
  if (!query || !title) return false;
  return title === query || title.includes(query) || query.includes(title);
}

function trailerContentFallback() {
  // selectedCatalog is cleared on every new search, so any selected item belongs to
  // the current query even when the catalog uses a localized title (e.g. "duna2"
  // -> "Duna: Parte Dois"). Preserve its metadata and official preview URL.
  if (selectedCatalog?.title) return selectedCatalog;
  return {
    title: lastTrailerQuery || $("#trailer-query")?.value.trim() || "Trailer",
    overview: "",
    year: "",
    mediaType: searchType === "series" ? "SÉRIE" : "FILME",
    posterUrl: "",
    id: "",
    catalogId: "",
    catalogType: searchType === "series" ? "series" : "movie"
  };
}

// NEXUS universal video contract: direct generation is primary; PC download is fallback.
function renderTrailers(results) {
  const box = $("#trailer-results");
  const list = $("#youtube-results");
  list.replaceChildren();
  if (!results.length) { box.hidden = true; return; }
  box.hidden = false;
  results.forEach(item => {
    const card = document.createElement("article");
    card.className = "youtube-card";
    const img = document.createElement("img");
    img.src = item.thumbnail || ("https://i.ytimg.com/vi/" + item.id + "/hqdefault.jpg");
    img.alt = item.title || "Trailer";
    const title = document.createElement("strong");
    title.textContent = item.title || "Trailer";
    const meta = document.createElement("small");
    const mins = item.duration ? Math.round(Number(item.duration) / 60) + " min" : "";
    const format = item.verticalCandidate ? "VERTICAL / SHORTS PRIORITÁRIO" : "";
    meta.textContent = [format, item.channel || "Canal", mins].filter(Boolean).join(" · ");

    const actions = document.createElement("div");
    actions.className = "youtube-actions";

    const generate = document.createElement("button");
    generate.type = "button";
    generate.className = "primary";
    generate.textContent = "Gerar vídeo";
    const actionStatus = document.createElement("small");
    actionStatus.className = "youtube-action-status";
    actionStatus.setAttribute("role", "status");

    generate.addEventListener("click", () => startTrailerJob(item, generate, actionStatus));

    const download = document.createElement("button");
    download.type = "button";
    download.className = "youtube-watch-link";
    download.textContent = "Baixar MP4";
    download.addEventListener("click", () => downloadTrailerOnly(item, download, actionStatus));

    const pcAlternative = document.createElement("button");
    pcAlternative.type = "button";
    pcAlternative.className = "youtube-watch-link";
    pcAlternative.textContent = "Usar meu PC (alternativa)";
    pcAlternative.addEventListener("click", () => startTrailerJob(item, pcAlternative, actionStatus, true));

    const watch = document.createElement("a");
    watch.className = "youtube-watch-link";
    watch.href = trailerUrl(item);
    watch.target = "_blank";
    watch.rel = "noopener noreferrer";
    watch.textContent = "Assistir trailer no YouTube";

    actions.append(generate, download, pcAlternative, watch);
    card.append(img, title, meta, actions, actionStatus);
    list.append(card);
  });
}

async function searchTrailers(event) {
  event.preventDefault();
  const query = $("#trailer-query")?.value.trim();
  searchType = $("#trailer-type")?.value || "movie";
  const requestedType = searchType;
  lastTrailerQuery = query || "";
  const btn = $("#trailer-search-btn");
  const msg = $("#trailer-search-message");
  const setStatus = (message, searching = false) => {
    msg.textContent = message;
    msg.classList.toggle("is-loading", searching);
    msg.setAttribute("aria-busy", String(searching));
  };
  if (!query) { setStatus("Digite o nome do filme ou série."); return; }

  // A second search immediately invalidates every pending response and poll
  // from an older query. Never make the search textbox itself disabled.
  const searchIdLocal = ++activeTrailerSearchId;
  if (trailerSearchTimer) clearTimeout(trailerSearchTimer);
  trailerSearchTimer = null;
  notice("");
  selectedCatalog = null;
  pendingUploadMetadata = null;
  $("#catalog-box").hidden = true;
  $("#trailer-results").hidden = true;
  btn.disabled = true;  // only until the lightweight search dispatch returns
  btn.textContent = "Iniciando...";
  setStatus("Buscando trailers, aguarde…", true);

  try {
    const data = await api("/api/portal/videos/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, type: requestedType })
    });
    if (searchIdLocal !== activeTrailerSearchId) return;

    const catalog = Array.isArray(data.catalog) ? data.catalog : [];
    // A free-text YouTube search is not an explicit film selection. Otherwise
    // a 2026 trailer inherits a random older "Homem-Aranha" catalogue card.
    // Only clicking a catalogue card assigns selectedCatalog.
    renderCatalog(catalog);
    btn.disabled = false;
    btn.textContent = "Nova busca";
    const remoteId = String(data.searchId || "");
    if (!remoteId) {
      setStatus("Não foi possível iniciar a busca. Tente novamente.");
      btn.textContent = "Buscar trailer dublado";
      return;
    }
    setStatus("Buscando trailers, aguarde… Os resultados aparecerão logo abaixo.", true);

    let attempts = 0;
    let errors = 0;
    const poll = async () => {
      if (searchIdLocal !== activeTrailerSearchId) return;
      attempts++;
      try {
        const status = await api("/api/portal/videos/search/" + encodeURIComponent(remoteId));
        if (searchIdLocal !== activeTrailerSearchId) return;
        errors = 0;
        if (status.status === "search_results") {
          const results = Array.isArray(status.results) ? status.results : [];
          if (!results.length) setStatus("Nenhum trailer oficial dublado encontrado. Tente outro nome.");
          else {
            renderTrailers(results);
            setStatus("Resultados encontrados abaixo. Escolha um trailer para gerar o vídeo.");
          }
          btn.textContent = "Buscar trailer dublado";
          return;
        }
        if (["failed", "search_failed"].includes(String(status.status || ""))) {
          setStatus("A busca falhou no servidor. Tente novamente ou envie o MP4 pelo computador.");
          btn.textContent = "Buscar trailer dublado";
          return;
        }
        if (attempts >= 24) {
          setStatus("A pesquisa está demorando. Faça outra busca ou envie o MP4 do PC.");
          btn.textContent = "Buscar trailer dublado";
          return;
        }
        setStatus("Buscando trailers, aguarde… Você pode fazer outra busca enquanto espera.", true);
        trailerSearchTimer = setTimeout(poll, 2500);
      } catch (err) {
        if (searchIdLocal !== activeTrailerSearchId) return;
        errors++;
        if (errors >= 3 || attempts >= 24) {
          setStatus("Erro na busca: " + err.message + ". Tente novamente.");
          btn.textContent = "Buscar trailer dublado";
          return;
        }
        setStatus("Aguardando resposta do YouTube… Tentando novamente.", true);
        trailerSearchTimer = setTimeout(poll, 2500);
      }
    };
    trailerSearchTimer = setTimeout(poll, 1200);
  } catch (error) {
    if (searchIdLocal !== activeTrailerSearchId) return;
    setStatus("Erro ao iniciar a busca: " + error.message);
    btn.disabled = false;
    btn.textContent = "Buscar trailer dublado";
  }
}

// Preserve the real failure from the initial Worker request or local helper.
// A missing jobId means there is no ticket to "recover" via /local-fail.
async function downloadTrailerOnly(item, button, actionStatus) {
  const original = button.textContent;
  const content = trailerContentFallback();
  button.disabled = true;
  button.textContent = "Preparando...";
  if (actionStatus) actionStatus.textContent = "Iniciando importação para disponibilizar o MP4.";
  try {
    const job = await api("/api/portal/videos/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        action: "download",
        url: trailerUrl(item),
        title: content.title,
        searchTitle: String(lastTrailerQuery || $("#trailer-query")?.value || content.title || "").trim(),
        youtubeTitle: String(item?.title || "").trim(),
        catalogId: content.id || content.catalogId || "",
        year: content.year || "",
        posterUrl: content.posterUrl || "",
        type: searchType,
        overview: content.overview || ""
      })
    });
    const message = job.message || "Importação iniciada. O arquivo aparecerá em Seu vídeo como Baixar original.";
    if (actionStatus) actionStatus.textContent = message;
    notice(message);
    await loadVideoJobs();
  } catch (error) {
    const message = "Não foi possível iniciar o download: " + String(error?.message || error);
    if (actionStatus) actionStatus.textContent = message;
    notice(message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function retryFailedYouTubeViaPC(job, button) {
  const original = button.textContent;
  let ticketCreated = false;
  button.disabled = true;
  button.textContent = "Conectando ao PC...";
  try {
    const health = await fetch("http://127.0.0.1:8765/health", {
      method: "GET", mode: "cors", cache: "no-store",
      signal: AbortSignal.timeout(3000)
    });
    const status = health.ok ? await health.json().catch(() => ({})) : {};
    if (!health.ok || status.ok !== true || status.service !== "nexus-local-helper" ||
        status.handoffSupported !== true || status.handoffReady === false) {
      throw new Error("Abra ou atualize o Auxiliar NEXUS no Windows (INICIAR.cmd) e tente novamente.");
    }

    const response = await api("/api/portal/videos/" + encodeURIComponent(job.id) + "/local-retry", {
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    if (!response.localUpload?.uploadTicket) throw new Error("O NEXUS não confirmou o ticket de recuperação.");
    ticketCreated = true;
    const accepted = await fetch("http://127.0.0.1:8765/handoff", {
      method: "POST", mode: "cors", cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify(response.localUpload)
    });
    const reply = await accepted.json().catch(() => ({}));
    if (!accepted.ok || reply.ok !== true) throw new Error(reply.message || "O Auxiliar não aceitou a recuperação.");
    notice("O mesmo vídeo foi retomado no PC. O MP4 será enviado automaticamente ao NEXUS; acompanhe o status aqui.");
    await loadVideoJobs();
  } catch (error) {
    if (ticketCreated) {
      await api("/api/portal/videos/" + encodeURIComponent(job.id) + "/local-fail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: String(error?.message || error || "local_retry_failed").slice(0, 280) })
      }).catch(() => {});
    }
    notice("Não foi possível retomar no PC: " + String(error?.message || error) +
      " Você também pode usar Enviar MP4 e gerar.");
    await loadVideoJobs().catch(() => {});
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function trailerStartFailureMessage(error, job, recovery = null) {
  const detail = String(error?.message || error || "Erro desconhecido").trim().slice(0, 320);
  if (!job?.jobId) {
    if (/TimeoutError|timed out|tempo esgotado|aborted|aborterror/i.test(detail))
      return "A Cloudflare demorou para responder e não confirmou um ticket. Atualize o painel antes de tentar novamente.";
    return "Não foi possível iniciar o vídeo: " + detail;
  }
  if (recovery?.requiresLocalHelper || /local_helper_required|YouTube bloqueia o download no servidor/i.test(detail))
    return "O download precisa do Auxiliar NEXUS no Windows. Atualize o auxiliar, abra INICIAR.cmd e tente novamente.";
  if (recovery?.fallbackStarted)
    return "Auxiliar indisponível. O NEXUS confirmou a continuação pelo servidor.";
  if (recovery?.ignored)
    return "O NEXUS já recebeu este trabalho. Acompanhe o andamento no topo do painel.";
  if (/404|rota indispon[ií]vel|not found/i.test(detail))
    return "A versão do Auxiliar NEXUS é antiga ou não possui /handoff. Atualize o auxiliar no Windows e abra INICIAR.cmd novamente.";
  if (/download j[aá] est[aá] em andamento|download em andamento|occupied|busy|ticket inv[aá]lido/i.test(detail))
    return "O Auxiliar NEXUS recusou o ticket: " + detail + " Aguarde o download atual terminar ou reinicie o auxiliar.";
  return "O Auxiliar NEXUS não aceitou o envio: " + detail +
    ". Verifique o auxiliar Windows e tente novamente; o NEXUS não confirmou o download.";
}

async function startTrailerJob(item, button, actionStatus, preferLocal = false) {
  notice("");
  if (actionStatus) actionStatus.textContent = "";
  const content = trailerContentFallback();
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Iniciando...";

  let job = null;
  try {
    // Server is the default. Only an explicit button click opts into the PC.
    let useLocalHelper = false;
    const isYouTubeTrailer = /(?:youtube\.com|youtu\.be)/i.test(trailerUrl(item));
    if (preferLocal && isYouTubeTrailer) {
      let helperAvailable = false;
      let helperBusy = false;
      let helperOutdated = false;
      try {
        const health = await fetch("http://127.0.0.1:8765/health", {
          method: "GET", mode: "cors", cache: "no-store",
          signal: AbortSignal.timeout(3000)
        });
        const detail = health.ok ? await health.json().catch(() => ({})) : {};
        helperAvailable = health.ok && detail.ok === true && detail.service === "nexus-local-helper";
        helperBusy = detail.handoffReady === false && /busy|uploading/.test(String(detail.status || ""));
        helperOutdated = detail.handoffSupported === false;
      } catch (_) {
        // The helper may be stopped or localhost requests blocked by the browser.
      }
      useLocalHelper = helperAvailable && !helperBusy && !helperOutdated;
      if (!useLocalHelper) {
        const message = helperBusy
          ? "Auxiliar NEXUS ocupado. Aguarde a conclusão no PC."
          : helperOutdated
            ? "Auxiliar NEXUS desatualizado. Atualize-o antes de usar esta alternativa."
            : "Auxiliar NEXUS indisponível. Abra INICIAR.cmd antes de usar esta alternativa.";
        if (actionStatus) actionStatus.textContent = message;
        throw new Error("Abra o Auxiliar NEXUS no Windows e clique na alternativa novamente.");
      }
    }

    job = await api("/api/portal/videos/youtube", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        action: useLocalHelper ? "local_generate" : "server_generate",
        url: trailerUrl(item),
        title: content.title,
        searchTitle: String(lastTrailerQuery || $("#trailer-query")?.value || content.title || "").trim(),
        youtubeTitle: String(item?.title || "").trim(),
        catalogId: content.id || content.catalogId || "",
        year: content.year || "",
        posterUrl: content.posterUrl || "",
        type: searchType,
        overview: content.overview || "",
        logoEnabled: $("#video-use-logo")?.checked !== false,
        endContact: brazilWhatsappDigits($("#video-whatsapp-number")?.value || ""),
        renderProfile: $("#video-render-profile")?.value === "quality" ? "quality" : "fast",
        creationMode: videoCreationMode,
        composition: videoCompositionPayload()
      })
    });

    if (!job.localUpload && job.jobId) {
      const serverMessage = job.message || "Fonte oficial encontrada. A geração 9:16 será iniciada automaticamente.";
      if (actionStatus) actionStatus.textContent = serverMessage;
      notice(serverMessage);
      await loadVideoJobs();
      $("#video-job-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!job.localUpload?.uploadTicket) throw new Error("local_ticket_missing");

    const helperHealth = await fetch("http://127.0.0.1:8765/health", {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(2500)
    });
    if (!helperHealth.ok) throw new Error("local_helper_unavailable");

    const helperResponse = await fetch("http://127.0.0.1:8765/handoff", {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify(job.localUpload)
    });
    const helperData = await helperResponse.json().catch(() => ({}));
    if (!helperResponse.ok || helperData.ok !== true) {
      const reason = helperData.message || helperData.error || (helperResponse.status === 404
        ? "404: rota /handoff indisponível" : "local_helper_rejected_" + helperResponse.status);
      throw new Error(reason);
    }

    const message = "Download iniciado no computador. O upload para o NEXUS será automático.";
    if (actionStatus) actionStatus.textContent = message;
    notice(message);
    await loadVideoJobs();
    $("#video-job-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    const reason = String(error?.message || "local_helper_unavailable").slice(0, 300);
    let fallback = null;
    if (job?.jobId) {
      try {
        fallback = await api("/api/portal/videos/" + encodeURIComponent(job.jobId) + "/local-fail", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason })
        });
      } catch (fallbackError) {
        // Recovery can correctly reject YouTube downloading on Cloudflare.
        // Show the real handoff failure; do not claim fallback was started.
        const message = trailerStartFailureMessage(error, job, {
          requiresLocalHelper: /local_helper_required|YouTube bloqueia o download no servidor|Auxiliar NEXUS/i
            .test(String(fallbackError?.message || ""))
        });
        if (actionStatus) actionStatus.textContent = message;
        notice(message);
        await loadVideoJobs().catch(() => {});
        return;
      }
    }
    const message = trailerStartFailureMessage(error, job, fallback);
    if (actionStatus) actionStatus.textContent = message;
    notice(message);
    if (job?.jobId) await loadVideoJobs().catch(() => {});
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function loadVideoJobs() {
  const root = $("#video-job-list");
  if (!root) return;
  try {
    const data = await api("/api/portal/videos");
    let jobs = Array.isArray(data.jobs) ? data.jobs : [];
    clearTimeout(videoJobTimer);
    if (jobs.some(job => ["importing", "cutting", "searching"].includes(job.status))) {
      videoJobTimer = setTimeout(loadVideoJobs, 2000);
    }
    if (root.contains(document.activeElement) && document.activeElement.matches("input, textarea, select")) {
      videoJobTimer = setTimeout(loadVideoJobs, 2000);
      return;
    }
    root.replaceChildren();
    const visible = jobs
      .filter(job => job.status !== "searching" && job.status !== "search_results")
      .sort((a, b) => {
        const priority = { cutting: 0, importing: 1, awaiting_configuration: 2, ready: 3, failed: 4 };
        const pa = priority[a.status] ?? 9;
        const pb = priority[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
      });

    const headingRow = document.createElement("div");
    headingRow.className = "video-status-heading";
    const heading = document.createElement("h2");
    heading.textContent = visible.length ? "Seu vídeo" : "Status da geração";
    const hint = document.createElement("small");
    hint.textContent = visible.length ? "Acompanhe aqui. Não precisa rolar a página." : "Quando você gerar um vídeo, ele aparece aqui.";
    headingRow.append(heading, hint);
    root.append(headingRow);

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "video-empty-state";
      empty.textContent = "Nenhum vídeo em geração.";
      root.append(empty);
      return;
    }

    const renderJobCard = job => {
      const card = document.createElement("article");
      card.className = "card media-card video-render-job";
      const top = document.createElement("div");
      top.className = "video-job-top";
      const title = document.createElement("strong");
      title.textContent = job.contentTitle || job.filename || "Vídeo";
      const status = document.createElement("span");
      const labels = { importing: "BAIXANDO", awaiting_configuration: job.creationMode === "edit" ? "PRONTO PARA EDITAR" : "AGUARDANDO AÇÃO", cutting: "GERANDO", ready: "PRONTO", failed: "FALHOU" };
      status.className = "status " + (job.status === "ready" ? "published" : job.status === "failed" ? "failed" : "ready");
      status.textContent = labels[job.status] || String(job.status || "").toUpperCase();
      top.append(title, status);
      card.append(top);

      const progressValue = Math.max(0, Math.min(100, Number(job.progress || 0)));
      if (["importing", "cutting"].includes(job.status)) {
        const shownProgress = Math.round(progressValue);
        const progressRow = document.createElement("div");
        progressRow.className = "video-progress-row";
        const progress = document.createElement("progress");
        progress.max = 100;
        progress.value = shownProgress;
        progress.className = "video-progress";
        const percent = document.createElement("strong");
        percent.textContent = shownProgress + "%";
        progressRow.append(progress, percent);
        card.append(progressRow);

        const detail = document.createElement("div");
        detail.className = "video-progress-detail";
        const stage = document.createElement("span");
        stage.textContent = job.message || (job.status === "importing" ? "Aguardando o PC receber e enviar o MP4…" : "Renderizando vídeo…");
        detail.append(stage);
        const startedMs = Date.parse(job.renderStartedAt || "");
        if (job.status === "cutting" && Number.isFinite(startedMs) && shownProgress > 42 && shownProgress < 95) {
          const elapsed = Math.max(1, (Date.now() - startedMs) / 1000);
          const completed = Math.max(1, shownProgress - 35);
          const remaining = Math.max(0, Math.round(elapsed * (100 - shownProgress) / completed));
          const eta = document.createElement("span");
          eta.textContent = remaining >= 60 ? "≈ " + Math.ceil(remaining / 60) + " min restantes" : "≈ " + remaining + " s restantes";
          detail.append(eta);
        }
        card.append(detail);
      }

      if (job.status === "awaiting_configuration" && job.creationMode !== "edit") {
        const waiting = document.createElement("div");
        waiting.className = "video-progress-detail";
        const waitingText = document.createElement("span");
        waitingText.textContent = job.message || "MP4 original salvo. Clique em Gerar vídeo agora para iniciar o 9:16.";
        waiting.append(waitingText);
        card.append(waiting);
      }

      const meta = document.createElement("small");
      const spec = job.renderProfile === "quality" ? "QUALIDADE · 1080p" : "RÁPIDO · 720p";
      meta.className = "video-render-spec";
      meta.textContent = spec + " · TRAILER COMPLETO · " + formatDate(job.updatedAt || job.createdAt);
      card.append(meta);

      if (job.status === "failed") {
        const failure = document.createElement("div");
        failure.className = "video-failure-detail";
        const message = document.createElement("strong");
        message.textContent = String(job.error) === "video_official_poster_required"
          ? "O pôster oficial não pôde ser carregado. Seu MP4 original está preservado."
          : job.message || "A geração falhou.";
        failure.append(message);
        if (job.error) {
          const code = document.createElement("small");
          code.textContent = String(job.error) === "video_official_poster_required"
            ? "Clique em Gerar vídeo agora para tentar recuperar o pôster oficial e gerar usando o mesmo original."
            : "Motivo: " + String(job.error).slice(0, 300);
          failure.append(code);
        }
        card.append(failure);
      }

      const actions = document.createElement("div");
      actions.className = "post-actions";
      if (job.sourceReady === true && job.sourceDownloadUrl) {
        // Keep original download accessible without exposing the unfinished editor.
        const sourceDownload = document.createElement("a");
        sourceDownload.className = "youtube-watch-link";
        sourceDownload.href = job.sourceDownloadUrl;
        sourceDownload.textContent = "Baixar original";
        actions.append(sourceDownload);
      }
      if (job.selectedYoutubeUrl) {
        const watchSource = document.createElement("a");
        watchSource.className = "youtube-watch-link";
        watchSource.href = job.selectedYoutubeUrl;
        watchSource.target = "_blank";
        watchSource.rel = "noopener noreferrer";
        watchSource.textContent = "Assistir no YouTube";
        actions.append(watchSource);
      }
      if (job.status === "failed" && job.sourceReady !== true && job.selectedYoutubeUrl &&
          /^(?:local_helper_required|local_helper_retry_failed|youtube_(?:authentication_required|challenge_failed|download_blocked|download_failed|ingest_timeout))/.test(String(job.error || ""))) {
        const retryOnPC = document.createElement("button");
        retryOnPC.type = "button";
        retryOnPC.className = "primary";
        retryOnPC.textContent = "Gerar pelo meu PC";
        retryOnPC.addEventListener("click", () => retryFailedYouTubeViaPC(job, retryOnPC));
        actions.append(retryOnPC);
      }
      if (job.status === "failed" && /^(?:local_helper_required|local_helper_retry_failed|youtube_(?:authentication_required|challenge_failed|download_blocked|download_failed|ingest_timeout))/.test(String(job.error || ""))) {
        const uploadFallback = document.createElement("button");
        uploadFallback.type = "button";
        uploadFallback.className = "primary";
        uploadFallback.textContent = "Enviar MP4 e gerar";
        uploadFallback.addEventListener("click", () => {
          pendingUploadMetadata = {
            title: job.contentTitle || job.filename || "",
            overview: job.overview || "",
            year: job.releaseYear || "",
            mediaType: job.mediaType || "",
            catalogId: "",
            catalogType: /s[eé]rie|series|tv/i.test(String(job.mediaType || "")) ? "series" : "movie"
          };
          showTab("upload");
          notice("Envie o MP4 para recuperar a geração. O NEXUS mantém título e sinopse disponíveis.");
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        actions.append(uploadFallback);
      }
      if (["ready", "failed", "awaiting_configuration"].includes(job.status) && job.sourceReady === true) {
        const generate = document.createElement("button");
        generate.type = "button";
        generate.className = "primary";
        generate.textContent = job.status === "ready" ? "Gerar novamente com card" : "Gerar vídeo agora";
        generate.addEventListener("click", async () => {
          const originalText = generate.textContent;
          generate.disabled = true;
          generate.textContent = "Iniciando...";
          let inline = card.querySelector(".video-process-feedback");
          if (!inline) {
            inline = document.createElement("small");
            inline.className = "video-process-feedback";
            inline.setAttribute("role", "status");
            card.append(inline);
          }
          inline.textContent = "Enviando comando ao NEXUS...";
          try {
            const response = await api("/api/portal/videos/" + encodeURIComponent(job.id) + "/process", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                endContact: brazilWhatsappDigits($("#video-whatsapp-number")?.value || ""),
                logoEnabled: $("#video-use-logo")?.checked !== false,
                renderProfile: $("#video-render-profile")?.value === "quality" ? "quality" : "fast",
                creationMode: videoCreationMode,
                composition: videoCompositionPayload()
              })
            });
            inline.textContent = response?.alreadyProcessing
              ? "Este vídeo já está sendo gerado. Acompanhe o progresso abaixo."
              : (response?.job?.status === "cutting" ? "Geração iniciada." : "Comando recebido pelo NEXUS.");
            await loadVideoJobs();
          } catch (error) {
            if (/video_render_in_progress|já está em processamento|already processing/i.test(String(error?.message || ""))) {
              inline.textContent = "Este vídeo já está sendo gerado. Acompanhe o progresso abaixo.";
              notice("");
              videoJobTimer = setTimeout(loadVideoJobs, 800);
              return;
            }
            const message = "Não foi possível iniciar: " + error.message;
            inline.textContent = message;
            notice("Vídeos: " + error.message);
            generate.disabled = false;
            generate.textContent = originalText;
          }
        });
        actions.append(generate);
      }
      const clip = (job.clips || []).find(c => c.status === "ready" && c.previewUrl);
      if (job.status === "ready" && clip) {
        const a = document.createElement("a");
        a.className = "primary";
        a.href = clip.previewUrl;
        a.download = "nexus-video-9x16.mp4";
        a.textContent = "Baixar vídeo 9:16";
        actions.append(a);
      }
      if (["ready", "failed", "awaiting_configuration"].includes(job.status)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Excluir";
        remove.addEventListener("click", async () => {
          const label = job.contentTitle || job.filename || "este vídeo";
          if (!window.confirm("Excluir " + label + " definitivamente?")) return;
          remove.disabled = true;
          remove.textContent = "Excluindo...";
          try {
            await api("/api/portal/videos/" + encodeURIComponent(job.id), { method: "DELETE" });
            notice("Vídeo excluído.");
            await loadVideoJobs();
          } catch (error) {
            notice("Não foi possível excluir: " + error.message);
            remove.disabled = false;
            remove.textContent = "Excluir";
          }
        });
        actions.append(remove);
      }
      if (actions.children.length) card.append(actions);
      return card;
    };

    root.append(renderJobCard(visible[0]));
    const editableJobs = visible.filter(job => job.sourceReady === true && ["awaiting_configuration", "ready", "failed"].includes(job.status));
    const editableJob = editableJobs.find(job => job.id === editableSourceJobId)
      || (videoCreationMode === "edit" ? editableJobs.find(job => job.creationMode === "edit") : null);
    if (editableJob) bindEditableSource(editableJob);
    if (visible.length > 1) {
      const history = document.createElement("details");
      history.className = "video-history";
      const summary = document.createElement("summary");
      summary.textContent = "Histórico (" + (visible.length - 1) + ")";
      history.append(summary);
      visible.slice(1, 6).forEach(job => history.append(renderJobCard(job)));
      root.append(history);
    }
  } catch (error) {
    notice("Vídeos: " + error.message);
  }
}

async function uploadMedia(event) {
  event.preventDefault();
  const editable = event.editable === true;
  const form = event.currentTarget;
  const button = editable ? $("#video-generate-editable") : form.querySelector('button[type="submit"]');
  const message = editable ? $("#video-editable-action-status") : $("#media-upload-message");
  const file = editable ? event.file : $("#media-file")?.files?.[0];
  if (!file) { message.textContent = "Selecione um vídeo."; return; }
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) { message.textContent = "Use MP4, WEBM ou MOV."; return; }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) { message.textContent = "O vídeo deve ter no máximo 90 MB."; return; }
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", "publish");
  if ($("#media-note")?.value) body.append("note", $("#media-note").value);
  // A direct PC upload must never inherit a stale catalogue selection from a
  // previous YouTube search. Only an explicit fallback handoff may carry metadata.
  const uploadMetadata = pendingUploadMetadata;
  body.append("metadataMode", uploadMetadata?.title ? "fallback" : "auto");
  if (uploadMetadata?.title) {
    body.append("title", String(uploadMetadata.title || ""));
    body.append("overview", String(uploadMetadata.overview || ""));
    body.append("year", String(uploadMetadata.year || ""));
    body.append("mediaType", String(uploadMetadata.mediaType || ""));
    body.append("catalogId", String(uploadMetadata.id || uploadMetadata.catalogId || ""));
    body.append("catalogType", String(uploadMetadata.catalogType || (searchType === "series" ? "series" : "movie")));
  }
  body.append("logoEnabled", $("#video-use-logo")?.checked === false ? "0" : "1");
  body.append("endContact", brazilWhatsappDigits($("#video-whatsapp-number")?.value || ""));
  body.append("renderProfile", $("#video-render-profile")?.value === "quality" ? "quality" : "fast");
  body.append("creationMode", editable ? "edit" : videoCreationMode);
  body.append("composition", JSON.stringify(videoCompositionPayload()));
  if (button) button.disabled = true;
  message.textContent = "Enviando vídeo ao NEXUS...";
  try {
    const data = await api("/api/portal/media", { method: "POST", body });
    if (editable && !data.videoJobId) throw new Error("O servidor não retornou um vídeo editável.");
    if (editable && data.renderStarted) {
      throw new Error("O servidor ainda está na versão antiga: iniciou a geração automática. O MP4 foi recebido, mas o modo editável precisa da atualização do Cloudflare.");
    }
    message.textContent = data.message || (editable ? "Vídeo carregado no editor." : "Vídeo enviado. Convertendo para 9:16...");
    if (!editable) form.reset();
    if (editable) {
      editableSourceJobId = data.videoJobId;
      const player = $("#video-editor-player");
      if (player) { player.removeAttribute("src"); player.hidden = true; player.load(); }
      const placeholder = $("#video-editor-placeholder");
      if (placeholder) { placeholder.hidden = false; placeholder.textContent = "Carregando vídeo e cenas..."; }
      setVideoCreationMode("edit");
    } else {
      showTab("videos");
      if (uploadMetadata?.title) notice("Convertendo " + uploadMetadata.title + " para 9:16.");
    }
    pendingUploadMetadata = null;
    selectedCatalog = null;
    await loadVideoJobs();
    if (!editable) $("#video-job-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    message.textContent = "Erro: " + error.message;
  } finally {
    if (button && !editable) button.disabled = false;
    if (editable && button) button.disabled = false;
  }
}

async function loadInstagram() {
  try {
    const data = await api("/api/portal/connections");
    const ig = data.connections?.instagram || data.instagram || data.connection || {};
    $("#instagram-handle").textContent = ig.handle || ig.username || ig.instagram || ig.label || (ig.connected ? "Instagram conectado" : "Nenhuma conta conectada");
    $("#instagram-state").textContent = ig.connected || ig.status === "connected" ? "Conectado" : (ig.status || "Não conectado");
    $("#instagram-expires").textContent = ig.expiresAt ? formatDate(ig.expiresAt) : "—";
    $("#instagram-scopes").textContent = Array.isArray(ig.scopes) ? ig.scopes.join(", ") : (ig.scopes || "—");
  } catch (error) {
    notice("Instagram: " + error.message);
  }
}

async function boot() {
  try {
    const data = await api("/api/portal/session", { signal: AbortSignal.timeout(8000) });
    showDashboard(data.client || data);
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    showTab(requestedTab === "instagram" ? "instagram" : "videos");
    if (params.get("oauth") === "success") {
      notice("Instagram conectado com sucesso.");
      history.replaceState({}, "", window.location.pathname);
    } else if (params.get("oauth")) {
      notice("A conexão com o Instagram não foi concluída. Tente novamente.");
      history.replaceState({}, "", window.location.pathname);
    }
  } catch {
    showLogin();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("#login-form");
  const savePassword = $("#login-save-password");
  const desktopVersion = new URLSearchParams(window.location.search).get("desktop");
  const desktopCredentialBridge = Boolean(window.nexusWindowsCredentials?.save);
  const versionNotice = $("#nexus-windows-version-notice");
  if (desktopVersion && versionNotice && !desktopCredentialBridge) {
    versionNotice.hidden = false;
    versionNotice.textContent = "NEXUS Windows " + desktopVersion + ": o salvamento seguro requer instalar o NEXUS Windows 0.1.2 ou superior. Atualizar somente o painel não atualiza o aplicativo.";
  }
  if (loginForm && savePassword) {
    // Desktop: passwords are encrypted by Electron safeStorage on Windows.
    // Browser: delegate any saving to the browser's password manager.
    const desktopStore = window.nexusWindowsCredentials;
    const passwordInput = loginForm.elements.namedItem("password");
    const usernameInput = loginForm.elements.namedItem("username");
    if (desktopStore?.load) {
      desktopStore.load().then(saved => {
        if (!saved || !usernameInput || !passwordInput) return;
        // Never overwrite credentials already entered by the user.
        if (!usernameInput.value && !passwordInput.value) {
          usernameInput.value = saved.username;
          passwordInput.value = saved.password;
          savePassword.checked = true;
        }
      }).catch(() => {});
    }
    savePassword.addEventListener("change", () => {
      if (passwordInput) passwordInput.autocomplete = savePassword.checked ? "current-password" : "off";
      if (!savePassword.checked && desktopStore?.clear) desktopStore.clear().catch(() => {});
    });
  }
  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const remember = savePassword?.checked === true;
    try {
      const data = await api("/api/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (window.nexusWindowsCredentials) {
        if (remember) {
          const stored = await window.nexusWindowsCredentials.save(
            String(body.username || ""), String(body.password || "")
          ).catch(() => false);
          if (!stored) notice("Login realizado. O Windows não conseguiu salvar a senha com proteção; ela não foi armazenada.");
        } else {
          await window.nexusWindowsCredentials.clear().catch(() => {});
        }
      } else if (remember && window.PasswordCredential && navigator.credentials?.store) {
        try {
          await navigator.credentials.store(new PasswordCredential({
            id: String(body.username || ""),
            password: String(body.password || ""),
            name: String(body.username || "")
          }));
        } catch (_) {
          // Some browsers save passwords through their own built-in prompt.
        }
      }
      showDashboard(data.client || data);
      showTab("videos");
    } catch (error) {
      $("#login-error").textContent = error.message;
    }
  });
  $("#logout")?.addEventListener("click", async () => {
    try { await api("/api/portal/logout", { method: "POST" }); } catch {}
    showLogin();
  });
  $("#refresh")?.addEventListener("click", () => showTab(activeTab));
  $$("[data-tab]").forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.tab)));
  $$("[data-refresh]").forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.refresh || activeTab)));
  $("#trailer-search-form")?.addEventListener("submit", searchTrailers);
  $$("#video-mode-switch [data-video-mode]").forEach(btn => btn.addEventListener("click", () => setVideoCreationMode(btn.dataset.videoMode)));
  $("#video-play-toggle")?.addEventListener("click", () => {
    const player = $("#video-editor-player");
    if (!player || player.hidden) return;
    if (player.paused) player.play().catch(() => {});
    else player.pause();
  });
  $("#video-timeline")?.addEventListener("input", event => {
    const player = $("#video-editor-player");
    if (!player || !Number.isFinite(player.duration)) return;
    player.currentTime = Math.max(0, Math.min(player.duration, Number(event.target.value || 0)));
  });
  $("#mark-trim-start")?.addEventListener("click", () => {
    const player = $("#video-editor-player");
    if (!player || !Number.isFinite(player.currentTime)) return;
    $("#video-trim-start").value = player.currentTime.toFixed(3);
    updateSelectionDuration();
    updateFilmstripState();
  });
  $("#mark-trim-end")?.addEventListener("click", () => {
    const player = $("#video-editor-player");
    if (!player || !Number.isFinite(player.currentTime)) return;
    $("#video-trim-end").value = player.currentTime.toFixed(3);
    updateSelectionDuration();
    updateFilmstripState();
  });
  $("#video-trim-start-range")?.addEventListener("input", event => {
    const end = Number($("#video-trim-end-range")?.value || 0);
    const value = Math.min(Number(event.target.value || 0), Math.max(0, end - VIDEO_FRAME_SECONDS));
    $("#video-trim-start").value = value.toFixed(3);
    event.target.value = String(value);
    const player = $("#video-editor-player"); if (player) player.currentTime = value;
    updateSelectionDuration();
    updateFilmstripState();
  });
  $("#video-trim-end-range")?.addEventListener("input", event => {
    const start = Number($("#video-trim-start-range")?.value || 0);
    const value = Math.max(Number(event.target.value || 0), start + VIDEO_FRAME_SECONDS);
    $("#video-trim-end").value = value.toFixed(3);
    event.target.value = String(value);
    const player = $("#video-editor-player"); if (player) player.currentTime = value;
    updateSelectionDuration();
    updateFilmstripState();
  });
  $("#video-generate-editable")?.addEventListener("click", generateEditableVideo);
  $$("#video-logo-position [data-logo-position]").forEach(btn => btn.addEventListener("click", () => setLogoPosition(btn.dataset.logoPosition)));
  $$("[data-logo-nudge]").forEach(btn => btn.addEventListener("click", () => adjustLogoFine(btn.dataset.logoNudge)));
  $("#video-custom-text")?.addEventListener("input", refreshTextPreview);
  ["video-text-color","video-text-weight","video-text-font","video-text-italic","video-text-underline","video-text-position","video-text-offset"].forEach(id => {
    $("#" + id)?.addEventListener("input", refreshTextPreview);
    $("#" + id)?.addEventListener("change", refreshTextPreview);
  });
  window.addEventListener("resize", refreshLogoPreview);
  $("#video-logo-scale")?.addEventListener("input", refreshLogoPreview);
  $("#video-logo-effect")?.addEventListener("change", refreshLogoPreview);
  $("#video-use-logo")?.addEventListener("change", refreshLogoPreview);
  $("#video-editor-back")?.addEventListener("click", () => setVideoCreationMode("auto"));
  $("#video-trim-start")?.addEventListener("input", updateSelectionDuration);
  $("#video-trim-end")?.addEventListener("input", updateSelectionDuration);
  $("#video-editor-player")?.addEventListener("loadedmetadata", event => {
    const player = event.currentTarget;
    const timeline = $("#video-timeline");
    if (timeline) {
      timeline.max = Number.isFinite(player.duration) ? String(player.duration) : "0";
      timeline.value = String(player.currentTime || 0);
    }
    if ($("#video-duration")) $("#video-duration").textContent = videoTimeLabel(player.duration);
    if ($("#video-current-time")) $("#video-current-time").textContent = videoTimeLabel(player.currentTime);
    syncTrimRanges();
    updateSelectionDuration();
    buildVideoFilmstrip().catch(() => {});
  });
  $("#video-editor-player")?.addEventListener("timeupdate", event => {
    const player = event.currentTarget;
    const timeline = $("#video-timeline");
    if (timeline && !timeline.matches(":active")) timeline.value = String(player.currentTime || 0);
    if ($("#video-current-time")) $("#video-current-time").textContent = videoTimeLabel(player.currentTime);
    updateFilmstripState();
  });
  $("#video-editor-player")?.addEventListener("play", () => {
    if ($("#video-play-toggle")) $("#video-play-toggle").textContent = "❚❚ Pausar";
  });
  $("#video-editor-player")?.addEventListener("pause", () => {
    if ($("#video-play-toggle")) $("#video-play-toggle").textContent = "▶ Reproduzir";
  });
  setVideoCreationMode("auto");
  $("#media-upload-form")?.addEventListener("submit", uploadMedia);
  $("#video-editable-file")?.addEventListener("change", async event => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const form = $("#media-upload-form");
    if (form) await uploadMedia({ preventDefault() {}, currentTarget: form, editable: true, file });
    event.currentTarget.value = "";
  });
  $("#video-whatsapp-number")?.addEventListener("input", event => {
    event.target.value = formatBrazilWhatsapp(event.target.value);
  });
  $("#video-whatsapp-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await api("/api/portal/videos/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ whatsappNumber: brazilWhatsappDigits($("#video-whatsapp-number")?.value || "") })
      });
      $("#video-whatsapp-message").textContent = "Número salvo.";
    } catch (error) {
      $("#video-whatsapp-message").textContent = error.message;
    }
  });
  $("#connect-instagram")?.addEventListener("click", async () => {
    try {
      const data = await api("/api/portal/instagram/start");
      if (data.url) window.location.href = data.url;
      else notice(data.message || "Não foi possível iniciar a conexão.");
    } catch (error) {
      notice("Instagram: " + error.message);
    }
  });
  $("#logo-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const file = $("#logo-file")?.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("logo", file);
    body.append("removeBg", $("#logo-remove-bg")?.checked ? "1" : "0");
    try {
      const data = await api("/api/portal/branding/logo", { method: "POST", body });
      $("#logo-message").textContent = data.message || "Logo salva.";
    } catch (error) {
      $("#logo-message").textContent = error.message;
    }
  });
  boot();
});
