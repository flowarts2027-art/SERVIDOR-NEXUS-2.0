import test from "node:test";
import assert from "node:assert/strict";
import { encryptSecret } from "../src/secrets.js";
import { qualifyRadarLead } from "../src/commercial-radar.js";
import { categoryFromText, hotPosts, goodHandle, runCompetitorWatch, saveCommenterLead, recordOwnCommentLead, competitorWatchResult } from "../src/radar-competitor-watch.js";

// Banco falso: só o necessário para nexus_state, concorrentes e leads (com o UNIQUE dos leads).
function fakeDb({ competitors = [] } = {}) {
  const state = new Map(), leads = [];
  return {
    leads, state,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async run() {
          if (/INSERT INTO nexus_state/.test(sql)) { state.set(args[0] + "|" + args[1] + "|" + args[2], args[3]); return { meta: { changes: 1 } }; }
          if (/INSERT OR IGNORE INTO flow_radar_leads/.test(sql)) {
            const [id, instagram, business, category, evidence, evidence_url, competitor, , , , source_type, score, reason] = args;
            if (leads.some(l => l.instagram === instagram && l.category === category && l.evidence_url === evidence_url)) return { meta: { changes: 0 } };
            leads.push({ id, instagram, business, category, evidence, evidence_url, competitor, source_type, score, reason, status: "novo" });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          if (/FROM nexus_state/.test(sql)) {
            const v = state.get(args[0] + "|" + args[1] + "|" + (args[2] ?? ""));
            return v ? { value_json: v, updated_at: "2026-11-01" } : null;
          }
          return null;
        },
        async all() {
          if (/FROM flow_radar_competitors/.test(sql)) return { results: competitors.map(instagram => ({ instagram })) };
          return { results: [] };
        }
      };
      return stmt;
    }
  };
}
async function connectedEnv(db) {
  const env = { DB: db, NEXUS_SECRET_KEY: "k" };
  const token = await encryptSecret(env, "tok");
  db.state.set("integration|facebook-radar|", JSON.stringify({ token, igUserId: "123" }));
  return env;
}
const now = new Date("2026-11-01T12:07:00Z");
const post = (code, comments, daysAgo = 3, caption = "Dica") => ({
  caption, comments_count: comments, like_count: 10, media_type: "IMAGE",
  timestamp: new Date(now.getTime() - daysAgo * 864e5).toISOString(),
  permalink: "https://www.instagram.com/p/" + code + "/"
});

test("aceita @, link de perfil com parâmetros e rejeita lixo", () => {
  assert.equal(goodHandle("@99hud"), "99hud");
  assert.equal(goodHandle("https://www.instagram.com/fialho.gabriel?exln=YmNs"), "fialho.gabriel");
  assert.equal(goodHandle("https://www.instagram.com/fabianocarvalhojr?vrflm=MTc"), "fabianocarvalhojr");
  assert.equal(goodHandle("nome com espaço"), "");
});

test("categoria vem da palavra do comentário", () => {
  assert.equal(categoryFromText("Quero um SITE"), "site");
  assert.equal(categoryFromText("tem IA pro whats?"), "instagram");
  assert.equal(categoryFromText("QUERO"), "leads");
});

test("marca só posts recentes acima do normal do perfil", () => {
  const media = [post("a", 4), post("b", 5), post("c", 6), post("d", 80), post("e", 200, 60), { ...post("f", 90), permalink: "https://evil.example/p/x/" }];
  const hot = hotPosts(media, now);
  assert.deepEqual(hot.map(h => h.url), ["https://www.instagram.com/p/d/"]);
  assert.equal(hot[0].comments, 80);
});

test("vigia guarda posts que bombaram e nunca grava quem comentou", async () => {
  const db = fakeDb({ competitors: ["99hud", "perfilpessoal"] });
  const env = await connectedEnv(db);
  const calls = [];
  const fetcher = async url => {
    calls.push(url);
    if (url.includes("perfilpessoal")) return new Response(JSON.stringify({ error: { message: "not business" } }), { status: 400 });
    return new Response(JSON.stringify({ business_discovery: { username: "99hud", name: "99 Hud", followers_count: 5000, media: { data: [post("x", 3), post("y", 4), post("z", 120, 2, "Comenta SITE")] } } }));
  };
  const out = await runCompetitorWatch(env, now, fetcher);
  assert.equal(out.ok, true);
  assert.equal(out.posts.length, 1);
  assert.equal(out.posts[0].competitor, "99hud");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(u => !/comments\{|\/comments/.test(decodeURIComponent(u))), "não pede a lista de comentários");
  assert.equal(db.leads.length, 0, "vigia não cria lead sozinho");
  assert.equal(out.profiles.find(p => p.instagram === "perfilpessoal").ok, false);
  const again = await runCompetitorWatch(env, now, fetcher);
  assert.equal(again.skipped, "already_ran_today");
  assert.equal((await competitorWatchResult(env)).posts.length, 1);
});

test("vigia sem conexão da Meta avisa e não inventa resultado", async () => {
  const db = fakeDb({ competitors: ["99hud"] });
  const out = await runCompetitorWatch({ DB: db }, now, async () => { throw new Error("não deveria chamar"); });
  assert.equal(out.ok, false);
  assert.equal(out.error, "facebook_radar_not_connected");
  assert.deepEqual(out.posts, []);
});

test("colar o @: salva com o post como prova, deduplica e exige link do Instagram", async () => {
  const db = fakeDb();
  const env = { DB: db };
  const qualify = qualifyRadarLead;
  const body = { instagram: "@Padaria.Sol", post_url: "https://www.instagram.com/p/ABC123/?igsh=x", competitor: "99hud", comment: "quero um site" };
  const first = await saveCommenterLead(env, body, { qualify });
  assert.equal(first.saved, true);
  assert.equal(first.category, "site");
  assert.equal(db.leads[0].instagram, "padaria.sol");
  assert.equal(db.leads[0].evidence_url, "https://www.instagram.com/p/ABC123/");
  assert.equal(db.leads[0].status, "novo", "contato só depois da aprovação");
  const dup = await saveCommenterLead(env, body, { qualify });
  assert.equal(dup.duplicate, true);
  assert.equal((await saveCommenterLead(env, { ...body, post_url: "https://evil.example/p/1/" }, { qualify })).error, "invalid_post_url");
  assert.equal((await saveCommenterLead(env, { ...body, instagram: "99hud" }, { qualify })).error, "same_as_competitor");
});

test("isca: só a Flow Arts, nunca o próprio perfil", async () => {
  const db = fakeDb();
  const env = { DB: db };
  const comment = { id: "1", username: "loja.x", text: "Quero IA no whatsapp" };
  assert.equal(await recordOwnCommentLead(env, { id: "quatree-dog" }, comment, { qualify: qualifyRadarLead, ownUsername: "ericsson_quatree" }), false);
  assert.equal(await recordOwnCommentLead(env, { id: "primeiro-teste" }, { ...comment, username: "flowarts2026" }, { qualify: qualifyRadarLead, ownUsername: "flowarts2026" }), false);
  assert.equal(await recordOwnCommentLead(env, { id: "primeiro-teste" }, comment, { qualify: qualifyRadarLead, ownUsername: "flowarts2026", permalink: "https://www.instagram.com/p/Q1/" }), true);
  assert.equal(db.leads.length, 1);
  assert.equal(db.leads[0].category, "instagram");
  assert.equal(db.leads[0].source_type, "authorized_import");
});
