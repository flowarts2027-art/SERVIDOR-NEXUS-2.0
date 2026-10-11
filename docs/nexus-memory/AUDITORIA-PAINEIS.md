# Auditoria dos painéis — 2026-10-11 (manhã)

Feita pelo código (`public/portal.html`, `client-lite.js`, `index.html`, `app.js`, rotas em `cloudflare/src/portal.js` e `master.js`). Nada foi alterado. Aguardando aprovação do proprietário.

## Decisões do proprietário na conversa por voz (2026-10-10 noite)
- Produto principal: automação de Instagram. Modelo conta pai (Master) e contas filho (clientes).
- Painel do cliente com 6 blocos: resumo, próximos posts (aprovar/refazer), publicados, insights do Instagram (conta e por post), contatos/CRM, conta e suporte.
- Tirar do cliente: gerar vídeo e logo como enfeite.
- Painel pensado para celular (navegador). App Android fica para depois, com um amigo desenvolvedor.
- Funil: comentário "EU QUERO" → DM → landing page com nome e WhatsApp → conteúdo → CRM com follow-up de 7 dias (depende de WhatsApp Business API).
- Pendências do proprietário: número do WhatsApp, preço da mensalidade, conteúdo-isca da landing page.
- Imagens com IA: ligar só com o portão de aprovação (botões Aprovar/Recusar já existem).

## Painel do cliente — o que existe hoje
É uma ferramenta de vídeo de trailer da fase streaming:
- Criar vídeo 9:16 (editor de texto, fonte, moldura, efeitos), capa com pôster oficial, sinopse, elenco.
- Buscar trailer dublado no YouTube; baixar "auxiliar do PC".
- Enviar vídeo do PC; Minha logo; Conectar Instagram.
- Não mostra posts, aprovação, insights, contatos nem suporte.

Veredito: **refazer do zero**. O backend já tem quase tudo pronto e sem uso pela tela atual:
`/api/portal/posts` (lista), `/api/portal/posts/:id/decision` (aprovar/recusar), revisão, `/api/portal/leads`, `/api/portal/support`, `/api/portal/profile`, `/api/portal/instagram/start`, `/api/portal/connections`.
Falta criar: endpoint de insights (o RADAR já coleta seguidores e métricas por post no estado do agente).

## Painel Master — o que existe hoje (10 itens de menu)
| Item | Situação | Proposta |
|---|---|---|
| Visão geral | contagem de clientes diverge; "Uso por cliente" mostra números de exemplo | manter, com números reais |
| Clientes | lista + configuração dos agentes; nome/nicho não editáveis | manter, com edição de nome/nicho/status |
| Agent Core | 13 botões de agente soltos + execuções | simplificar: status + "rodar ciclo" |
| Postagens & custos | prévia e Aprovar/Recusar (feito ontem) | manter |
| Campanhas | campanha + comandos + diretrizes | juntar com Agentes |
| Notificações | chamados dos clientes | virar "Suporte" |
| Portal do cliente | prévia estática com textos de streaming | tirar; botão "ver como cliente" em Clientes |
| Odin & Leads | leads de todos | virar "Contatos (CRM)" |
| Novo cliente | formulário | juntar com Clientes |
| Integrações | OpenAI, Instagram (só GP/Ragnar), textos de streaming | manter, listar todos os clientes |

Textos de Global Play/Ragnar/streaming ainda no HTML do Master: linhas ~158, 188, 262, 293, 329–346 de `public/index.html`.
Os dois painéis já têm `viewport` e regras `@media`, mas o layout não foi desenhado para celular.

## Ordem proposta de execução
1. Painel do cliente novo, celular primeiro, usando as rotas existentes (+ rota de insights).
2. Master enxuto: 6 menus (Visão geral, Clientes, Postagens, Agentes, Contatos, Integrações) e limpeza dos textos antigos.
3. Funil EU QUERO → WhatsApp (quando o proprietário passar o número).
4. Landing page de captura e CRM; follow-up de 7 dias após WhatsApp Business API.
