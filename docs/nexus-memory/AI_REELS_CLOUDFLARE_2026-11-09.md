# Proposta: vídeos IA no Nexus — 09/11/2026

Status: branch experimental sem merge/deploy, sem geração paga.

## Arquitetura
- GitLab `flow-arts-marketing-digital/servidor-nexus-flowarts`, backend Cloudflare Workers, binding AI e bucket R2 já declarados no projeto.
- Modelo Cloudflare Grok Imagine Video (`xai/grok-imagine-video`), 9:16, de 8 a 15 segundos; referência de tarifa em 09/11: 480p US$ 0,05/segundo e 720p US$ 0,07/segundo. Conferir tabela atual antes de ativar: https://developers.cloudflare.com/ai/models/xai/grok-imagine-video/
- Master autenticado acessa GET/POST `/api/master/ai-reel`; tela em Postagens > Outras ferramentas.
- Prévia e confirmação de preço, teto `NEXUS_AI_REEL_MAX_COST_USD`; `NEXUS_AI_REEL_ENABLED` ausente significa DESLIGADO.
- Saída salva no R2 em `videos/<clientId>/ai-reels`, acesso por rota protegida. Nenhuma alteração em post_ledger, aprovação, agenda ou Instagram.
- Clipes de B-roll sem nomes de produtos, logos ou textos criados pela IA. O vídeo ainda precisa ser inspecionado, ter marca oficial composta e passar pelo fluxo de aprovação.

## Cuidados e limitações
- Trata-se de um limite POR TENTATIVA; não existe ainda teto agregado de gastos, reserva atômica ou trava contra concorrência. NÃO ativar execução automática nem produção.
- Confirmar retorno de vídeo do provedor e cabeçalhos MP4 em ambiente de teste antes do merge.
- Confirmar direitos de uso comercial de cada modelo, tarifação, armazenamento e custos extras.
- A integração NÃO recupera o renderizador GitHub do Reel animado em 5 cenas. Migrar separadamente se necessário.
- A branch não substitui o Reel manual da Flow Arts do meio-dia nem altera a grade.
- Testes locais Node e dry-run Wrangler obrigatórios antes de merge; versão em produção pode diferir do GitLab; comparar com `nexus-deploy`.
- Deploy somente pelo PC `nexus-deploy`, após autorização expressa.
