import { globalPlayCarouselPlan, GLOBAL_PLAY_REFERENCE_VERSION } from "./media-references.js";
import { reviewImage } from "./visual-review.js";
import { openAIKeyForClient } from "./openai-routing.js";
import { generateOriginalMedia } from "./media-generation.js";
import { publishInstagramImage, publishInstagramCarousel } from "./publisher.js";
import { globalPlayCampaignForDay, ragnarCampaignForDay } from "./globalplay-campaign.js";

const CLIENTS = [
  { id: "globalplay-streaming", name: "Global Play", niche: "streaming" },
  { id: "ragnar-one", name: "Ragnar One", niche: "streaming" }
];

function localParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(now);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

function dayKey(now) {
  const p = localParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

function localHour(now) {
  return Number(localParts(now).hour || 0);
}

function stateKey(clientId, day) {
  return `emergency-state/${clientId}/${day}.json`;
}

async function loadState(env, clientId, day) {
  if (!env.MEDIA) return { count: 0, lastPublishedAt: null };
  const obj = await env.MEDIA.get(stateKey(clientId, day));
  if (!obj) return { count: 0, lastPublishedAt: null };
  try {
    return JSON.parse(await obj.text());
  } catch {
    return { count: 0, lastPublishedAt: null };
  }
}

async function saveState(env, clientId, day, value) {
  if (!env.MEDIA) return;
  await env.MEDIA.put(stateKey(clientId, day), JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" }
  });
}

async function emergencyImage(env, client, now, creativeBrief = "", overlayTitle = "", carouselIndex = null) {
  const key = openAIKeyForClient(env, client.id);
  if (!key) throw new Error("emergency_openai_not_configured");

  const seed = `emergency-${client.id}-${now.toISOString()}-${crypto.randomUUID()}`;
  const media = await generateOriginalMedia(env, client, seed, creativeBrief || (
    "Create a fresh, high-impact customer-facing streaming advertisement for " + client.name + ". " +
    "One coherent scene, contemporary Brazilian home entertainment, emotionally positive, premium commercial photography, " +
    "obvious sales intent, no reseller language, no generated text inside the image."
  ), {
    title: overlayTitle,
    contentFormat:carouselIndex === null ? "image" : "carousel",
    carouselIndex:carouselIndex || 0,
    nexusPurpose: "emergency-publisher",
    bypassDailyBudget: true,
    variationSeed: seed
  });
  if(client.id === "globalplay-streaming" && !media.brandingApplied) throw new Error("brand_overlay_required");
  const review=await reviewImage(env,client,media.url,null);
  if(review.status !== "approved") throw new Error("emergency_visual_review_"+review.status+":"+String(review.reason || ""));
  return media.url;
}

async function emergencyCarousel(env, client, now) {
  const schedule = client.id === "ragnar-one" ? ragnarCampaignForDay(now) : globalPlayCampaignForDay(now);
  const item = schedule.find(x => String(x?.format || "") === "carousel") || schedule[0] || {};
  const brand = client.name;
  const theme = String(item.theme || "entretenimento em casa");
  const hook = String(item.hook || theme);
  const angle = String(item.angle || "");
  const cta = String(item.cta || 'Digite "QUERO".');
  const variation = client.id === "ragnar-one"
    ? "Use Ragnar One identity with noticeably different palette, framing, clothing, props and room details from Global Play; never copy the same image."
    : "Use Global Play identity with its own palette and composition.";

  const approvedPlan=client.id === "globalplay-streaming" ? globalPlayCarouselPlan() : null;
  const titles = approvedPlan ? approvedPlan.map(card=>card.overlay) : client.id === "globalplay-streaming"
    ? ["CHEGA DE TRAVAR", "TUDO NUM LUGAR", "ATIVA DIRETO", "DIGITE QUERO"]
    : ["SEM COMPLICAR", "RAGNAR ONE", "ATIVA DIRETO", "DIGITE QUERO"];

  const briefs = approvedPlan ? approvedPlan.map((card,index)=>"Generate ONE independent card "+(index+1)+" of 4. "+card.scene+" Use consistent family, home and amber lighting, with one Global Play mark upper-right added by system. No montage, no repeated logos, no image counter.") : [
    "Instagram carousel card 1 of 4 for " + brand + ". Story role: pain-point hook. Hook: " + hook + ". Show a concrete frustration with entertainment choice or streaming instability, not just people smiling at a TV. The image must have obvious commercial intent and clean space for the system overlay title: " + titles[0] + ". Do not generate text inside the image. No abstract TV gradients. " + variation,
    "Instagram carousel card 2 of 4 for " + brand + ". Story role: solution/discovery. Continue the same campaign but vary framing clearly. Introduce " + brand + " as the simple answer to: " + theme + ". Angle: " + angle + ". Show app/entertainment choice, remote control, phone or TV interface as a meaningful benefit, without third-party logos. Clean space for overlay title: " + titles[1] + ". " + variation,
    "Instagram carousel card 3 of 4 for " + brand + ". Story role: mechanism/ease. Show a concrete next step: quick activation, WhatsApp conversation, choosing content, or a practical benefit. Avoid generic people merely watching TV. Clean space for overlay title: " + titles[2] + ". No generated text inside the image. " + variation,
    "Instagram carousel card 4 of 4 for " + brand + ". Story role: conversion payoff. Show the satisfying result of the same commercial story with clear visual energy and a direct response composition. The final card must feel like an ad people can act on, with clean space for CTA overlay: " + titles[3] + ". Preserve brand identity and do not revert to plain lifestyle scenes. " + variation
  ];
  const urls = [];
  for (let index = 0; index < briefs.length; index++) {
    urls.push(await emergencyImage(env, client, now, briefs[index], titles[index], index));
  }
  return urls;
}

function emergencyCaption(client, now) {
  const stamp = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  }).format(now);
  if (client.id === "globalplay-streaming") {
    return `Chega de perder tempo procurando o que assistir.\n\nCom a Global Play, você fala no WhatsApp, ativa direto no painel e aproveita filmes, séries e entretenimento em casa com mais praticidade.\n\nDigite QUERO e fale com a Global Play.\n\n#GlobalPlay #Streaming #Entretenimento #Filmes #Series #DicaDeHoje\n\nAtualizado em ${stamp}`;
  }
  return `Entretenimento sem enrolação para assistir do seu jeito.\n\nA Ragnar One te ajuda a ativar rápido e aproveitar conteúdo em casa com praticidade.\n\nDigite QUERO e fale com a Ragnar One.\n\n#RagnarOne #Streaming #Entretenimento #Filmes #Series #Diversao\n\nAtualizado em ${stamp}`;
}

export function isD1Emergency(error) {
  return /d1|daily row read limit|database|sqlite/i.test(String(error?.message || error || ""));
}

export async function runEmergencyPublisher(env, now = new Date(), targetClientId = "", options = {}) {
  if (!env.MEDIA) return { attempted: 0, published: 0, errors: ["r2_unavailable"] };
  const hour = localHour(now);
  if (hour < 9 || hour >= 22) return { attempted: 0, published: 0, errors: options.forceTest ? ["outside_publishing_window"] : [] };

  const day = dayKey(now);
  const requestedFormat = String(options?.format || "post").toLowerCase();
  const forceTest = options?.forceTest === true;
  if (!["post","carousel"].includes(requestedFormat)) return {attempted:0,published:0,errors:["unsupported_emergency_format"]};
  const testId=String(options.testId || "");
  if(forceTest && (!targetClientId || !/^[a-zA-Z0-9_-]{8,80}$/.test(testId))) return {attempted:0,published:0,errors:["controlled_test_id_required"]};
  const testKey=forceTest ? "controlled-tests/"+targetClientId+"/"+testId+".json" : "";
  if(testKey){
    const previous=await env.MEDIA.get(testKey);
    if(previous){
      const saved=JSON.parse(await previous.text());
      if(saved.status==="published")return {...saved.summary,reused:true};
      return {attempted:0,published:0,errors:["controlled_test_already_attempted"]};
    }
  }
  const summary = { attempted: 0, published: 0, errors: [], posts:[], format: requestedFormat };

  const targets = targetClientId
    ? CLIENTS.filter(client => client.id === String(targetClientId))
    : CLIENTS;
  if (targetClientId && targets.length === 0) {
    return { attempted: 0, published: 0, errors: ["unknown_client"] };
  }

  for (const client of targets) {
    const state = await loadState(env, client.id, day);
    const count = Math.max(0, Number(state?.count || 0));
    const lastMs = Date.parse(String(state?.lastPublishedAt || ""));
    const spaced = !Number.isFinite(lastMs) || now.getTime() - lastMs >= 90 * 60 * 1000;
    if (!forceTest && !spaced) continue;

    if(testKey)await env.MEDIA.put(testKey,JSON.stringify({status:"started",startedAt:now.toISOString()}),{httpMetadata:{contentType:"application/json"}});
    summary.attempted += 1;
    try {
      let result;
      if (requestedFormat === "carousel") {
        const imageUrls = await emergencyCarousel(env, client, now);
        result = await publishInstagramCarousel(env, client.id, imageUrls, emergencyCaption(client, now));
      } else {
        const imageUrl = await emergencyImage(env, client, now);
        result = await publishInstagramImage(env, client.id, imageUrl, emergencyCaption(client, now));
      }
      if(!String(result?.mediaId || ""))throw new Error("instagram_media_id_missing");
      summary.posts.push({clientId:client.id,mediaId:String(result.mediaId),permalink:String(result.permalink || ""),referenceVersion:client.id === "globalplay-streaming" ? GLOBAL_PLAY_REFERENCE_VERSION : ""});
      await saveState(env, client.id, day, {
        count: count + 1,
        lastPublishedAt: now.toISOString(),
        mediaId: String(result?.mediaId || ""),
        mode: forceTest ? "controlled-test-" + requestedFormat : "d1-emergency"
      });
      summary.published += 1;
      if(testKey)await env.MEDIA.put(testKey,JSON.stringify({status:"published",summary}),{httpMetadata:{contentType:"application/json"}});
    } catch (error) {
      summary.errors.push(`${client.id}:${String(error?.message || error).slice(0,120)}`);
    }
  }
  return summary;
}


export async function emergencyPublisherStatus(env, now = new Date()) {
  const day = dayKey(now);
  const clients = [];
  for (const client of CLIENTS) {
    const state = await loadState(env, client.id, day);
    clients.push({
      clientId: client.id,
      day,
      count: Math.max(0, Number(state?.count || 0)),
      lastPublishedAt: state?.lastPublishedAt || null,
      mediaIdPresent: Boolean(state?.mediaId),
      mode: String(state?.mode || "")
    });
  }
  return { ok: true, storage: "r2", clients };
}
