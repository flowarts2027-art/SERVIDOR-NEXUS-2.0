// Inspeção de perfil profissional, somente pela Business Discovery oficial da Meta.
// Não lê comentários de terceiros, não faz scraping e não envia mensagens.
import { getState } from "./storage.js";
import { decryptSecret } from "./secrets.js";

const goodHandle = value => {
  const name = String(value ?? "").trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(name) ? name : "";
};
const graphVersion = env => /^v\d+\.\d+$/.test(String(env.META_GRAPH_VERSION || "")) ? env.META_GRAPH_VERSION : "v25.0";

export function classifyProfileWebsite(website, biography = "") {
  const raw = String(website || "").trim();
  const bio = String(biography || "");
  if (raw) return { signal:"website_declared", label:"Site informado no perfil; qualidade não avaliada", verifiedBadSite:false };
  if (/\b(?:www\.|https?:\/\/|[a-z0-9-]+\.(?:com\.br|com|net\.br|org\.br|site|store))\b/i.test(bio)) {
    return { signal:"bio_link_indicated", label:"Possível link mencionado na biografia; conferir manualmente", verifiedBadSite:false };
  }
  return { signal:"website_not_declared", label:"Site não informado no campo website do Instagram; verificar antes de oferecer", verifiedBadSite:false };
}

export async function inspectInstagramBusiness(env, username, fetcher = fetch) {
  const target = goodHandle(username);
  if (!target) return { ok:false,error:"invalid_instagram_handle" };
  if (!env.DB) return { ok:false,error:"database_unavailable" };
  const saved = (await getState(env,"integration","facebook-radar").catch(() => null))?.value || {};
  if (!saved.token || !/^\d+$/.test(String(saved.igUserId || ""))) return { ok:false,error:"facebook_radar_not_connected" };
  if (saved.expiresAt && Date.parse(saved.expiresAt) < Date.now()) return { ok:false,error:"facebook_radar_token_expired" };
  const token = await decryptSecret(env,saved.token).catch(() => "");
  if (!token) return { ok:false,error:"facebook_radar_token_unavailable" };
  const url = new URL("https://graph.facebook.com/" + graphVersion(env) + "/" + saved.igUserId);
  url.searchParams.set("fields", "business_discovery.username(" + target + "){username,name,biography,website,followers_count,media_count}");
  let response;
  try {
    response = await fetcher(url.toString(),{
      headers:{ authorization:"Bearer " + token,accept:"application/json" },
      redirect:"error",signal:AbortSignal.timeout(10000)
    });
  } catch { return { ok:false,error:"meta_request_failed" }; }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) return { ok:false,error:"meta_business_discovery_unavailable",detail:String(body?.error?.message||"").slice(0,160) };
  const data = body.business_discovery;
  if (!data || !goodHandle(data.username) || goodHandle(data.username)!==target) return { ok:false,error:"profile_not_accessible" };
  const biography=String(data.biography||"").slice(0,500),website=String(data.website||"").slice(0,500);
  return { ok:true,username:target,name:String(data.name||"").slice(0,120),biography,website,
    followers:Number(data.followers_count||0),posts:Number(data.media_count||0),
    profileUrl:"https://www.instagram.com/"+target+"/",source:"meta_business_discovery",
    assessment:classifyProfileWebsite(website,biography) };
}
