/* Nexus video overlay model. No external dependencies; coordinates are percentages. */
(function (root) {
  "use strict";
  const TYPES = new Set(["text", "emoji", "sticker", "gif"]);
  const EFFECTS = new Set(["none", "blink", "fade", "pulse", "bounce", "slide", "spin", "float", "zoom", "glow"]);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(value)) ? Number(value) : lo));
  const cleanText = (value, limit) => String(value ?? "").slice(0, limit);
  const safeAsset = (value) => {
    const url = cleanText(value, 2048).trim();
    if (!url) return "";
    // Only same-origin media and HTTPS, never javascript:, data:, blob:, or local files.
    if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return url;
    try { const parsed = new URL(url); return parsed.protocol === "https:" ? parsed.href : ""; }
    catch { return ""; }
  };
  const identifier = () => "layer-" + (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  function normalize(item, duration = 3600) {
    if (!item || !TYPES.has(item.type)) throw new TypeError("Unsupported overlay type");
    const length = clamp(duration, 0.033, 86400);
    const start = clamp(item.start ?? 0, 0, length);
    const end = clamp(item.end ?? length, start, length);
    const type = item.type;
    const src = type === "sticker" || type === "gif" ? safeAsset(item.src) : "";
    if ((type === "sticker" || type === "gif") && !src) throw new TypeError("A safe asset URL is required");
    return {
      id: cleanText(item.id || identifier(), 96),
      type,
      text: type === "text" || type === "emoji" ? cleanText(item.text, type === "emoji" ? 24 : 280) : "",
      src,
      x: clamp(item.x ?? 50, 0, 100),
      y: clamp(item.y ?? 50, 0, 100),
      width: clamp(item.width ?? 30, 3, 100),
      scale: clamp(item.scale ?? 1, 0.2, 3),
      rotation: clamp(item.rotation ?? 0, -180, 180),
      opacity: clamp(item.opacity ?? 1, 0, 1),
      fontSize: clamp(item.fontSize ?? 44, 8, 90),
      color: /^#[\da-f]{6}$/i.test(item.color || "") ? item.color : "#ffffff",
      bold: Boolean(item.bold),
      italic: Boolean(item.italic),
      underline: Boolean(item.underline),
      effect: EFFECTS.has(item.effect) ? item.effect : "none",
      start,
      end
    };
  }
  function visibleAt(layer, seconds) {
    const time = Number(seconds);
    return Number.isFinite(time) && time >= layer.start && time < layer.end;
  }
  // FFmpeg/Pillow rasterizes at fontSize * 3 for a 1080px-wide output.
  // Match that proportional size in the actual 9:16 preview (usually 260px wide).
  function previewFontPixels(fontSize, previewWidth) {
    return Math.max(1, clamp(fontSize, 8, 90) * 3 * clamp(previewWidth, 1, 4096) / 1080);
  }
  function renderLayer(container, layer) {
    if (!container || !container.ownerDocument) throw new TypeError("A DOM container is required");
    const el = container.ownerDocument.createElement(layer.type === "gif" || layer.type === "sticker" ? "img" : "div");
    el.className = "nexus-overlay nexus-overlay--" + layer.type;
    el.dataset.layerId = layer.id;
    if (el.tagName === "IMG") {
      el.src = layer.src;
      el.alt = layer.type === "gif" ? "GIF" : "Figurinha";
      el.draggable = false;
    } else el.textContent = layer.text; // Never inject HTML supplied by client.
    Object.assign(el.style, {
      position: "absolute", left: layer.x + "%", top: layer.y + "%",
      transform: "translate(-50%, -50%) rotate(" + layer.rotation + "deg) scale(" + layer.scale + ")",
      opacity: String(layer.opacity), width: layer.type === "text" ? "max-content" : layer.width + "%",
      maxWidth: "100%", fontSize: previewFontPixels(layer.fontSize, container.getBoundingClientRect().width) + "px", color: layer.color,
      fontWeight: layer.bold ? "700" : "400", fontStyle: layer.italic ? "italic" : "normal",
      textDecoration: layer.underline ? "underline" : "none",
      cursor: "grab", touchAction: "none", userSelect: "none"
    });
    if (layer.effect !== "none") el.dataset.effect = layer.effect;
    container.appendChild(el);
    return el;
  }
  function attachDrag(element, layer, onChange) {
    let active = null;
    element.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      const box = element.parentElement.getBoundingClientRect();
      if (!box.width || !box.height) return;
      active = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: layer.x, originY: layer.y, box };
      element.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    element.addEventListener("pointermove", event => {
      if (!active || event.pointerId !== active.id) return;
      layer.x = clamp(active.originX + (event.clientX - active.x) / active.box.width * 100, 0, 100);
      layer.y = clamp(active.originY + (event.clientY - active.y) / active.box.height * 100, 0, 100);
      element.style.left = layer.x + "%";
      element.style.top = layer.y + "%";
      onChange?.(layer);
    });
    const release = event => { if (active && event.pointerId === active.id) active = null; };
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
  }
  const api = Object.freeze({ normalize, visibleAt, renderLayer, attachDrag, previewFontPixels, effects: [...EFFECTS] });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NexusVideoOverlays = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
