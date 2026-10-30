import test from "node:test";
import assert from "node:assert/strict";
import { fixArtTextInOpenPosts } from "../src/art-text-fix.js";

test("agente texto nas artes: sem molduras, só marca como conferido e não mexe na imagem", async () => {
  const updates = [];
  const row = { id: "upload-feed-1", client_id: "cliente-x", scheduled_for: "2026-10-30T12:00:00Z",
    payload_json: JSON.stringify({ imageUrl: "https://x/media/posts/cliente-x/a/imagem.jpg", formatBuild: { kind: "post", imageUrl: "https://x/media/posts/cliente-x/a/imagem.jpg" } }) };
  const env = {
    MEDIA: { get: async () => null, put: async () => { throw new Error("não devia gravar"); } },
    IMAGES: {},
    ASSETS: { fetch: async () => new Response("{}", { status: 404 }) },
    DB: { prepare: sql => ({ bind: (...args) => ({
      all: async () => ({ results: /SELECT/.test(sql) ? [row] : [] }),
      run: async () => { updates.push(args); return {}; }
    }) }) }
  };
  const result = await fixArtTextInOpenPosts(env, { now: new Date("2026-10-29T12:00:00Z") });
  assert.equal(result.checked, 1);
  assert.equal(result.framed, 0);
  assert.equal(updates.length, 1);
  assert.equal(JSON.parse(updates[0][0]).formatBuild.artChecked, true);
  assert.equal(JSON.parse(updates[0][0]).formatBuild.artCheckVersion, 2);
  assert.equal(JSON.parse(updates[0][0]).imageUrl, "https://x/media/posts/cliente-x/a/imagem.jpg");
});
