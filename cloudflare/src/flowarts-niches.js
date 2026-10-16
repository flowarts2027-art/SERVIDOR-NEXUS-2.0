// Tipos de negócio que aparecem nos posts da Flow Arts (imagem e legenda).
// Sem isso a IA caía sempre em café e padaria. Cada post sorteia um tipo diferente dos últimos.
export const FLOWARTS_NICHES = Object.freeze([
  Object.freeze({ id: "barbearia", pt: "barbearia", en: "a neighborhood barbershop (barber chair, mirror, clippers, a barber at work)" }),
  Object.freeze({ id: "salao", pt: "salão de beleza", en: "a hair and beauty salon (styling station, mirror, hair products, a stylist with a client)" }),
  Object.freeze({ id: "academia", pt: "academia", en: "a small local gym or fitness studio (weights, mats, a trainer helping a member)" }),
  Object.freeze({ id: "pet-shop", pt: "pet shop", en: "a pet shop with grooming (a groomer washing a dog, shelves of pet products)" }),
  Object.freeze({ id: "loja-de-roupas", pt: "loja de roupas", en: "a small clothing boutique (clothes racks, mannequins, an owner folding garments)" }),
  Object.freeze({ id: "oficina", pt: "oficina mecânica", en: "a car repair garage (a mechanic under a car hood, tools, a customer waiting)" }),
  Object.freeze({ id: "restaurante", pt: "restaurante", en: "a family restaurant (a plated lunch dish, a cook in the kitchen, a waiter serving a table)" }),
  Object.freeze({ id: "floricultura", pt: "floricultura", en: "a flower shop (buckets of fresh flowers, a florist making a bouquet)" }),
  Object.freeze({ id: "confeitaria", pt: "confeitaria de bolos", en: "a custom cake shop (decorated cakes, a decorator piping icing)" }),
  Object.freeze({ id: "clinica", pt: "clínica de estética ou odontologia", en: "a small aesthetics or dental clinic (a clean reception desk, a friendly professional with a patient)" }),
  Object.freeze({ id: "lanchonete", pt: "lanchonete", en: "a snack bar (burgers on the counter, a cook at the grill, a customer ordering)" }),
  Object.freeze({ id: "loja-de-celular", pt: "loja de celular e acessórios", en: "a phone accessories store (cases and chargers on display, a seller helping a customer)" }),
  Object.freeze({ id: "papelaria", pt: "papelaria e presentes", en: "a stationery and gift shop (colorful notebooks, wrapped gifts, an owner at the counter)" }),
  Object.freeze({ id: "cafeteria", pt: "cafeteria", en: "a small neighborhood café (coffee cups, a barista behind the counter)" })
]);

function hash(text) {
  let h = 2166136261;
  for (const ch of String(text || "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Escolhe um tipo de negócio evitando os dos últimos posts; estável para a mesma semente.
export function pickNiche({ seed = "", avoid = [] } = {}) {
  const skip = new Set((Array.isArray(avoid) ? avoid : []).map(String));
  const fresh = FLOWARTS_NICHES.filter(n => !skip.has(n.id));
  const pool = fresh.length ? fresh : FLOWARTS_NICHES;
  return pool[hash(seed) % pool.length];
}

export function nicheById(id) {
  return FLOWARTS_NICHES.find(n => n.id === String(id)) || null;
}
