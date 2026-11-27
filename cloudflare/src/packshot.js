// Embalagem real por cima do cenário da IA (pedido do Rodrigo, 27/11/2026).
// A IA nunca desenha embalagem (inventa letra, marca e saco). Ela faz só o cenário com um espaço vazio,
// e o Nexus cola a foto REAL da embalagem tirada do catálogo 2026 (public/catalogo/catalogo.json).
// Adimax: a linha Qualidy nunca entra (o Eduardo não vende). Quatree: a linha Supreme ainda não está na biblioteca.

let cached = null;

export async function loadCatalog(env) {
  if (cached) return cached;
  if (!env?.ASSETS?.fetch) return null;
  const res = await env.ASSETS.fetch(new Request("https://assets.local/catalogo/catalogo.json")).catch(() => null);
  if (!res?.ok) return null;
  cached = await res.json().catch(() => null);
  return cached;
}

export function resetCatalogCache() { cached = null; }

const QUALIDY = /qualid[iy]/i;

// Produto do dia: gira pela lista, cada peça do dia com um produto diferente.
export function pickProduct(catalog, marca, d, i) {
  const list = (catalog?.[marca] || []).filter(p => p?.arquivo && !QUALIDY.test(String(p.nome || "")));
  if (!list.length) return null;
  const n = list.length;
  // Passo 7 (número primo) espalha as linhas para não repetir a mesma família em seguida.
  return list[(((d * 4 + i) * 7) % n + n) % n];
}

// Onde a embalagem entra (combina com a moldura nova: título do post no alto à direita, botão no centro
// embaixo; texto do story na parte de baixo).
export function productPlace(story, item) {
  const W = 1080, H = story ? 1920 : 1350;
  // 27/11/2026 (prévia real): no story a IA pôs o cão no meio e a embalagem o cobriu. Agora a embalagem é
  // menor e fica no canto de baixo à direita (acima do texto); o pet fica à esquerda. No post, mais à direita.
  const maxH = story ? 520 : 560;
  // Foto do catálogo pequena (Adimax): não aumenta mais que 2x, para não ficar borrada.
  const nativeH = Number(item?.altura) || maxH;
  const h = Math.min(maxH, Math.round(nativeH * 2));
  const w = Math.round(h * (Number(item?.largura) || 1) / (Number(item?.altura) || 1));
  if (story) return { w, h, left: W - w - 50, top: 1240 - h };
  // Post: lado direito, entre o título (até ~420) e o botão (~1120).
  return { w, h, left: W - w - 40, top: 1105 - h };
}

export async function composeProduct(env, sceneBytes, item, aspect) {
  if (!env?.IMAGES || !env?.ASSETS?.fetch) throw new Error("packshot_unavailable");
  const story = aspect === "9:16";
  const res = await env.ASSETS.fetch(new Request("https://assets.local/" + String(item.arquivo)));
  if (!res.ok) throw new Error("packshot_missing");
  const pack = new Uint8Array(await res.arrayBuffer());
  const place = productPlace(story, item);
  const stream = b => new Blob([b]).stream();
  const canvas = env.IMAGES.input(stream(sceneBytes)).transform({ width: 1080, height: story ? 1920 : 1350, fit: "cover" })
    .draw(env.IMAGES.input(stream(pack)).transform({ width: place.w, height: place.h, fit: "scale-down" }), { left: place.left, top: place.top });
  const out = await (await canvas.output({ format: "image/jpeg", quality: 92 })).response();
  if (!out.ok) throw new Error("packshot_compose_http_" + out.status);
  return new Uint8Array(await out.arrayBuffer());
}
