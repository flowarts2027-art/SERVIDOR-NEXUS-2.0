import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { BUNDLED_NICHES, bundledExample } from "../src/bundled-example-catalog.js";

async function render() {
  const box = {}, handlers = {}, requests = [];
  const data = { ok: true, map: Object.fromEntries(BUNDLED_NICHES.map(k => [k, bundledExample(k)])), niches: BUNDLED_NICHES.map(key => ({ key, label: key, url: `https://flowarts.com.br/exemplo/${key}` })), reels: [] };
  vm.runInNewContext(fs.readFileSync(new URL("../../public/examples.js", import.meta.url), "utf8"), {
    document: { querySelector: s => s === "#examples-list" ? box : null, addEventListener: (name, fn) => { handlers[name] = fn; } },
    fetch: async (path, options = {}) => { requests.push({ path, options }); return { ok: true, status: 200, json: async () => data }; },
    FormData, File, setTimeout, URL, console
  });
  handlers["nexus:view"]({ detail: "odin" });
  await new Promise(resolve => setImmediate(resolve));
  return { box, handlers, requests };
}

test("Master mostra 21 artes prontas, miniaturas corretas e formulário de imagem única", async () => {
  const { box, handlers } = await render();
  assert.match(box.innerHTML, /<b>21<\/b> de 21 nichos/);
  assert.equal((box.innerHTML.match(/Arte · 4 cenas em 2×2/g) || []).length, 21);
  for (const niche of BUNDLED_NICHES) assert.ok(box.innerHTML.includes(`/exemplos-nicho/${niche}/arte-2x2.jpg`));
  const button = { dataset: { exampleOpen: "cafeteria" }, matches: s => s === "[data-example-open]" };
  await handlers.click({ target: { closest: () => button } });
  assert.match(box.innerHTML, /name="kind" value="image" checked/);
  assert.match(box.innerHTML, /name="image"/);
});

test("Master envia uma imagem pelo fluxo existente de exemplos, sem endpoint de posts", async () => {
  const { handlers, requests } = await render();
  const file = new File([new Uint8Array([255,216,255])], "arte.jpg", { type: "image/jpeg" });
  const button = {};
  const form = { dataset: { exampleForm: "cafeteria" }, querySelector: s => s === "input[name=kind]:checked" ? { value: "image" } : s === "input[name=image]" ? { files: [file] } : button };
  await handlers.submit({ target: { closest: () => form }, preventDefault() {} });
  const posts = requests.filter(r => r.options.method === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].path, "/api/master/showcase/upload");
  assert.equal(posts[0].options.body.get("kind"), "image");
  assert.equal(posts[0].options.body.get("image").name, "arte.jpg");
  assert.equal(posts[0].options.body.get("niche"), "cafeteria");
});
