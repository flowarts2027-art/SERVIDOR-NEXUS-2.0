import test from "node:test";
import assert from "node:assert/strict";
import { publishInstagramImage, publishInstagramVideo, publishInstagramCarousel } from "../src/publisher.js";

for (const clientId of ["ragnar-one", "globalplay-streaming"]) {
  test(`publicação bloqueada para ${clientId}`, async () => {
    const env = {};
    await assert.rejects(publishInstagramImage(env, clientId, "https://x/a.jpg", "c"), /instagram_client_disabled/);
    await assert.rejects(publishInstagramVideo(env, clientId, "https://x/a.mp4", "c"), /instagram_client_disabled/);
    await assert.rejects(publishInstagramCarousel(env, clientId, ["https://x/a.jpg", "https://x/b.jpg"], "c"), /instagram_client_disabled/);
  });
}
