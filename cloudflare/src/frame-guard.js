// Auditoria 27/11/2026: nenhuma página do Nexus abre dentro de outro site (golpe do clique falso).
export function frameGuard(response) {
  if (!response || response.status === 101 || response.webSocket) return response;
  const headers = new Headers(response.headers);
  headers.set("x-frame-options", "DENY");
  const csp = headers.get("content-security-policy") || "";
  if (!/frame-ancestors/i.test(csp)) headers.set("content-security-policy", (csp ? csp.replace(/;?\s*$/, "; ") : "") + "frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
