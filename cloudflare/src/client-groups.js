// Grupos de clientes (pedido do Rodrigo, 04/11/2026): vendedores da mesma marca, cada um com o seu painel.
// Uma campanha do grupo sobe para o painel de todos, com as mesmas imagens e a legenda de cada vendedor.
// O destino "grupo:<id>" vale no Master, em Enviar artes e no conector. Tudo continua esperando aprovação.
import { CLIENT_GROUPS, getClient, listClients, upsertClient } from "./clients.js";
import { newManagedClientConfig } from "./client-create.js";
import { clientScreenName } from "./client-display.js";

const GROUP_PREFIX = "grupo:";
const CONTACT_LINE = /wa\.me|whatsapp\.com|\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/i;
const CLOSINGS = Object.freeze([
  "Vendedor {vendedor}: peça a tabela e faça o seu pedido.",
  "Peça a tabela e faça o seu pedido com o vendedor {vendedor}.",
  "Garanta a linha na sua loja: fale com o vendedor {vendedor}."
]);

export function groupFromTarget(target) {
  const value = String(target || "").trim();
  if (!value.startsWith(GROUP_PREFIX)) return null;
  const id = value.slice(GROUP_PREFIX.length);
  return CLIENT_GROUPS[id] ? { id, ...CLIENT_GROUPS[id] } : null;
}

// Grupos criados pelo botão "+ Novo grupo" do Master (06/11/2026). Os fixos seguem em CLIENT_GROUPS.
export async function savedGroups(env) {
  const { results } = await env.DB.prepare(
    "SELECT item_key, value_json FROM nexus_state WHERE namespace='client-group' AND client_id=''"
  ).all();
  return (results || []).map(row => ({ id: row.item_key, name: String(JSON.parse(row.value_json).name), members: [] }));
}

// Igual a groupFromTarget, mas também acha os grupos criados no Master.
export async function findGroup(env, target) {
  const fixed = groupFromTarget(target);
  const value = String(target || "").trim();
  if (fixed || !value.startsWith(GROUP_PREFIX)) return fixed;
  return (await savedGroups(env)).find(group => group.id === value.slice(GROUP_PREFIX.length)) || null;
}

export async function createGroup(env, value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  const id = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (name.length < 2 || name.length > 40 || !id) throw new Error("group_name");
  if (Object.hasOwn(CLIENT_GROUPS, id) || (await savedGroups(env)).some(group => group.id === id)) throw new Error("group_exists");
  await env.DB.prepare(
    "INSERT INTO nexus_state(namespace,item_key,client_id,value_json,updated_at) VALUES('client-group',?1,'',?2,CURRENT_TIMESTAMP)"
  ).bind(id, JSON.stringify({ name })).run();
  return { id: GROUP_PREFIX + id, name };
}

// Vendedores do grupo: os fixos em CLIENT_GROUPS e os ligados pelo campo Grupo do Master.
export async function groupMembers(env, group) {
  const fixed = new Set(group.members.map(member => member.clientId));
  const linked = (await listClients(env))
    .filter(client => client.config?.group?.id === group.id && client.config.group.vendor
      && client.status !== "archived" && !fixed.has(client.id))
    .map(client => ({ clientId: client.id, vendor: String(client.config.group.vendor) }));
  return [...group.members, ...linked];
}

export async function groupOptions(env) {
  const options = [];
  // Painel renomeado pelo lápis do Master aparece com o nome novo; os outros, com o nome do vendedor.
  const clients = await listClients(env).catch(() => []);
  const label = member => {
    const client = clients.find(item => item.id === member.clientId);
    return client?.config?.displayName ? clientScreenName(client) : member.vendor;
  };
  const saved = await savedGroups(env).catch(() => []);
  for (const group of [...Object.entries(CLIENT_GROUPS).map(([id, fixed]) => ({ id, ...fixed })), ...saved]) {
    const members = await groupMembers(env, group).catch(() => group.members);
    options.push({ id: GROUP_PREFIX + group.id, name: "Grupo: " + group.name + (members.length ? " (" + members.map(label).join(" e ") + ")" : "") });
  }
  return options;
}

// Cliente novo do grupo sem nicho escrito usa o nicho de quem já está no grupo.
export async function groupNiche(env, groupId) {
  const group = await findGroup(env, GROUP_PREFIX + groupId);
  const [first] = group ? await groupMembers(env, group) : [];
  return first ? (await getClient(env, first.clientId))?.niche || "" : "";
}

// Campo Grupo do Master (05/11/2026). Devolve o que salvar em config.group, ou null para ficar sem grupo.
// O nome só aceita letras, espaço, hífen e apóstrofo, porque entra na troca de nomes da legenda.
export function groupChoice(body = {}, saved = []) {
  const id = String(body.group || "").trim().replace(GROUP_PREFIX, "");
  if (!id) return null;
  const custom = saved.find(group => group.id === id);
  if (!Object.hasOwn(CLIENT_GROUPS, id) && !custom) throw new Error("group_invalid");
  const vendor = String(body.vendor || "").trim().replace(/\s+/g, " ");
  if (!/^\p{L}[\p{L}' -]{0,39}$/u.test(vendor)) throw new Error("group_vendor_invalid");
  return custom ? { id, vendor, name: custom.name } : { id, vendor };
}

// Legenda do vendedor: o nome dele no lugar do outro, e um fechamento diferente para cada um.
// Sem IA e sem inventar nada. O 1º vendedor é o dono do contato escrito na legenda; os outros não herdam
// esse telefone nem esse @, para o cliente de um vendedor não cair no contato de outro.
export function vendorCaption(base, group, index) {
  const member = group.members[index];
  const owner = group.members[0];
  let text = String(base || "");
  if (index > 0) {
    const handle = String(owner.instagram || "").toLowerCase();
    text = text.split("\n")
      .filter(line => !CONTACT_LINE.test(line) && !(handle && line.toLowerCase().includes("@" + handle)))
      .join("\n");
  }
  text = text.split("{vendedor}").join(member.vendor);
  for (const other of group.members) {
    if (other !== member) text = text.replace(new RegExp("(?<![\\p{L}\\p{N}])" + other.vendor + "(?![\\p{L}\\p{N}])", "giu"), member.vendor);
  }
  const closings = group.closings || CLOSINGS;
  const closing = closings[index % closings.length].replace("{vendedor}", member.vendor);
  const parts = text.replace(/\n{3,}/g, "\n\n").trim().split(/\n\n/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  // Deixa as hashtags no fim: o fechamento entra logo antes delas.
  if (parts.length > 1 && /^\s*#/.test(last)) parts.splice(parts.length - 1, 0, closing);
  else parts.push(closing);
  return parts.join("\n\n").slice(0, 2200);
}

// Vendedor novo nasce em configuração: sem Instagram e sem senha, que o Rodrigo preenche no Master.
export async function ensureGroupClients(env) {
  for (const [, group] of Object.entries(CLIENT_GROUPS)) {
    const owner = await getClient(env, group.members[0].clientId);
    if (!owner) continue;
    for (const member of group.members.slice(1)) {
      if (await getClient(env, member.clientId)) continue;
      await upsertClient(env, {
        id: member.clientId,
        name: group.name + " " + member.vendor,
        niche: owner.niche,
        instagram: "",
        status: "setup",
        config: newManagedClientConfig(member.clientId)
      });
    }
  }
}
