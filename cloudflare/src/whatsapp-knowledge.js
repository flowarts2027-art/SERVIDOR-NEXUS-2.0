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
    "A Flow Arts faz um exemplo grátis para o negócio antes da pessoa contratar."
  ]),
  offers: Object.freeze([
    "Instagram no Automático: 12 posts por mês feitos com IA (4 Reels, 4 carrosséis e 4 posts). Preço de fundador, só para os 3 primeiros clientes e travado por 6 meses: R$ 297 de entrada + R$ 697 por mês. Sem fidelidade, cancelamento com aviso de 30 dias, pagamento por Pix.",
    "Site do seu negócio: R$ 497, pagamento único. Site de 1 página com fotos, serviços, horário, mapa e botão para o WhatsApp, feito para aparecer no Google e abrir bem no celular. Pronto em até 5 dias. Hospedagem e ajustes pequenos inclusos no primeiro ano; depois, R$ 29 por mês ou R$ 297 por ano. Tem contrato. O domínio .com.br fica por conta do cliente (cerca de R$ 40 por ano).",
    "Instagram que responde sozinho: R$ 197, pagamento único. Resposta automática no direct para quem comenta, levando a pessoa para o WhatsApp do negócio, e 10 posts prontos. Funcionando em até 2 dias.",
    "5 Reels com IA: R$ 147, pagamento único. Entrega em até 5 dias.",
    "10 posts prontos: R$ 97, pagamento único. Entrega em 24 horas.",
    "Criação de logo: R$ 67, pagamento único. Três opções em 24 horas.",
    "No plano mensal, os primeiros posts ficam prontos em até 5 dias."
  ]),
  limits: Object.freeze([
    "Nunca citar a Global Play nem outros clientes antigos.",
    "Nunca inventar números, clientes, resultados, depoimentos, prazos ou descontos."
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
