// Legenda pronta por nicho e formato (pedido do Rodrigo, 18/10): ele sobe o Reels, carrossel ou post
// do cliente no Master e a legenda já vem escrita. Feita por código, sem IA: custo zero.
// Varia a cada vez (gancho, corpo e chamada) para não repetir legenda, porque o Publisher
// barra legenda igual a uma já publicada.

import { clientBrand } from "./client-brand.js";

// h = ganchos, b = corpo, t = hashtags. Sem preços, números ou promessas.
const N = {
  restaurante: { k: /restaurant|comida|almo[cç]o|pizz|marmit|churrasc|self.?service/i,
    h: ["Hoje tem comida feita com carinho", "Bateu a fome? A gente resolve", "Sabor de comida caseira, do jeito que você gosta"],
    b: ["Ingredientes frescos e tempero de verdade, todos os dias.", "Prato bem servido e atendimento que faz você voltar.", "Venha comer com a família ou peça para levar."],
    t: ["#restaurante", "#comidacaseira", "#almoço", "#comidaboa"] },
  cafeteria: { k: /caf[eé]|cafeteria|coffee/i,
    h: ["Hora do café", "Um café para deixar o dia melhor", "Seu cantinho favorito te espera"],
    b: ["Café passado na hora e doces que combinam com ele.", "Um lugar tranquilo para conversar, trabalhar ou só respirar.", "Venha provar as novidades da semana."],
    t: ["#cafeteria", "#café", "#cafédamanhã", "#coffeelover"] },
  lanchonete: { k: /lanch|hamb[uú]rg|burger|salgad|pastel|a[cç]a[ií]/i,
    h: ["Bateu aquela vontade?", "O lanche que você merece", "Fome de quê hoje?"],
    b: ["Lanche caprichado, feito na hora.", "Bem recheado e com aquele sabor que você já conhece.", "Peça para comer aqui ou para levar."],
    t: ["#lanchonete", "#lanche", "#hamburguer", "#fome"] },
  padaria: { k: /padaria|p[aã]o|confeit|bolo|doce/i,
    h: ["Fornada nova saindo agora", "O cheirinho de pão quente chegou", "Café da manhã completo é aqui"],
    b: ["Pão quentinho, bolos e salgados feitos todos os dias.", "Do café da manhã ao lanche da tarde, tem sempre algo fresquinho.", "Passe aqui e leve para a família."],
    t: ["#padaria", "#pãoquentinho", "#cafédamanhã", "#feitocomamor"] },
  bar: { k: /\bbar\b|boteco|chopp|cerveja|petisco/i,
    h: ["O happy hour começa aqui", "Bora reunir a turma?", "Petisco bom e gelada no ponto"],
    b: ["Clima bom, música e aquele petisco caprichado.", "O lugar certo para encontrar os amigos depois do trabalho.", "Venha curtir com a gente."],
    t: ["#bar", "#happyhour", "#petiscos", "#boteco"] },
  salao: { k: /sal[aã]o|beleza|cabel|barbear|barbeir|manicure|est[eé]tic|unha/i,
    h: ["Hora de se cuidar", "Autoestima em dia", "Seu visual novo começa aqui"],
    b: ["Atendimento com carinho e profissionais que entendem o que você quer.", "Corte, cor e cuidado para você sair se sentindo bem.", "Agende o seu horário e venha relaxar."],
    t: ["#salaodebeleza", "#cabelo", "#autoestima", "#beleza"] },
  academia: { k: /academia|fitness|muscula|crossfit|pilates|treino/i,
    h: ["Bora treinar?", "O primeiro passo é o mais importante", "Seu treino de hoje já está esperando"],
    b: ["Equipamentos, orientação e um ambiente que motiva.", "Cuide da saúde com quem acompanha você de perto.", "Venha conhecer e fazer uma aula com a gente."],
    t: ["#academia", "#treino", "#saude", "#foco"] },
  pet: { k: /pet\s?shop|banho e tosa|petshop/i,
    h: ["Seu pet merece o melhor", "Banho tomado, rabinho abanando", "Amor de pet é aqui"],
    b: ["Cuidado e carinho em cada banho e tosa.", "Tudo para o seu bichinho em um só lugar.", "Traga o seu pet para um dia de cuidado."],
    t: ["#petshop", "#banhoetosa", "#amopets", "#cachorro"] },
  racao: { k: /ra[cç][aã]o|quatree|pet food/i,
    h: ["A ração certa faz diferença", "Seu pet bem alimentado e feliz", "Ração de qualidade para quem você ama"],
    b: ["Rações para cães e gatos de todas as idades, com atendimento que ajuda a escolher.", "Variedade de marcas, petiscos e acessórios para o seu pet.", "Passe na loja ou chame no WhatsApp para saber mais."],
    t: ["#racao", "#pet", "#cachorro", "#gato", "#alimentacaopet"] },
  agropecuaria: { k: /agro|agropecu[aá]ri|rural|fazenda|produtor/i,
    h: ["Tudo para o seu campo", "O produtor encontra aqui", "Do plantio à criação, a gente ajuda"],
    b: ["Ferramentas, sementes, rações e insumos com atendimento de quem entende.", "Produtos para a lavoura, a criação e o jardim.", "Venha conversar com a gente e tirar as suas dúvidas."],
    t: ["#agropecuaria", "#agro", "#produtorrural", "#campo"] },
  veterinario: { k: /veterin[aá]ri|vet\b|cl[ií]nica vet/i,
    h: ["Saúde do seu pet em boas mãos", "Cuidado de verdade para quem é da família", "Consulta em dia, pet feliz"],
    b: ["Atendimento com carinho e atenção a cada bichinho.", "Consultas, vacinas e acompanhamento para o seu pet.", "Agende uma consulta com a nossa equipe."],
    t: ["#veterinario", "#saudepet", "#clinicaveterinaria", "#pet"] },
  dentista: { k: /dent|odonto|sorriso/i,
    h: ["Seu sorriso merece cuidado", "Sorrir sem medo", "Cuidar dos dentes é cuidar de você"],
    b: ["Atendimento tranquilo, com explicação de cada passo.", "Prevenção e tratamento para toda a família.", "Agende a sua avaliação."],
    t: ["#dentista", "#sorriso", "#odontologia", "#saudebucal"] },
  clinica: { k: /cl[ií]nica|consult[oó]rio|m[eé]dic|fisio|psic|nutri/i,
    h: ["Cuidar da saúde é prioridade", "Atendimento humano, de perto", "Sua saúde em boas mãos"],
    b: ["Profissionais atenciosos e um ambiente acolhedor.", "Agende sem complicação e seja bem atendido.", "Estamos aqui para cuidar de você."],
    t: ["#clinica", "#saude", "#cuidado", "#bemestar"] },
  farmacia: { k: /farm[aá]cia|drogaria/i,
    h: ["Sua farmácia de confiança", "Cuidado pertinho de você", "Atendimento que entende você"],
    b: ["Medicamentos, cuidados e beleza com atendimento atencioso.", "Tire suas dúvidas com quem conhece você.", "Passe aqui ou peça pelo WhatsApp."],
    t: ["#farmacia", "#saude", "#cuidado", "#bemestar"] },
  mercado: { k: /mercad|mercearia|hortifr|supermerc|empór/i,
    h: ["Ofertas fresquinhas chegaram", "Tudo que a sua casa precisa", "Compra do mês sem sair do bairro"],
    b: ["Hortifruti fresco, carnes e o que você precisa no dia a dia.", "Preço justo e atendimento de quem é do bairro.", "Passe aqui e confira as novidades."],
    t: ["#mercado", "#ofertas", "#hortifruti", "#comprasdomes"] },
  roupas: { k: /roupa|moda|boutique|vestu[aá]ri|look|cal[cç]ado/i,
    h: ["Look novo chegando", "Peças que combinam com você", "Novidade na arara"],
    b: ["Peças escolhidas a dedo para o seu estilo.", "Venha provar e montar o seu look.", "Chame no WhatsApp e veja as cores e os tamanhos."],
    t: ["#moda", "#lookdodia", "#estilo", "#lojaderoupas"] },
  oficina: { k: /oficina|mec[aâ]nic|auto ?pe[cç]a|funilar|pneu/i,
    h: ["Seu carro em boas mãos", "Revisão em dia, viagem tranquila", "Serviço bem feito e explicado"],
    b: ["Diagnóstico honesto e serviço com garantia de qualidade.", "Manutenção, revisão e cuidado com o seu carro.", "Agende uma avaliação com a gente."],
    t: ["#oficinamecanica", "#carro", "#manutencao", "#revisao"] },
  hotel: { k: /hotel|pousada|hostel|hospedag/i,
    h: ["Hora de descansar", "Seu próximo destino te espera", "Conforto para a sua viagem"],
    b: ["Quartos confortáveis, café caprichado e atendimento acolhedor.", "Um lugar para relaxar e aproveitar a viagem.", "Faça a sua reserva pelo WhatsApp."],
    t: ["#pousada", "#hotel", "#viagem", "#descanso"] },
  imobiliaria: { k: /imobili|im[oó]ve|corretor/i,
    h: ["Seu novo lar está aqui", "O imóvel que você procura", "Hora de mudar de casa?"],
    b: ["Imóveis para comprar ou alugar, com atendimento do começo ao fim.", "A gente ajuda você a encontrar o lugar certo.", "Agende uma visita."],
    t: ["#imobiliaria", "#imoveis", "#casanova", "#aluguel"] },
  contabilidade: { k: /cont[aá]b|contador|fiscal|mei\b/i,
    h: ["Suas contas em dia, sem dor de cabeça", "Contabilidade que fala a sua língua", "Foque no seu negócio, a gente cuida das contas"],
    b: ["Atendimento próximo para empresas e MEI.", "Organização, prazos em dia e explicação simples.", "Converse com a gente sem compromisso."],
    t: ["#contabilidade", "#empreendedor", "#mei", "#negocios"] },
  material: { k: /material de constru|constru[cç][aã]o|home ?center|ferragem|tinta/i,
    h: ["Tudo para a sua obra", "Reforma sem dor de cabeça", "Da fundação ao acabamento"],
    b: ["Material de construção com atendimento que ajuda a escolher.", "Variedade e entrega para a sua obra.", "Peça o seu orçamento pelo WhatsApp."],
    t: ["#materialdeconstrucao", "#obra", "#reforma", "#construcao"] }
};

const GENERIC = {
  h: ["Novidade para você", "Feito pensando em você", "Vem conhecer"],
  b: ["Atendimento com carinho e qualidade em cada detalhe.", "Estamos aqui para ajudar você.", "Chame no WhatsApp e tire suas dúvidas."],
  t: ["#negociolocal", "#compreLocal", "#atendimento"]
};

const OPEN = {
  reel: ["Dá o play e vê até o final 🎬", "Assiste esse vídeo 👀", "Aperta o play 🎬"],
  carousel: ["Arrasta para o lado 👉", "Desliza para ver tudo 👉", "Passa para o lado e confere 👉"],
  post: [""]
};
const CTA = ["Chame a gente no WhatsApp 📲", "Fale com a gente pelo direct ou WhatsApp 📲", "Salve e mande para quem precisa 💬", "Comente aqui o que achou 👇"];
const EXTRA = ["", "Marque alguém que precisa ver isso 👇", "Siga o perfil para não perder as novidades ✨", "Compartilhe com quem vai gostar 💬"];

// Descobre o nicho do cliente pelo que está salvo (nicho, perfil da marca, nome).
export function captionNiche(client = {}) {
  const brand = clientBrand(client);
  const text = [client.niche, brand.niche, client.name, brand.brandName].filter(Boolean).join(" ");
  for (const [key, n] of Object.entries(N)) if (n.k.test(text)) return key;
  return "";
}

// Quantas legendas diferentes existem para este cliente e formato.
export function captionVariants(client = {}, format = "post") {
  const fmt = format === "feed" ? "post" : format;
  const n = N[captionNiche(client)] || GENERIC;
  return n.h.length * n.b.length * (OPEN[fmt] || OPEN.post).length * CTA.length * EXTRA.length;
}

// Número da vez (contador) → combinação. Pula longe a cada vez, para o gancho, o texto e a chamada
// mudarem juntos de uma postagem para a outra. Passa por todas antes de repetir.
export function readyCaption(client = {}, format = "post", turn = 0) {
  const fmt = format === "feed" ? "post" : format;
  if (fmt === "story") return ""; // Stories não têm legenda no Instagram.
  const n = N[captionNiche(client)] || GENERIC;
  const open = OPEN[fmt] || OPEN.post;
  const sizes = [n.h.length, n.b.length, CTA.length, EXTRA.length, open.length];
  const total = sizes.reduce((a, b) => a * b, 1);
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  let step = Math.floor(total * 0.618) || 1;
  while (gcd(step, total) !== 1) step++;
  let k = ((Math.abs(Math.floor(Number(turn) || 0)) % total) * step) % total;
  const idx = sizes.map(size => { const v = k % size; k = Math.floor(k / size); return v; });
  const brand = clientBrand(client);
  const offer = String(brand.offer || "").trim();
  const name = String(brand.brandName || client.name || "").trim();
  const showName = name && name !== "NEXUS";
  const tags = [...n.t];
  if (showName) tags.push("#" + name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toLowerCase());
  const head = n.h[idx[0]] + (open[idx[4]] ? "\n" + open[idx[4]] : "");
  const lines = [head, n.b[idx[1]]];
  if (offer && offer.length <= 220) lines.push(offer);
  if (EXTRA[idx[3]]) lines.push(EXTRA[idx[3]]);
  lines.push(CTA[idx[2]] + (showName ? "\n" + name : ""));
  lines.push(tags.slice(0, 6).join(" "));
  return lines.join("\n\n").slice(0, 2200);
}
