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
  const IMG = { imageUrl: "https://painel.flowarts.com.br/media/arte.jpg" };
  const addPost = (clientId, approval = "pending", when = "2026-11-03T15:00:00.000Z", createdAt = "2026-11-02 16:00:00", payload = IMG) => {
    n += 1;
    db.prepare("INSERT INTO post_ledger(id,client_id,scheduled_for,scheduled_hour,status,approval_status,media_id,caption,image_object_key,error,cost_usd,payload_json,created_at,updated_at) VALUES(?1,?2,?3,'12:00','ready',?4,'','x','','',0,?6,?5,CURRENT_TIMESTAMP)")
      .run({ "?1": "upload-feed-" + n, "?2": clientId, "?3": when, "?4": approval, "?5": createdAt, "?6": JSON.stringify(payload) });
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
  addClient("adimax-eduardo-soares", { contact: { phone: "22 99999-8888" } });
  addPost("adimax-eduardo-soares");
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
  addClient("adimax-eduardo-soares", { contact: { name: "Eduardo Soares", phone: "22 99999-8888" } });
  for (let i = 0; i < 7; i++) addPost("adimax-eduardo-soares");
  addPost("adimax-eduardo-soares", "approved");
  const out = await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "5522999998888");
  assert.equal(sent[0].type, "template");
  assert.equal(sent[0].template.name, "aviso_arte_painel");
  assert.deepEqual(sent[0].template.components[0].parameters.map(p => p.text), ["Eduardo", "https://painel.flowarts.com.br/"]);
  assert.equal(out.results[0].posts, 7);

  // Mesmas artes: nunca avisa de novo, nem depois de horas (sem lembrete).
  await runClientApprovalNotices(env, new Date(AT.getTime() + 15 * 60 * 1000));
  await runClientApprovalNotices(env, new Date(AT.getTime() + 5 * 60 * 60 * 1000));
  assert.equal(sent.length, 1);

  // Arte nova depois: vai um novo aviso, sem esperar 3 horas.
  addPost("adimax-eduardo-soares", "pending", "2026-11-03T15:00:00.000Z", "2026-11-02 17:10:00");
  await runClientApprovalNotices(env, new Date("2026-11-02T17:30:00Z"));
  assert.equal(sent.length, 2);
  assert.equal(sent[1].to, "5522999998888");
});

test("lote ainda chegando espera sossegar: um aviso só", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("giltec", { contact: { phone: "22 99999-0004" } });
  addPost("giltec", "pending", undefined, "2026-11-02 16:55:00");
  addPost("giltec", "pending", undefined, "2026-11-02 16:58:00");
  const first = await runClientApprovalNotices(env, AT); // 17:00, última arte há 2 min
  assert.equal(first.results[0].skipped, "lote_chegando");
  assert.equal(sent.length, 0);
  addPost("giltec", "pending", undefined, "2026-11-02 17:05:00");
  await runClientApprovalNotices(env, new Date("2026-11-02T17:10:00Z"));
  assert.equal(sent.length, 0);
  await runClientApprovalNotices(env, new Date("2026-11-02T17:20:00Z"));
  assert.equal(sent.length, 1);
  await runClientApprovalNotices(env, new Date("2026-11-02T17:35:00Z"));
  assert.equal(sent.length, 1);
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

test("Maskara Assessoria nunca recebe aviso", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("maskara-assessoria", { contact: { name: "Maskara", phone: "22 99999-8888" } });
  addPost("maskara-assessoria");
  addPost("maskara-assessoria", "pending", null);
  await runClientApprovalNotices(env, AT);
  await runClientApprovalNotices(env, new Date(AT.getTime() + 60 * 60 * 1000));
  assert.equal(sent.length, 0);
});

test("arte sem dia e hora na aba Aprovar também avisa", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("adimax-eduardo-soares", { contact: { phone: "22 99999-0005" } });
  addPost("adimax-eduardo-soares", "pending", null);
  addPost("adimax-eduardo-soares", "pending", "");
  const out = await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 1);
  assert.equal(out.results[0].posts, 2);
});

test("cliente sem arte pendente no painel não recebe nada", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("adimax-eduardo-soares", { contact: { phone: "22 99999-0005" } });
  addClient("giltec", { contact: { phone: "22 99999-0004" } });
  addPost("adimax-eduardo-soares", "approved");
  addPost("adimax-eduardo-soares", "rejected");
  addPost("adimax-eduardo-soares", "pending", "2026-11-01T15:00:00.000Z"); // data já passou
  addPost("giltec", "pending", undefined, undefined, { ...{ imageUrl: "https://x/a.jpg" }, hiddenFromPanel: true });
  addPost("giltec", "pending", undefined, undefined, { imageUrl: "https://x/b.jpg", qualityGates: { copyChief: "rejected", designer: "approved" } });
  addPost("giltec", "pending", undefined, undefined, {}); // ainda sem imagem
  const out = await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 0);
  assert.deepEqual(out.results, []);
});

test("arte em revisão automática entra no aviso quando fica pronta", async () => {
  const { env, addClient, addPost, sent } = fixture();
  addClient("giltec", { contact: { phone: "22 99999-0004" } });
  addPost("giltec", "pending", undefined, undefined, { imageUrl: "https://x/b.jpg", qualityGates: { copyChief: "pending", designer: "pending" } });
  await runClientApprovalNotices(env, AT);
  assert.equal(sent.length, 0);
  addPost("giltec", "pending", undefined, undefined, { imageUrl: "https://x/c.jpg", qualityGates: { copyChief: "approved", designer: "approved" } });
  await runClientApprovalNotices(env, new Date(AT.getTime() + 15 * 60 * 1000));
  assert.equal(sent.length, 1);
});
