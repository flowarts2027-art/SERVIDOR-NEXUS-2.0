import test from "node:test";
import assert from "node:assert/strict";
import { hasPanel, pickPanel, composePanel, isEyebrowPhoto, nextPanelCounter, PANEL_CLIENTS } from "../src/art-frame.js";

// Moldura da Daniela (Rodrigo, 20/11/2026).
const META = {
  clientes: {
    "daniela-martins": {
      estilo: "painel",
      feed: [
        { arquivo: "daniela-martins/painel-feed-1.png", tema: "depilacao" },
        { arquivo: "daniela-martins/painel-feed-2.png", tema: "depilacao" },
        { arquivo: "daniela-martins/painel-feed-3.png", tema: "sobrancelha" }
      ],
      story: [{ arquivo: "daniela-martins/painel-story-1.png", tema: "depilacao" }],
      logo: { feed: { centro_y: 1272, altura: 110 }, story: { centro_y: 1640, altura: 120 } }
    },
    "quatree-dog": { feed: [{ arquivo: "q/f.png" }], story: [{ arquivo: "q/s.png" }] }
  }
};

function fakeEnv({ logoInMaster = true } = {}) {
  const chain = name => {
    const node = { name, steps: [] };
    const api = {
      node,
      transform(opts) { node.steps.push(["transform", opts]); return api; },
      draw(child, opts) { node.steps.push(["draw", child.node.name, child.node.steps, opts]); return api; },
      async output() { return { response: () => new Response(new Uint8Array([0xff, 0xd8, 1]), { status: 200 }) }; }
    };
    return api;
  };
  let n = 0;
  const root = [];
  const store = new Map();
  const assets = [];
  return {
    root, store, assets,
    env: {
      IMAGES: {
        info: async () => ({ width: 720, height: 305 }),
        input: () => { const c = chain("in" + (n++)); root.push(c); return c; }
      },
      ASSETS: { fetch: async req => { assets.push(new URL(req.url).pathname); return new Response(new Uint8Array([0x89]), { status: 200 }); } },
      MEDIA: {
        get: async key => {
          if (key === "logos/dani.png") return logoInMaster ? { body: new Uint8Array([1, 2]) } : null;
          if (!store.has(key)) return null;
          return { json: async () => JSON.parse(store.get(key)) };
        },
        put: async (key, value) => { store.set(key, value); }
      }
    }
  };
}

test("só a Daniela tem moldura de painel, e só com o estilo certo", () => {
  assert.ok(PANEL_CLIENTS.has("daniela-martins"));
  assert.equal(hasPanel(META, "daniela-martins"), true);
  assert.equal(hasPanel(META, "quatree-dog"), false);
  assert.equal(hasPanel({ clientes: { "daniela-martins": { feed: [1], story: [1] } } }, "daniela-martins"), false);
});

test("escolhe só textos do tema e gira pelo contador", () => {
  assert.equal(pickPanel(META, "daniela-martins", false, "depilacao", 0).arquivo, "daniela-martins/painel-feed-1.png");
  assert.equal(pickPanel(META, "daniela-martins", false, "depilacao", 1).arquivo, "daniela-martins/painel-feed-2.png");
  assert.equal(pickPanel(META, "daniela-martins", false, "depilacao", 2).arquivo, "daniela-martins/painel-feed-1.png");
  assert.equal(pickPanel(META, "daniela-martins", false, "sobrancelha", 5).arquivo, "daniela-martins/painel-feed-3.png");
  // Story sem texto de sobrancelha: usa o que tiver.
  const s = pickPanel(META, "daniela-martins", true, "sobrancelha", 0);
  assert.equal(s.arquivo, "daniela-martins/painel-story-1.png");
  assert.deepEqual(s.logo, { centro_y: 1640, altura: 120 });
});

test("contador guarda feed e story separados", async () => {
  const { env } = fakeEnv();
  assert.equal(await nextPanelCounter(env, "daniela-martins", false), 0);
  assert.equal(await nextPanelCounter(env, "daniela-martins", false), 1);
  assert.equal(await nextPanelCounter(env, "daniela-martins", true), 0);
  assert.equal(await nextPanelCounter(env, "daniela-martins", false), 2);
});

test("sem IA a foto conta como depilação (serviço principal)", async () => {
  assert.equal(await isEyebrowPhoto({}, new Uint8Array([1])), false);
});

test("monta foto cobrindo a tela + moldura + logo do Master no meio da faixa de baixo", async () => {
  const { env, root } = fakeEnv();
  const frame = pickPanel(META, "daniela-martins", false, "depilacao", 0);
  const out = await composePanel(env, new Uint8Array([1]), frame, { story: false, logoKey: "logos/dani.png" });
  assert.ok(out.byteLength > 0);
  const photo = root[0].node.steps;
  // Fundo: a mesma foto desfocada; por cima, a foto com 86% no canto de cima à esquerda (Rodrigo, 26/11/2026).
  assert.deepEqual(photo[0], ["transform", { width: 1080, height: 1350, fit: "cover", blur: 60 }]);
  const draws = photo.filter(s => s[0] === "draw");
  assert.equal(draws.length, 3);
  assert.deepEqual(draws[0][2], [["transform", { width: 929, height: 1161, fit: "cover" }]]);
  assert.deepEqual(draws[0][3], { left: 0, top: 0 });
  const logo = draws[2][3];
  // 720x305 com 110 de altura = 260 de largura, centralizada; centro em 1272.
  assert.equal(logo.left, Math.round((1080 - 260) / 2));
  assert.equal(logo.top, 1272 - 55);
});

test("sem logo no Master usa a logo do deploy (public/brand)", async () => {
  const { env, assets } = fakeEnv({ logoInMaster: false });
  const frame = pickPanel(META, "daniela-martins", true, "depilacao", 0);
  await composePanel(env, new Uint8Array([1]), frame, { story: true, logoKey: "logos/dani.png" });
  assert.ok(assets.includes("/brand/daniela-martins-logo.png"));
  assert.ok(assets.includes("/molduras/daniela-martins/painel-story-1.png"));
});

// Todos os clientes (Rodrigo, 20/11/2026): moldura de painel para quem tem estilo "painel".
test("moldura de painel vale para qualquer cliente com estilo painel", async () => {
  const { hasPanel, panelThemeFor } = await import("../src/art-frame.js");
  const meta = { clientes: { "maskara-assessoria": { estilo: "painel", feed: [{ arquivo: "m/f.png", tema: "geral" }], story: [{ arquivo: "m/s.png", tema: "geral" }] } } };
  assert.equal(hasPanel(meta, "maskara-assessoria"), true);
  assert.equal(hasPanel(meta, "luciana-carvalho"), false);
  assert.equal(await panelThemeFor({}, "maskara-assessoria", new Uint8Array([1])), "geral");
  assert.equal(await panelThemeFor({}, "daniela-martins", new Uint8Array([1])), "depilacao");
});
