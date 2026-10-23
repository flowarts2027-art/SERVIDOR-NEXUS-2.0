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
