import { postRow, updateRow, view, parseJson, requestPostRevision, openRevisionTicket } from "./posts.js";
import { BLOCKED_PUBLISH_CLIENTS } from "./publisher.js";
import { isClientPaused } from "./client-pause.js";
import { COMPOSE_WAIT_MS, REVISION_REASON, WATCHER_DEPS, canCreateArt, formatOf, replacePost } from "./post-watcher.js";

// Botão "Pedir ajuste" do painel do cliente (Rodrigo, 06/11/2026). Regra em docs/nexus-memory/REGRA_PEDIR_AJUSTE.md.
// Post e story: imagem nova no gerador do vigia, no mesmo horário, e volta para o cliente aprovar.
// Quem não recebe imagem gerada, Reels, ou geração que falhou: vira aviso no Master, e a arte atual fica guardada.
const MAX_ADJUSTMENTS = 3; // por post, para o cliente não gastar sozinho o limite do gerador grátis
const SENT_TO_TEAM = "Pedido enviado. A equipe vai refazer a arte, e ela volta para você aprovar.";

async function canGenerate(env, client, deps) {
  return !BLOCKED_PUBLISH_CLIENTS.has(client.id) && !isClientPaused(env, client.id) && await canCreateArt(env, client, deps);
}

// A imagem não é apagada: sem isso, o ciclo antigo dos agentes geraria outra para quem não pode receber.
async function askMaster(env, client, row, revised, text) {
  const payload = { ...revised, autoReplaceTries: undefined, autoReplaceFailed: undefined, autoReplacePending: undefined };
  const updated = await updateRow(env, row, { approvalStatus: "correction_requested", status: "ready", error: "", payload });
  await openRevisionTicket(env, client, row, text, "Refazer arte · ajuste pedido pelo cliente");
  return { ok: true, mode: "master", message: SENT_TO_TEAM, post: view(updated) };
}

export async function requestAdjustment(env, client, postId, instructions, now = new Date(), overrides = {}) {
  const deps = { ...WATCHER_DEPS, ...overrides };
  const text = String(instructions || "").trim().slice(0, 1600);
  if (!text) throw new Error("revision_instructions_required");
  const row = await postRow(env, client.id, postId);
  if (!row) throw new Error("post_not_found");
  if (row.status === "published") throw new Error("already_published");
  if (row.status === "publishing") throw new Error("publishing_in_progress");
  const payload = parseJson(row.payload_json, {});
  if (now.getTime() - Date.parse(String(payload.autoReplacePending?.at || "")) < COMPOSE_WAIT_MS) throw new Error("revision_in_progress");

  const format = formatOf(payload);
  const generated = await canGenerate(env, client, deps);
  if (generated && format === "carousel") return requestPostRevision(env, client, postId, text);

  const count = Number(payload.clientRevision?.count || 0);
  const revised = {
    ...payload,
    revisionRequest: text,
    revisionRequestedAt: now.toISOString(),
    clientRevision: { at: now.toISOString(), request: text, count: count + 1 }
  };
  if (!generated || format === "reel" || count >= MAX_ADJUSTMENTS) return askMaster(env, client, row, revised, text);

  await updateRow(env, row, { approvalStatus: "correction_requested", status: "ready", error: "", payload: revised });
  const out = await replacePost(env, client, row, revised, REVISION_REASON, now, deps);
  if (!out.pending && !out.replaced) return askMaster(env, client, row, revised, text);
  const post = view(await postRow(env, client.id, postId));
  return out.pending
    ? { ok: true, mode: "composing", message: "Estou montando a arte nova. Ela volta aqui para você aprovar.", post }
    : { ok: true, mode: "generated", message: "Arte nova pronta. Confira e aprove.", post };
}
