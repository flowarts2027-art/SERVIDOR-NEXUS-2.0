import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../../public/app.js", import.meta.url), "utf8");

test("Master shows Instagram app ID and a password field for the app secret", () => {
  assert.match(html, /id="instagram-secret-form"/);
  assert.match(html, /name="appSecret" type="password"/);
  assert.match(html, /id="instagram-current-app-id" name="appId"/);
  assert.doesNotMatch(html, /data-instagram-token-form/);
});

test("Master saves the Instagram app ID and secret through the protected settings endpoint", () => {
  assert.match(app, /instagramSecretForm/);
  assert.match(app, /body:JSON\.stringify\(\{appId,appSecret\}\)/);
  assert.match(app, /App do Instagram salvo/);
});
