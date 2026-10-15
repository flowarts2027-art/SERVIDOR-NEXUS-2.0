// Brindes por palavra (passo B, pedido de 15/10): cada palavra comentada abre um conteúdo.
//   QUERO (e as palavras antigas) → guia "10 ideias de post"
//   SITE  → checklist "O site que traz clientes"
//   REELS → "5 roteiros de Reels prontos"
// O resto do funil (seguir, formulário, contato no painel) é o mesmo para todos.

export const DEFAULT_MATERIAL = "guia";

const GUIA = {
  id: "guia",
  keyword: "QUERO",
  pattern: /\b(eu\s+)?quero\b|\bexemplo\b|\binforma[çc][aã]o\b|\binfo\b|\bpre[çc]o\b|\bvalor(es)?\b|\bquanto\s+custa\b|\bcomo\s+funciona\b/i,
  cta: 'Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁',
  topic: /./,
  title: "10 ideias de post que trazem clientes",
  coverTitle: "10 ideias<br>de post",
  coverSub: "que trazem clientes",
  formSub: "O guia que mostra o que postar, com a legenda pronta e um plano de 10 dias para o Instagram do seu negócio.",
  gets: [["10 ideias", "testadas, uma por dia"], ["Legendas prontas", "para copiar e colar"], ["5 minutos", "para montar cada post"]],
  h1: "<em>10 ideias de post</em> que trazem clientes para pequenos negócios",
  sub: "Cada ideia vem com a legenda pronta para copiar. Faça uma por dia: em 10 dias o seu perfil já parece outro.",
  meta: [["10", "ideias"], ["5 min", "por post"], ["R$ 0", "para aplicar"]],
  start: "Começar pela ideia 1",
  section: "Do primeiro post ao décimo",
  blockLabel: "Copiar legenda",
  pdf: "/downloads/guia-10-ideias-flowarts.pdf",
  tip: "Poste no mesmo horário por uma semana e veja nos números qual ideia trouxe mais seguidores. Depois repita a que funcionou. Se quiser que isso rode sozinho, a {brand} faz os posts e você só aprova.",
  bandTitle: "Quer ver isso pronto, com a cara da sua marca?",
  bandText: "A {brand} cria um post de exemplo grátis para o seu negócio. Sem compromisso.",
  bandButton: "Quero o meu exemplo",
  whatsText: "Olá! Baixei o guia de ideias de post da {brand} e quero o meu post de exemplo grátis.",
  leadIntent: "Seguiu o perfil e pegou o guia de ideias",
  items: [
    ["Bastidores de 15 segundos", "Grave algo sendo feito: o café saindo, o corte acontecendo, a embalagem sendo fechada. Gente gosta de ver o processo.", "Ninguém vê essa parte, mas é aqui que o [PRODUTO] fica bom de verdade.\n\nCada [PEDIDO/CLIENTE] passa por isso antes de chegar até você.\n\nQuer um? Chama no direct.", "Reels", "15 s"],
    ["Antes e depois", "Uma foto do problema e outra do resultado. Funciona para salão, reforma, limpeza, roupa e comida.", "Antes 👉 depois.\n\n[O QUE FOI FEITO] em [TEMPO].\n\nQuer esse resultado também? Comente QUERO.", "Carrossel", "2 fotos"],
    ["Pergunta do cliente", "Pegue uma dúvida que você ouve toda semana e responda em um post.", "\"[PERGUNTA QUE VOCÊ MAIS OUVE]?\"\n\nResposta curta: [RESPOSTA EM UMA FRASE].\n\nTem outra dúvida? Comenta aqui que eu respondo.", "Post", "5 min"],
    ["O mais pedido", "Mostre o campeão de vendas e diga por que as pessoas voltam para comprar.", "Esse é o mais pedido da casa: [PRODUTO].\n\nO motivo: [O QUE ELE TEM DE ESPECIAL].\n\nSalve para lembrar na próxima vez.", "Foto", "5 min"],
    ["Quem está por trás", "Apresente você ou alguém da equipe com nome e uma curiosidade. Pessoas compram de pessoas.", "Prazer, eu sou [NOME] 👋\n\nCuido do [NEGÓCIO] há [TEMPO] e o que eu mais gosto é [CURIOSIDADE].\n\nMe conta: há quanto tempo você acompanha a gente?", "Foto", "5 min"],
    ["Prova de cliente", "Print de um elogio (com permissão) ou foto do cliente usando. Uma prova vale mais que dez promessas.", "Recebemos essa mensagem hoje e precisávamos mostrar 🥹\n\nObrigado, [NOME DO CLIENTE]!\n\nQuer ser o próximo? Chama no direct.", "Print", "2 min"],
    ["Erro comum", "\"3 erros que as pessoas cometem ao…\" ensina e mostra que você entende do assunto.", "3 erros que quase todo mundo comete com [ASSUNTO]:\n\n1. [ERRO 1]\n2. [ERRO 2]\n3. [ERRO 3]\n\nSalve para não esquecer.", "Carrossel", "10 min"],
    ["Oferta com prazo", "Uma condição real com data para acabar. Diga o que é, até quando e como pedir.", "Só até [DIA]: [OFERTA].\n\nPara pedir, é só [COMO PEDIR].\n\nDepois disso, volta ao normal.", "Post", "5 min"],
    ["Enquete nos stories", "Duas opções simples. Quem vota já está conversando com você.", "Story com enquete: \"Qual você prefere?\" [OPÇÃO A] ou [OPÇÃO B].\n\nNo dia seguinte, poste o resultado e marque quem votou.", "Stories", "1 min"],
    ["Chamada clara", "Todo post termina com um próximo passo. Escolha um só por post.", "Comente QUERO que eu te mando [O QUE A PESSOA GANHA] no direct.", "Toda legenda", "1 linha"]
  ]
};

const REELS = {
  id: "reels",
  keyword: "REELS",
  pattern: /\breels?\b|\broteiros?\b/i,
  cta: 'Comente "REELS" e receba grátis 5 roteiros de Reels prontos para gravar 🎬',
  topic: /\breels?\b|\bv[ií]deos?\b|\bgrava[rç]/i,
  title: "5 roteiros de Reels prontos para gravar",
  coverTitle: "5 roteiros<br>de Reels",
  coverSub: "para gravar no celular",
  formSub: "Cinco roteiros curtos, cena por cena, com o texto da tela e a legenda. É só gravar com o celular.",
  gets: [["5 roteiros", "cena por cena"], ["Texto da tela", "e legenda prontos"], ["Até 30 s", "cada vídeo"]],
  h1: "<em>5 roteiros de Reels</em> prontos para gravar com o celular",
  sub: "Cada roteiro diz o que filmar em cada cena, o texto que vai na tela e a legenda. Grave um por semana.",
  meta: [["5", "roteiros"], ["10–30 s", "cada"], ["Celular", "basta"]],
  start: "Começar pelo roteiro 1",
  section: "Os 5 roteiros",
  blockLabel: "Copiar roteiro",
  pdf: "",
  tip: "Grave com o celular em pé, perto de uma janela, e segure firme com as duas mãos. Fale como fala com um cliente no balcão. Se quiser que a gente grave e edite por você, a {brand} tem o plano com vídeo.",
  bandTitle: "Prefere receber o Reel pronto?",
  bandText: "A {brand} faz Reels com a cara da sua marca. Você só aprova no celular.",
  bandButton: "Quero ver um exemplo",
  whatsText: "Olá! Baixei os roteiros de Reels da {brand} e quero ver um exemplo para o meu negócio.",
  leadIntent: "Seguiu o perfil e pegou os roteiros de Reels",
  items: [
    ["O processo em 3 cenas", "Mostre como o seu produto ou serviço fica pronto. Três cenas curtas prendem mais que uma longa.", "CENA 1 (3 s): mãos começando o trabalho.\nCENA 2 (5 s): o meio do processo, bem de perto.\nCENA 3 (4 s): o resultado pronto, parado.\n\nTEXTO NA TELA: \"Como o [PRODUTO] fica pronto\"\n\nLEGENDA: Do começo ao fim, em 12 segundos. Qual parte você não sabia? 👇", "Reels", "12 s"],
    ["Mito ou verdade", "Desfaça uma crença errada do seu ramo. Quem aprende algo com você volta.", "CENA 1 (3 s): você olhando para a câmera.\nCENA 2 (8 s): você fala: \"Dizem que [MITO]. Mentira. [VERDADE EM UMA FRASE].\"\nCENA 3 (4 s): mostre a prova (o produto, o resultado).\n\nTEXTO NA TELA: \"MITO: [MITO]\"\n\nLEGENDA: Você também achava isso? Salve para mostrar para alguém.", "Reels", "15 s"],
    ["Um dia aqui", "Pequenos trechos do seu dia: abrir a porta, o primeiro cliente, a hora do almoço, fechar. Aproxima as pessoas da sua marca.", "CENA 1 (3 s): abrindo a porta de manhã.\nCENA 2 (4 s): arrumando o balcão ou a mesa.\nCENA 3 (5 s): atendendo um cliente (com permissão).\nCENA 4 (4 s): o movimento do meio do dia.\nCENA 5 (3 s): fechando as portas à noite.\n\nTEXTO NA TELA: \"Um dia no [NEGÓCIO]\"\n\nLEGENDA: Foi assim o nosso dia. Vem fazer parte do próximo? 😉", "Reels", "20 s"],
    ["Antes e depois com estalo", "Grave o antes, estale os dedos e corte para o depois. O corte rápido é o que faz as pessoas assistirem de novo.", "CENA 1 (3 s): o antes, parado. Você estala os dedos.\nCENA 2 (5 s): o depois, no mesmo ângulo.\n\nDICA: deixe o celular no mesmo lugar nas duas cenas.\n\nTEXTO NA TELA: \"Antes → depois\"\n\nLEGENDA: [O QUE FOI FEITO] em [TEMPO]. Quer o seu? Chama no direct.", "Reels", "8 s"],
    ["Resposta para comentário", "Pegue um comentário ou pergunta real e responda em vídeo. Mostra que você escuta e gera mais comentários.", "CENA 1 (3 s): print do comentário na tela.\nCENA 2 (12 s): você responde olhando para a câmera, em 2 ou 3 frases.\nCENA 3 (3 s): termine com \"Manda a sua pergunta aqui embaixo\".\n\nTEXTO NA TELA: \"Respondendo a @[PESSOA]\"\n\nLEGENDA: Ótima pergunta! Qual é a sua? 👇", "Reels", "18 s"]
  ]
};

const SITE = {
  id: "site",
  keyword: "SITE",
  pattern: /\bsites?\b/i,
  cta: 'Comente "SITE" e receba grátis o checklist do site que traz clientes 🌐',
  topic: /\bsites?\b|\bgoogle\b|\bdom[ií]nio\b/i,
  title: "O site que traz clientes: checklist em 7 passos",
  coverTitle: "O site que<br>traz clientes",
  coverSub: "checklist em 7 passos",
  formSub: "Sete pontos para conferir no seu site, com texto pronto para copiar. Serve para quem já tem site e para quem vai fazer.",
  gets: [["7 passos", "para conferir hoje"], ["Textos prontos", "para copiar"], ["Sem programar", "nada"]],
  h1: "<em>O site que traz clientes</em>: checklist em 7 passos",
  sub: "Confira um passo por vez. Se o seu site passar nos 7, ele trabalha por você até de madrugada.",
  meta: [["7", "passos"], ["15 min", "para conferir"], ["R$ 0", "para aplicar"]],
  start: "Começar pelo passo 1",
  section: "Os 7 passos",
  blockLabel: "Copiar texto",
  pdf: "",
  tip: "Abra o seu site no celular, como se fosse um cliente, e tente pedir algo em menos de 30 segundos. Se não conseguir, comece pelo passo 2. Se quiser um site novo, a {brand} faz por R$ 497 com o domínio do primeiro ano incluído.",
  bandTitle: "Quer que a gente confira o seu site?",
  bandText: "Mande o endereço e a {brand} diz, de graça, o que mudar primeiro.",
  bandButton: "Quero a análise grátis",
  whatsText: "Olá! Baixei o checklist de site da {brand} e quero a análise grátis do meu site.",
  leadIntent: "Seguiu o perfil e pegou o checklist de site",
  items: [
    ["A primeira frase diz o que você faz", "Quem abre o site decide em 5 segundos se fica. A frase do topo precisa dizer o que você faz, para quem e onde.", "[O QUE VOCÊ FAZ] para [QUEM] em [CIDADE/BAIRRO].\n\nExemplo: Bolos de festa sob encomenda em Copacabana.", "Texto", "5 min"],
    ["Botão do WhatsApp sempre à vista", "No celular, o cliente quer falar com você sem procurar. Um botão verde fixo no canto da tela resolve.", "Link do botão:\nhttps://wa.me/55[DDD][NÚMERO]?text=Olá!%20Vi%20o%20site%20e%20quero%20saber%20mais.", "Botão", "5 min"],
    ["Abre rápido no celular", "Se demora mais de 3 segundos, metade das pessoas desiste. Teste de graça no PageSpeed do Google.", "Teste aqui: pagespeed.web.dev\n\nNota abaixo de 50 no celular? Diminua o tamanho das fotos antes de colocar no site.", "Checagem", "2 min"],
    ["Fotos reais do seu negócio", "Foto de banco de imagens parece igual a todo mundo. Fotos suas, da equipe e do produto passam confiança.", "Lista de fotos para tirar:\n1. Fachada\n2. Você ou a equipe trabalhando\n3. O produto mais vendido\n4. Um cliente satisfeito (com permissão)", "Fotos", "20 min"],
    ["Prova de quem já comprou", "Três depoimentos curtos com nome valem mais que um texto longo sobre você.", "\"[O QUE O CLIENTE DISSE, EM UMA FRASE]\"\n— [NOME], [BAIRRO OU PROFISSÃO]", "Texto", "10 min"],
    ["Endereço, horário e Google", "O cliente quer saber onde e quando. E o site precisa estar ligado ao seu perfil no Google para aparecer nas buscas da região.", "Atendimento: [DIAS] das [HORA] às [HORA]\nEndereço: [RUA, NÚMERO, BAIRRO, CIDADE]\nComo chegar: [LINK DO GOOGLE MAPS]", "Texto", "5 min"],
    ["Endereço próprio (.com.br)", "seunegocio.com.br passa mais confiança que um link de plataforma gratuita, e é fácil de lembrar e de falar.", "Confira se o nome está livre: registro.br\n\nDica: curto, sem hífen e igual ao seu @ do Instagram.", "Domínio", "5 min"]
  ]
};

export const GIFT_MATERIALS = { guia: GUIA, reels: REELS, site: SITE };

// Ordem de busca: as palavras específicas primeiro; o QUERO e as antigas por último.
const BY_KEYWORD = [SITE, REELS, GUIA];

export function giftMaterial(id = "") {
  return GIFT_MATERIALS[String(id || "")] || GUIA;
}

// Qual conteúdo a pessoa pediu no comentário (null = nenhuma palavra do brinde).
export function materialForComment(text = "") {
  const value = String(text || "");
  const hit = BY_KEYWORD.find(m => m.pattern.test(value));
  return hit ? hit.id : null;
}

// Chamada do post conforme o assunto: post de site → SITE, de vídeo → REELS, o resto → QUERO.
export function giftCtaForTopic(text = "", fallback = GUIA.cta) {
  if (!fallback) return "";
  const value = String(text || "");
  if (SITE.topic.test(value)) return SITE.cta;
  if (REELS.topic.test(value)) return REELS.cta;
  return fallback;
}

// Uma chamada de brinde já está na legenda? (QUERO, SITE ou REELS)
export const GIFT_CTA_PATTERN = /coment[ae]\s+["“']?(quero|site|reels)\b/i;
