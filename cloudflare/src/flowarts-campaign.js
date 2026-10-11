// Campanha de 30 dias da Flow Arts (@flowarts2026), criada em 2026-10-10.
// Base: auditoria do perfil (docs/nexus-memory/AUDITORIA-FLOW-ARTS.md).
// Conta nova (2 seguidores): o foco é descoberta (Reels), confiança (carrosséis
// úteis) e só depois conversão ("Comente EXEMPLO").
//
// Estrutura: 2 posts por dia, 60 peças no mês.
//   Semana 1 — Apresentação: quem é a Flow Arts e o que ela faz.
//   Semana 2 — Educação: dicas práticas de marketing e IA.
//   Semana 3 — Prova: exemplos, antes/depois descritos, bastidores.
//   Semana 4 — Conversão: automação 24h, exemplo grátis, oferta.
//   Dias 29–30 — Resumo e chamada final.

const CTA = {
  "comentário": "Responda nos comentários.",
  "salvamento": "Salve para usar depois.",
  "compartilhamento": "Envie para um empreendedor que precisa ver isso.",
  "seguir": "Siga a Flow Arts para mais dicas de marketing com IA.",
  "conversão": 'Comente "EXEMPLO" e receba um exemplo grátis para o seu negócio.'
};

// [formato, tema/gancho, ângulo, objetivo]
const DAYS = [
  // Semana 1 — Apresentação
  ["reel", "Uma agência de marketing que trabalha 24h por você", "apresentação da Flow Arts", "seguir"],
  ["carousel", "O que a Flow Arts faz pelo seu negócio", "serviços: marketing, automação, sites, fotos e vídeos", "salvamento"],
  ["reel", "Seu Instagram pode estar afastando clientes", "diagnóstico rápido de perfil", "comentário"],
  ["post", "Por que usamos IA a favor do pequeno negócio", "transparência sobre IA", "comentário"],
  ["reel", "Foto amadora x foto profissional feita com IA", "contraste antes/depois descrito", "compartilhamento"],
  ["carousel", "5 sinais de que o seu perfil precisa de ajuda", "checklist de perfil comercial", "salvamento"],
  ["reel", "Quanto tempo você perde criando posts?", "dor do empreendedor sem tempo", "comentário"],
  ["post", "Conheça a Marina, a cara da Flow Arts", "persona criada com IA, com transparência", "seguir"],
  ["reel", "Automação de Instagram: o que é e como funciona", "explicação simples", "salvamento"],
  ["carousel", "Bio do Instagram que traz clientes: passo a passo", "tutorial de bio", "salvamento"],
  ["reel", "Seu concorrente já está usando IA", "urgência leve", "compartilhamento"],
  ["post", "Atendemos negócios do Rio de Janeiro e região", "negócio local", "seguir"],
  ["reel", "3 erros de marketing que custam clientes", "erros comuns", "compartilhamento"],
  ["carousel", "Peça seu exemplo grátis: como funciona", "processo do exemplo grátis", "conversão"],
  // Semana 2 — Educação
  ["reel", "Ideia de Reels para comércio local", "dica prática de conteúdo", "salvamento"],
  ["carousel", "Calendário de postagens sem complicação", "rotina semanal de posts", "salvamento"],
  ["reel", "Legenda que gera comentários: o segredo", "copywriting simples", "salvamento"],
  ["post", "Qual a maior dificuldade do seu Instagram hoje?", "pergunta para a audiência", "comentário"],
  ["reel", "Como os Stories ajudam a vender", "Stories para vendas", "salvamento"],
  ["carousel", "Métricas do Instagram que realmente importam", "métricas para iniciantes", "salvamento"],
  ["reel", "Identidade visual que passa confiança", "cores, fontes e consistência", "compartilhamento"],
  ["carousel", "Tráfego pago para iniciantes: por onde começar", "anúncios com pouco dinheiro", "salvamento"],
  ["reel", "Hashtags locais: como ser encontrado no Rio", "alcance local", "salvamento"],
  ["post", "Você já pensou em ter um site simples?", "site para pequeno negócio", "comentário"],
  ["reel", "Como a IA deixa o marketing mais barato", "economia com IA", "compartilhamento"],
  ["carousel", "Como transformar seguidores em clientes", "funil simples", "salvamento"],
  ["reel", "Responder rápido vende mais: automação de mensagens", "atendimento automático", "comentário"],
  ["post", "Dica da semana: poste com constância", "constância", "seguir"],
  // Semana 3 — Prova
  ["reel", "Fotos de produto feitas com IA, sem estúdio", "demonstração de foto de produto", "compartilhamento"],
  ["carousel", "Antes e depois: perfil de uma loja de bairro", "transformação de perfil (exemplo ilustrativo)", "salvamento"],
  ["reel", "Bastidores: como os agentes criam um post", "bastidores da automação", "comentário"],
  ["post", "Exemplo: post criado para um salão de beleza", "exemplo de trabalho (ilustrativo)", "comentário"],
  ["reel", "Vídeo curto com IA para divulgar o seu negócio", "demonstração de vídeo", "compartilhamento"],
  ["carousel", "Site simples em 4 passos", "processo de criação de site", "salvamento"],
  ["reel", "Um dia de Instagram no automático", "rotina automatizada", "seguir"],
  ["carousel", "Exemplo: campanha para uma lanchonete", "exemplo de campanha (ilustrativo)", "salvamento"],
  ["reel", "O que muda quando o perfil fica profissional", "resultado esperado sem promessa absoluta", "compartilhamento"],
  ["post", "Qual negócio você quer ver transformado aqui?", "enquete de nicho", "comentário"],
  ["reel", "Foto, vídeo e site no mesmo estilo da sua marca", "consistência de marca", "salvamento"],
  ["carousel", "Checklist antes de postar", "checklist de qualidade", "salvamento"],
  ["reel", "Perguntas que todo cliente faz antes de contratar", "objeções comuns", "comentário"],
  ["post", "Transparência: o que a IA faz e o que a gente revisa", "confiança e revisão humana", "seguir"],
  // Semana 4 — Conversão
  ["reel", "E se o seu Instagram trabalhasse sozinho 24h?", "automação 24h", "conversão"],
  ["carousel", "Automação de Instagram: o que está incluído", "escopo do serviço", "conversão"],
  ["reel", "Você não precisa de uma equipe grande para crescer", "dor de custo", "compartilhamento"],
  ["post", "Peça seu exemplo grátis hoje", "oferta direta", "conversão"],
  ["reel", "Como funciona: do pedido ao primeiro post", "processo de contratação", "salvamento"],
  ["carousel", "Marketing com IA x agência tradicional", "comparação honesta", "salvamento"],
  ["reel", "Para quem é a Flow Arts", "público ideal", "seguir"],
  ["carousel", "3 pacotes para começar", "pacotes de serviço sem preço inventado", "conversão"],
  ["reel", "O melhor momento para começar é agora", "urgência leve sem promessa", "conversão"],
  ["post", "Perguntas frequentes sobre automação", "FAQ", "comentário"],
  ["reel", "Seu negócio merece aparecer", "motivacional", "compartilhamento"],
  ["carousel", "Passo a passo para pedir seu exemplo grátis", "instruções de conversão", "conversão"],
  ["reel", "Marketing simples para quem não tem tempo", "praticidade", "conversão"],
  ["post", "Vagas para exemplos grátis desta semana", "escassez honesta", "conversão"],
  // Dias 29–30 — Resumo
  ["reel", "O que você aprendeu este mês", "resumo da campanha", "salvamento"],
  ["carousel", "Resumo: 10 dicas de marketing com IA", "compilado", "salvamento"],
  ["reel", "Obrigado por chegar até aqui", "agradecimento e convite", "seguir"],
  ["post", "Comece agora: comente EXEMPLO", "chamada final", "conversão"]
];

const VISUAL_BY_FORMAT = {
  reel: "Vertical 9:16 hero image for a 10-second Reel with a subtle zoom: one strong focal subject, immediate visual hook, clean area at top and bottom for overlay text.",
  carousel: "Portrait 4:5 card of a coherent 4-card educational carousel, clean negative space for the card title.",
  post: "Portrait 4:5 single image with one clear idea, premium and minimal."
};

// Cenas que se revezam, para os posts não repetirem a mesma imagem.
// A Marina (persona) aparece só em parte delas.
const SCENES = [
  "close-up of a small business product beautifully photographed on a clean counter (coffee, pastry, cosmetics or clothing), no people",
  "a hand holding a phone that clearly shows an Instagram profile feed full of bright, appetizing photos of a local café's coffee and cakes",
  "a modern small storefront in Rio de Janeiro at golden hour, inviting entrance with real products in the window",
  "top view of a work desk: a laptop showing a social media analytics dashboard with real-looking line charts, bar charts and photo thumbnails, a smartphone showing a photo feed, printed product photos, a camera and a cup of coffee, no people",
  "the owner of a small café or salon smiling while checking a phone behind the counter, real products around, candid natural light",
  "Marina, a friendly professional woman with curly dark hair in a navy blazer, showing a tablet with a colorful Instagram feed of a client's products to a small business owner",
  "before-and-after of the same product: on the left a dull, dark amateur phone photo, on the right a bright professional photo of it, side by side on a table",
  "a café owner holding a phone with a chat full of new customer messages, happy customers at tables in the background"
];

function campaignDayIndex(date = new Date()) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return ((local.getDate() - 1) % 30 + 30) % 30;
}

// reelsEnabled=false enquanto o render de Reels não tiver token do GitHub:
// o Reel vira post de imagem, mantendo tema e gancho (nunca fica travado).
export function flowArtsCampaignForDay(date = new Date(), options = {}) {
  const reelsEnabled = options.reelsEnabled !== false;
  const dayIndex = campaignDayIndex(date);
  return [DAYS[dayIndex * 2], DAYS[dayIndex * 2 + 1]].map((row, index) => {
    const format = row[0] === "reel" && !reelsEnabled ? "post" : row[0];
    return {
      format,
      plannedFormat: row[0],
      theme: row[1],
      hook: row[1],
      angle: row[2],
      goal: row[3],
      campaignDay: dayIndex + 1,
      campaignWeek: Math.min(4, Math.floor(dayIndex / 7) + 1),
      storytelling: row[0] !== "post",
      storyStructure: ["gancho", "problema", "dica ou virada", "CTA"],
      targetSegment: "pequenos negócios e empreendedores do Rio de Janeiro",
      conversionBridge: row[3] === "conversão"
        ? "Levar o interesse para o comentário EXEMPLO e depois para a conversa no WhatsApp."
        : "Gerar confiança e interação primeiro; oferta só nas peças de conversão.",
      language: "pt-BR simples e direto; frases curtas; transparente sobre o uso de IA",
      cta: CTA[row[3]] || CTA["comentário"],
      visualBrief: VISUAL_BY_FORMAT[format] + " Scene: " + SCENES[(dayIndex * 2 + index) % SCENES.length] + ". Theme: " + row[1] + ". Angle: " + row[2] + ". Use Flow Arts colors (deep navy, electric blue, silver). No text, no logos of other companies, no copyrighted references.",
      variationKey: "flowarts-" + (dayIndex + 1) + "-" + index
    };
  });
}

export function flowArtsCampaignStrategy() {
  const counts = DAYS.reduce((acc, row) => { acc[row[0]] = (acc[row[0]] || 0) + 1; return acc; }, {});
  return {
    campaignLengthDays: 30,
    fixedMonthlyFormats: { reel: counts.reel || 0, carousel: counts.carousel || 0, post: counts.post || 0, total: DAYS.length },
    formatSelectionLocked: true,
    dailySlots: 2,
    recommendedPostTimes: ["12:00", "19:00"],
    contentRatio: { educacao: 45, prova: 25, apresentacao: 15, conversao: 15 },
    auditBaseline: { followers: 2, posts: 2, note: "conta nova; sem métricas úteis ainda" },
    funnelDiagnosis: {
      discovery: "inexistente (conta nova)",
      interaction: "sem dados",
      profileToLink: "sem link na bio no momento da auditoria",
      objective: "ganhar os primeiros seguidores locais e gerar pedidos de exemplo grátis"
    },
    formatRoles: {
      reel: "descoberta e alcance para não seguidores",
      carousel: "salvamentos e autoridade",
      post: "interação, apresentação e conversão"
    },
    hooks: DAYS.filter(row => row[0] === "reel").map(row => row[1]),
    priorities: [
      "Conta nova: priorizar Reels de descoberta e hashtags locais do Rio de Janeiro.",
      "Uma ideia por peça; gancho visível no primeiro segundo.",
      "Carrosséis educativos para gerar salvamentos e autoridade.",
      "Ser transparente sobre o uso de IA; nunca inventar clientes, números ou depoimentos.",
      "Exemplos de trabalho devem ser apresentados como ilustrativos até existirem clientes reais.",
      "CTA EXEMPLO só nas peças de conversão; nas demais, comentário, salvamento ou compartilhamento.",
      "Sem preços inventados: pacotes descritos sem valores até o proprietário definir."
    ]
  };
}

export const FLOW_ARTS_CAMPAIGN_DAYS = DAYS;

export const CAMPAIGN_CLIENTS = new Set(["primeiro-teste"]);

const GOAL_LABEL = {
  "comentário": "gerar comentários",
  "salvamento": "gerar salvamentos",
  "compartilhamento": "gerar compartilhamentos",
  "seguir": "ganhar seguidores",
  "conversão": "pedir o exemplo grátis"
};

// Plano do mês para o calendário do painel. month = "AAAA-MM" (padrão: mês atual em São Paulo).
// Mostra o que a campanha planeja para cada dia; os posts reais vêm de /api/portal/posts.
export function campaignCalendar(clientId, month, now = new Date()) {
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(now).slice(0, 7);
  const target = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || "")) ? String(month) : current;
  if (!CAMPAIGN_CLIENTS.has(String(clientId))) return { month: target, campaign: false, days: [] };
  const [year, mon] = target.split("-").map(Number);
  const total = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const strategy = flowArtsCampaignStrategy();
  const days = [];
  for (let day = 1; day <= total; day += 1) {
    const date = new Date(Date.UTC(year, mon - 1, day, 15));
    const items = flowArtsCampaignForDay(date).map((item, index) => ({
      time: strategy.recommendedPostTimes[index] || "",
      format: item.plannedFormat,
      theme: item.theme,
      goal: GOAL_LABEL[item.goal] || item.goal,
      week: item.campaignWeek,
      campaignDay: item.campaignDay
    }));
    days.push({ date: target + "-" + String(day).padStart(2, "0"), items });
  }
  return { month: target, campaign: true, days };
}
