import { openAIResponses } from "./openai.js";
import { commercialPromptGuard } from "./content-policy.js";
import { GLOBAL_PLAY_REFERENCE_VERSION, globalPlayReferenceDirection } from "./media-references.js";
import { GLOBAL_PLAY_BRAND_PNG, GLOBAL_PLAY_REEL_BAND_PNG } from "./media-brand-overlays.js";
import { clientBrand, brandProfileVersion } from "./client-brand.js";
import { pickFlowArtsStyle } from "./flowarts-styles.js";

function bytesFromBase64(value){
  const raw=atob(String(value||""));
  const out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}

export function overlayCopy(client,title=""){
  const id=String(client?.id||"");
  const brand=id==="globalplay-streaming"?"GLOBAL PLAY":id==="ragnar-one"?"RAGNAR ONE":String(client?.name||"NEXUS").toUpperCase();
  const cleanTitle=String(title||"").replace(/\s+/g," ").trim().slice(0,42);
  return {brand,title:cleanTitle,cta:"DIGITE QUERO"};
}

async function composeBrandOverlay(env,bytes,client,title="",options={}){
  if(!env.IMAGES)return {bytes,applied:Boolean(brandProfileVersion(client?.id)),reason:"images_binding_unavailable"};
  try{
    const copy=overlayCopy(client,title);
    // A imagem já nasce em 4:5 ou 9:16 (imageSizeFor): aqui só amplia, sem cortar.
    let canvas=env.IMAGES.input(new Blob([bytes]).stream()).transform({width:1080,height:options.contentFormat==="reel"?1920:1350,fit:"cover"});
    // Marcas com perfil próprio (gancho já escrito pela IA) e campanhas de clientes (imagem limpa):
    // aqui só ajusta para 4:5 (feed) ou 9:16 (reel), sem escrever nada por cima.
    if(brandProfileVersion(client?.id)||options.cleanImage===true){
      const response=await (await canvas.output({format:"image/jpeg",quality:90})).response();
      if(!response.ok)throw new Error("images_resize_http_"+response.status);
      const out=new Uint8Array(await response.arrayBuffer());
      if(!out.byteLength||out.byteLength>12*1024*1024)throw new Error("images_resize_invalid_bytes");
      return {bytes:out,applied:true,reason:"clean_brand_image"};
    }
    if(client?.id==="globalplay-streaming"){
      canvas=canvas.draw(env.IMAGES.input(new Blob([bytesFromBase64(GLOBAL_PLAY_BRAND_PNG)]).stream()),{right:48,top:40});
      if(options.contentFormat==="reel")canvas=canvas.draw(env.IMAGES.input(new Blob([bytesFromBase64(GLOBAL_PLAY_REEL_BAND_PNG)]).stream()),{bottom:0,left:0});
      const response=await (await canvas.output({format:"image/jpeg",quality:90})).response();
      if(!response.ok)throw new Error("images_overlay_http_"+response.status);
      const out=new Uint8Array(await response.arrayBuffer());
      if(!out.byteLength||out.byteLength>12*1024*1024)throw new Error("images_overlay_invalid_bytes");
      return {bytes:out,applied:true,reason:""};
    }
    const brand=env.IMAGES.text(copy.brand,{color:"#FFFFFF",size:64});
    const headline=copy.title?env.IMAGES.text(copy.title,{color:"#FFFFFF",size:52}):null;
    const cta=env.IMAGES.text(copy.cta,{color:"#FFFFFF",size:54});
    canvas=canvas.draw(brand,{left:64,top:58});
    if(headline)canvas=canvas.draw(headline,{left:64,bottom:176});
    canvas=canvas.draw(cta,{left:64,bottom:72});
    const response=await (await canvas.output({format:"image/jpeg",quality:90})).response();
    if(!response.ok)throw new Error("images_overlay_http_"+response.status);
    const out=new Uint8Array(await response.arrayBuffer());
    if(!out.byteLength||out.byteLength>12*1024*1024)throw new Error("images_overlay_invalid_bytes");
    return {bytes:out,applied:true,reason:""};
  }catch(error){
    return {bytes,applied:false,reason:String(error?.message||error).slice(0,120)};
  }
}

// Gancho curto que vai escrito na imagem das marcas com perfil próprio (ex.: Flow Arts).
export function brandHeadline(client,title=""){
  if(!brandProfileVersion(client?.id))return "";
  const clean=String(title||"").replace(/["“”]/g,"").replace(/\s+/g," ").trim();
  if(!clean||/^(portrait|vertical|create|scene)\b/i.test(clean))return "";
  const words=clean.split(" ");
  if(words.length<=9&&clean.length<=70)return clean;
  // Longo demais: corta numa pausa natural (vírgula, ponto, travessão, dois-pontos),
  // para a frase nunca aparecer cortada no meio.
  const parts=clean.split(/(?<=[,.;:!?])\s+|\s+[—–-]\s+/).map(part=>part.replace(/[,;:\s]+$/,"").trim()).filter(Boolean);
  let out="";
  for(const part of parts){
    const next=out?out+" "+part:part;
    if(next.split(" ").length>9||next.length>70)break;
    out=next;
  }
  if(out.split(" ").length>=3)return out;
  return words.slice(0,7).join(" ").replace(/[,;:\s]+$/,"");
}

export function imageSizeFor(contentFormat){
  return contentFormat==="reel"?"1008x1792":"1024x1280";
}

// Estilo visual do post (só marcas com perfil próprio, ex.: Flow Arts).
export function styleForPost(client, visualBrief="", variationSeed="", options={}){
  if(!brandProfileVersion(client?.id))return null;
  return pickFlowArtsStyle({
    headline:brandHeadline(client,options.title),
    brief:visualBrief,
    seed:variationSeed,
    avoid:options.avoidStyles
  });
}

export function buildVisualPrompt(client, visualBrief="", variationSeed="", options={}){
  const id=String(client?.id||"");
  const headline=brandHeadline(client,options.title);
  const style=styleForPost(client,visualBrief,variationSeed,options);
  const common=[
    options.contentFormat==="carousel"?"Create one separate premium portrait carousel advertising artwork in 4:5 format.":options.contentFormat==="reel"?"Create one premium vertical social-media advertising artwork in 9:16 format.":"Create one premium portrait Instagram feed artwork in 4:5 format.",
    headline
      ? "Write exactly this headline in Brazilian Portuguese, spelled exactly as given, with all accents: \""+headline+"\". Large bold clean sans-serif, white or very light text with strong contrast, placed in the upper half of the image, starting about 12% below the top edge, max 3 lines, every letter fully visible and at least 10% away from the left and right edges (Instagram shows a narrower preview in the profile grid). Never put any letter in the bottom 20% of the image, where Instagram shows buttons and captions. Add a small discreet wordmark \"FLOW ARTS\" above the bottom 20%. No other words, no other logos, no watermarks, no split screen, no collage."
      : "No text, no words, no logos, no watermarks, no split screen, no collage.",
    style?("Art direction ("+style.name+"): "+style.direction):"One coherent scene, strong focal point, expressive lighting, mobile-feed readability.",
    "Mobile-feed readability: strong focal point, expressive lighting, high contrast between headline and background.",
    "Make the composition noticeably different from generic stock imagery.",
    "Variation seed: "+String(variationSeed||"new")
  ];
  if(id==="globalplay-streaming"){
    common.push(
      "Brand context: Global Play streaming entertainment.",
      "Use the audited visual system: premium, photorealistic, contemporary Brazilian home-entertainment scenes.",
      "Use one clear idea per creative, natural people when useful, believable lighting, clean composition and generous negative space.",
      "No copyrighted characters, movie frames, sports-team marks or third-party brands.",
      "Avoid legacy campaign styles, dark depressing scenes, empty televisions and repeated compositions."
    );
  }else if(id==="ragnar-one"){
    common.push(
      "Brand context: Ragnar One, an independent streaming brand.",
      "Use the audited visual system: premium, photorealistic, contemporary home-entertainment scenes with one clear idea per creative.",
      "Use generic original contemporary people only when useful; vary age, pose, framing and environment.",
      "Avoid legacy themed art direction, repeated compositions, third-party brands and copyrighted references."
    );
  }else{
    const brand=clientBrand(client);
    common.push(
      "Brand context: "+brand.brandName+(brand.niche?", "+brand.niche:"")+".",
      // "Sem texto" fazia a IA desenhar telas e papéis vazios, só com blocos de cor.
      "Screens and objects must show real, meaningful content: a phone or laptop shows a real-looking Instagram feed full of product photos, or an analytics dashboard with real-looking charts and photo thumbnails. Any text on screens or paper appears only as tiny, blurred interface lines.",
      "Never show blank screens, empty colored rectangles, plain color swatches, blank cards or meaningless decorative shapes. Every object must be a real item a small business uses.",
      // Pedido do Rodrigo (15/10): celular virado para a câmera parece falso.
      "When a person holds a phone, the screen faces the person holding it, never the viewer. To show the screen, use an over-the-shoulder view from behind the person.",
      // Pedido do Rodrigo (15/10): pessoa escrevendo em agenda fechada.
      "People use objects realistically: someone writing writes on an open notebook page, cups are upright, tools are held the right way.",
      brand.visualDirection||"Premium, photorealistic, contemporary scenes that clearly match the brand niche, with one clear idea per creative.",
      "No copyrighted characters, movie frames, sports-team marks, third-party brands or logos."
    );
  }
  const commercialGuard=commercialPromptGuard(client);
  if(commercialGuard)common.push(commercialGuard);
  if(String(visualBrief||"").trim())common.push("Creative direction: "+String(visualBrief).slice(0,1200));
  if(id==="globalplay-streaming")common.push(globalPlayReferenceDirection(options.contentFormat,options.carouselIndex));
  return common.join(" ");
}

export async function generateOriginalMedia(env,client,postId,visualBrief="",options={}){
  if(!env.MEDIA)throw new Error("r2_unavailable");
  const origin=String(env.PUBLIC_BASE_URL||"").replace(/\/+$/,"");
  if(!origin)throw new Error("public_base_url_missing");
  const request=options.request||openAIResponses;
  const references=[]; // Only the user-approved textual art direction is sent; private R2 references stay local.
  const style=styleForPost(client,visualBrief,options.variationSeed||postId,options);
  const prompt=buildVisualPrompt(client,visualBrief,options.variationSeed||postId,options);
  const response=await request(env,client.id,{
    nexusPurpose:options.nexusPurpose||"media-generation",
    nexusBypassDailyBudget:options.bypassDailyBudget===true,
    nexusTimeoutMs:options.timeoutMs||150000,
    model:env.NEXUS_MEDIA_PLANNER_MODEL||"gpt-5.6-luna",
    input:[{role:"user",content:[{type:"input_text",text:prompt},...references]}],
    tools:[{
      type:"image_generation",
      model:env.NEXUS_IMAGE_MODEL||"gpt-image-2",
      quality:String(env.NEXUS_IMAGE_QUALITY||"medium"),
      // Já no formato final (sem corte depois): 4:5 no feed/carrossel, 9:16 no Reel.
      // gpt-image-2 aceita tamanho livre (lados múltiplos de 16).
      size:imageSizeFor(options.contentFormat),
      output_format:"jpeg"
    }],
    tool_choice:"required"
  });
  const item=(response?.output||[]).find(x=>x?.type==="image_generation_call"&&x?.result);
  if(!item?.result)throw new Error("image_generation_missing_result");
  const rawBytes=bytesFromBase64(item.result);
  if(!rawBytes.byteLength||rawBytes.byteLength>12*1024*1024)throw new Error("image_generation_invalid_bytes");
  const composed=await composeBrandOverlay(env,rawBytes,client,options.title||"",options);
  const bytes=composed.bytes;
  const fingerprint=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))]
    .map(byte=>byte.toString(16).padStart(2,"0")).join("");
  const key="posts/"+String(client.id)+"/"+String(postId)+"/generated-"+crypto.randomUUID()+".jpg";
  await env.MEDIA.put(key,bytes,{
    httpMetadata:{contentType:"image/jpeg",cacheControl:"public, max-age=31536000, immutable"},
    customMetadata:{clientId:String(client.id),postId:String(postId),kind:"openai-original-media"}
  });
  return {url:origin+"/media/"+key,key,fingerprint,brandingApplied:composed.applied,brandingError:composed.reason,promptVersion:client.id==="globalplay-streaming"&&["carousel","reel"].includes(options.contentFormat)?GLOBAL_PLAY_REFERENCE_VERSION:"scene-grammar-v1",styleId:style?style.id:"",referenceMode:references.length?"image":"text-direction",referenceCount:references.length,contentFormat:options.contentFormat||"image"};
}
