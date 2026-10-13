# Auditoria do Nexus — 2026-10-13

Pedido do Rodrigo pelo app: "faça uma auditoria no Nexus e veja o que pode ser melhorado".
Feita na cópia de `main` 1f879fa. Nada foi alterado em produção.

## O que está bem (conferido no código)
- Nenhuma chave ou senha encontrada nos arquivos do repositório (que é público).
- Webhooks do WhatsApp e do Instagram conferem a assinatura da Meta (`x-hub-signature-256`).
- Login com limite de tentativas; rotas internas (`/api/state`, `/api/openai/responses`, `/api/system/*`, emergência) exigem autenticação.
- Testes locais: 320/320.
- Deploy da Cloudflare funcionando (último: commit 1f879fa, sucesso).

## O que melhorar, em ordem de prioridade
1. **Post aprovado que falha some sem aviso.** `scheduler.js` marca como `expired` (`stale_ready_expired`) todo post `ready/scheduled/failed` criado há mais de 24 h, sem olhar tentativas nem aprovação. O Rodrigo não fica sabendo. Sugestão: avisar no painel antes de expirar e não expirar post aprovado sem aviso.
2. **CI vermelho há dias.** Causa achada: `scripts/test_premium_editor_layout.cjs` (testes 2 e 3) procura botões do editor de vídeo que foi retirado do painel. Por isso os passos seguintes do CI (bundle Wrangler etc.) nunca rodam. Decisão do Rodrigo: apagar o passo do editor de vídeo ou atualizar o teste.
3. **Integração antiga da Cloudflare.** O Worker ainda aparece ligado ao repositório antigo globalplay27/SERVIDOR-GLOBAL-PLAY (Workers Builds). Pode sobrescrever o deploy certo. Desligar no painel da Cloudflare.
4. **Rota sem uso.** `/api/instagram-publishing-health` (pública) só olha Global Play e Ragnar, que estão arquivados. Remover ou trocar para Flow Arts.
5. **Token de verificação padrão no código.** `comment-autoreply.js` usa "nexus-flowarts-instagram" se `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` não existir. Como o repositório é público, colocar um valor próprio na Cloudflare. (Baixo risco: a assinatura da Meta continua sendo conferida.)
6. **Pendências antigas ainda abertas** (KNOWN_ISSUES): card do Master sem a Flow Arts; portal mostrando "Conecte o Instagram"; "Uso por cliente" sem consumo real; Política de Privacidade sem o trecho do WhatsApp com IA; CSS `#wa-thread-wrap[hidden]`.

## Próximo passo
Rodrigo escolhe por onde começar. Sugestão: item 1 (posts somindo) e item 2 (CI).
