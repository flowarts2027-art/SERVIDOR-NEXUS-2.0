import test from "node:test";
import assert from "node:assert/strict";
import { materialForComment, giftCtaForTopic, giftMaterial, GIFT_MATERIALS } from "../src/gift-materials.js";
import { wantsReply } from "../src/comment-autoreply.js";
import { ensureGiftCta } from "../src/caption-polish.js";
import { giftLink, readGiftCode, signGift, handleGiftRequest, guideHtml, giftPageHtml } from "../src/gift.js";

const NOW = new Date("2026-10-15T22:00:00Z");
function memoryEnv() {
  const rows = new Map();
  const prepare = sql => ({
    bind: (...args) => ({
      run: async () => { if (/INSERT INTO nexus_state/.test(sql)) rows.set(args[0] + "|" + args[1], args[3] ?? args[2]); return {}; },
      first: async () => {
        if (/FROM nexus_state WHERE namespace=\?1 AND item_key=\?2/.test(sql)) { const v = rows.get(args[0] + "|" + args[1]); return v ? { value_json: v } : null; }
        return null;
      },
      all: async () => ({ results: [] })
    })
  });
  return { rows, NEXUS_SECRET_KEY: "teste-chave", DB: { prepare } };
}

test("cada palavra comentada escolhe o seu conteúdo", () => {
  assert.equal(materialForComment("SITE"), "site");
  assert.equal(materialForComment("quero o site!"), "site");
  assert.equal(materialForComment("Reels"), "reels");
  assert.equal(materialForComment("manda os roteiros"), "reels");
  assert.equal(materialForComment("QUERO"), "guia");
  assert.equal(materialForComment("qual o preço?"), "guia");
  assert.equal(materialForComment("lindo post"), null);
  assert.equal(wantsReply("SITE"), true);
  assert.equal(wantsReply("REELS"), true);
  assert.equal(wantsReply("parabéns"), false);
});

test("chamada do post segue o assunto e não duplica", () => {
  const base = giftMaterial("guia").cta;
  assert.match(giftCtaForTopic("Você já pensou em ter um site simples?", base), /Comente "SITE"/);
  assert.match(giftCtaForTopic("Ideia de Reels para comércio local", base), /Comente "REELS"/);
  assert.equal(giftCtaForTopic("5 sinais de que o seu perfil precisa de ajuda", base), base);
  assert.equal(giftCtaForTopic("site", ""), "");
  const withSite = ensureGiftCta("Texto do post.\n\n#flowarts", GIFT_MATERIALS.site.cta);
  assert.match(withSite, /Comente "SITE"/);
  assert.equal(ensureGiftCta(withSite, GIFT_MATERIALS.guia.cta), withSite);
});

test("o link do brinde guarda a palavra e abre o conteúdo certo", async () => {
  const env = memoryEnv();
  const url = await giftLink(env, { clientId: "primeiro-teste", igsid: "9", topic: "site" }, NOW);
  const code = url.split("/b/")[1];
  assert.equal((await readGiftCode(env, code, NOW)).t, "site");
  assert.equal((await readGiftCode(env, (await giftLink(env, { clientId: "primeiro-teste", igsid: "9", topic: "xx" }, NOW)).split("/b/")[1], NOW)).t, "guia");
  const k = await signGift(env, { c: "primeiro-teste", u: "9", g: 1, t: "reels", e: Math.floor(NOW.getTime() / 1000) + 60 });
  const guide = new URL("https://x.test/brinde/guia?k=" + k);
  const html = await (await handleGiftRequest(new Request(guide), env, guide, { now: NOW })).text();
  assert.match(html, /5 roteiros de Reels/);
  assert.doesNotMatch(html, /Baixar PDF/);
});

test("páginas mostram o conteúdo de cada palavra", () => {
  for (const id of Object.keys(GIFT_MATERIALS)) {
    const mat = GIFT_MATERIALS[id];
    const guide = guideHtml({ id: "primeiro-teste", name: "Flow Arts", config: {} }, id);
    assert.equal((guide.match(/class="step"/g) || []).length, mat.items.length, id);
    assert.ok(guide.includes(mat.section), id);
    assert.ok(!guide.includes("{brand}"), id);
    assert.ok(mat.items.every(item => item.length === 5), id);
    assert.ok(giftPageHtml("@flowarts2026", "ABCDEFGHJ", id).includes(mat.title.replace(/:/g, ":")), id);
  }
  assert.match(guideHtml({ id: "primeiro-teste", config: {} }, "guia"), /Baixar PDF/);
});
