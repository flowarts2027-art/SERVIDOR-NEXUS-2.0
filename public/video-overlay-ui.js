/* Editor de camadas da issue #96: textos/emojis exportados via render_overlay_layers.py. */
(function(){
"use strict";
const engine=window.NexusVideoOverlays;
if(!engine)return;
const $=s=>document.querySelector(s);
let layers=[],active="",jobId="";
const palette=[["⚠️ ATENÇÃO","text","⚠️ ATENÇÃO"],["🆕 NOVO","text","NOVO!"],["👇 CLIQUE","text","CLIQUE AQUI"],["🔥 OFERTA","text","OFERTA"],["✅ DISPONÍVEL","text","DISPONÍVEL"],["✎ Texto livre","text","Seu texto aqui"],["⬇️ Seta baixo","emoji","⬇️"],["⬆️ Seta cima","emoji","⬆️"],["➡️ Seta direita","emoji","➡️"],["↖️ Seta diagonal","emoji","↖️"],["👉 Mão direita","emoji","👉"],["👆 Mão cima","emoji","👆"],["👇 Mão baixo","emoji","👇"],["🔥 Fogo","emoji","🔥"],["✨ Brilho","emoji","✨"],["❤️ Coração","emoji","❤️"],["⭐ Estrela","emoji","⭐"],["🎬 Cinema","emoji","🎬"],["🍿 Pipoca","emoji","🍿"],["🔔 Aviso","emoji","🔔"],["⚡ Raio","emoji","⚡"],["📱 Celular","emoji","📱"],["🎯 Alvo","emoji","🎯"],["✅ Check","emoji","✅"]];
const effects=["none","blink","pulse","fade","bounce","slide","float","spin","zoom","glow"];
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const video=()=>$("#video-editor-player");
const duration=()=>Number.isFinite(video()?.duration)&&video().duration>0?video().duration:3600;
const selected=()=>layers.find(l=>l.id===active);
function notify(s){const el=$("#overlay-feedback");if(el)el.textContent=s;}
function storageKey(){return "nexus-overlay-draft-v1:"+ (jobId || "new");}
function save(){try{sessionStorage.setItem(storageKey(),JSON.stringify(layers));}catch{}}
function setJob(value,serverLayers=[]){const id=String(value||"");if(id===jobId)return;const initial=!jobId?layers.map(x=>({...x})):[];const persisted=Array.isArray(serverLayers)?serverLayers.slice(0,16):[];jobId=id;active="";try{const saved=sessionStorage.getItem(storageKey());layers=(saved?JSON.parse(saved):persisted.length?persisted:initial).slice(0,16).map(x=>engine.normalize(x,duration()));}catch{layers=persisted.slice(0,16).map(x=>engine.normalize(x,duration()));}save();render();}
function add(type,text){
if(layers.length>=16){notify("Limite de 16 elementos por vídeo.");return;}
const total=duration(), current=video()?.currentTime||0;
const t=Math.min(Math.max(0,current),Math.max(0,total-0.1)), end=Math.min(total,t+8);
const layer=engine.normalize({type,text,start:t,end:Math.max(t+0.033,end),effect:"none",x:50,y:48,fontSize:26,scale:1},duration());
layers.push(layer);active=layer.id;save();render();notify("Arraste o elemento sobre o vídeo.");
}
function change(key,value){const l=selected();if(!l)return;l[key]=value;save();render(true);}
function renderTimeline(){
 const holder=$("#nexus-premium-layer-timeline");
 if(!holder)return;
 holder.replaceChildren();
 for(const layer of layers){
  const line=node("div","nexus-premium-track");
  const label=node("span","nexus-premium-track-label",(layer.type==="emoji"?"✦ ":"T ")+(layer.text||"Elemento").slice(0,24));
  const rail=node("div","nexus-premium-track-rail");
  const segment=node("button","nexus-premium-track-segment",layer.text.slice(0,24));
  segment.type="button";segment.setAttribute("aria-label","Selecionar camada "+layer.text.slice(0,40));
  const span=Math.max(0.033,duration()),start=Math.max(0,Math.min(span,layer.start)),end=Math.max(start,Math.min(span,layer.end));
  segment.style.left=(start/span*100)+"%";
  segment.style.width=(Math.max(0.5,(end-start)/span*100))+"%";
  segment.classList.toggle("active",layer.id===active);
  segment.onclick=()=>{active=layer.id;const player=video();if(player&&Number.isFinite(player.duration))player.currentTime=Math.min(player.duration,start);render();};
  rail.append(segment);line.append(label,rail);holder.append(line);
 }
}
function render(preserveControls=false){
const overlay=$("#nexus-overlay-surface"),list=$("#nexus-layer-items");
if(!overlay||!list)return;
overlay.replaceChildren();list.replaceChildren();
for(const layer of layers){
const el=engine.renderLayer(overlay,layer);
el.hidden=!engine.visibleAt(layer,video()?.currentTime||0);
el.classList.toggle("nexus-selected-overlay",active===layer.id);
el.addEventListener("pointerdown",()=>{
 active=layer.id;
 overlay.querySelectorAll(".nexus-overlay").forEach(n=>n.classList.toggle("nexus-selected-overlay",n.dataset.layerId===active));
 controls();
});
engine.attachDrag(el,layer,()=>{save();});
const chip=node("button","nexus-layer-chip",layer.text.slice(0,20)||layer.type);
chip.type="button";chip.classList.toggle("active",active===layer.id);
chip.onclick=()=>{active=layer.id;render();};
list.append(chip);
}
renderTimeline();
if(!preserveControls)controls();
}
function field(parent,label,type,value,callback,options){
const wrap=node("label","nexus-layer-property"),span=node("span","",label);
let input=node(type==="select"?"select":"input");
if(type==="select"){
for(const entry of options){const opt=node("option","",entry);opt.value=entry;input.append(opt);}
}else input.type=type;
if(type==="checkbox") input.checked=Boolean(value);
else input.value=String(value);
if(type==="range"){input.min=options[0];input.max=options[1];input.step=options[2];}
if(type==="number"){input.min="0";input.max=String(duration());input.step="0.1";}
input.addEventListener(type==="checkbox"?"change":"input",()=>callback(type==="checkbox"?input.checked:input.value));
wrap.append(span,input);parent.append(wrap);
}
function controls(){
const el=$("#nexus-layer-properties");if(!el)return;el.replaceChildren();
const l=selected();if(!l){el.append(node("small","", "Toque num elemento ou escolha uma figurinha."));return;}
field(el,"Conteúdo","text",l.text,v=>change("text",v));
field(el,"Efeito","select",l.effect,v=>change("effect",v),effects);
field(el,"Tamanho","range",l.scale,v=>change("scale",Number(v)),[0.2,3,0.1]);
field(el,"Girar","range",l.rotation,v=>change("rotation",Number(v)),[-180,180,5]);
field(el,"Cor","color",l.color,v=>change("color",v));
field(el,"Início (segundos)","number",l.start,v=>change("start",Math.min(Number(v)||0,l.end)));
field(el,"Fim (segundos)","number",l.end,v=>change("end",Math.max(Number(v)||0,l.start+0.1)));
field(el,"Negrito","checkbox",l.bold,v=>change("bold",v));
field(el,"Itálico","checkbox",l.italic,v=>change("italic",v));
field(el,"Sublinhado","checkbox",l.underline,v=>change("underline",v));
const arrows=node("div","nexus-layer-arrows");
for(const [c,dx,dy] of [["←",-1,0],["↑",0,-1],["↓",0,1],["→",1,0]]){
const b=node("button","",c);b.type="button";b.title="Mover 1%";b.onclick=()=>{l.x=Math.max(0,Math.min(100,l.x+dx));l.y=Math.max(0,Math.min(100,l.y+dy));save();render();};arrows.append(b);
}
const remove=node("button","nexus-remove-layer","Excluir figurinha");
remove.type="button";remove.onclick=()=>{layers=layers.filter(x=>x.id!==active);active="";save();render();};
el.append(arrows,remove);
}
function buildPremiumLayout(toolbox,props){
 const panel=$("#video-editor-panel"),toolbar=panel?.querySelector(".video-editor-toolbar"),preview=panel?.querySelector(".video-editor-preview"),controls=panel?.querySelector(".video-editor-controls");
 if(!panel||!toolbar||!preview||!controls||panel.querySelector(".nexus-premium-workspace"))return;
 panel.classList.add("nexus-premium-editor");
 const studio=node("div","nexus-premium-workspace"),library=node("aside","nexus-premium-library"),stage=node("section","nexus-premium-stage"),inspector=node("aside","nexus-premium-inspector"),timeline=node("section","nexus-premium-timeline");
 library.setAttribute("aria-label","Biblioteca criativa");stage.setAttribute("aria-label","Prévia 9:16");inspector.setAttribute("aria-label","Propriedades");timeline.setAttribute("aria-label","Linha do tempo");
 const stageTitle=node("div","nexus-premium-stage-title");stageTitle.append(node("strong","","Prévia do vídeo · 9:16"),node("small","","Arraste elementos diretamente no vídeo"));stage.append(stageTitle,preview);
 inspector.append(node("div","nexus-premium-pane-heading","Propriedades do elemento"),props);
 const settings=node("details","nexus-premium-settings");settings.append(node("summary","","Configurações do vídeo, logo e upload"),controls);inspector.append(settings);
 library.append(node("div","nexus-premium-pane-heading","Biblioteca criativa"));
 const search=node("input","nexus-premium-search");search.type="search";search.placeholder="Buscar textos, setas e emojis";search.setAttribute("aria-label","Buscar elementos");
 const tabs=node("div","nexus-premium-category-tabs"),paletteEl=toolbox.querySelector(".nexus-overlay-palette");let category="Todos";
 function filter(){const term=search.value.trim().toLocaleLowerCase("pt-BR");paletteEl.querySelectorAll("button").forEach(b=>{const allowed=category==="Todos"||(category==="Texto"?b.dataset.overlayType==="text":b.dataset.overlayType==="emoji");b.hidden=!(allowed&&b.textContent.toLocaleLowerCase("pt-BR").includes(term));});}
 for(const kind of ["Todos","Texto","Emojis"]){const b=node("button","",kind);b.type="button";if(kind===category)b.classList.add("active");b.onclick=()=>{category=kind;tabs.querySelectorAll("button").forEach(t=>t.classList.toggle("active",t===b));filter();};tabs.append(b);}
 search.addEventListener("input",filter);
 library.append(search,tabs,toolbox);
 toolbox.querySelector(".nexus-layer-items")?.before(node("strong","nexus-premium-layer-title","Camadas adicionadas"));
 inspector.querySelector(".nexus-layer-properties")?.setAttribute("aria-label","Ajustes da camada selecionada");
 const th=node("div","nexus-premium-timeline-heading");th.append(node("strong","","Linha do tempo"),node("small","","Arraste as alças azuis para cortar"));timeline.append(th);
 const tracks=node("div","nexus-premium-layer-timeline");tracks.id="nexus-premium-layer-timeline";timeline.append(tracks);
 for(const selector of [".video-filmstrip-wrap",".video-editor-markers","#video-trim-start","#video-trim-end"]){const element=preview.querySelector(selector);if(element)timeline.append(element);}
 timeline.append(tracks);
 const generate=controls.querySelector("#video-generate-editable");if(generate){generate.textContent="↓ Exportar MP4";const action=node("div","nexus-premium-export-action");action.append(generate);toolbar.append(action);}
 const upload=controls.querySelector(".video-editor-primary-actions");if(upload){upload.classList.add("nexus-premium-upload");library.append(upload);}
 const eyebrow=toolbar.querySelector(".eyebrow");if(eyebrow)eyebrow.textContent="NEXUS 2.0 · EDITOR PREMIUM";
 studio.append(library,stage,inspector,timeline);panel.append(studio);toolbar.after(studio);
}
function setup(){
const surface=$(".video-player-shell"),controlsPane=$(".video-editor-controls");
if(!surface||!controlsPane||$("#nexus-overlay-surface"))return;
const overlay=node("div","nexus-overlay-surface");overlay.id="nexus-overlay-surface";surface.append(overlay);
const toolbox=node("section","nexus-overlay-toolbox");
toolbox.append(node("strong","nexus-overlay-title","✦ Figurinhas, setas e selos"));
const paletteEl=node("div","nexus-overlay-palette");
for(const [name,type,txt] of palette){const b=node("button","nexus-palette-item",name);b.type="button";b.dataset.overlayType=type;b.onclick=()=>add(type,txt);paletteEl.append(b);}
const items=node("div","nexus-layer-items");items.id="nexus-layer-items";
const props=node("div","nexus-layer-properties");props.id="nexus-layer-properties";
const feedback=node("small","nexus-overlay-feedback","Texto e emoji: exportação MP4 em validação. Verifique o resultado antes de compartilhar.");feedback.id="overlay-feedback";
toolbox.append(paletteEl,items,props,feedback);controlsPane.prepend(toolbox);
buildPremiumLayout(toolbox,props);
try{const raw=JSON.parse(sessionStorage.getItem(storageKey())||"[]");layers=raw.slice(0,16).map(l=>engine.normalize(l,duration()));}catch{layers=[];}
if(typeof ResizeObserver!=="undefined"){
const observer=new ResizeObserver(()=>render(true));observer.observe(surface);
}
video()?.addEventListener("timeupdate",()=>{
const current=video().currentTime;
overlay.querySelectorAll("[data-layer-id]").forEach(n=>{const l=layers.find(x=>x.id===n.dataset.layerId);n.hidden=!l||!engine.visibleAt(l,current);});
});
render();
}
window.NexusVideoOverlayUI=Object.freeze({setJob,getLayers:()=>layers.map(x=>({...x}))});
document.addEventListener("DOMContentLoaded",setup);
})();