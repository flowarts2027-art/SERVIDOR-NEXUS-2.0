import test from "node:test";
import assert from "node:assert/strict";
import { instagramRedirectUri } from "../src/instagram.js";

test("Instagram redirect address is the same on every panel domain", () => {
  const env = { PUBLIC_BASE_URL: "https://servidor-nexus.diamantehinode2015.workers.dev" };
  const expected = "https://servidor-nexus.diamantehinode2015.workers.dev/api/oauth/instagram/callback";
  assert.equal(instagramRedirectUri(new Request("https://painel.flowarts.com.br/api/master/x"), env), expected);
  assert.equal(instagramRedirectUri(new Request("https://servidor-nexus.diamantehinode2015.workers.dev/master"), env), expected);
});
