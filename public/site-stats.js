// Aba "Site" do painel Master: visitas do flowarts.com.br.
// Lê /api/master/site-stats. Não depende do app.js para não derrubar o painel.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const NAMES = {
    google: "Google", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp",
    direto: "Direto (digitou o endereço ou link sem origem)", "outros buscadores": "Outros buscadores", "outros sites": "Outros sites"
  };
  const PAGES = {
    "/": "Página principal", "/exemplo": "Exemplo grátis", "/demo": "Painel de exemplo",
    "/marketing-para-salao-de-beleza": "Para salão de beleza", "/marketing-para-loja-de-roupas": "Para loja de roupas",
    "/marketing-para-oficina-mecanica": "Para oficina mecânica", "/privacidade": "Privacidade", "/termos": "Termos"
  };
  const pageName = path => PAGES[path] || (/^\/marketing-para-/.test(path) ? "Para " + path.slice(16).replace(/-/g, " ") : path);

  // Comparação com os 30 dias anteriores, em palavras simples.
  function compare(now, before) {
    if (!before) return now ? "primeiro período com dados" : "sem dados antes";
    const pct = Math.round((now - before) / before * 100);
    return pct === 0 ? "igual aos 30 dias anteriores" : (pct > 0 ? "+" : "") + pct + "% contra os 30 dias anteriores";
  }

  // Diagnóstico curto, só com o que os números mostram.
  function diagnosis(r, sources) {
    const outside = sources.filter(s => s.source !== "direto").reduce((t, s) => t + s.visits, 0);
    const notes = [];
    if (r.entries < 100) notes.push("Pouca gente chegando: menos de 100 entradas em 30 dias.");
    if (r.entries && outside / r.entries < 0.3) notes.push("Quase todas as entradas são diretas (link sem origem), que podem ser você mesmo testando. Google e Instagram ainda trazem pouca gente.");
    if (r.entries >= 30 && !r.whatsapp && !r.leads) notes.push("Ninguém clicou no WhatsApp nem pediu o exemplo grátis ainda.");
    if (r.whatsapp + r.leads > 0) notes.push(`${r.whatsapp + r.leads} contato(s) vieram do site. Responda rápido no WhatsApp.`);
    return notes.join(" ") || "Sem alertas.";
  }
  const dayLabel = day => {
    const [y, m, d] = String(day).split("-");
    return d && m ? `${d}/${m}` : day;
  };

  function bars(list, label, value) {
    const max = Math.max(1, ...list.map(value));
    return list.map(item => {
      const n = value(item);
      return `<div class="site-row"><span>${esc(label(item))}</span><div class="bar"><i style="width:${Math.max(2, Math.round(n / max * 100))}%"></i></div><b>${n}</b></div>`;
    }).join("");
  }

  function fillDays(byDay, days) {
    const map = new Map(byDay.map(row => [row.day, row.visits]));
    const out = [];
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
    for (let i = days - 1; i >= 0; i--) {
      const day = fmt.format(new Date(Date.now() - i * 86400000));
      out.push({ day, visits: map.get(day) || 0 });
    }
    return out;
  }

  async function load() {
    const kpis = $("#site-kpis");
    if (!kpis) return;
    try {
      const response = await fetch("/api/master/site-stats?days=30", { credentials: "same-origin" });
      if (!response.ok) throw new Error(response.status === 401 ? "Login do painel não aceito. Recarregue a página." : "Erro " + response.status);
      const raw = await response.json();
      const data = { totals: { today: 0, week: 0, period: 0, ...(raw.totals || {}) }, byDay: raw.byDay || [], pages: raw.pages || [], sources: raw.sources || [] };
      const r = { entries: 0, entriesBefore: 0, whatsapp: 0, whatsappWeek: 0, leads: 0, rate: 0, ...(raw.results || {}) };
      const results = $("#site-results");
      if (results) {
        results.innerHTML = [
          ["Pessoas que entraram", r.entries, compare(r.entries, r.entriesBefore)],
          ["Cliques no WhatsApp", r.whatsapp, r.whatsappWeek + " nos últimos 7 dias"],
          ["Pedidos de exemplo grátis", r.leads, "formulário do site"],
          ["Viraram contato", r.rate + "%", "cliques + pedidos ÷ entradas"]
        ].map(([title, n, note]) => `<article><span>${title}</span><strong>${esc(n)}</strong><small>${esc(note)}</small></article>`).join("");
        $("#site-diagnosis").textContent = diagnosis(r, data.sources);
      }
      kpis.innerHTML = [
        ["Hoje", data.totals.today], ["Últimos 7 dias", data.totals.week], ["Últimos 30 dias", data.totals.period]
      ].map(([title, n]) => `<article><span>${title}</span><strong>${Number(n || 0)}</strong><small>páginas vistas</small></article>`).join("");

      const days = fillDays(data.byDay || [], 30);
      $("#site-days").innerHTML = data.totals.period
        ? `<div class="site-chart" role="img" aria-label="Páginas vistas por dia nos últimos 30 dias">${days.map(row => {
            const max = Math.max(1, ...days.map(d => d.visits));
            return `<div class="site-col" title="${dayLabel(row.day)}: ${row.visits}"><i style="height:${Math.round(row.visits / max * 100)}%"></i><small>${dayLabel(row.day)}</small></div>`;
          }).join("")}</div>`
        : '<p class="muted">Ainda não há visitas registradas. O contador começa a contar a partir de agora.</p>';

      $("#site-sources").innerHTML = (data.sources || []).length
        ? bars(data.sources, row => NAMES[row.source] || row.source, row => row.visits)
        : '<p class="muted">Sem dados ainda.</p>';
      $("#site-pages").innerHTML = (data.pages || []).length
        ? bars(data.pages, row => pageName(row.path), row => row.visits)
        : '<p class="muted">Sem dados ainda.</p>';
    } catch (error) {
      kpis.innerHTML = `<p class="muted">Não consegui ler as visitas. ${esc(error.message)}</p>`;
    }
  }

  document.querySelectorAll('[data-view="site"]').forEach(button => button.addEventListener("click", load));
  if (document.getElementById("site")?.classList.contains("active")) load();
})();
