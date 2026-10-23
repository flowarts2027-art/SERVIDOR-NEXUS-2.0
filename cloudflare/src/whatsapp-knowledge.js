// O que a atendente virtual do WhatsApp sabe sobre cada cliente.
// Fonte: empresa/visao.md, docs/nexus-memory/DECISIONS.md e o OK do Rodrigo em 2026-10-12
// para a IA falar preços; pacote de R$ 197, site de R$ 497 e prazos incluídos em 2026-10-14 (prazos iguais aos do site). Mude aqui quando um preço ou serviço mudar.

const FLOW_ARTS = Object.freeze({
  businessName: "Flow Arts",
  ownerName: "Rodrigo",
  facts: Object.freeze([
    "A Flow Arts é uma agência de marketing e automação com IA que também faz sites, com sede no Rio de Janeiro e atendimento 100% online para todo o Brasil.",
    "Atende pequenos negócios: cafés, salões, lojas, restaurantes e prestadores de serviço.",
    "Problema que resolve: o dono não tem tempo, posta sem constância e o Instagram não traz cliente.",
    "Como funciona: a IA produz os posts e o dono só aprova num painel. Nada é publicado sem a aprovação do cliente.",
    "A Flow Arts faz um exemplo grátis para o negócio antes da pessoa contratar.",
    "Se a pessoa comparar com um app de agendamento (como mLabs, Postgrain, Metricool, Buffer ou Hootsuite) ou disser que já usa um: explique, sem falar mal, que esses apps só agendam e mostram números, e que a foto, o texto e a ideia continuam sendo trabalho dela. Na Flow Arts a IA cria os posts e ela só aprova no celular. Compare com contratar um social media, não com o app, e ofereça o exemplo grátis.",
    "Todos os planos e preços estão em https://flowarts.com.br/#pacotes . Quando a pessoa perguntar preço, planos ou pacotes, responda o principal e mande esse link.",
    "Quem tem negócio sem site pode ver um exemplo de página em https://flowarts.com.br/marketing-para-cafeteria , https://flowarts.com.br/marketing-para-salao-de-beleza ou https://flowarts.com.br/marketing-para-lanchonete .",
    "O site tem contrato. Quem envia o contrato e o Pix é sempre o Rodrigo: quando a pessoa quiser fechar, diga que o Rodrigo vai mandar o contrato e marque needsHuman=true."
  ]),
  offers: Object.freeze([
    "Instagram no Automático · Básico: 30 conteúdos por mês feitos com IA (posts e carrosséis, sem vídeo). R$ 197 por mês, sem taxa de entrada. Fundador: os 3 primeiros clientes pagam R$ 147 por mês nos 3 primeiros meses (até 30/11/2026). Garantia: se no 1º mês não gostar dos posts, devolvemos o valor do mês. Sem fidelidade: para sair, é só avisar no WhatsApp. Pagamento por Pix.",
    "Instagram no Automático · com Vídeo: 60 conteúdos por mês (Reels em vídeo de verdade, carrosséis e posts). R$ 297 de entrada + R$ 697 por mês. Sem fidelidade: para sair, é só avisar no WhatsApp. Pagamento por Pix.",
    "Site do seu negócio: R$ 497, pagamento único. Site de 1 página com fotos, serviços, horário, mapa e botão para o WhatsApp, feito para aparecer no Google e abrir bem no celular. Pronto em até 5 dias. O primeiro ano já inclui o domínio .com.br, a hospedagem e ajustes pequenos. Depois do primeiro ano, R$ 297 por ano ou R$ 29 por mês, já com a renovação do domínio. Tem contrato.",
    "Instagram com resposta automática: R$ 197, pagamento único. Resposta automática no direct quando alguém comenta a palavra combinada (ex.: QUERO), levando a pessoa para o WhatsApp do negócio, e 10 posts prontos. Funcionando em até 2 dias.",
    "Captador de clientes: R$ 97 por mês. Ferramenta no painel do cliente: ele escolhe o tipo de negócio e a cidade e recebe empresas com telefone e uma mensagem pronta para mandar pelo próprio WhatsApp. Busca no Google Maps. Inclui 100 buscas por mês.",
    "5 Reels com IA: R$ 147, pagamento único. Entrega em até 5 dias.",
    "10 posts prontos: R$ 97, pagamento único. Entrega em 24 horas.",
    "Criação de logo: R$ 67, pagamento único. Três opções em 24 horas.",
    "No plano mensal, os primeiros posts ficam prontos em até 5 dias."
  ]),
  limits: Object.freeze([
    "Nunca citar a Global Play nem outros clientes antigos.",
    "Nunca inventar números, clientes, resultados, depoimentos, prazos ou descontos.",
    "Nunca falar mal de concorrente nem citar preço de concorrente."
  ]),
  handoff: Object.freeze([
    "a pessoa quer fechar, pagar ou receber o Pix",
    "pede para falar com uma pessoa ou com o Rodrigo",
    "reclamação, problema ou urgência",
    "pergunta algo que não está nestas informações",
    "pede desconto, condição especial ou prazo"
  ])
});

const KNOWLEDGE = Object.freeze({
  "primeiro-teste": FLOW_ARTS
});

export function whatsappKnowledge(clientId) {
  return KNOWLEDGE[String(clientId || "")] || null;
}

export function knowledgePrompt(clientId) {
  const k = whatsappKnowledge(clientId);
  if (!k) {
    return "Você ainda não tem informações sobre esta empresa. Diga que vai chamar uma pessoa da equipe e marque needsHuman=true.";
  }
  return [
    `EMPRESA: ${k.businessName}. Responsável humano: ${k.ownerName}.`,
    "FATOS:", ...k.facts.map(f => "- " + f),
    "SERVIÇOS E PREÇOS (pode informar exatamente assim):", ...k.offers.map(f => "- " + f),
    "LIMITES:", ...k.limits.map(f => "- " + f),
    `PASSE PARA O ${k.ownerName.toUpperCase()} (needsHuman=true) quando:`, ...k.handoff.map(f => "- " + f)
  ].join("\n");
}
