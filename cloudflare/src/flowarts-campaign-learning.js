// Flow Arts campaign learning: pure scoring and comparison helpers.
// No network calls, no publishing, no access to other clients.
export function summarizeFlowArtsPosts(posts = []) {
  const rows = posts.filter(p => p && (p.tipo || p.media_type)).map(p => ({
    id: String(p.id || ''),
    url: String(p.link || p.permalink || ''),
    type: String(p.tipo || p.media_type || ''),
    reach: Math.max(0, Number(p.alcance ?? p.reach) || 0),
    views: Math.max(0, Number(p.visualizacoes ?? p.views) || 0),
    likes: Math.max(0, Number(p.curtidas ?? p.likes) || 0),
    comments: Math.max(0, Number(p.comentarios ?? p.comments) || 0),
    saves: Math.max(0, Number(p.salvos ?? p.saved) || 0),
    shares: Math.max(0, Number(p.compartilhamentos ?? p.shares) || 0),
    follows: Math.max(0, Number(p.seguidores_ganhos ?? p.follows) || 0),
    visualStyle: p.visual_style || null,
    creativeRef: p.creative_ref || null,
  }));
  const total = key => rows.reduce((sum, p) => sum + p[key], 0);
  const byReach = [...rows].sort((a,b) => b.reach - a.reach);
  return {
    posts: rows.length,
    totals: {reach:total('reach'),views:total('views'),likes:total('likes'),comments:total('comments'),saves:total('saves'),shares:total('shares'),follows:total('follows')},
    topReach: byReach.slice(0,5),
    styleEvidenceReady: rows.filter(p => p.visualStyle && p.creativeRef).length,
    recommendation: rows.length < 20 || total('reach') < 100 ? 'Amostra insuficiente: testar formatos e ganchos, sem declarar estilo vencedor.' : 'Comparar estilos por formato, janela de coleta e alcance de público equivalente antes de escolher padrão.'
  };
}
export function formatFlowArtsLearningReport(data, collectedAt) {
  const s = summarizeFlowArtsPosts(data.posts);
  return ['# Relatório Flow Arts — '+collectedAt, '', 'Fonte: métricas autorizadas do Nexus. Não representa vendas ou clientes adquiridos.', '',
    'Posts: '+s.posts+'; alcance somado: '+s.totals.reach+'; visualizações: '+s.totals.views+'; curtidas: '+s.totals.likes+'; compartilhamentos: '+s.totals.shares+'; seguidores atribuídos: '+s.totals.follows+'.',
    'Posts com estilo e arquivo visual identificados: '+s.styleEvidenceReady+'/'+s.posts+'.', '', '## Maiores alcances',
    ...s.topReach.map(p => '- '+p.url+' | '+p.type+' | alcance '+p.reach+' | estilo '+(p.visualStyle || 'não registrado')),
    '', '## Recomendação', s.recommendation, '', 'Aprovação humana obrigatória; não publicar automaticamente.', ''].join(String.fromCharCode(10));
}
