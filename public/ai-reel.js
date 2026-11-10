// Master > Postagens > Outras ferramentas: prévia avulsa, sem publicar.
(() => {
  "use strict";
  const form=document.getElementById("ai-reel-form");
  if(!form)return;
  const status=document.getElementById("ai-reel-status");
  const price=document.getElementById("ai-reel-price");
  const video=document.getElementById("ai-reel-video");
  const button=form.querySelector('button[type="submit"]');
  let quote=null;
  async function estimate(){
    quote=null; button.disabled=true;
    const q=new URLSearchParams({duration:form.elements.duration.value,resolution:form.elements.resolution.value});
    const response=await fetch("/api/master/ai-reel?"+q,{credentials:"same-origin"});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error("Não consegui consultar o preço.");
    quote=data.quote;
    price.textContent="Valor estimado por tentativa: US$ "+quote.costUsd.toFixed(2).replace(".",",")+
      (data.enabled?". Disponível mediante confirmação.":". Desligado no servidor: nenhum gasto possível.");
    button.disabled=!data.enabled;
  }
  async function clients(){
    const response=await fetch("/api/clients",{credentials:"same-origin"});
    const data=await response.json();
    const list=Array.isArray(data)?data:data.clients||[];
    const sel=form.elements.clientId;
    sel.replaceChildren(new Option("Escolha um cliente",""));
    for(const c of list){
      if(c?.id&&!["ragnar-one","globalplay-streaming","demo-cafe"].includes(c.id))sel.add(new Option(c.name||c.id,c.id));
    }
  }
  for(const name of ["duration","resolution"])form.elements[name].addEventListener("change",()=>{
    estimate().catch(e=>status.textContent=e.message);
  });
  Promise.all([clients(),estimate()]).catch(e=>{status.textContent=e.message;button.disabled=true;});
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!quote||!form.elements.confirmCost.checked){status.textContent="Confirme o custo antes de gerar.";return;}
    button.disabled=true;video.hidden=true;
    status.textContent="Gerando vídeo. Nenhuma postagem será criada.";
    try{
      const res=await fetch("/api/master/ai-reel",{
        method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          clientId:form.elements.clientId.value,prompt:form.elements.prompt.value,
          duration:quote.seconds,resolution:quote.resolution,
          confirmCost:true,acceptedCostUsd:quote.costUsd
        })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok)throw new Error(data.message||data.error||"Erro na geração");
      video.src=data.videoUrl;video.hidden=false;
      status.textContent="Prévia salva. Revise o MP4 antes de enviar para o painel do cliente.";
      form.elements.confirmCost.checked=false;
    }catch(e){status.textContent=e.message;}
    finally{await estimate().catch(()=>{button.disabled=true;});}
  });
})();
