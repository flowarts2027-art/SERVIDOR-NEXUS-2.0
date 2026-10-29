import test from "node:test";
import assert from "node:assert/strict";
import { toInstagramJpeg, needsLetterbox, containBox } from "../src/manual-carousel.js";

// Regra fixa (Rodrigo, 29/10/2026): arte nunca é cortada para caber no 4:5.
const FEED = { width: 1080, height: 1350 };

function fakeImages(info) {
  const log = [];
  const chain = () => {
    const steps = [];
    const api = {
      steps,
      transform(o) { steps.push(["transform", o]); return api; },
      draw(child, o) { steps.push(["draw", child.steps, o]); return api; },
      async output(o) { steps.push(["output", o]); log.push(steps); return { response: () => new Response(new Uint8Array([0xff, 0xd8]), { status: 200 }) }; }
    };
    return api;
  };
  return { log, env: { IMAGES: { info: async () => info, input: chain } } };
}
const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });

test("4:5 ou quase (até 3%): só ajusta o tamanho", () => {
  assert.equal(needsLetterbox(1080, 1350, FEED), false);
  assert.equal(needsLetterbox(1664, 2080, FEED), false);
  assert.equal(needsLetterbox(1100, 1350, FEED), false);
});

test("quadrada, deitada ou 2:3: precisa encaixar inteira", () => {
  assert.equal(needsLetterbox(1080, 1080, FEED), true);
  assert.equal(needsLetterbox(1536, 1024, FEED), true);
  assert.equal(needsLetterbox(1024, 1536, FEED), true);
});

test("encaixe inteiro: quadrada fica 1080x1080 no meio", () => {
  assert.deepEqual(containBox(2048, 2048, FEED), { width: 1080, height: 1080, left: 0, top: 135 });
  const wide = containBox(1536, 1024, FEED);
  assert.equal(wide.width, 1080);
  assert.equal(wide.height, 720);
});

test("arte quadrada: fundo desfocado + arte inteira, sem cortar", async () => {
  const { env, log } = fakeImages({ width: 1080, height: 1080 });
  await toInstagramJpeg(env, file);
  const steps = log[0];
  assert.deepEqual(steps[0], ["transform", { width: 1080, height: 1350, fit: "cover", blur: 40 }]);
  assert.equal(steps[1][0], "draw");
  assert.deepEqual(steps[1][1][0], ["transform", { width: 1080, height: 1080, fit: "contain" }]);
  assert.deepEqual(steps[1][2], { left: 0, top: 135 });
});

test("arte já em 4:5: só redimensiona", async () => {
  const { env, log } = fakeImages({ width: 1664, height: 2080 });
  await toInstagramJpeg(env, file);
  assert.deepEqual(log[0][0], ["transform", { width: 1080, height: 1350, fit: "cover" }]);
  assert.equal(log[0].length, 2);
});

test("foto de cena com crop pedido (Reel animado): continua cortando", async () => {
  const { env, log } = fakeImages({ width: 1080, height: 1080 });
  await toInstagramJpeg(env, file, { width: 1080, height: 880 }, { crop: true });
  assert.deepEqual(log[0][0], ["transform", { width: 1080, height: 880, fit: "cover" }]);
});
