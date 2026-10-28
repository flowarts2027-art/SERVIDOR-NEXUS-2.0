// Cidades e bairros prontos para a busca do Captador (pedido do Rodrigo, 23/10/2026: Quatree Dog).
// Uberlândia e cidades próximas em Minas Gerais (Triângulo Mineiro e Alto Paranaíba).
// O cliente marca as cidades da busca diária e, na busca manual, escolhe cidade e bairro.

export const UBERLANDIA_REGION = Object.freeze({
  id: "uberlandia",
  label: "Uberlândia e região (MG)",
  areaCity: "Uberlândia MG", // cidade dos bairros abaixo
  cities: Object.freeze([
    "Uberlândia MG", "Araguari MG", "Uberaba MG", "Ituiutaba MG", "Monte Carmelo MG", "Patrocínio MG",
    "Araxá MG", "Patos de Minas MG", "Frutal MG", "Prata MG", "Tupaciguara MG", "Monte Alegre de Minas MG",
    "Indianópolis MG", "Estrela do Sul MG", "Nova Ponte MG", "Romaria MG", "Cascalho Rico MG", "Grupiara MG",
    "Douradoquara MG", "Abadia dos Dourados MG", "Coromandel MG", "Iraí de Minas MG", "Santa Juliana MG",
    "Sacramento MG", "Conquista MG", "Canápolis MG", "Centralina MG", "Capinópolis MG", "Campina Verde MG",
    "Araporã MG", "Perdizes MG", "Ibiá MG"
  ]),
  // Bairros de Uberlândia (busca manual pelo Google: "pet shop em <bairro>, Uberlândia MG").
  bairros: Object.freeze([
    "Centro", "Fundinho", "Santa Mônica", "Tibery", "Umuarama", "Martins", "Brasil", "Aparecida", "Osvaldo Rezende",
    "Tabajaras", "Lídice", "Saraiva", "Cazeca", "Bom Jesus", "Custódio Pereira", "Segismundo Pereira", "Jardim Patrícia",
    "Planalto", "Luizote de Freitas", "Jardim Canaã", "Mansour", "Tocantins", "Laranjeiras", "Shopping Park", "São Jorge",
    "Granada", "Pampulha", "Jardim Karaíba", "Morada da Colina", "Jardim Inconfidência", "Cidade Jardim",
    "Nossa Senhora Aparecida", "Presidente Roosevelt", "Jardim Brasília", "Pacaembu", "Santa Rosa", "Minas Gerais",
    "Marta Helena", "Taiaman", "Dona Zulmira", "Morumbi", "Alvorada", "Novo Mundo", "Jardim Holanda", "Panorama",
    "Daniel Fonseca", "Morada Nova", "Industrial", "Santa Luzia", "Lagoinha", "Carajás", "Jaraguá", "Guarani", "Chácaras Tubalina"
  ])
});

// Cliente da região de Uberlândia? (perfil, ramo, cidades salvas ou o próprio Quatree Dog)
export function clientRegion(client = {}, daily = {}) {
  const text = [client?.id, client?.niche, JSON.stringify(client?.config?.agentProfile || {}), (daily?.cities || []).join(" ")].join(" ");
  return /uberl[aâ]ndia|quatree/i.test(text) ? UBERLANDIA_REGION : null;
}

// Estado do Rio de Janeiro inteiro (pedido do Rodrigo, 27/10/2026: GILTEC). As 92 cidades, das maiores para as menores.
export const RJ_STATE_CITIES = Object.freeze([
    "Rio de Janeiro RJ", "São Gonçalo RJ", "Duque de Caxias RJ", "Nova Iguaçu RJ", "Niterói RJ", "Belford Roxo RJ",
    "Campos dos Goytacazes RJ", "São João de Meriti RJ", "Petrópolis RJ", "Volta Redonda RJ", "Macaé RJ", "Magé RJ",
    "Itaboraí RJ", "Cabo Frio RJ", "Maricá RJ", "Nova Friburgo RJ", "Barra Mansa RJ", "Angra dos Reis RJ",
    "Mesquita RJ", "Teresópolis RJ", "Rio das Ostras RJ", "Nilópolis RJ", "Queimados RJ", "Araruama RJ", "Resende RJ",
    "Itaguaí RJ", "São Pedro da Aldeia RJ", "Itaperuna RJ", "Japeri RJ", "Barra do Piraí RJ", "Saquarema RJ",
    "Seropédica RJ", "Três Rios RJ", "Valença RJ", "Cachoeiras de Macacu RJ", "Rio Bonito RJ", "Guapimirim RJ",
    "Casimiro de Abreu RJ", "Paraty RJ", "São Francisco de Itabapoana RJ", "Paracambi RJ", "Paraíba do Sul RJ", "São João da Barra RJ",
    "Santo Antônio de Pádua RJ", "Mangaratiba RJ", "Armação dos Búzios RJ", "São Fidélis RJ",
    "Bom Jesus do Itabapoana RJ", "Vassouras RJ", "Tanguá RJ", "Arraial do Cabo RJ", "Itatiaia RJ",
    "Paty do Alferes RJ", "Bom Jardim RJ", "Iguaba Grande RJ", "Miracema RJ", "Miguel Pereira RJ", "Piraí RJ",
    "Quissamã RJ", "Cordeiro RJ", "Porciúncula RJ", "Conceição de Macabu RJ", "Silva Jardim RJ", "Cambuci RJ",
    "Pinheiral RJ", "São José do Vale do Rio Preto RJ", "Sapucaia RJ", "Cantagalo RJ", "Carapebus RJ", "Areal RJ",
    "Natividade RJ", "Italva RJ", "Porto Real RJ", "Engenheiro Paulo de Frontin RJ", "Rio Claro RJ", "Quatis RJ",
    "Itaocara RJ", "Mendes RJ", "Cardoso Moreira RJ", "Aperibé RJ", "São Sebastião do Alto RJ", "Varre-Sai RJ",
    "Laje do Muriaé RJ", "Rio das Flores RJ", "Comendador Levy Gasparian RJ", "Duas Barras RJ", "Sumidouro RJ",
    "Carmo RJ", "Trajano de Moraes RJ", "Santa Maria Madalena RJ", "São José de Ubá RJ", "Macuco RJ"
]);
