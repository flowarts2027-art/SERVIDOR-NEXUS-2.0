import test from "node:test";
import assert from "node:assert/strict";
import * as frames from "../src/art-frame.js";
import { enviarArte } from "../src/mcp-server.js";

const { pickFrame, hasFrames, composeFramed, loadFrames, resetFramesCache } = frames;

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

test("foto ocupa a tela toda: sem desfoque, véu ou margem, só o texto e o número por cima", async () => {
  const { env, log, assets } = fakeEnv();
  const frame = pickFrame(META, "quatree-dog", false, 0);
  const out = await composeFramed(env, new Uint8Array([1, 2, 3]), frame, { numero: 2 });
  assert.ok(out.byteLength > 0);
  const steps = log[0].steps;
  assert.deepEqual(steps[0], ["transform", { width: 1080, height: 1350, fit: "cover" }]);
  assert.deepEqual(steps[1][3], { left: 0, top: 0 }); // texto inteiro
  assert.deepEqual(steps[2][3], { left: 0, top: 0 }); // identidade do deploy
  assert.deepEqual(steps[3][3], { left: 948, top: 66 }); // número
  assert.deepEqual(steps[4], ["output", { format: "image/jpeg", quality: 90 }]);
  assert.deepEqual(assets, ["/molduras/quatree-dog/feed-1.png", "/molduras/quatree-dog/marca-feed.png", "/molduras/quatree-dog/num-2.png"]);
});

test("story usa 1080x1920", async () => {
  const { env, log } = fakeEnv({ info: { width: 1080, height: 1920 } });
  await composeFramed(env, new Uint8Array([1]), pickFrame(META, "quatree-dog", true, 0), { story: true });
  assert.equal(log[0].steps[0][1].height, 1920);
});

test("foto fora do tamanho não recebe texto: nunca corta nem encolhe", async () => {
  const { env } = fakeEnv({ info: { width: 1080, height: 1080 } });
  await assert.rejects(composeFramed(env, new Uint8Array([1]), pickFrame(META, "quatree-dog", false, 0)), /art_not_framable/);
});

test("Daniela Martins não recebe nada escrito", () => {
  const meta = { clientes: { "daniela-martins": META.clientes["quatree-dog"] } };
  assert.equal(hasFrames(meta, "daniela-martins"), false);
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

test("conector: ja_tem_texto=true manda a imagem como veio", async () => {
  const { env, deps, uploads, fake } = connectorSetup();
  const out = await enviarArte(env, deps, { cliente_id: "quatree-dog", formato: "post", dia: "2026-10-31", hora: "09:00", imagem: img(1), ja_tem_texto: true });
  assert.equal(fake.log.length, 0);
  assert.match(out.texto, /arte preservada/);
  assert.equal(uploads.length, 1);
});

test("sem as molduras publicadas, não quebra (devolve null)", async () => {
  resetFramesCache();
  assert.equal(await loadFrames({}), null);
  assert.equal(await loadFrames({ ASSETS: { fetch: async () => new Response("x", { status: 404 }) } }), null);
});

// Carimbador (Rodrigo, 18/11/2026): a logo vem do arquivo salvo no Master, nunca da IA.

// Regra de 18/11/2026: o Nexus nunca escreve texto; só cola a logo do Master, com ou sem texto na arte.
test("conector: com ou sem ja_tem_texto, a arte vai como veio e sem moldura de texto", async () => {
  for (const ja of [undefined, true, false]) {
    const { env, deps, uploads, fake } = connectorSetup();
    const out = await enviarArte(env, deps, { cliente_id: "quatree-dog", formato: "post", dia: "2026-10-31", hora: "09:00", imagem: img(1), ...(ja === undefined ? {} : { ja_tem_texto: ja }) });
    assert.match(out.texto, /só a logo oficial salva no Master/);
    assert.equal(fake.log.length, 0, "o conector não escreve nada");
    assert.equal(uploads[0].get("jaTemTexto"), "1");
    assert.equal(uploads[0].get("approval"), "cliente");
  }
});

const { stampLogo, logoPositionFor, NEXUS_WRITES_TEXT_ON_ARRIVAL } = frames;
const logoEnv = (art, logo) => {
  const fake = fakeEnv();
  let n = 0;
  fake.env.IMAGES.info = async () => (n++ === 0 ? art : logo);
  fake.env.MEDIA = { get: async () => ({ body: new Blob([new Uint8Array([0x89, 0x50])]).stream() }) };
  return fake;
};

test("carimbo: só a logo, canto de cima à direita, sem mudar o tamanho da arte", async () => {
  assert.equal(NEXUS_WRITES_TEXT_ON_ARRIVAL, false);
  const { env, log } = logoEnv({ width: 1080, height: 1350 }, { width: 200, height: 200 });
  await stampLogo(env, new Uint8Array([1]), "brand/giltec/logo.png", { position: logoPositionFor("giltec") });
  const steps = log[0].steps;
  assert.equal(steps.length, 2, "logo e saída; nenhum transform na arte");
  assert.deepEqual(steps[0][2], [["transform", { width: 216, height: 216, fit: "scale-down" }]]);
  assert.deepEqual(steps[0][3], { left: 1080 - 54 - 216, top: 54 });
});

test("carimbo: Daniela Martins leva a logo embaixo, no meio", async () => {
  assert.equal(logoPositionFor("daniela-martins"), "bottom");
  const { env, log } = logoEnv({ width: 1080, height: 1350 }, { width: 1440, height: 1080 });
  await stampLogo(env, new Uint8Array([1]), "brand/daniela/logo.png", { position: "bottom" });
  const [, , , pos] = log[0].steps[0];
  assert.equal(pos.left, Math.round((1080 - 432) / 2));
  assert.equal(pos.top, 1350 - 324 - 54);
});

test("carimbo: sem logo salva, dá erro (quem chama manda a arte como veio)", async () => {
  const { env } = logoEnv({ width: 1080, height: 1350 }, { width: 1, height: 1 });
  env.MEDIA = { get: async () => null };
  await assert.rejects(stampLogo(env, new Uint8Array([1]), "x"), /logo_missing/);
});
