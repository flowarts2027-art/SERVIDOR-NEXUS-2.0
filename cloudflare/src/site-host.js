// SEO: o site tem um endereço só para o Google (https://flowarts.com.br).
// http:// e www. levam para ele com 301; o painel (painel.flowarts.com.br) não muda.
export const SITE_ORIGIN = "https://flowarts.com.br";

// 16/11/2026: o Rodrigo atende o Brasil todo (mora em Magé - RJ). A página antiga
// com "Nova Friburgo" no endereço leva para /criacao-de-site com 301.
export const MOVED_PAGES = { "/criacao-de-site-nova-friburgo": "/criacao-de-site" };

export function canonicalSiteRedirect(url, method = "GET") {
  if (!["GET", "HEAD"].includes(method)) return null;
  if (!/^(www\.)?flowarts\.com\.br$/i.test(url.hostname)) return null;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const moved = MOVED_PAGES[path.replace(/\.html$/, "")];
  if (moved) return SITE_ORIGIN + moved + url.search;
  if (url.protocol === "https:" && !/^www\./i.test(url.hostname)) return null;
  return SITE_ORIGIN + url.pathname + url.search;
}
