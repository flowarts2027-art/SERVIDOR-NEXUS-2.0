// SEO: o site tem um endereço só para o Google (https://flowarts.com.br).
// http:// e www. levam para ele com 301; o painel (painel.flowarts.com.br) não muda.
export const SITE_ORIGIN = "https://flowarts.com.br";

export function canonicalSiteRedirect(url, method = "GET") {
  if (!["GET", "HEAD"].includes(method)) return null;
  if (!/^(www\.)?flowarts\.com\.br$/i.test(url.hostname)) return null;
  if (url.protocol === "https:" && !/^www\./i.test(url.hostname)) return null;
  return SITE_ORIGIN + url.pathname + url.search;
}
