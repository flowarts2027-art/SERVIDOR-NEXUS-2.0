import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { runClientApprovalNotices, clientWhatsapp, approvalNoticeConfig } from "../src/client-approval-notify.js";

// 14:00 de Brasília (17:00 UTC).
const AT = new Date("2026-11-02T17:00:00Z");

function fixture(envExtra = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of fs.readdirSync(new URL("../migrations/", import.meta.url)).sort()) {
    db.exec(fs.readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8"));
  }
  const DB = { prepare(sql) {
    const wrap = args => {
      const parameters = Object.fromEntries(args.map((value, i) => ["?" + (i + 1), value ?? null]));
      return {
        first: async () => db.prepare(sql).get(parameters) || null,
        all: async () => ({ results: db.prepare(sql).all(parameters) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(parameters).changes) } })
      };
    };
    return { ...wrap([]), bind: (...args) => wrap(args) };
  } };
  const addClient = (id, config, status = "online") =>
    db.prepare("INSERT OR REPLACE INTO clients(id,name,status,config_json) VALUES(?1,?2,?3,?4)").run({ "?1": id, "?2": "Cliente " + id, "?3": status, "?4": JSON.stringify(config) });
  let n = 0;
  const addPost = (clientId, approval = "pending", when = "2026-11-03T15:00:00.000Z") => {
    n += 1;
    db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,?3,'12:00','ready',?4,'','x','','',0,'{}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .run({ "?1": "upload-feed-" + n, "?2": clientId, "?3": when, "?4": approval });
  };
  const sent = [];
  const env = {
    DB, WHATSAPP_ACCESS_TOKEN: "fixture-token", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_GRAPH_VERSION: "v26.0",
    WHATSAPP_CLIENT_ID: "primeiro-teste", WHATSAPP_SEND_LIMIT_PER_HOUR: "90",
    CLIENT_APPROVAL_WHATSAPP: "on", CLIENT_APPROVAL_TEMPLATE: "aviso_arte_painel",
    __whatsappFetch: async (url, options) => { sent.push(JSON.parse(options.body)); return Response.json({ messages: [{ id: "wamid." + sent.length }] }); },
    ...envExtra
  };
  return { env, addClient, addPost, sent };
}

test("fica desligado sem a chave e sem o modelo", async () => {
  assert.equal(approvalNoticeConfig({}).enabled, false);
  assert.equal(approvalNoticeConfig({ CLIENT_APPROVAL_WHATSAPP: "on" }).enabled, false);
  const { env, addClient, addPost, sent } = fixture({ CLIENT_APPROVAL_WHATSAPP: "" });
  addClient("maskara-assessoria", { contact: { phone: "22 99999-8888" } });
  addPost("maskara-assessoria");
  assert.equal((await runClientApprovalNotices(env, AT)).skipped, "disabled");
  assert.equal(sent.length, 0);
});

test("número do cliente sempre com 55", () => {
  assert.equal(clientWhatsapp({ contact: { phone: "(22) 99999-8888" } }), "5522999998888");
  assert.equal(clientWhatsapp({ contact: { whatsapp: "5522999998888" } }), "5522999998888");
  assert.equal(clientWhatsapp({}), "");
});

test("várias artes = uma mensagem modelo; não repete o aviso", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("maskara-assessoria", { contact: { name: "Silva Maskara", phone: "22 99999-8888" } });
  for (let i = 0; i < 7; i++) addPost("maskara-assessoria");
  addPost("maskara-assessoria", "approved");
  const out = await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "5522999998888");
  assert.equal(sent[0].type, "template");
  assert.equal(sent[0].template.name, "aviso_arte_painel");
  assert.deepEqual(sent[0].template.components[0].parameters.map(p => p.text), ["Silva", "7"]);
  assert.equal(out.results[0].posts, 7);

  // Mesmas artes: não avisa de novo.
  await runClientApprovalNotices(env, new Date(AT.getTime() + 15 * 60 * 1000));
  assert.equal(sent.length, 1);

  // Arte nova 1 hora depois: espera o intervalo de 3 horas.
  addPost("maskara-assessoria");
  await runClientApprovalNotices(env, new Date(AT.getTime() + 60 * 60 * 1000));
  assert.equal(sent.length, 1);
  await runClientApprovalNotices(env, new Date(AT.getTime() + 4 * 60 * 60 * 1000));
  assert.equal(sent.length, 2);
  assert.equal(sent[1].template.components[0].parameters[1].text, "1");
});

test("não manda de noite, nem para Flow Arts, demonstração ou cliente arquivado", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("primeiro-teste", { contact: { phone: "22 99999-0001" } });
  addClient("demo-cafe", { contact: { phone: "22 99999-0002" } });
  addClient("globalplay-streaming", { contact: { phone: "22 99999-0003" } }, "archived");
  addClient("giltec", { contact: { phone: "22 99999-0004" } });
  ["primeiro-teste", "demo-cafe", "globalplay-streaming", "giltec"].forEach(id => addPost(id));
  assert.equal((await runClientApprovalNotices(env, new Date("2026-11-03T01:00:00Z"))).skipped, "fora_do_horario");
  assert.equal(sent.length, 0);
  await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "5522999990004");
});

test("erro da Meta não marca as artes: tenta de novo depois", async () => {
  let fail = true;
  const sent = [];
  const { env, addClient, addPost } = fixture({
    __whatsappFetch: async (url, options) => {
      if (fail) return Response.json({ error: { message: "conta desativada", code: 131031 } }, { status: 400 });
      sent.push(JSON.parse(options.body));
      return Response.json({ messages: [{ id: "wamid.ok" }] });
    }
  });
  addClient("giltec", { contact: { phone: "22 99999-0004" } });
  addPost("giltec");
  const first = await runClientApprovalNotices(env, AT);
  assert.equal(first.results[0].status, "erro");
  fail = false;
  await runClientApprovalNotices(env, new Date(AT.getTime() + 15 * 60 * 1000));
  assert.equal(sent.length, 1);
});

test("cliente que desligou o aviso não recebe", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("giltec", { contact: { phone: "22 99999-0004" }, approvalWhatsapp: false });
  addPost("giltec");
  await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 0);
});
