import { resolveInstagramCredentials } from "./instagram-credentials.js";

const CLIENTS = new Set(["globalplay-streaming", "ragnar-one"]);
const isoTime = value => {
  const time = Date.parse(String(value || ""));
  if (!Number.isFinite(time)) throw new Error("invalid_diagnostic_timestamp");
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function emergencyPublisherDiagnostic(request, env, dependencies = {}) {
  const expected = String(env.EMERGENCY_TRIGGER_TOKEN || "");
  if (!expected || request.headers.get("x-nexus-emergency-token") !== expected) return reply({error:"unauthorized"},401);
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") || "";
  const testId = url.searchParams.get("testId") || "";
  if (!CLIENTS.has(clientId) || !/^[a-zA-Z0-9_-]{8,80}$/.test(testId)) return reply({error:"invalid_diagnostic_target"},400);
  try {
    if (!env.MEDIA) return reply({error:"r2_unavailable"},503);
    const object = await env.MEDIA.get(`controlled-tests/${clientId}/${testId}.json`);
    const saved = object ? JSON.parse(await object.text()) : null;
    // Never return stored summaries or arbitrary provider fields.
    const controlledTest = saved ? {status:String(saved.status || ""),startedAt:saved.startedAt ? isoTime(saved.startedAt) : "",summary:saved.summary ? {published:Number(saved.summary.published || 0),posts:(Array.isArray(saved.summary.posts)?saved.summary.posts:[]).map(post=>({clientId:String(post.clientId || ""),mediaId:String(post.mediaId || ""),permalink:String(post.permalink || "")}))}:null} : null;
    const connection = await (dependencies.resolveCredentials || resolveInstagramCredentials)(env,clientId);
    if (!connection?.accessToken || !connection?.igUserId) return reply({error:"instagram_not_connected"},503);
    const response = await (dependencies.fetch || fetch)(`https://graph.instagram.com/${encodeURIComponent(connection.igUserId)}/media?fields=id,media_type,timestamp,permalink&limit=25`, {
      method:"GET",headers:{authorization:`Bearer ${connection.accessToken}`},signal:AbortSignal.timeout(15000)
    });
    if (!response.ok) return reply({error:"instagram_diagnostic_failed"},502);
    const body = await response.json();
    if (!Array.isArray(body.data)) return reply({error:"instagram_diagnostic_invalid_response"},502);
    if (body.data.some(item => !String(item.id || "").trim() || !["IMAGE","VIDEO","CAROUSEL","CAROUSEL_ALBUM"].includes(item.media_type))) return reply({error:"instagram_diagnostic_incomplete_media"},502);
    const hasMore = Boolean(body.paging?.next);
    const recentMedia = body.data.slice(0,25).map(item => ({id:String(item.id || ""),media_type:String(item.media_type || ""),timestamp:isoTime(item.timestamp),permalink:String(item.permalink || "")}));
    return reply({ok:true,clientId,testId,controlledTest,recentMedia,hasMore});
  } catch { return reply({error:"emergency_diagnostic_failed"},502); }
}
