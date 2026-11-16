import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHmac } from "node:crypto";
import { handleWhatsAppWebhook, handleWhatsAppProtected, deliveryFromStatus } from "../src/whatsapp-agent.js";

const CLIENT = "primeiro-teste";
const SECRET = "fixture-app-secret";

function setup() {
  const db = new DatabaseSync(":memory:");
  for (const name of fs.readdirSync(new URL("../migrations/", import.meta.url)).sort()) {
    db.exec(fs.readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  }
  const DB = { prepare(sql) {
    const wrap = args => {
      const p = Object.fromEntries(args.map((v, i) => ["?" + (i + 1), v ?? null]));
      return {
        first: async () => db.prepare(sql).get(p) || null,
        all: async () => ({ results: db.prepare(sql).all(p) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(p).changes) } })
      };
    };
    return { ...wrap([]), bind: (...a) => wrap(a) };
  } };
  const env = { DB, WHATSAPP_APP_SECRET: SECRET, WHATSAPP_CLIENT_ID: CLIENT };
  async function hook(value) {
    const body = JSON.stringify({ entry: [{ changes: [{ field: "messages", value }] }] });
    const signature = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
    const url = new URL("https://nexus.test/api/whatsapp/webhook");
    const res = await handleWhatsAppWebhook(new Request(url, { method: "POST", body, headers: { "x-hub-signature-256": signature } }), env, url, null);
    assert.equal(res.status, 200);
  }
  async function messages(phone) {
    const url = new URL("https://nexus.test/api/whatsapp/messages?phone=" + phone);
    const res = await handleWhatsAppProtected(new Request(url), env, url);
    return (await res.json()).items;
  }
  return { db, hook, messages };
}

test("deliveryFromStatus guarda o motivo da falha da Meta", () => {
  const d = deliveryFromStatus({ status: "failed", timestamp: "1763302557", errors: [{ code: 131042, title: "Business eligibility payment issue", error_data: { details: "Payment" } }] });
  assert.equal(d.status, "failed");
  assert.equal(d.code, 131042);
  assert.match(d.title, /payment/);
  assert.equal(deliveryFromStatus({ status: "deleted" }), null);
});

test("webhook de status marca entregue/falhou na mensagem enviada e a API mostra", async () => {
  const f = setup();
  try {
    await f.hook({ messages: [{ from: "553198625624", id: "wamid.in1", timestamp: "1763000000", type: "text", text: { body: "oi" } }] });
    f.db.prepare(`INSERT INTO whatsapp_messages(id,client_id,wa_id,provider_message_id,direction,message_type,text,status,payload_json,created_at)
      VALUES('wamid.out1',?1,'553198625624','wamid.out1','outbound','template','Olá','sent_auto','{"messages":[{"id":"wamid.out1"}]}','2026-11-16T14:15:57.164Z')`).run({ "?1": CLIENT });
    await f.hook({ statuses: [{ id: "wamid.out1", status: "failed", timestamp: "1763302558", recipient_id: "553198625624", errors: [{ code: 131042, title: "Business eligibility payment issue" }] }] });
    const out = (await f.messages("553198625624")).find(m => m.id === "wamid.out1");
    assert.equal(out.status, "sent_auto");
    assert.equal(out.delivery.status, "failed");
    assert.equal(out.delivery.code, 131042);
    const inbound = (await f.messages("553198625624")).find(m => m.id === "wamid.in1");
    assert.equal(inbound.delivery, null);
  } finally { f.db.close(); }
});

test("status mais antigo não apaga o mais novo (lida não volta para entregue)", async () => {
  const f = setup();
  try {
    await f.hook({ messages: [{ from: "5521999990000", id: "wamid.in9", timestamp: "1763000000", type: "text", text: { body: "oi" } }] });
    f.db.prepare(`INSERT INTO whatsapp_messages(id,client_id,wa_id,provider_message_id,direction,message_type,text,status,payload_json,created_at)
      VALUES('wamid.out2',?1,'5521999990000','wamid.out2','outbound','text','Oi','sent','{}','2026-11-16T14:00:00Z')`).run({ "?1": CLIENT });
    await f.hook({ statuses: [{ id: "wamid.out2", status: "read", timestamp: "1763302600" }] });
    await f.hook({ statuses: [{ id: "wamid.out2", status: "delivered", timestamp: "1763302590" }] });
    const out = (await f.messages("5521999990000")).find(m => m.id === "wamid.out2");
    assert.equal(out.delivery.status, "read");
  } finally { f.db.close(); }
});
