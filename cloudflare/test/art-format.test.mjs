import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  artShape, assertArtFits, assertVideoFits, keepArt, mediaFitsFormat, readImageSize, readVideoSize, windowError, WINDOW_MOVES
} from "../src/art-format.js";
import { createClientUpload } from "../src/client-uploads.js";
import { enviarArte } from "../src/mcp-server.js";
import { postProblem } from "../src/missing-posts.js";

function jpeg(width, height) {
  const b = new Uint8Array(32);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255]);
  return b;
}
const file = (width, height, name = "a.jpg") => new File([jpeg(width, height)], name, { type: "image/jpeg" });

function box(type, ...parts) {
  const body = parts.reduce((all, part) => [...all, ...part], []);
  const size = body.length + 8;
  return [size >>> 24, (size >> 16) & 255, (size >> 8) & 255, size & 255, ...[...type].map(c => c.charCodeAt(0)), ...body];
}
function mp4(width, height, rotated = false) {
  const u32 = n => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  const matrix = rotated ? [0, 0x10000, 0, -0x10000 >>> 0, 0, 0, 0, 0, 0x40000000] : [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000];
  const tkhd = box("tkhd", new Array(40).fill(0), matrix.flatMap(u32), u32(width * 65536), u32(height * 65536));
  return new File([new Uint8Array([...box("ftyp", [0, 0, 0, 0]), ...box("moov", box("trak", tkhd))])], "v.mp4", { type: "video/mp4" });
}

test("janela Story aceita 9:16; Post aceita 4:5 e 1:1", () => {
  assert.equal(windowError("story", { width: 1080, height: 1920 }), "");
  assert.equal(windowError("feed", { width: 1080, height: 1350 }), "");
  assert.equal(windowError("feed", { width: 1080, height: 1080 }), "");
  assert.equal(windowError("carousel", { width: 2160, height: 2700 }), "");
});

test("arte na janela errada aponta a janela certa", () => {
  assert.equal(windowError("feed", { width: 1080, height: 1920 }), "window_story");
  assert.equal(windowError("story", { width: 1080, height: 1350 }), "window_feed");
  assert.equal(WINDOW_MOVES.window_story, "story");
  assert.equal(WINDOW_MOVES.window_feed, "feed");
});

test("tamanho que não serve para janela nenhuma é recusado", () => {
  assert.equal(windowError("feed", { width: 1024, height: 1536 }), "size_invalid");
  assert.equal(windowError("feed", { width: 1100, height: 1350 }), "size_invalid");
  assert.equal(windowError("story", { width: 1920, height: 1080 }), "size_invalid");
});

test("arredondamento de 1 pixel passa", () => {
  assert.equal(artShape(1080, 1351), "portrait");
});

test("lê o tamanho de JPG, PNG e WEBP", () => {
  assert.deepEqual(readImageSize(jpeg(1080, 1350)), { width: 1080, height: 1350 });
  const png = new Uint8Array(32);
  png.set([0x89, 0x50, 0x4e, 0x47]);
  new DataView(png.buffer).setUint32(16, 1080);
  new DataView(png.buffer).setUint32(20, 1920);
  assert.deepEqual(readImageSize(png), { width: 1080, height: 1920 });
  const webp = new Uint8Array(40);
  webp.set([..."RIFF"].map(c => c.charCodeAt(0)));
  webp.set([..."WEBPVP8X"].map(c => c.charCodeAt(0)), 8);
  webp.set([0x37, 4, 0, 0x7f, 7, 0], 24);
  assert.deepEqual(readImageSize(webp), { width: 1080, height: 1920 });
  assert.equal(readImageSize(new Uint8Array([1, 2, 3])), null);
});

test("carrossel: todas as páginas do mesmo tamanho", async () => {
  await assertArtFits({}, "carousel", [file(1080, 1350), file(1080, 1350)]);
  await assert.rejects(assertArtFits({}, "carousel", [file(1080, 1350), file(1080, 1080)]), /carousel_mixed/);
  await assert.rejects(assertArtFits({}, "carousel", [file(1080, 1920), file(1080, 1920)]), /size_invalid/);
});

test("vídeo: lê o tamanho, entende vídeo girado e recusa deitado", async () => {
  assert.deepEqual(await readVideoSize(mp4(1080, 1920)), { width: 1080, height: 1920 });
  assert.deepEqual(await readVideoSize(mp4(1920, 1080, true)), { width: 1080, height: 1920 });
  await assertVideoFits(mp4(1080, 1920));
  await assertVideoFits(mp4(1920, 1080, true));
  await assert.rejects(assertVideoFits(mp4(1920, 1080)), /video_window/);
});

test("imagem certa em JPG não é alterada: mesmos bytes", async () => {
  const image = file(1080, 1350);
  assert.deepEqual(await keepArt({ IMAGES: { input() { throw new Error("não pode mexer"); } } }, image), jpeg(1080, 1350));
});

test("PNG só muda de tipo: nada de transform, corte ou margem", async () => {
  const calls = [];
  const env = { IMAGES: { input: () => ({
    transform() { throw new Error("não pode redimensionar"); },
    output: async options => { calls.push(options); return { response: () => new Response(new Uint8Array([9])) }; }
  }) } };
  const out = await keepArt(env, new File([new Uint8Array([1])], "a.png", { type: "image/png" }));
  assert.deepEqual([...out], [9]);
  assert.deepEqual(calls, [{ format: "image/jpeg", quality: 92 }]);
});

function uploadEnv() {
  const put = [];
  return {
    put,
    env: {
      PUBLIC_BASE_URL: "https://x.test",
      MEDIA: { put: async (key, body) => { put.push([key, body]); } },
      DB: { prepare: () => ({ bind() { return this; }, run: async () => ({ meta: { changes: 1 } }) }) }
    }
  };
}
const NOW = new Date("2026-11-06T12:00:00.000Z");
const CLIENT = { id: "giltec", name: "Giltec", config: {} };
function form(type, images) {
  const data = new FormData();
  data.set("type", type);
  data.set("caption", "Legenda");
  data.set("date", "2026-11-08");
  data.set("time", "09:00");
  images.forEach(image => data.append("images", image));
  return data;
}

test("painel: arte 9:16 na janela Post é recusada e nada é guardado", async () => {
  const { env, put } = uploadEnv();
  await assert.rejects(createClientUpload(env, CLIENT, form("feed", [file(1080, 1920)]), NOW), /window_story/);
  assert.equal(put.length, 0);
});

test("painel: arte 1:1 entra na janela Post com os mesmos bytes, sem margem", async () => {
  const { env, put } = uploadEnv();
  await createClientUpload(env, CLIENT, form("feed", [file(1080, 1080)]), NOW);
  assert.deepEqual(put[0][1], jpeg(1080, 1080));
});

test("painel: 4:5 na janela Story é recusada", async () => {
  const { env } = uploadEnv();
  await assert.rejects(createClientUpload(env, CLIENT, form("story", [file(1080, 1350)]), NOW), /window_feed/);
});

test("trava final: story em post de feed não publica; arte certa publica", async () => {
  const objects = { "a.jpg": jpeg(1080, 1920), "b.jpg": jpeg(1080, 1350) };
  const env = { MEDIA: { get: async key => ({ arrayBuffer: async () => objects[key].buffer }) } };
  const url = name => "https://x.test/media/" + name;
  assert.equal(await mediaFitsFormat(env, { imageUrl: url("a.jpg") }, "image"), false);
  assert.equal(await mediaFitsFormat(env, { imageUrl: url("b.jpg") }, "post"), true);
  assert.equal(await mediaFitsFormat(env, { imageUrl: url("a.jpg") }, "story"), true);
  assert.equal(await mediaFitsFormat(env, { formatBuild: { carouselUrls: [url("b.jpg"), url("a.jpg")] } }, "carousel"), false);
  assert.equal(await mediaFitsFormat(env, { formatBuild: { videoUrl: url("v.mp4") } }, "reel"), true);
  assert.equal(await mediaFitsFormat(env, { imageUrl: "https://outro.test/x.jpg" }, "post"), true);
});

test("o quadro do Master mostra arte no formato errado", () => {
  assert.equal(postProblem({ status: "ready", approval_status: "approved", error: "format_mismatch" }), "arte no formato errado");
});

function connector(bytes) {
  const uploads = [];
  const env = {
    NEXUS_MCP_WRITE: "on",
    DB: { prepare: () => ({ first: async () => ({ n: 0 }), bind() { return this; } }) }
  };
  const deps = {
    getClient: async () => CLIENT,
    download: async () => new Response(bytes),
    upload: async (_, data) => { uploads.push(data); return { ok: true, id: "x" }; }
  };
  return { env, deps, uploads };
}
const ARGS = { cliente_id: "giltec", dia: "2026-11-08", hora: "09:00", imagem: { download_url: "https://x.test/a.jpg" } };

test("conector: formato é obrigatório", async () => {
  const { env, deps } = connector(jpeg(1080, 1350));
  await assert.rejects(enviarArte(env, deps, ARGS, NOW), /campo formato é obrigatório/);
});

test("conector: formato que não bate com o tamanho é recusado com mensagem clara", async () => {
  const { env, deps, uploads } = connector(jpeg(1080, 1920));
  await assert.rejects(enviarArte(env, deps, { ...ARGS, formato: "post" }, NOW), /Use formato story/);
  assert.equal(uploads.length, 0);
});

test("conector: reels sem vídeo é recusado", async () => {
  const { env, deps } = connector(jpeg(1080, 1920));
  await assert.rejects(enviarArte(env, deps, { ...ARGS, formato: "reels" }, NOW), /Reels precisa de vídeo/);
});

test("regra de envio existe e o ChatGPT é avisado", async () => {
  const root = new URL("../../docs/nexus-memory/", import.meta.url);
  const rule = await readFile(new URL("REGRAS_ENVIO_ARTES.md", root), "utf8");
  assert.match(rule, /1080x1920/);
  assert.match(await readFile(new URL("HANDOFF_CHATGPT.md", root), "utf8"), /REGRAS_ENVIO_ARTES\.md/);
  assert.match(await readFile(new URL("BRIDGE_PROTOCOL.md", root), "utf8"), /REGRAS_ENVIO_ARTES\.md/);
});
