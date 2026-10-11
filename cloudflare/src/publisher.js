import { resolveInstagramCredentials } from "./instagram-credentials.js";

// Contas antigas de streaming desligadas em 2026-10-10 a pedido do proprietário.
// Nenhuma publicação no Instagram pode sair para elas, por nenhum caminho.
export const BLOCKED_PUBLISH_CLIENTS = Object.freeze(new Set(["ragnar-one", "globalplay-streaming"]));

export function assertClientMayPublish(clientId) {
  if (BLOCKED_PUBLISH_CLIENTS.has(String(clientId || "").trim())) {
    const error = new Error("instagram_client_disabled");
    error.code = "client_disabled";
    throw error;
  }
}

async function graphRequest(accessToken, pathName, method = "GET", form = null) {
  const endpoint = "https://graph.instagram.com/" + String(pathName || "").replace(/^\/+/, "");
  const headers = {
    authorization: "Bearer " + accessToken,
    "user-agent": "NEXUS-AI-Cloudflare/1.0"
  };
  const options = { method, headers };

  if (form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(form);
  }

  const response = await fetch(endpoint, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const metaError = payload?.error || {};
    const error = new Error(String(metaError.message || "instagram_api_failed"));
    error.code = metaError.code || response.status;
    error.type = metaError.type || "";
    throw error;
  }
  return payload;
}

// Four image generations/reviews and carousel container creation share the
// invocation's fetch budget. Forty three-second polls can exceed the Free
// Worker limit of 50 before media_publish; keep a bounded polling allowance.
export async function waitInstagramContainer(accessToken,containerId,kind="media",timeoutMs=120000,dependencies={}){
  const request=dependencies.request||graphRequest;
  const wait=dependencies.wait||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const now=dependencies.now||Date.now;
  const deadline=now()+timeoutMs;
  let lastStatus="";
  for(let attempt=0;attempt<12;attempt++){
    const remaining=deadline-now();
    if(remaining<=0)break;
    await wait(Math.min(attempt===0?3000:10000,remaining));
    const status=await request(accessToken,containerId+"?fields=status_code,status");
    const code=String(status?.status_code||"").toUpperCase();
    lastStatus=String(status?.status||code||"");
    if(code==="FINISHED")return;
    if(code==="ERROR"||code==="EXPIRED"){
      const error=new Error("instagram_"+kind+"_processing_failed");error.detail=lastStatus;throw error;
    }
  }
  const error=new Error("instagram_"+kind+"_processing_timeout");error.detail=lastStatus;throw error;
}

export async function publishInstagramImage(env, clientId, imageUrl, caption = "") {
  assertClientMayPublish(clientId);
  const connection = await resolveInstagramCredentials(env, clientId);
  const accessToken = String(connection?.accessToken || "");
  const igUserId = String(connection?.igUserId || "").trim();

  if (!accessToken || !igUserId) {
    throw new Error("instagram_not_connected");
  }
  if (!/^https:\/\//i.test(String(imageUrl || ""))) {
    throw new Error("instagram_public_image_url_required");
  }

  const created = await graphRequest(accessToken, igUserId + "/media", "POST", {
    image_url: String(imageUrl),
    caption: String(caption || "")
  });
  const containerId = String(created?.id || "");
  if (!containerId) throw new Error("instagram_container_missing");

  await waitInstagramContainer(accessToken,containerId,"media",85000);
  const published = await graphRequest(accessToken, igUserId + "/media_publish", "POST", {
    creation_id: containerId
  });
  const mediaId = String(published?.id || "");
  let permalink = "";
  if (mediaId) {
    try {
      const media = await graphRequest(accessToken, mediaId + "?fields=permalink");
      permalink = String(media?.permalink || "");
    } catch {}
  }
  return { mediaId, containerId, permalink };
}


export async function publishInstagramVideo(env, clientId, videoUrl, caption = "") {
  assertClientMayPublish(clientId);
  const connection = await resolveInstagramCredentials(env, clientId);
  const accessToken = String(connection?.accessToken || "");
  const igUserId = String(connection?.igUserId || "").trim();

  if (!accessToken || !igUserId) throw new Error("instagram_not_connected");
  if (!/^https:\/\//i.test(String(videoUrl || ""))) throw new Error("instagram_public_video_url_required");

  const created = await graphRequest(accessToken, igUserId + "/media", "POST", {
    media_type: "REELS",
    video_url: String(videoUrl),
    caption: String(caption || ""),
    share_to_feed: "true"
  });
  const containerId = String(created?.id || "");
  if (!containerId) throw new Error("instagram_container_missing");

  await waitInstagramContainer(accessToken,containerId,"video",120000);
  const published = await graphRequest(accessToken, igUserId + "/media_publish", "POST", {
    creation_id: containerId
  });
  const mediaId = String(published?.id || "");
  let permalink = "";
  if (mediaId) {
    try {
      const media = await graphRequest(accessToken, mediaId + "?fields=permalink");
      permalink = String(media?.permalink || "");
    } catch {}
  }
  return { mediaId, containerId, permalink };
}


export async function publishInstagramCarousel(env, clientId, imageUrls = [], caption = "") {
  assertClientMayPublish(clientId);
  const connection = await resolveInstagramCredentials(env, clientId);
  const accessToken = String(connection?.accessToken || "");
  const igUserId = String(connection?.igUserId || "").trim();

  if (!accessToken || !igUserId) throw new Error("instagram_not_connected");
  const urls = (Array.isArray(imageUrls) ? imageUrls : [])
    .map(String).map(value => value.trim()).filter(value => /^https:\/\//i.test(value));
  if (urls.length < 2 || urls.length > 10) throw new Error("instagram_carousel_requires_2_to_10_items");

  const childIds = [];
  for (const imageUrl of urls) {
    const child = await graphRequest(accessToken, igUserId + "/media", "POST", {
      image_url: imageUrl,
      is_carousel_item: "true"
    });
    const childId = String(child?.id || "");
    if (!childId) throw new Error("instagram_carousel_child_missing");
    childIds.push(childId);
  }

  const created = await graphRequest(accessToken, igUserId + "/media", "POST", {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: String(caption || "")
  });
  const containerId = String(created?.id || "");
  if (!containerId) throw new Error("instagram_container_missing");

  await waitInstagramContainer(accessToken,containerId,"carousel",120000);
  const published = await graphRequest(accessToken, igUserId + "/media_publish", "POST", {
    creation_id: containerId
  });
  const mediaId = String(published?.id || "");
  let permalink = "";
  if (mediaId) {
    try {
      const media = await graphRequest(accessToken, mediaId + "?fields=permalink");
      permalink = String(media?.permalink || "");
    } catch {}
  }
  return { mediaId, containerId, permalink, childIds };
}


export function instagramPublishTarget(payload = {}) {
  const requestedFormat = String(payload?.creativeFeatures?.requestedFormat || "post").toLowerCase();
  const formatBuild = payload?.formatBuild && typeof payload.formatBuild === "object"
    ? payload.formatBuild
    : {};
  const quality = payload?.qualityGates && typeof payload.qualityGates === "object"
    ? payload.qualityGates
    : {};

  if (["reel","carousel"].includes(requestedFormat) && quality.formatBuilder !== "approved") {
    return { ok:false, kind:requestedFormat, error:"format_build_pending" };
  }
  if (requestedFormat === "carousel") {
    const urls = Array.isArray(formatBuild.carouselUrls)
      ? formatBuild.carouselUrls.map(String).map(value=>value.trim()).filter(value=>/^https:\/\//i.test(value))
      : [];
    return urls.length >= 2
      ? { ok:true, kind:"carousel", carouselUrls:urls }
      : { ok:false, kind:"carousel", error:"carousel_assets_not_ready" };
  }
  if (requestedFormat === "reel") {
    const videoUrl = String(formatBuild.videoUrl || "").trim();
    return /^https:\/\//i.test(videoUrl)
      ? { ok:true, kind:"reel", videoUrl }
      : { ok:false, kind:"reel", error:"reel_asset_not_ready" };
  }
  const imageUrl = String(
    formatBuild.imageUrl || payload?.imageUrl || payload?.publicImageUrl || ""
  ).trim();
  return /^https:\/\//i.test(imageUrl)
    ? { ok:true, kind:"post", imageUrl }
    : { ok:false, kind:"post", error:"instagram_public_image_url_required" };
}

export async function publishInstagramPost(env, clientId, payload = {}, caption = "") {
  const target = instagramPublishTarget(payload);
  if (!target.ok) throw new Error(target.error);

  if (target.kind === "carousel") {
    return publishInstagramCarousel(env, clientId, target.carouselUrls, String(caption || ""));
  }
  if (target.kind === "reel") {
    return publishInstagramVideo(env, clientId, target.videoUrl, String(caption || ""));
  }
  return publishInstagramImage(env, clientId, target.imageUrl, String(caption || ""));
}
