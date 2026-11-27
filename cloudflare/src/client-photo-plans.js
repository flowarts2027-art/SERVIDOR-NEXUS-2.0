// Geração automática de fotos para os clientes (pedido do Rodrigo, 27/11/2026).
// Plano de R$ 97: 2 posts (manhã e tarde) + 2 stories por dia. A IA grátis do Cloudflare faz só a FOTO
// (sem texto e sem logo); o painel do cliente monta a moldura nova (texto na foto, botão centralizado,
// tarja fininha com a logo) e a arte espera aprovação. Nada sai sem aprovação.
// GILTEC fica de fora (a Sheila repete as artes do painel; a Rose está pausada).
// Adimax e Quatree entram depois, com as embalagens reais dos catálogos (a IA nunca desenha embalagem).

// Cenas que a IA erra muito (teste de 27/11: pernas trocadas, pessoa repetida, 3 pés para 4 pernas).
export const SAFE_ANATOMY = "ANATOMY SAFETY: only ONE person in the image unless the scene says otherwise. "
  + "No crossed legs, no legs folded under the body, no people touching or overlapping, no full-body sitting poses. "
  + "Prefer waist-up framing, or a close-up of a single body part. Hands simple and relaxed, five fingers, fully visible.";

// Horários base (o alinhador do Nexus põe o minuto fixo de cada cliente, REGRA_HORARIOS_CLIENTES.md).
const SLOTS = Object.freeze([
  { key: "0900", type: "post", time: "09:00" },
  { key: "1200-story", type: "story", time: "12:00" },
  { key: "1800", type: "post", time: "18:00" },
  { key: "2000-story", type: "story", time: "20:00" }
]);

const pick = (list, d, i) => list[((d * 2 + i) % list.length + list.length) % list.length];

function photoPlan(cfg, d) {
  const count = { post: 0, story: 0 };
  return SLOTS.map(slot => {
    const story = slot.type === "story";
    // Cada formato gira na própria lista: as 2 peças do dia nunca repetem a cena.
    const scene = pick(story ? cfg.stories : cfg.posts, d, count[slot.type]++);
    const format = story ? "FORMAT: vertical 9:16 Instagram story photo (1080x1920)." : "FORMAT: vertical 4:5 Instagram feed photo (1080x1350).";
    return {
      key: slot.key, type: slot.type, time: slot.time,
      cards: [{ equipment: "", topic: cfg.topic, aspect: story ? "9:16" : "4:5",
        prompt: `${format} ${cfg.context} SCENE: ${scene}. ${cfg.look} ${SAFE_ANATOMY} NO TEXT anywhere, no logos, no brand names, no watermarks, no borders, no collage.` }]
    };
  });
}

// Daniela Martins: epilação é o foco (sobrancelha não entra nas fotos automáticas).
// Pernas e braços aparecem só em enquadramentos que a IA acerta: close, pernas paralelas e retas.
const DANIELA = Object.freeze({
  topic: "epilação",
  context: "Realistic advertising photo for a professional female waxing (epilation) studio in Brazil.",
  look: "LOOK: bright, clean and elegant beauty studio, white and olive-green (#746E44) decor with soft gold details, plants, soft daylight. Realistic photograph, true skin tones.",
  posts: Object.freeze([
    "close-up of ONE smooth, hairless female lower leg resting straight on a white treatment bed with a folded white towel; a hand gently touching the shin",
    "a female waxing specialist with white gloves applying warm wax with a wooden spatula on ONE straight lower leg of a client lying on a white bed; close framing on the leg and the gloved hands",
    "BOTH legs of a woman side by side, straight and parallel, from the knees down, resting on a white treatment bed with a white towel, smooth skin",
    "close-up of a smooth, hairless female underarm with the arm raised straight up, clean white background, soft light",
    "a professional waxing studio with a white treatment bed, folded towels, a wax heater and wooden spatulas on a tray, no people"
  ]),
  stories: Object.freeze([
    "a woman seen from behind, waist down, walking on a light floor wearing a short summer dress, smooth legs, straight steps",
    "close-up of hands with white gloves holding a wooden spatula with warm wax over a wax heater",
    "close-up of ONE smooth female lower leg stretched straight on a white bed, soft daylight from a window",
    "a waist-up portrait of a smiling female waxing specialist in a white uniform in her olive-green and white studio, hands relaxed",
    "a tray with folded white towels, wax and spatulas next to a plant in an olive-green and white studio, no people"
  ]),
  captionBrief: "Daniela Martins é epiladora com 26 anos de experiência, em Uberlândia (bairro Tibery). O foco é a EPILAÇÃO (depilação com cera); "
    + "ela também faz design de sobrancelha, mas só cite se combinar. Objetivo: VENDER o atendimento com a Daniela. "
    + "Conteúdo educativo e acolhedor sobre depilação (benefícios, cuidados antes e depois, mitos). Nunca mande a cliente a médico ou outro profissional, "
    + "nunca prometa cura ou resultado garantido. Cada legenda: primeira linha forte, 2 parágrafos curtos e no fim 'Comente QUERO para agendar com a Daniela.' "
    + "Termine com 4 hashtags (#Epilação #DepilaçãoComCera #Uberlândia #DanielaMartinsEpiladora)."
});

// Maskara Assessoria: REGRA_IMAGENS_MASKARA.md (arma parada, nunca na mão, escuro com dourado).
const MASKARA = Object.freeze({
  topic: "documentação de armas e CAC",
  context: "Realistic advertising photo for a LEGAL firearms documentation dispatcher company in Brazil (CR, CRAF, transfers, sports shooting paperwork).",
  look: "LOOK: dark graphite background with soft gold details, soft side light, blurred background, sober and professional. Any firearm is unloaded and resting still on a table, counter or inside an open transport case; nobody holds, aims or points a weapon; no ammunition scattered.",
  posts: Object.freeze([
    "a dark office desk with a document folder (no readable data), a stamp, a gold pen and an unloaded pistol resting inside an open hard case with black foam, no people",
    "the counter of a sports shooting range with an unloaded pistol resting on the counter, ear protection and safety glasses next to it, a paper target far in the background, no people",
    "a waist-up dispatcher (one person) organizing document folders at a dark desk, a closed transport case on the desk, nobody holding a weapon",
    "close-up of hands signing a form with a gold pen next to a closed black transport case on a dark desk"
  ]),
  stories: Object.freeze([
    "a closed black firearm transport case on a dark wooden desk with document folders, gold desk lamp",
    "a sports shooter seen from behind (one person) wearing ear protection at a range booth, the unloaded pistol resting on the counter, not in the hand",
    "a neat stack of document folders and a stamp on a dark desk with gold details, no people"
  ]),
  captionBrief: "Maskara Assessoria é despachante LEGALIZADO de documentação de armas de fogo e CAC (CR, CRAF, guia de tráfego, transferências). "
    + "Ela não vende armas: ajuda o cliente a regularizar pelo processo legal. Tom sério e confiável. Nunca prometa aprovação, prazo ou resultado. "
    + "Cada legenda: 2 parágrafos curtos sobre a documentação e no fim 'Comente QUERO abaixo que a gente te chama.' "
    + "Termine com 4 hashtags (#CAC #Despachante #AssessoriaDocumental #CRAF)."
});

// Flow Arts e Nexus AI: campanha do brinde (30 legendas prontas, link da bio). Só eles falam de legenda grátis.
const FLOW = Object.freeze({
  topic: "brinde 30 legendas",
  context: "Realistic photo for a Brazilian digital marketing agency that helps small business owners on Instagram.",
  look: "LOOK: warm natural colors of a real small business (wood, plants, daylight). If a phone appears, its screen faces the person, never the viewer.",
  posts: Object.freeze([
    "a smiling small business owner (one woman) at the counter of her bakery looking at her phone, fresh bread on the counter",
    "a small business owner (one man) in his coffee shop holding his phone near his chest and smiling, waist-up",
    "a hairdresser (one woman) in her small salon checking her phone between clients, waist-up, relaxed",
    "a shop owner (one woman) arranging products on a shelf in a small boutique, waist-up, natural light"
  ]),
  stories: Object.freeze([
    "a small business owner (one person) waist-up, smiling at the phone in a cozy shop, empty wooden counter in the lower part of the image",
    "a café counter in the morning with a cup of coffee and a notebook, no people",
    "a shop owner (one person) waist-up writing ideas in a notebook at the counter, smiling"
  ]),
  captionBrief: "Flow Arts é uma agência de marketing e automação com IA para pequenos negócios do Brasil. Campanha atual: brinde grátis "
    + "'30 legendas prontas' no link da bio (flowarts.com.br/brinde). Tom próximo, direto e prático. Cada legenda: primeira linha forte, "
    + "2 parágrafos curtos sobre postar sem travar na legenda e no fim 'Comente QUERO ou baixe grátis no link da bio.' "
    + "Termine com 4 ou 5 hashtags (#FlowArtsMarketing #MarketingDigital #PequenosNegocios ...). Nunca use #flowart nem #flowarts. Sem preço, sem prometer vendas."
});

const NEXUS_AI = Object.freeze({
  ...FLOW,
  context: "Realistic premium photo for an Instagram automation service called Nexus.",
  look: "LOOK: bright, vivid colors with golden light, clean and premium, nothing dark. Robots are glossy white with a black visor and glowing eyes (one with blue eyes, one with orange eyes), full body with legs, in a real modern office. No logos or symbols on the robots.",
  posts: Object.freeze([
    "a glossy white robot with blue glowing eyes standing next to a desk, holding a phone with the screen facing the robot, in a bright modern office",
    "two glossy white robots (one with blue eyes, one with orange eyes) working at a bright office desk with a laptop, screens facing the robots",
    "a happy small business owner (one woman) waist-up in her shop while a small glossy white robot with orange eyes stands on the counter beside her"
  ]),
  stories: Object.freeze([
    "a glossy white robot with blue glowing eyes waving, standing in a bright modern office with plants, empty clean floor in the lower part",
    "a glossy white robot with orange glowing eyes sitting at a desk writing in a notebook, golden light"
  ]),
  captionBrief: FLOW.captionBrief.replace("Flow Arts é uma agência", "Nexus AI é o sistema de automação de Instagram da Flow Arts, agência")
});

// Sabor do Campo (Elaine): empadas artesanais de frango, carne seca e camarão, por encomenda no WhatsApp.
// Comida é o que a IA faz melhor: quase sempre sem pessoa (27/11/2026).
const SABOR = Object.freeze({
  topic: "empadas artesanais",
  context: "Realistic appetizing food photo for a small Brazilian homemade empada (savory pie) business.",
  look: "LOOK: warm, rustic and homemade: wooden table, green and yellow details, checkered cloth, natural daylight, golden flaky crust, true food colors.",
  posts: Object.freeze([
    "close-up of golden homemade Brazilian empadas (small round savory pies) on a wooden board, one cut open showing creamy shredded chicken filling",
    "a rustic basket full of golden empadas on a wooden table with a green and yellow checkered cloth, no people",
    "one empada cut in half showing shrimp filling, on a small plate, soft daylight, shallow depth of field",
    "a party tray with many small golden empadas arranged in rows on a wooden table, festive and homemade, no people",
    "close-up of hands (one person, simple and relaxed) placing fresh golden empadas into a kraft paper delivery box"
  ]),
  stories: Object.freeze([
    "golden empadas cooling on a rack in a homemade kitchen, warm light, empty wooden counter in the lower part of the image",
    "one empada cut open showing dried beef (carne seca) filling, on a wooden board, steam, close-up",
    "a kraft paper box with a dozen golden empadas ready for delivery on a wooden table"
  ]),
  captionBrief: "Sabor do Campo é o negócio de empadas artesanais da Elaine, feitas com carinho, por encomenda pelo WhatsApp (link na bio). "
    + "Sabores: frango, carne seca e camarão. Tom caseiro, alegre e com água na boca. Cada legenda: primeira linha que dá fome, "
    + "2 parágrafos curtos (sabor, massa que desmancha, encomendas para festas e lanches) e no fim 'Comente QUERO ou peça pelo WhatsApp da bio.' "
    + "Termine com 4 hashtags (#EmpadaArtesanal #Empadas #Encomendas #SaborDoCampo). Sem preço."
});

// Adimax e Quatree (27/11/2026): a IA faz só o cenário com o pet e um espaço vazio; o Nexus cola a embalagem
// REAL do catálogo (packshot.js). {PET} vira "dog" ou "cat" conforme o produto do dia.
const PET_LOOK = "LOOK: warm, bright and clean, true colors, realistic photograph. NO product bags, NO packages, NO boxes, NO bowls with brand, no text anywhere.";
const PET_POSTS = Object.freeze([
  "a happy {PET} sitting on the LEFT side of a bright, clean living room floor, looking toward the right; the RIGHT half of the image is empty light floor and wall (a product will be placed there later)",
  "a {PET} lying relaxed on the LEFT side of a wooden floor near a window with soft daylight; the RIGHT half is empty floor and plain wall",
  "the inside of a bright Brazilian pet shop with empty wooden shelves on the RIGHT side and a {PET} on the LEFT, looking at the shelves",
  "a {PET} on the LEFT side of a kitchen next to an empty steel food bowl, the RIGHT half is a clean empty floor and cabinet"
]);
const PET_STORIES = Object.freeze([
  "a happy {PET} in the upper part of the image looking down at an empty clean light floor in the middle, bright home, soft daylight",
  "a {PET} resting on a sofa in the upper part of the image, a clean empty wooden floor in the middle and bottom",
  "a bright pet shop with a {PET} in the upper part and an empty clean counter top in the middle of the image"
]);

const ADIMAX = Object.freeze({
  topic: "ração Adimax",
  context: "Realistic advertising photo of a pet for a pet food seller in Brazil.",
  look: PET_LOOK, posts: PET_POSTS, stories: PET_STORIES,
  marca: "adimax",
  captionBrief: "Eduardo Soares é vendedor da Adimax (rações Fórmula Natural, Origens e Magnus para cães e gatos). O produto do post é o tema dado. "
    + "Objetivo: VENDER. Diga para quem é o produto como está no nome (cão ou gato, fase, porte) sem inventar ingrediente, benefício, peso ou preço. "
    + "Nunca fale da linha Qualidy. Cada legenda: primeira linha com o nome do produto, 2 parágrafos curtos e no fim 'Comente QUERO e faça seu pedido com o Eduardo.' "
    + "Termine com 4 hashtags (#Adimax #RaçãoParaCães #RaçãoParaGatos #PetShop)."
});

const QUATREE = Object.freeze({
  topic: "ração Quatree",
  context: "Realistic advertising photo of a pet for a pet food brand sold to pet shops in Brazil.",
  look: PET_LOOK, posts: PET_POSTS, stories: PET_STORIES,
  marca: "quatree",
  captionBrief: "Ericsson é vendedor da Quatree (rações Quatree Life, Select, Gourmet, Hot Dog e Hot Cat). Quem compra é o LOJISTA (pet shop, casa de ração, agropecuária). "
    + "Objetivo: VENDA. Cada legenda vende o produto do post (o tema dado): nome da linha e para quem é, só com o que está no nome; nunca invente ingrediente, "
    + "benefício, selo, peso, preço ou 'mais vendido'. Chamada direta: 'Comente QUERO e peça a tabela para abastecer a sua loja.' "
    + "Termine com 4 hashtags (#RaçãoQuatree #PetShop #CasaDeRação #Agropecuária)."
});

export const PHOTO_CAMPAIGNS = Object.freeze({
  "adimax-eduardo-soares": Object.freeze({ ...ADIMAX, plan: photoPlan, panel: true, packshot: true }),
  "quatree-dog": Object.freeze({ ...QUATREE, plan: photoPlan, panel: true, packshot: true }),
  "sabor-do-campo": Object.freeze({ ...SABOR, plan: photoPlan, panel: true }),
  "daniela-martins": Object.freeze({ ...DANIELA, plan: photoPlan, panel: true }),
  "maskara-assessoria": Object.freeze({ ...MASKARA, plan: photoPlan, panel: true }),
  "primeiro-teste": Object.freeze({ ...FLOW, plan: photoPlan, panel: true }),
  "nexus-ai": Object.freeze({ ...NEXUS_AI, plan: photoPlan, panel: true })
});
