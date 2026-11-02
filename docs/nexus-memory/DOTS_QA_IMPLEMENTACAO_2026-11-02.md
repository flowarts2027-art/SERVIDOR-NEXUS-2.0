# DOTs — correções aplicadas em branch (02/11/2026)

Status: PR para revisão. Não é confirmação de deploy, executor de imagens autônomo ou publicação real.

## Entregues na branch
- Maestro: grade por formato/slot e validação 1080×1350 para posts/carrossel, 1080×1920 para stories; SHA-256 da peça; dHash opcional; registro de revisão Clara com hash vinculado à imagem; revisão posterior persistida via API Master.
- Carimbador: módulo Python separado, aplica logo oficial original sem redesenhar e verifica blob SHA dos ativos GILTEC, Flow Arts e Daniela. Flow Arts usa logo completo em vez do símbolo.
- GILTEC: carrinho de mão retirado do catálogo da campanha, trocado por soprador de folhas de mochila (equipamento confirmado). Bloqueio de itens proibidos no gerador.
- Gerador: detector perceptual de fotos repetidas por lote, até 3 tentativas; qualquer falha faz lote falhar, mesmo se algumas peças forem criadas.
- GitHub Actions: geração parcial bloqueia o envio; CI passa a executar testes .test.js do Maestro; testes do Carimbador incorporados ao CI Atlas.

## Limites importantes
- QA da Clara ainda recebe comprovante do executor autenticado; não faz comparação pixel a pixel automática com PDF, embalagem ou logo de produto externo. Nunca considerar a declaração por si só prova de revisão humana independente.
- O Maestro continua sem executor de imagem conectado na API do Nexus; rotas autenticadas registram tarefas e recebimentos, sem gerar nem publicar.
- Nilo 24h, sincronização automática da agenda e retry real de publicações existentes ainda não foram implantados.
- Não modifica artes aprovadas nem agenda real. Após merge, validar CI, deploy e uma campanha controlada antes de ativar fluxos adicionais.

## Evidências exigidas na próxima fase
Gerador real ligado ao Maestro; fiscalização visual das imagens finais; hashes e motivos; ID do envio ao Nexus; aprovação humana; link de publicação quando houver; reconciliação de 3 posts + 3 stories por cliente sem colisões.
