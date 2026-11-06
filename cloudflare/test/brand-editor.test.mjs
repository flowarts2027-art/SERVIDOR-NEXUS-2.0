import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = name => readFile(new URL("../../public/" + name, import.meta.url), "utf8");

// Tela de pixels de mentira: o suficiente para rodar o corte do editor sem navegador.
function fakeCanvas(width, height, paint = () => [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  const canvas = { width, height, data };
  canvas.getContext = () => ({
    getImageData: () => ({ data: canvas.data }),
    drawImage(source, sx, sy, sw, sh) { canvas.crop = { sx, sy, sw, sh }; }
  });
  return canvas;
}

async function editor(small = () => fakeCanvas(64, 64)) {
  const window = {};
  vm.runInNewContext(await read("brand-editor.js"), { window, document: { createElement: small } });
  return window.BrandEditor;
}

const ORANGE = [255, 165, 0, 255];
const BLACK = [0, 0, 0, 255];
const inside = (x, y) => x >= 20 && x < 60 && y >= 10 && y < 30;

test("corta as sobras de fundo transparente e de fundo colorido", async () => {
  const { trimBackground } = await editor();
  for (const background of [[0, 0, 0, 0], ORANGE]) {
    const out = trimBackground(fakeCanvas(100, 50, (x, y) => inside(x, y) ? BLACK : background));
    assert.deepEqual([out.width, out.height], [40, 20]);
    assert.deepEqual([out.crop.sx, out.crop.sy, out.crop.sw, out.crop.sh], [20, 10, 40, 20]);
  }
});

test("foto com cantos diferentes, ou imagem de uma cor só, não é cortada", async () => {
  const { trimBackground } = await editor();
  const photo = fakeCanvas(10, 10, (x, y) => [x * 25, y * 25, 0, 255]);
  assert.equal(trimBackground(photo), photo);
  const blank = fakeCanvas(10, 10, () => ORANGE);
  assert.equal(trimBackground(blank), blank);
});

test("aviso de capa: mais de 3 vezes a altura, antes ou depois do corte, e a capa do Facebook", async () => {
  const { looksLikeCover, COVER_MESSAGE } = await editor();
  const size = (width, height) => ({ width, height });
  assert.equal(COVER_MESSAGE, "Esta imagem parece uma capa, não uma logo. Envie só a logo.");
  assert.equal(looksLikeCover(size(1640, 400), size(1640, 400)), true);
  assert.equal(looksLikeCover(size(800, 400), size(700, 200)), true);
  assert.equal(looksLikeCover(size(851, 315), size(851, 315)), true, "851x315 fica abaixo de 3");
  assert.equal(looksLikeCover(size(255, 128), size(255, 128)), false);
  assert.equal(looksLikeCover(size(900, 300), size(900, 300)), false, "exatamente 3 não passa de 3");
});

test("cartão: logo preta é escura, laranja não; principal escura vira cartão branco", async () => {
  const dark = async paint => (await editor(() => fakeCanvas(64, 64, paint))).isDarkLogo({});
  assert.equal(await dark(() => BLACK), true);
  assert.equal(await dark(() => ORANGE), false);
  assert.equal(await dark(() => [0, 0, 0, 0]), false, "transparente não conta");
  const { cardColor } = await editor();
  assert.equal(cardColor("#f2a900"), "#f2a900");
  assert.equal(cardColor("#102030"), "#ffffff");
});

test("Master: marca saiu da seção separada e fica no lápis do cliente e do grupo", async () => {
  const [index, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.doesNotMatch(index, /brand-panel|Marca do cliente ou do grupo|brand-target/);
  assert.match(index, /id="client-edit-brand"/);
  assert.match(index, /id="new-client-brand"/);
  assert.match(app, /data-edit-group=/);
  assert.match(app, /editBrand\?\.changed\(\) \? await editBrand\.save\(target\) : null/, "sem mexer na marca não grava");
});

test("painel: logo na proporção dela, sem espremer, e cartão para logo escura", async () => {
  const [css, js] = await Promise.all([read("client-lite.css"), read("client-lite.js")]);
  const rule = css.match(/html\[data-custom-brand\] \.nav-brand img\.client-brand-logo \{[^}]*\}/)?.[0] || "";
  assert.match(rule, /width: auto/);
  assert.match(rule, /max-width: 200px/);
  assert.match(rule, /object-fit: contain/);
  assert.match(js, /brand\.logoDark/);
});

test("avisos do que é aceito: texto do Rodrigo, acima de cada envio de arte e de logo", async () => {
  const source = await read("upload-rules.js");
  for (const line of [
    "Logo: PNG transparente, JPG ou SVG. Mínimo 300 px.",
    "Story: JPG ou PNG, 1080 x 1920.",
    "Post: JPG ou PNG, 1080 x 1350 ou 1080 x 1080.",
    "Carrossel: até 10 imagens do mesmo tamanho.",
    "Reels: vídeo MP4, 1080 x 1920."
  ]) assert.ok(source.includes(line), line);
  const pages = { "index.html": 3, "portal.html": 1, "artes.html": 1 };
  for (const [page, count] of Object.entries(pages)) {
    const html = await read(page);
    assert.equal(html.match(/data-upload-rules=/g).length, count, page);
    assert.ok(html.indexOf("upload-rules.js") < html.search(/brand-editor\.js|client-lite\.js|window-alert\.js/), page + ": carrega antes das telas");
  }
  assert.ok((await read("biblioteca.html")).indexOf("upload-rules.js") < (await read("biblioteca.html")).indexOf("biblioteca.js"));
  for (const file of ["brand-editor.js", "biblioteca.js", "campanha.js", "examples.js", "enviar.js", "master-upload.js"]) assert.match(await read(file), /UploadRules/, file);
});
