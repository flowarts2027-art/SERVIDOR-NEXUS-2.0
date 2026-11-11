#!/usr/bin/env node
// Garante que a ÚLTIMA versão do Worker tenha os segredos antes do `wrangler deploy`.
//
// Por quê (11/11/2026): o wrangler copia os segredos da última versão CRIADA, não da que
// está no ar. Versões vazias criadas pelo Build da Cloudflare (já desligado) deixaram a
// última versão sem segredos, e cada deploy seguinte publicou o Nexus sem nenhum.
//
// O que faz: se a última versão não tem segredos e a versão no ar tem, sobe uma versão
// "carregadora" (não publicada) que herda os segredos da versão no ar pelo tipo oficial
// `inherit` com `version_id`. O deploy seguinte herda dela. Nunca lê nem imprime valores.
//
// Uso: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node cf-carry-secrets.mjs [worker]

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const worker = process.argv[2] || "servidor-nexus";
if (!token || !account) {
  console.error("::error::CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID são obrigatórios.");
  process.exit(1);
}
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}`;

async function api(path, init = {}) {
  const res = await fetch(base + path, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`${init.method || "GET"} ${path} -> HTTP ${res.status} ${JSON.stringify(body.errors || body).slice(0, 400)}`);
  }
  return body.result;
}

const secretNames = version => (version?.resources?.bindings || []).filter(b => b.type === "secret_text").map(b => b.name);

const versions = await api("/versions?per_page=1");
const latestId = (versions.items || versions)[0]?.id;
const latest = await api(`/versions/${latestId}`);
const latestSecrets = secretNames(latest);
if (latestSecrets.length) {
  console.log(`SECRETS_OK latest=${latestId.slice(0, 8)} secrets=${latestSecrets.length}`);
  process.exit(0);
}

const deployments = await api("/deployments");
const active = (deployments.deployments || [])[0];
const sources = (active?.versions || []).slice().sort((a, b) => b.percentage - a.percentage);
let source = null;
let names = [];
for (const v of sources) {
  const detail = await api(`/versions/${v.version_id}`);
  names = secretNames(detail);
  if (names.length) { source = detail; break; }
}
if (!source) {
  console.error("::error::Nem a última versão nem a versão no ar têm segredos. Reverta no painel da Cloudflare para uma versão com segredos antes de publicar.");
  process.exit(1);
}

// Versão carregadora: código mínimo, mesmas classes exportadas da versão no ar, só os segredos herdados.
const classes = (source.resources?.script?.named_handlers || []).map(h => h.name).filter(n => /^[A-Za-z_$][\w$]*$/.test(n));
const code = [
  ...classes.map(n => `export class ${n} { constructor() {} async fetch() { return new Response("carrier", { status: 503 }); } }`),
  'export default { async fetch() { return new Response("carrier", { status: 503 }); } };'
].join("\n");
// Só a API "beta" de Workers aceita herdar de uma versão específica; a de upload aceita apenas "latest".
// Criar uma versão por ela não publica nada.
const body = {
  main_module: "carrier.mjs",
  compatibility_date: source.resources?.script_runtime?.compatibility_date || "2026-09-24",
  modules: [{ name: "carrier.mjs", content_type: "application/javascript+module", content_base64: Buffer.from(code).toString("base64") }],
  bindings: names.map(name => ({ type: "inherit", name, version_id: source.id })),
  annotations: { "workers/message": `Carregar segredos da versão ${source.id.slice(0, 8)} (não publicada)` }
};
const betaRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/workers/${worker}/versions`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify(body)
});
const betaBody = await betaRes.json().catch(() => ({}));
if (!betaRes.ok || betaBody.success === false) {
  console.error(`::error::Criar versão carregadora falhou: HTTP ${betaRes.status} ${JSON.stringify(betaBody.errors || betaBody).slice(0, 500)}`);
  process.exit(1);
}
const createdId = betaBody.result?.id;

const check = await api(`/versions/${createdId}`);
const carried = secretNames(check).length;
if (carried !== names.length) {
  console.error(`::error::A versão carregadora ficou com ${carried} de ${names.length} segredos.`);
  process.exit(1);
}
// O wrangler herda da última versão da API de scripts: ela precisa ser a carregadora.
const after = await api("/versions?per_page=1");
const newLatest = (after.items || after)[0]?.id;
if (newLatest !== createdId) {
  console.error(`::error::A última versão (${String(newLatest).slice(0, 8)}) não é a carregadora (${String(createdId).slice(0, 8)}). Deploy cancelado para não perder os segredos.`);
  process.exit(1);
}
console.log(`SECRETS_CARRIED from=${source.id.slice(0, 8)} to=${String(createdId).slice(0, 8)} secrets=${carried}`);
