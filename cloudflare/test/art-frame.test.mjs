import test from "node:test";
import assert from "node:assert/strict";
import * as frames from "../src/art-frame.js";
import { enviarArte } from "../src/mcp-server.js";

const { photoBox, pickFrame, hasFrames, composeFramed, loadFrames, resetFramesCache } = frames;

const META = {
  versao: 1,
  clientes: {
    "quatree-dog": {
      feed: [
        { arquivo: "quatree-dog/feed-1.png", topo: 472, base: 1018 },
        { arquivo: "quatree-dog/feed-2.png", topo: 472, base: 1018 }
      ],
      story: [{ arquivo: "quatree-dog/story-1.png", topo: 694, base: 1236 }],
      numero: { feed: { left: 948, top: 66 }, story: { left: 948, top: 288 } }
    }
  }
};

// Binding de imagens falso: guarda cada passo para conferir a ordem das camadas.
function fakeEnv({ fail = false, info = { width: 1664, height: 2080 } } = {}) {
  const log = [];
  const chain = name => {
    const node = { name, steps: [] };
    const api = {
      node,
      transform(opts) { node.steps.push(["transform", opts]); return api; },
      draw(child, opts) { node.steps.push(["draw", child.node.name, child.node.steps, opts]); return api; },
      async output(opts) {
        node.steps.push(["output", opts]);
        log.push(node);
        return { response: () => fail ? new Response("x", { status: 500 }) : new Response(new Uint8Array([0xff, 0xd8, 1, 2]), { status: 200 }) };
      }
    };
    return api;
  };
  let n = 0;
  const assets = [];
  return {
    log, assets,
    env: {
      IMAGES: { info: async () => info, input: () => chain("in" + (n++)) },
      ASSETS: {
        fetch: async req => {
          const path = new URL(req.url).pathname;
          assets.push(path);
          if (path.endsWith("molduras.json")) return Response.json(META);
          return new Response(new Uint8Array([0x89, 0x50]), { status: 200 });
        }
      }
    }
  };
}

test("foto no meio: inteira quando cabe, corta no máximo 10% em cima e embaixo", () => {
  // 4:5 numa faixa larga: altura usa a faixa toda e mostra 80% da foto.
  const b = photoBox(1664, 2080, 1080, 546);
  assert.equal(b.height, 546);
  assert.ok(b.width < 1080);
  assert.ok(b.width / 1664 * 2080 * 0.8 <= 546 + 1, "não corta mais de 20% da altura");
  assert.equal(b.left, Math.round((1080 - b.width) / 2));
  // Foto bem larga: cabe inteira na largura.
  const w = photoBox(2000, 800, 1080, 546);
  assert.equal(w.width, 1080);
  assert.ok(w.height <= 546);
});

test("escolhe moldura girando os textos e sabe onde vai o número do carrossel", () => {
  assert.equal(hasFrames(META, "quatree-dog"), true);
  assert.equal(hasFrames(META, "demo-cafe"), false);
  assert.equal(pickFrame(META, "quatree-dog", false, 0).arquivo, "quatree-dog/feed-1.png");
  assert.equal(pickFrame(META, "quatree-dog", false, 1).arquivo, "quatree-dog/feed-2.png");
  assert.equal(pickFrame(META, "quatree-dog", false, 2).arquivo, "quatree-dog/feed-1.png");
  const s = pickFrame(META, "quatree-dog", true, 7);
  assert.equal(s.arquivo, "quatree-dog/story-1.png");
  assert.deepEqual(s.numero, { left: 948, top: 288 });
});

test("monta na ordem: fundo desfocado, véu, foto no meio, moldura e número", async () => {
  const { env, log, assets } = fakeEnv();
  const frame = pickFrame(META, "quatree-dog", false, 0);
  const out = await composeFramed(env, new Uint8Array([1, 2, 3]), frame, { numero: 2 });
  assert.ok(out.byteLength > 0);
  const steps = log[0].steps;
  assert.deepEqual(steps[0], ["transform", { width: 1080, height: 1350, fit: "cover", blur: 40 }]);
  assert.equal(steps[1][0], "draw"); // véu
  assert.equal(steps[2][0], "draw"); // foto
  assert.equal(steps[2][3].top >= frame.topo, true);
  assert.equal(steps[3][3].left, 0); // moldura inteira
  assert.deepEqual(steps[4][3], { left: 948, top: 66 }); // número
  assert.deepEqual(steps[5], ["output", { format: "image/jpeg", quality: 90 }]);
  assert.deepEqual(assets, ["/molduras/quatree-dog/veu-feed.png", "/molduras/quatree-dog/feed-1.png", "/molduras/quatree-dog/num-2.png"]);
});

test("story usa 1080x1920 e o véu do story", async () => {
  const { env, log, assets } = fakeEnv();
  await composeFramed(env, new Uint8Array([1]), pickFrame(META, "quatree-dog", true, 0), { story: true });
  assert.equal(log[0].steps[0][1].height, 1920);
  assert.ok(assets.includes("/molduras/quatree-dog/veu-story.png"));
});

// ---------- conector: enviar arte com texto automático ----------
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
function connectorSetup(envOpts) {
  resetFramesCache();
  const fake = fakeEnv(envOpts);
  const uploads = [];
  const env = {
    ...fake.env,
    DB: { prepare: () => ({ first: async () => ({ n: 0 }), bind() { return this; } }) }
  };
  const deps = {
    getClient: async (_e, id) => (["quatree-dog", "demo-cafe"].includes(id) ? { id, name: id } : null),
    download: async () => new Response(JPG, { status: 200 }),
    upload: async (_e, form) => { uploads.push(form); return { id: "up-1" }; },
    frames
  };
  return { env, deps, uploads, fake };
}
const img = n => ({ download_url: "https://files.oaiusercontent.com/f" + n });

test("conector: foto sem texto ganha a moldura antes de ir ao painel", async () => {
  const { env, deps, uploads, fake } = connectorSetup();
  const out = await enviarArte(env, deps, { cliente_id: "quatree-dog", formato: "carrossel", dia: "2026-10-31", hora: "12:00", imagem: img(1), imagem2: img(2), imagem3: img(3), ja_tem_texto: false });
  assert.match(out.texto, /escreveu/);
  assert.equal(fake.log.length, 3);
  const files = uploads[0].getAll("images");
  assert.equal(files.length, 3);
  assert.ok(files.every(f => f.type === "image/jpeg" && f.name.startsWith("arte-")));
  assert.ok(fake.assets.includes("/molduras/quatree-dog/num-3.png"));
  assert.equal(uploads[0].get("approval"), "cliente");
});

test("conector: ja_tem_texto=true manda a imagem como veio", async () => {
  const { env, deps, uploads, fake } = connectorSetup();
  const out = await enviarArte(env, deps, { cliente_id: "quatree-dog", formato: "post", dia: "2026-10-31", hora: "09:00", imagem: img(1), ja_tem_texto: true });
  assert.equal(fake.log.length, 0);
  assert.match(out.texto, /arte preservada/);
  assert.equal(uploads.length, 1);
});

test("conector: se não der para escrever o texto, nada vai ao painel", async () => {
  const { env, deps, uploads } = connectorSetup({ fail: true });
  await assert.rejects(enviarArte(env, deps, { cliente_id: "quatree-dog", formato: "post", dia: "2026-10-31", hora: "09:00", imagem: img(1), ja_tem_texto: false }), /Nada foi enviado/);
  assert.equal(uploads.length, 0);
});

test("conector: cliente sem moldura recebe a imagem como veio, com aviso", async () => {
  const { env, deps, uploads } = connectorSetup();
  const out = await enviarArte(env, deps, { cliente_id: "demo-cafe", formato: "post", dia: "2026-10-31", hora: "09:00", imagem: img(1), ja_tem_texto: false });
  assert.match(out.texto, /ainda não tem moldura/);
  assert.equal(uploads.length, 1);
});

test("sem as molduras publicadas, não quebra (devolve null)", async () => {
  resetFramesCache();
  assert.equal(await loadFrames({}), null);
  assert.equal(await loadFrames({ ASSETS: { fetch: async () => new Response("x", { status: 404 }) } }), null);
});
