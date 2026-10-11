import { reviewImage } from "./visual-review.js";
import { globalPlayCarouselPlan, GLOBAL_PLAY_REFERENCE_VERSION } from "./media-references.js";
import { generateOriginalMedia } from "./media-generation.js";
import { clientBrand, brandProfileVersion } from "./client-brand.js";
import { recordAgentExecution, patchAgentCoreState } from "./agent-core.js";

function parseJson(raw, fallback = {}) {
  try {
    const value = JSON.parse(String(raw || ""));
    return value && typeof value === "object" ? value : fallback;
  } catch { return fallback; }
}

function publicBase(env) {
  return String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

function compact(value, max = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function requestedFormat(payload = {}) {
  const value = String(payload?.creativeFeatures?.requestedFormat || "post").toLowerCase();
  if (value === "carousel") return "carousel";
  if (value === "reel") return "reel";
  return "post";
}

const CAROUSEL_STORY_VERSION = "streaming-story-v4-commercial-overlay-globalplay-ref-v1";

function brandName(client = {}) {
  const raw = String(client?.name || client?.id || "marca").trim();
  if (/ragnar/i.test(raw)) return "Ragnar One";
  if (/global\s*play|globalplay/i.test(raw)) return "Global Play";
  return raw || "marca";
}

// Carrossel educativo para marcas com perfil próprio (ex.: Flow Arts).
function brandCarouselPlan(client = {}, payload = {}) {
  const brand = clientBrand(client);
  const features = payload?.creativeFeatures || {};
  const theme = compact(features.theme || payload?.title || brand.contentFocus || "marketing", 140);
  const hook = compact(features.hook || theme, 140);
  const cta = compact(features.cta || brand.cta || "Salve para usar depois.", 120);
  const conversion = String(features.campaignGoal || "") === "conversão";
  return [
    { role:"hook", message:hook, overlay:compact(hook, 40).toUpperCase(),
      scene:"Open with a relatable moment of a small business owner in Brazil facing this topic: " + theme + ". Stop the scroll with curiosity, not with a solution yet." },
    { role:"development", message:"Explique o primeiro ponto prático de: " + theme + ".", overlay:"PASSO 1",
      scene:"Show the first practical step of the topic in a clean business setting (desk, laptop, phone, product, storefront). Vary framing from card 1." },
    { role:"turn", message:"Mostre o segundo ponto e a virada.", overlay:"PASSO 2",
      scene:"Show the improvement or result of applying the tip, still in the same visual campaign, with a different angle and gesture." },
    { role:"result", message:"Feche com o resultado e o CTA.", overlay: conversion ? "COMENTE EXEMPLO" : "SALVE ESTE POST",
      scene:"Close with a confident, satisfied business owner or a polished brand result. Leave clean space for the CTA: " + cta }
  ];
}

function carouselPlan(client = {}, payload = {}) {
  if (client.id === "globalplay-streaming") return globalPlayCarouselPlan();
  if (brandProfileVersion(client.id)) return brandCarouselPlan(client, payload);
  const brand = brandName(client);
  const features = payload?.creativeFeatures || {};
  const theme = compact(features.theme || payload?.title || "entretenimento em casa", 140);
  const hook = compact(features.hook || theme, 140);
  const scene = compact(features.scene || "", 180);
  const goal = compact(features.campaignGoal || "engajamento", 80);
  const cta = compact(features.cta || 'Digite "QUERO".', 90);

  const opening = scene
    ? "Abra com uma situação cotidiana ligada ao tema: " + scene + "."
    : "Abra com uma situação cotidiana brasileira que represente o tema: " + theme + ".";

  const development = goal === "salvamento"
    ? "Transforme a ideia em uma dica, comparação ou descoberta útil que faça sentido salvar."
    : goal === "compartilhamento"
      ? "Desenvolva uma situação de identificação ou humor leve que dê vontade de compartilhar."
      : goal === "conversão"
        ? "Mostre uma virada natural da situação inicial para uma experiência mais simples com " + brand + ", sem parecer propaganda agressiva."
        : "Desenvolva a história com uma mudança clara de emoção, contexto ou descoberta.";

  return [
    {
      role:"hook",
      message:hook,
      overlay:"CHEGA DE TRAVAR",
      scene:opening + " A primeira imagem precisa parar o scroll com dor, desejo ou curiosidade clara, sem resolver tudo."
    },
    {
      role:"development",
      message:"A história avança a partir de: " + theme + ".",
      overlay:"TUDO NUM LUGAR",
      scene:development + " Preserve continuidade visual quando fizer sentido, mas varie enquadramento e gesto para não parecer a mesma foto."
    },
    {
      role:"turn",
      message:"Acontece uma virada coerente com o tema.",
      overlay:"ATIVA DIRETO",
      scene:"Mostre a consequência, descoberta ou solução decorrente do quadro anterior. A virada deve nascer do tema e não repetir automaticamente TV travando, instalação de aplicativo ou família comemorando."
    },
    {
      role:"result",
      message:"Feche a história com resultado claro e CTA.",
      overlay:"DIGITE QUERO",
      scene:"Conclua a narrativa de forma visualmente satisfatória, mantendo continuidade com os quadros anteriores. Integre " + brand + " apenas quando fizer sentido para o objetivo do post. Reserve espaço limpo para o CTA: " + cta
    }
  ];
}

async function buildCarousel(env, client, row, payload) {
  const sameStoryVersion = String(payload?.formatBuild?.carouselTemplateVersion || "") === CAROUSEL_STORY_VERSION;
  const existing = sameStoryVersion && Array.isArray(payload?.formatBuild?.carouselUrls)
    ? payload.formatBuild.carouselUrls.filter(url => /^https:\/\//i.test(String(url)))
    : [];
  if (existing.length === 4) {
    return { status:"approved", kind:"carousel", carouselUrls:existing, cardCount:4, carouselTemplateVersion:CAROUSEL_STORY_VERSION, referenceVersion:client.id === "globalplay-streaming" ? GLOBAL_PLAY_REFERENCE_VERSION : "", reused:true };
  }

  const cards = [...existing];
  const plan = carouselPlan(client, payload);
  for (let index = cards.length; index < plan.length; index++) {
    const card = plan[index];
    const brandBrief = brandProfileVersion(client.id) ? [
      "Instagram carousel card " + (index + 1) + " of " + plan.length + " for " + clientBrand(client).brandName + ".",
      "Card role: " + card.role + ". Message intent: " + card.message + ".",
      "Required scene: " + card.scene,
      clientBrand(client).visualDirection,
      "System overlay title to support: " + card.overlay + ". Leave clean negative space for this title and do not generate text inside the image.",
      "Keep one coherent visual campaign across all cards. No collage, no split screen, no logos of other companies.",
      "Generate exactly one standalone vertical card image."
    ].join(" ") : "";
    const brief = brandBrief || (client.id === "globalplay-streaming" ? ["Generate exactly one standalone card "+(index+1)+" of 4.",card.scene,"Keep the same family and home with amber lighting across the cards. One brand placement upper-right added by the system, full scene with no lower caption panel. No montage or image counter."].join(" ") : [
      "Instagram carousel card " + (index + 1) + " of " + plan.length + ".",
      "Keep one coherent " + String(client?.name || client?.id || "brand") + " visual campaign across all cards.",
      "Card role: " + card.role + ".",
      "Message intent: " + card.message + ".",
      "Required scene: " + card.scene,
      "System overlay title to support: " + card.overlay + ". Leave clean negative space for this title and do not generate text inside the image.",
      "Use believable Brazilian people or product-use scenes when useful, but avoid repeating the same family-on-sofa layout across the whole carousel.",
      "Photorealistic commercial photography, natural expressions, realistic hands, believable TV viewing distance and lighting.",
      "Every card must read as a customer-facing advertisement, not generic lifestyle stock photography.",
      "The television or phone must show meaningful generic entertainment context; never use abstract colored screens, empty walls, empty rooms or meaningless decorative TV graphics.",
      "For sports, use a fictional generic football match with no real club crests, league logos, broadcaster marks or recognizable players.",
      "Leave generous negative space for a short overlay added by the brand system.",
      "Do not create a collage or split screen. Generate exactly one standalone vertical card image."
    ].join(" "));
    const media = await generateOriginalMedia(env, client, row.id + "-carousel-" + (index + 1), brief, {
      title: card.overlay,
      contentFormat:"carousel",
      carouselIndex:index,
      variationSeed: row.id + "|carousel|" + index
    });
    if (client.id === "globalplay-streaming" && !media.brandingApplied) throw new Error("brand_overlay_required");
    if (!/^https:\/\//i.test(String(media?.url || ""))) throw new Error("carousel_card_generation_failed");
    if(client.id === "globalplay-streaming"){
      const review=await reviewImage(env,client,media.url,null);
      if(review.status!=="approved")throw new Error("carousel_visual_review_"+review.status+":"+String(review.reason || ""));
    }
    cards.push(String(media.url));
    const partialPayload = {
      ...payload,
      formatBuild: {
        ...(payload.formatBuild || {}),
        status:"building",
        kind:"carousel",
        carouselUrls:[...cards],
        cardCount:cards.length,
        carouselTemplateVersion:CAROUSEL_STORY_VERSION,
        updatedAt:new Date().toISOString()
      }
    };
    await env.DB.prepare(
      "UPDATE post_ledger SET payload_json=?2,error='format_build_pending',updated_at=CURRENT_TIMESTAMP WHERE id=?1"
    ).bind(row.id, JSON.stringify(partialPayload)).run();
    payload.formatBuild = partialPayload.formatBuild;
  }
  if (cards.length < 2) throw new Error("carousel_requires_multiple_cards");
  return { status:"approved", kind:"carousel", carouselUrls:cards, cardCount:cards.length, carouselTemplateVersion:CAROUSEL_STORY_VERSION, referenceVersion:client.id === "globalplay-streaming" ? GLOBAL_PLAY_REFERENCE_VERSION : "" };
}

async function dispatchReel(env, client, row, payload) {
  const current = payload?.formatBuild && typeof payload.formatBuild === "object" ? payload.formatBuild : {};
  if (/^https:\/\//i.test(String(current.videoUrl || ""))) {
    return { ...current, status:"approved", kind:"reel" };
  }
  if (["dispatching","rendering"].includes(String(current.status || "")) && current.callbackToken) {
    const dispatchedAt = Date.parse(String(current.dispatchedAt || ""));
    const stale = Number.isFinite(dispatchedAt) && Date.now() - dispatchedAt > 20 * 60 * 1000;
    if (!stale) return current;
    throw new Error("social_reel_render_timeout");
  }

  const ghToken = String(env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN || "").trim();
  if (!ghToken) throw new Error("github_actions_token_missing");
  let sourceImage = String(payload.imageUrl || payload.publicImageUrl || "").trim();
  if (client.id === "globalplay-streaming" && current.referenceVersion !== GLOBAL_PLAY_REFERENCE_VERSION && !(payload.mediaGeneration?.referenceVersion === GLOBAL_PLAY_REFERENCE_VERSION && payload.mediaGeneration?.contentFormat === "reel")) {
    const media = await generateOriginalMedia(env,client,row.id+"-reel-reference",payload.visualBrief || "",{contentFormat:"reel",variationSeed:row.id+"|reel-reference"});
    if (!media.brandingApplied) throw new Error("brand_overlay_required");
    const review=await reviewImage(env,client,media.url,null);
    if(review.status!=="approved")throw new Error("reel_visual_review_"+review.status+":"+String(review.reason || ""));
    sourceImage=media.url;
    // Persist generated source before dispatch so retries do not pay to regenerate it.
    payload.formatBuild={...current,sourceImage,referenceVersion:GLOBAL_PLAY_REFERENCE_VERSION};
    await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id,JSON.stringify(payload)).run();
  } else if (current.sourceImage) sourceImage=current.sourceImage;
  if (!/^https:\/\//i.test(sourceImage)) throw new Error("reel_source_image_required");
  const repo = String(env.GITHUB_INGEST_REPOSITORY || "flowarts2027-art/SERVIDOR-NEXUS-2.0");
  const [owner, name] = repo.split("/");
  const callbackToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const base = publicBase(env);
  if (!base) throw new Error("public_base_url_missing");

  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/dispatches`, {
    method:"POST",
    headers:{
      authorization:`Bearer ${ghToken}`,
      accept:"application/vnd.github+json",
      "content-type":"application/json",
      "user-agent":"NEXUS-Format-Builder"
    },
    body:JSON.stringify({
      event_type:"social-format-render",
      client_payload:{
        post_id:String(row.id),
        client_id:String(client.id),
        callback_token:callbackToken,
        callback_url:base + "/api/internal/social-format-render/upload",
        source_image:sourceImage,
        hook:compact(payload?.creativeFeatures?.hook || "", 100),
        cta:compact(payload?.creativeFeatures?.cta || clientBrand(client).cta || 'Digite "QUERO".', 100),
        duration:10
      }
    }),
    signal:AbortSignal.timeout(15000)
  });
  if (response.status !== 204) {
    const detail = (await response.text().catch(() => "")).slice(0, 180);
    throw new Error("social_reel_dispatch_failed_" + response.status + (detail ? ":" + detail : ""));
  }
  return {
    status:"rendering",
    kind:"reel",
    callbackToken,
    dispatchedAt:new Date().toISOString(),
    sourceImage,
    referenceVersion: client.id === "globalplay-streaming" ? GLOBAL_PLAY_REFERENCE_VERSION : ""
  };
}

export async function runFormatBuilder(env, client, options = {}) {
  const startedAt = new Date().toISOString();
  if (!String(client?.id || "").trim()) {
    const output={skipped:true,reason:"client_id_missing",built:0,pending:0,failed:0};
    await recordAgentExecution(env,client,"FORMAT BUILDER",{function:"social-format-build",trigger:options.trigger,startedAt,status:"warning",quantity:0,message:"FORMAT BUILDER sem client_id válido."});
    return output;
  }

  const result = await env.DB.prepare(
    `SELECT id,status,approval_status,payload_json,caption,scheduled_for,created_at
     FROM post_ledger
     WHERE client_id=?1
       AND status IN ('ready','scheduled','failed')
       AND approval_status='approved'
     ORDER BY COALESCE(scheduled_for,created_at) ASC
     LIMIT 12`
  ).bind(client.id).all();

  let built=0,pending=0,failed=0;
  const items=[];
  for (const row of result?.results || []) {
    const payload=parseJson(row.payload_json,{});
    const format=requestedFormat(payload);
    payload.qualityGates=payload.qualityGates&&typeof payload.qualityGates==="object"?payload.qualityGates:{};
    if (payload.qualityGates.copyChief!=="approved" || payload.qualityGates.designer!=="approved") continue;

    if (format==="post") {
      payload.formatBuild={status:"approved",kind:"post",imageUrl:String(payload.imageUrl||payload.publicImageUrl||""),builtAt:new Date().toISOString()};
      payload.qualityGates.formatBuilder="approved";
      await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error='',updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id,JSON.stringify(payload)).run();
      built++;
      items.push({id:row.id,format,status:"approved"});
      continue;
    }

    const formatAttempts=Math.max(0,Number(payload?.formatBuild?.attempts||0));
    if(formatAttempts>=3&&String(payload?.formatBuild?.status||"")==="failed"){
      payload.qualityGates.formatBuilder="rejected";
      await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error='format_build_retry_limit_reached',updated_at=CURRENT_TIMESTAMP WHERE id=?1")
        .bind(row.id,JSON.stringify(payload)).run();
      failed++;
      items.push({id:row.id,format,status:"failed",error:"format_build_retry_limit_reached"});
      continue;
    }

    try {
      const build = format==="carousel"
        ? await buildCarousel(env,client,row,payload)
        : await dispatchReel(env,client,row,payload);
      payload.formatBuild={...(payload.formatBuild||{}),...build,builtAt:build.status==="approved"?new Date().toISOString():(payload.formatBuild?.builtAt||null)};
      payload.qualityGates.formatBuilder=build.status==="approved"?"approved":"pending";
      await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error=?3,updated_at=CURRENT_TIMESTAMP WHERE id=?1")
        .bind(row.id,JSON.stringify(payload),build.status==="approved"?"":"format_build_pending").run();
      if(build.status==="approved")built++;else pending++;
      items.push({id:row.id,format,status:build.status});
    } catch (error) {
      const message=String(error?.message||error);
      // Sem acesso ao GitHub (token ausente, inválido ou de conta suspensa), o Reel
      // sai como post de imagem para não travar a publicação aprovada.
      if(format==="reel"&&/github_actions_token_missing|social_reel_dispatch_failed_40[13]/.test(message)
        &&/^https:\/\//i.test(String(payload.imageUrl||payload.publicImageUrl||""))){
        payload.formatBuild={status:"approved",kind:"post",fallbackFrom:"reel",fallbackReason:message.slice(0,120),imageUrl:String(payload.imageUrl||payload.publicImageUrl||""),builtAt:new Date().toISOString()};
        payload.creativeFeatures={...(payload.creativeFeatures||{}),requestedFormat:"post",plannedFormat:"reel"};
        payload.qualityGates.formatBuilder="approved";
        await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error='',updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(row.id,JSON.stringify(payload)).run();
        built++;
        items.push({id:row.id,format:"post",status:"approved",fallbackFrom:"reel"});
        continue;
      }
      failed++;
      payload.formatBuild={...(payload.formatBuild||{}),status:"failed",kind:format,attempts:Math.max(0,Number(payload?.formatBuild?.attempts||0))+1,error:String(error?.message||error).slice(0,180),failedAt:new Date().toISOString()};
      payload.qualityGates.formatBuilder="rejected";
      await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error='format_build_failed',updated_at=CURRENT_TIMESTAMP WHERE id=?1")
        .bind(row.id,JSON.stringify(payload)).run();
      items.push({id:row.id,format,status:"failed",error:payload.formatBuild.error});
    }
  }

  const output={built,pending,failed,items,skills:["carousel-build","reel-render-dispatch","format-validation","safe-fallback"]};
  await recordAgentExecution(env,client,"FORMAT BUILDER",{
    function:"social-format-build",trigger:options.trigger,startedAt,
    status:failed?"warning":"success",quantity:built+pending+failed,
    message:`${built} formato(s) pronto(s), ${pending} renderizando e ${failed} falha(s).`
  });
  await patchAgentCoreState(env,client.id,{formatBuilder:output});
  return output;
}

export async function handleSocialFormatRenderCallback(request, env, url) {
  if (url.pathname !== "/api/internal/social-format-render/upload") return null;
  if (request.method !== "PUT") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:{"content-type":"application/json"}});
  const postId=String(request.headers.get("x-nexus-post-id")||"").trim();
  const clientId=String(request.headers.get("x-nexus-client-id")||"").trim();
  const token=String(request.headers.get("x-nexus-callback-token")||"").trim();
  if(!postId||!clientId||!token)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json"}});

  const row=await env.DB.prepare("SELECT payload_json FROM post_ledger WHERE id=?1 AND client_id=?2 LIMIT 1").bind(postId,clientId).first();
  if(!row)return new Response(JSON.stringify({error:"post_not_found"}),{status:404,headers:{"content-type":"application/json"}});
  const payload=parseJson(row.payload_json,{});
  if(String(payload?.formatBuild?.callbackToken||"")!==token)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  if(!env.MEDIA||!request.body)return new Response(JSON.stringify({error:"r2_unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  const declared=Number(request.headers.get("content-length")||0);
  if(!declared||declared>50*1024*1024)return new Response(JSON.stringify({error:"invalid_video_size"}),{status:400,headers:{"content-type":"application/json"}});

  const key="posts/"+clientId+"/"+postId+"/format-builder-reel-"+crypto.randomUUID()+".mp4";
  await env.MEDIA.put(key,request.body,{
    httpMetadata:{contentType:"video/mp4",cacheControl:"public, max-age=31536000, immutable"},
    customMetadata:{clientId,postId,kind:"social-format-reel"}
  });
  const videoUrl=publicBase(env)+"/media/"+key;
  delete payload.formatBuild.callbackToken;
  payload.formatBuild={...(payload.formatBuild||{}),status:"approved",kind:"reel",videoUrl,objectKey:key,builtAt:new Date().toISOString()};
  payload.qualityGates={...(payload.qualityGates||{}),formatBuilder:"approved",formatBuilderAt:new Date().toISOString()};
  await env.DB.prepare("UPDATE post_ledger SET payload_json=?2,error='',updated_at=CURRENT_TIMESTAMP WHERE id=?1").bind(postId,JSON.stringify(payload)).run();
  return new Response(JSON.stringify({ok:true,postId,videoUrl}),{status:201,headers:{"content-type":"application/json"}});
}
