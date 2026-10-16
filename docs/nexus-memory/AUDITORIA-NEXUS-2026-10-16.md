# Auditoria do Nexus — 16/10/2026 (leitura; só o que foi comprovado)

Pedido do Rodrigo: parar os erros dos agentes (cada erro custa saldo) e corrigir antes de chegar ao cliente. Pausa de imagens pedida às 14:40 (BRT).

## Feito agora
- PAUSA: Creator, Designer e Format Builder desligados via Master (agent-core PATCH) em `primeiro-teste` e `demo-cafe`, às 17:44 UTC. Para religar: PATCH modules {creator,designer,"format-builder"}:true. Nada religado sem OK do Rodrigo.

## Comprovado
1. Loop de reprovação sem limite: Designer reprova a arte, Creator gera outra (paga de novo). Corrigido no deploy 2e1ae22 (limite de 3 reprovações; motivo gravado).
2. Frase da imagem cortada no meio gerava arte fraca (nota 40). Corrigido no deploy 2e1ae22.
3. Revisor reprovava por margem do texto mesmo com notas passando (75/60/70/60). Corrigido no deploy 608ab8f (aprova com aviso para o Rodrigo decidir).
4. Sem saldo ficava travado para sempre. Corrigido no deploy 0909b5c (expira em 15 min).
5. Post preso depois de 3 tentativas. Corrigido no deploy 72f5dce (+1 tentativa após 20 min, máx. 2 vezes).
6. Painel do cliente liberava "Aprovar" com a revisão automática ainda pendente (qualityGates.designer = "pending"). Correção na branch fix/painel-so-aprova-revisado (aguarda OK).
7. Chamados "Correção solicitada" ficam "resolved" mesmo com o problema igual (12:00 e 19:00 pediram ajuste várias vezes desde 15/10).

## Comprovado, NÃO corrigido
- Reel virou post de imagem desde 14/10 (FLOWARTS_REAL_VIDEO_REELS=false), mas a legenda da IA ainda diz "Envie este vídeo" e o Copy Chief aprova.
- O modelo escreveu "Faça este teste" na arte, sem o "agora" do prompt (texto da imagem difere do pedido).
- Custo por agente/imagem aparece 0 no Master. O custo real só vem do saldo estimado da OpenAI.
- Revisor visual olha só 1 imagem por rodada.
- AUDITOR só compara desempenho e duplicidade; ninguém audita qualidade/custo antes do cliente.
- ODIN chegou a 147 s numa execução.
- Rodadas do cron com atraso irregular (ex.: 16:17 → 17:01 UTC).

## Não verificado
- Saldo da OpenAI é estimativa (US$ 9,58 às 17:20 UTC).
- Causa dos 9 pendências do SUPORTE (são chamados do próprio Rodrigo, todos "resolved").
