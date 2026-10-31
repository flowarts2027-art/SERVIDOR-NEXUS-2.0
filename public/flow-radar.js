// Radar Comercial exclusivo da sessão do cliente Flow Arts.
// A API valida a sessão no Worker. Este script nunca publica ou envia mensagens.
(() => {
  "use strict";
  const BASE = "/api/portal/flow/commercial-radar";
  const $ = id => document.getElementById(id);
  const statusNames = ["novo","revisao","aprovado","contatado","negociacao","ganho","descartado","nao_contatar","nutricao","convite_seguir","seguidor_confirmado"];
  const names = { site:"Sites", instagram:"Automação Instagram", leads:"Geração de leads", prospeccao:"Prospecção B2B" };
  let leads = [];
  let loaded = false;
  let busy = false;

  function el(tag, value, cls) {
    const node = document.createElement(tag);
    if (value != null) node.textContent = String(value);
    if (cls) node.className = cls;
    return node;
  }
  function appendLink(target, url, title) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return;
      const a = el("a", title);
      a.href = u.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      target.append(a, el("span", " · "));
    } catch {}
  }
  async function api(path, init = {}) {
    const r = await fetch(BASE + path, { credentials:"same-origin", ...init });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || data.message || "Erro HTTP " + r.status);
    return data;
  }
  const jsonBody = data => ({ method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(data) });

  function renderLeads() {
    const host = $("flow-radar-leads"); if (!host) return;
    host.replaceChildren();
    const chosen = $("flow-radar-category")?.value || "";
    const items = leads.filter(x => !chosen || x.category === chosen);
    if (!items.length) {
      host.append(el("p", leads.length ? "Nenhuma oportunidade nesta categoria." : "Nenhum lead de intenção registrado. A lista vazia não significa que a busca automática esteja ativa."));
      return;
    }
    for (const row of items) {
      const card = el("article", null, "radar-item");
      card.style.cssText = "border-top:1px solid #d4deea;padding:14px 0";
      card.append(el("h3", (row.business || "Oportunidade") + " · " + (row.instagram ? "@" + row.instagram : "") + " · " + Number(row.score || 0) + "/95"));
      card.append(el("p", (names[row.category] || row.category) + " · " + row.reason + " · " + row.status));
      if (row.website_opportunity?.label && row.category==="site") card.append(el("p", "Diagnóstico de site: " + row.website_opportunity.label));
      card.append(el("p", "Evidência: " + (row.evidence || "")));
      const links = el("p");
      appendLink(links, row.evidence_url, "Ver evidência");
      if (row.instagram) appendLink(links, "https://www.instagram.com/" + encodeURIComponent(row.instagram) + "/", "Instagram");
      if (row.website) appendLink(links, row.website, "Site da empresa");
      if (row.whatsapp_link) appendLink(links, row.whatsapp_link, "Abrir WhatsApp (sem enviar)");
      card.append(links);
      const select = el("select");
      select.setAttribute("aria-label", "Etapa do lead");
      for (const stage of statusNames) {
        const option = el("option", stage.replace(/_/g," "));
        option.value = stage;
        option.selected = row.status === stage;
        select.append(option);
      }
      const save = el("button", "Atualizar etapa", "ghost");
      save.type = "button";
      save.onclick = async () => {
        save.disabled = true;
        try {
          await api("/leads/" + encodeURIComponent(row.id), { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({ status:select.value }) });
          await refreshLeads();
        } catch (error) { alert(error.message); }
        finally { save.disabled = false; }
      };
      card.append(select, save);
      host.append(card);
    }
  }
  async function refreshLeads() {
    const data = await api("/leads");
    leads = Array.isArray(data.leads) ? data.leads : [];
    renderLeads();
    const target = $("flow-radar-count");
    if (target) target.textContent = leads.length + " oportunidade(s) registradas; " + leads.filter(x=>x.status==="aprovado").length + " aprovada(s) para contato manual.";
  }
  async function refreshStatus() {
    const d = await api("/status");
    const target = $("flow-radar-status");
    if (target) target.textContent = (d.instagramInspectionReady
      ? "Meta conectada para inspeção de perfis profissionais. "
      : "A inspeção oficial de perfis depende da conexão Facebook Radar no Master. ") +
      (d.feedConfigured
        ? "Fonte de oportunidades autorizada ativa para busca periódica."
        : "Sem fonte autorizada para coletar intenções de clientes em comentários de terceiros. Não é possível varrer esses comentários pela API oficial.");
    const button = $("flow-radar-discover");
    if (button) { button.disabled = !d.feedConfigured; button.title = d.feedConfigured ? "" : "Configure uma fonte autorizada para ativar esta busca."; }
  }
  async function refreshCompetitors() {
    const host = $("flow-radar-competitors"); if (!host) return;
    const data = await api("/competitors");
    host.replaceChildren();
    const rows = Array.isArray(data.competitors) ? data.competitors : [];
    if (!rows.length) { host.append(el("p", "Nenhuma referência cadastrada.")); return; }
    for (const x of rows) {
      const line = el("p");
      appendLink(line, "https://www.instagram.com/" + encodeURIComponent(x.instagram) + "/", "@" + x.instagram);
      line.append(el("span", names[x.category] || x.category));
      host.append(line);
    }
  }
  async function load() {
    if (busy) return;
    busy = true;
    try {
      await Promise.all([refreshStatus(), refreshLeads(), refreshCompetitors(), refreshOwnLeads().catch(() => null)]);
      loaded = true;
    } catch (e) {
      const target = $("flow-radar-status");
      if (target) target.textContent = "Não foi possível consultar o Radar: " + e.message + ". Isso não confirma ausência de leads.";
    } finally { busy = false; }
  }
  function showProfile(profile) {
    const host=$("flow-radar-profile-results"); if(!host) return;
    host.replaceChildren();
    host.append(el("h3", (profile.name || "Perfil profissional") + " · @" + profile.username));
    host.append(el("p", "Biografia: " + (profile.biography || "Não informada")));
    host.append(el("p", profile.assessment?.label || "Site não avaliado"));
    const links=el("p");
    appendLink(links,profile.profileUrl,"Abrir perfil");
    if(profile.website) appendLink(links,profile.website,"Abrir site informado");
    host.append(links);
    if(profile.assessment?.signal==="website_not_declared") {
      host.append(el("p", "É uma pista para prospecção, não um pedido de contratação."));
      const save=el("button","Registrar para revisão","ghost");
      save.type="button";
      save.onclick=async()=>{
        save.disabled=true;
        try {
          const d=await api("/profile-check",jsonBody({instagram:profile.username,save:true}));
          host.append(el("p", d.saved?"Perfil registrado como oportunidade. Revise antes de contatar.":"Esse perfil já estava registrado ou precisa de revisão."));
          await refreshLeads();
        }catch(e){host.append(el("p","Falha ao salvar: "+e.message));}
        finally{save.disabled=false;}
      };
      host.append(save);
    } else {
      host.append(el("p","Não foi detectada ausência de site no campo público. A qualidade do site não foi auditada."));
    }
  }
  async function inspectProfile(event) {
    event.preventDefault();
    const form=event.currentTarget,host=$("flow-radar-profile-results"),button=$("flow-radar-profile-button");
    if(!host||!button)return;
    const username=String(new FormData(form).get("instagram")||"").trim();
    button.disabled=true;
    host.replaceChildren(el("p","Consultando dados públicos oficiais da Meta…"));
    try {
      const d=await api("/profile-check",jsonBody({instagram:username}));
      showProfile(d);
    }catch(e){
      const labels={
        facebook_radar_not_connected:"A conta profissional da Flow Arts ainda precisa estar conectada ao Facebook Radar do Master.",
        facebook_radar_token_expired:"A conexão da Meta expirou; é necessário reconectar no Master.",
        profile_not_accessible:"A Meta não disponibilizou esse perfil. A consulta oficial é restrita a contas profissionais.",
        meta_business_discovery_unavailable:"A Meta recusou a consulta ou a permissão do app ainda não permite acessar esse perfil."
      };
      const msg=String(e.message||"");
      host.replaceChildren(el("p",labels[msg]||("Não foi possível verificar esse perfil: "+msg)));
    }finally{button.disabled=false;}
  }
  async function portalApi(path,options={}) {
    const r=await fetch("/api/portal/"+path,{credentials:"same-origin",...options});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.ok===false)throw new Error(d.message||d.error||"Operação indisponível");
    return d;
  }
  async function refreshOwnLeads() {
    const status=$("flow-radar-own-status"),host=$("flow-radar-own-leads");
    if(!host||!status)return;
    try {
      const [data,run]=await Promise.all([portalApi("leads"),portalApi("lead-hunter")]);
      const entries=Array.isArray(data.leads)?data.leads:[];
      const strong=entries.filter(x=>Number(x.score||0)>=68);
      const active=Boolean(run.config?.enabled&&run.config?.autoRun&&run.config?.metaComments);
      status.textContent="Varredura de comentários próprios: "+(active?"automática ligada":"automática desligada")+
        " · Leads ativos: "+entries.length+" · Sinais fortes: "+strong.length+
        (run.summary?.lastRunAt?" · Última busca: "+String(run.summary.lastRunAt).slice(0,16).replace("T"," "):"");
      host.replaceChildren();
      if(!strong.length) {
        host.append(el("p","Nenhum pedido específico com alta pontuação registrado nos comentários próprios."));
      } else {
        for(const lead of strong.slice(0,15)) {
          const card=el("article");card.style.cssText="border-top:1px solid #d4deea;padding:10px 0";
          card.append(el("strong","@"+(lead.instagramUsername||"perfil")+" · "+Number(lead.score||0)+"/100"));
          card.append(el("p",lead.lastMessage||lead.intent||"Interação"));
          const links=el("p");
          if(lead.sourceUrl)appendLink(links,lead.sourceUrl,"Ver comentário");
          if(lead.instagramUsername)appendLink(links,"https://www.instagram.com/"+encodeURIComponent(lead.instagramUsername)+"/","Instagram");
          card.append(links);host.append(card);
        }
      }
      const autoBtn=$("flow-radar-own-enable");
      if(autoBtn) {autoBtn.disabled=active;autoBtn.textContent=active?"Varredura automática ativa":"Ativar varredura automática";}
    }catch(e){status.textContent="Não foi possível consultar comentários próprios: "+e.message;}
  }
  async function scanOwnComments(event) {
    const btn=event.currentTarget,desc=$("flow-radar-own-status");
    btn.disabled=true;if(desc)desc.textContent="Consultando comentários pela Meta…";
    try {
      const d=await portalApi("lead-hunter/run",jsonBody({}));
      const errors=d.run?.errors||[];
      if(desc)desc.textContent=(d.run?"Comentários analisados: "+Number(d.run.analyzed||0)+" · Novos leads: "+Number(d.run.newLeads||0)+". ":"")
        +(errors.length?"Avisos: "+errors.join("; ").slice(0,230):"");
      await refreshOwnLeads();
    }catch(e){if(desc)desc.textContent="Não foi possível fazer a varredura: "+e.message;}
    finally{btn.disabled=false;}
  }
  async function enableOwnScanner(event) {
    const btn=event.currentTarget,desc=$("flow-radar-own-status");
    btn.disabled=true;
    try {
      await portalApi("lead-hunter/config",jsonBody({enabled:true,autoRun:true,metaComments:true,minScore:40}));
      await refreshOwnLeads();
    }catch(e){if(desc)desc.textContent="Não foi possível ativar: "+e.message;btn.disabled=false;}
  }
  // Prospecção real, usando a busca existente de OSM / Google Places do CRM.
  // Resultados são empresas a verificar, não comentários com intenção explícita.
  async function searchBusinesses() {
    const btn = $("flow-radar-map-search"), msg = $("flow-radar-map-status"), host = $("flow-radar-map-results");
    if (!btn || !msg || !host) return;
    btn.disabled = true;
    msg.textContent = "Procurando empresas nas fontes do mapa…";
    host.replaceChildren();
    try {
      const result = await fetch("/api/portal/flow/prospects/search", {
        credentials:"same-origin",
        ...jsonBody({
          calls:1,
          niche:$("flow-radar-map-niche")?.value || "",
          city:$("flow-radar-map-city")?.value?.trim() || ""
        })
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok || data.ok === false) throw new Error(data.message || data.error || "Busca indisponível");
      const items = Array.isArray(data.items) ? data.items : [];
      msg.textContent = "Fonte: " + (data.provider === "osm" ? "OpenStreetMap" : "Google Places") +
        " · Analisadas: " + Number(data.found || 0) + " · Oportunidades nesta busca: " + items.length +
        ". A análise do site é uma indicação baseada no cadastro público, sujeita a confirmação.";
      if (!items.length) { host.append(el("p", "Nenhuma empresa elegível nesta rodada. Altere o segmento ou a cidade.")); return; }
      for (const item of items.slice(0, 20)) {
        const card = el("article");
        card.style.cssText = "border-top:1px solid #d4deea;padding:12px 0";
        card.append(el("h3", item.name || "Empresa"));
        card.append(el("p", (item.city || "") + " · " + (item.niche || "") + " · site próprio não identificado"));
        const links = el("p");
        if (item.maps_url) appendLink(links, item.maps_url, "Conferir mapa");
        if (item.instagram) appendLink(links, "https://www.instagram.com/" + encodeURIComponent(item.instagram) + "/", "Instagram");
        if (item.whatsapp) appendLink(links, item.whatsapp, "Abrir WhatsApp (envio manual)");
        card.append(links);
        host.append(card);
      }
    } catch(e) { msg.textContent = "Busca não concluída: " + e.message + ". Isso não significa que não existam empresas."; }
    finally { btn.disabled = false; }
  }
  function wire() {
    if (!$("tab-radar")) return;
    $("flow-radar-refresh")?.addEventListener("click", load);
    $("flow-radar-map-search")?.addEventListener("click", searchBusinesses);
    $("flow-radar-profile-form")?.addEventListener("submit", inspectProfile);
    $("flow-radar-own-run")?.addEventListener("click", scanOwnComments);
    $("flow-radar-own-enable")?.addEventListener("click", enableOwnScanner);
    $("flow-radar-category")?.addEventListener("change", renderLeads);
    $("flow-radar-crm")?.addEventListener("click", () => {
      const tab = document.querySelector('.tabbar [data-tab="crm"]');
      if (tab) tab.click();
      const fold = $("cacador-fold"); if (fold) { fold.open = true; fold.scrollIntoView({ behavior:"smooth", block:"start" }); }
    });
    $("flow-radar-discover")?.addEventListener("click", async event => {
      const btn = event.currentTarget, msg = $("flow-radar-result");
      btn.disabled = true;
      if (msg) msg.textContent = "Consultando fonte autorizada…";
      try {
        const out = await api("/discover", jsonBody({}));
        if (msg) msg.textContent = out.skipped
          ? "Nenhuma fonte autorizada configurada. Use o Caçador de empresas do CRM."
          : "Verificados: " + Number(out.scanned||0) + " · Novos: " + Number(out.inserted||0) + " · Repetidos: " + Number(out.duplicates||0) + " · Rejeitados: " + Number(out.rejected||0);
        await refreshLeads();
      } catch(e) { if (msg) msg.textContent = "Busca falhou: " + e.message; }
      finally { await refreshStatus().catch(() => { btn.disabled = true; }); }
    });
    $("flow-radar-add")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget, msg = $("flow-radar-add-result");
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        const data = await api("/leads", jsonBody(payload));
        if(msg) msg.textContent = "Lead registrado. Pontuação: " + data.qualification.score + ". Contato exige aprovação.";
        form.reset();
        await refreshLeads();
      } catch(e) { if(msg) msg.textContent = "Não foi possível salvar: " + e.message; }
    });
    $("flow-radar-competitor-add")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget, msg = $("flow-radar-competitor-msg");
      try {
        await api("/competitors", jsonBody(Object.fromEntries(new FormData(form).entries())));
        if(msg) msg.textContent = "Referência cadastrada. Não há coleta automática de comentários de terceiros.";
        form.reset();
        await refreshCompetitors();
      } catch(e) { if(msg) msg.textContent = "Não foi possível cadastrar: " + e.message; }
    });
  }
  wire();
  document.addEventListener("nexus:view", e => { if (e.detail === "flow-radar") load(); });
  if (!$("tab-radar")?.hidden && !loaded) load();
})();
