const HOOKS = [
  "Você está assistindo errado e nem percebeu.",
  "O problema não é falta de conteúdo.",
  "Quase ninguém percebe isso antes de travar.",
  "Você pagaria por isso depois de ver isso?",
  "Tem um erro que estraga qualquer noite.",
  "Filme bom não salva uma experiência ruim.",
  "A parte mais irritante acontece antes do play.",
  "Todo mundo reclama disso, mas aceita mesmo assim.",
  "Se isso acontece com você, veja até o fim.",
  "O que parece vantagem pode estar te atrapalhando."
];

export const GLOBAL_PLAY_AUDIT_BASELINE = {
  views: 1342,
  followersViewShare: 43.4,
  nonFollowersViewShare: 56.6,
  viewers: 320,
  interactions: 76,
  followersInteractionShare: 85.5,
  nonFollowersInteractionShare: 14.5,
  engagedAccounts: 15,
  profileActivity: 146,
  profileVisits: 140,
  externalLinkTaps: 6,
  contentShare: { reels: 63.9, posts: 23.0, stories: 13.2 },
  interactionShare: { reels: 50.0, posts: 44.7, stories: 5.3 },
  mondayActiveHours: { "00:00":7, "03:00":21, "06:00":22, "09:00":23, "12:00":23, "15:00":20, "18:00":12, "21:00":4 }
};

function auditCategory(goal, angle) {
  if (goal === "conversão") return "offer";
  if (/dor|trav|problema|suporte|complic|busca|difícil/i.test(String(angle || ""))) return "painSolution";
  return "entertainmentEngagement";
}

const DAYS = [
  ["reel","Você chega em casa e perde 20 minutos escolhendo?","indecisão para escolher o que assistir","comentário"],
  ["carousel","5 coisas que estragam sua noite de filme","dor + solução","salvamento"],
  ["reel","Vai travar justo na melhor parte?","travamento em momento decisivo","compartilhamento"],
  ["post","Você chega cansado em casa. Só quer apertar play.","storytelling de rotina","conversão"],
  ["reel","Filme ou série hoje?","escolha rápida","comentário"],
  ["carousel","3 tipos de pessoa na hora de escolher algo","identificação","compartilhamento"],
  ["reel","90 minutos de jogo. Aí acontece isso...","futebol + tensão","compartilhamento"],
  ["carousel","Qual foi o pior momento que sua transmissão já travou?","pergunta emocional em sequência","comentário"],
  ["reel","Você também abre 5 aplicativos e não acha nada?","humor + identificação","compartilhamento"],
  ["carousel","Como escolher o que assistir em menos de 1 minuto","utilidade","salvamento"],
  ["reel","Uma tela. Quatro opiniões.","família + conflito leve","compartilhamento"],
  ["post","Sábado à noite, cada um queria assistir uma coisa...","storytelling familiar","conversão"],
  ["reel","Domingo pede o quê?","filme, série ou futebol","comentário"],
  ["carousel","Escolha seu domingo","escolha por humor","salvamento"],
  ["reel","Se você faz isso todo dia, está perdendo tempo.","busca demorada","compartilhamento"],
  ["post","O problema não é falta de conteúdo. É dificuldade para encontrar.","contraste","conversão"],
  ["reel","A pior hora para descobrir que algo não funciona...","suspense","compartilhamento"],
  ["carousel","4 sinais de que você precisa simplificar seu entretenimento","diagnóstico","salvamento"],
  ["reel","Qual desses define você?","tipos de espectador","comentário"],
  ["post","Ele só queria assistir depois do trabalho...","storytelling emocional","conversão"],
  ["reel","Você é do time que escolhe rápido ou demora uma eternidade?","contraste","comentário"],
  ["carousel","Teste rápido: qual tipo de espectador você é?","identidade","salvamento"],
  ["reel","Imagina perder o lance por causa disso...","futebol + tensão","compartilhamento"],
  ["post","Qual campeonato você mais acompanha?","pergunta simples","comentário"],
  ["reel","3 segundos para escolher: ação, terror ou comédia?","escolha rápida","comentário"],
  ["carousel","O que assistir de acordo com seu humor","utilidade","salvamento"],
  ["reel","Sextou. Você quer sair ou apertar play?","contraste","compartilhamento"],
  ["post","Casal cancela o rolê e faz cinema em casa.","storytelling","conversão"],
  ["reel","Você paga para assistir ou para procurar?","polêmica leve","compartilhamento"],
  ["carousel","O que uma boa experiência precisa ter?","valor percebido","salvamento"],
  ["reel","Quando todo mundo quer assistir ao mesmo tempo...","humor familiar","compartilhamento"],
  ["carousel","Na sua casa, quem manda no controle?","identificação familiar em sequência","comentário"],
  ["reel","O gol saiu. Você viu ou ficou carregando?","futebol + dor","compartilhamento"],
  ["carousel","5 momentos em que ninguém aceita travamento","dor + lista","salvamento"],
  ["reel","Você lembra quando assistir era só apertar play?","nostalgia","compartilhamento"],
  ["post","Antes eu gastava mais tempo procurando do que assistindo.","storytelling","conversão"],
  ["reel","Hoje você só pode escolher UM.","escolha: filme, série ou futebol","comentário"],
  ["carousel","Faça seu ranking de entretenimento","ranking","compartilhamento"],
  ["reel","O que acontece antes de você apertar play?","bastidores da experiência","curiosidade"],
  ["post","Nosso trabalho é tirar complicação do seu caminho.","posicionamento","conversão"],
  ["reel","Maratonar ou dormir cedo? Sabemos a resposta.","humor","compartilhamento"],
  ["carousel","Manual do maratonista","lista útil","salvamento"],
  ["reel","A pessoa falou: só mais um episódio...","humor + identificação","compartilhamento"],
  ["carousel","Quando você percebeu, já era madrugada.","storytelling progressivo","comentário"],
  ["reel","Qual capa você clicaria primeiro?","curiosidade visual","comentário"],
  ["carousel","O que faz você escolher um filme?","preferências","salvamento"],
  ["reel","Quando o suporte responde só depois que o jogo acabou...","humor + dor","compartilhamento"],
  ["post","Bom atendimento só é percebido quando você precisa.","confiança","conversão"],
  ["reel","Seu entretenimento deveria caber nisso aqui.","praticidade","curiosidade"],
  ["carousel","Quando você mais assiste?","rotina","salvamento"],
  ["reel","Você conhece alguém que nunca sabe o que assistir?","identificação","compartilhamento"],
  ["post","Todo dia ele pedia uma recomendação diferente...","storytelling","conversão"],
  ["reel","Quando começa a melhor cena e alguém chama...","humor","compartilhamento"],
  ["carousel","7 desculpas para dizer: só depois desse episódio","humor","salvamento"],
  ["reel","O que vale mais: quantidade ou facilidade para assistir?","contraste","comentário"],
  ["post","Ter muito não adianta se encontrar é difícil.","posicionamento","conversão"],
  ["reel","Se você pudesse melhorar UMA coisa quando assiste, qual seria?","pesquisa","comentário"],
  ["carousel","Menos travamento, mais variedade, busca fácil ou suporte?","pesquisa visual","salvamento"],
  ["reel","30 dias depois, descobrimos uma coisa...","recap + curiosidade","compartilhamento"],
  ["post","Por que assistir precisa ser complicado?","storytelling + oferta","conversão"]
];

export function globalPlayCampaignForDay(date = new Date()) {
  const local = new Date(date.toLocaleString("en-US",{timeZone:"America/Sao_Paulo"}));
  const dayIndex = ((local.getDate()-1) % 30 + 30) % 30;
  const first=DAYS[dayIndex*2], second=DAYS[dayIndex*2+1];
  return [first,second].map((row,index)=>({
    format:row[0],
    theme:row[1],
    hook:index===0 ? row[1] : HOOKS[(dayIndex+index)%HOOKS.length],
    angle:row[2],
    goal:row[3],
    auditCategory:auditCategory(row[3], row[2]),
    storytelling:true,
    storyStructure:["situação","emoção","problema","virada","CTA"],
    targetSegment:"não seguidores + seguidores com intenção de interação",
    conversionBridge:row[3]==="conversão"
      ? "Levar da identificação para o comentário QUERO e depois para o perfil/link."
      : "Gerar interação primeiro; oferta só depois do interesse.",
    language:"pt-BR simples, emocional e direta; frases curtas; sem enrolação",
    cta: row[3]==="conversão" ? 'Digite "QUERO".' : row[3]==="salvamento" ? "Salve para ver depois." : row[3]==="compartilhamento" ? "Envie para alguém que vai se identificar." : "Responda nos comentários.",
    visualBrief:"Criativo vertical limpo, uma ideia por peça, hook visível imediatamente, marca depois da mensagem. Priorizar identificação, curiosidade e emoção; evitar cara de propaganda, excesso de texto, tabela de preços e promessas absolutas."
  }));
}

export function ragnarCampaignForDay(date = new Date()) {
  return globalPlayCampaignForDay(date).map((item,index)=>({
    ...item,
    brandVariant:"ragnar",
    visualBrief:item.visualBrief+" Para Ragnar One, variar paleta, enquadramento, roupa, props e detalhes do ambiente em relação à Global Play; manter a mesma ideia-base, mas nunca gerar imagem idêntica. Preferir contraste um pouco mais forte e atmosfera contemporânea própria, sem tema viking/nórdico.",
    variationKey:"ragnar-"+date.toISOString().slice(0,10)+"-"+index
  }));
}

export function globalPlayCampaignStrategy() {
  return {
    campaignLengthDays:30,
    fixedMonthlyFormats:{reel:30,carousel:18,post:12,total:60},
    formatSelectionLocked:true,
    dailySlots:2,
    recommendedPostTimes:["09:00","15:00"],
    contentRatio:{entertainmentEngagement:50,painSolution:30,offer:20},
    auditBaseline:GLOBAL_PLAY_AUDIT_BASELINE,
    funnelDiagnosis:{
      discovery:"forte entre não seguidores",
      interaction:"baixa entre não seguidores",
      profileToLink:"gargalo",
      objective:"converter alcance em compartilhamentos, salvamentos, comentários QUERO e visitas qualificadas ao perfil/link"
    },
    formatRoles:{
      reel:"descoberta e alcance",
      carousel:"salvamentos e compartilhamentos",
      post:"interação e conversão"
    },
    hooks:HOOKS,
    priorities:[
      "Reels como intenção criativa de descoberta e alcance; enquanto o publisher for imagem, preservar o hook e nunca rotular a publicação como Reel.",
      "Carrosséis devem usar o pipeline real de múltiplas imagens; cada sequência precisa contar uma história coerente, progressiva e diferente das anteriores.",
      "Priorizar não seguidores: o alcance já é forte, mas a interação desse público precisa subir.",
      "Uma emoção e um problema por peça.",
      "Storytelling: situação, emoção, problema, virada e CTA.",
      "Hook imediatamente visível; marca depois da mensagem principal.",
      "CTA de compartilhamento/salvamento nas peças de engajamento e Digite QUERO nas peças de conversão.",
      "Levar interesse para perfil/link sem poluição visual e sem repetir oferta/tabela de preços.",
      "Não fazer promessas absolutas de estabilidade, catálogo, canais ou disponibilidade."
    ]
  };
}
