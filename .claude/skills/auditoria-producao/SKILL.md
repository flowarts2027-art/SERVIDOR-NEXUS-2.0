---
name: auditoria-producao
description: Auditoria "está pronto para vender?" do Nexus, do CRM ou de qualquer página nova, antes do merge, do deploy ou de abrir para clientes. Use quando o Rodrigo perguntar se pode lançar, se está tudo certo, ou depois de um merge grande.
---

# Auditoria de produção (Nexus e CRM)

Adaptado da skill `production-audit` do projeto ECC (licença MIT). Ver `THIRD_PARTY_NOTICES.md`.

Usar só o que está no repositório e no que o Rodrigo autorizou. Não mandar código para serviço de fora. Não publicar nada real para testar.

## Ordem
1. **O que vai sair:** qual branch, qual PR, quais arquivos. Lembrar: mudança em `cloudflare/**` ou `public/**` dispara o deploy do Nexus no merge da `main`; o CRM tem deploy próprio (`crm-deploy`).
2. **Mudanças recentes:** `git log --oneline -20` e `git diff --stat origin/main...HEAD`.
3. **Pontos sensíveis que existem de verdade:** login, contas separadas, cobrança (Pix/InfinitePay), webhooks da Meta, cron, IA, envio de mensagem, publicação.
4. **Testes e CI:** suíte passa? Banco precisa de migração? Tem como voltar atrás?
5. **Resposta curta:** PODE SAIR ou BLOQUEADO, com a lista do que arrumar.

## Lentes
- **Segurança:** rotas de admin separadas; senha/chave fora do navegador e dos logs; cada cliente só vê o dele (skill `seguranca-agente-ia`).
- **Dados:** migração não apaga coluna nem dado; repetir o deploy não quebra.
- **Dinheiro:** cobrança não duplica; link de pagamento é do banco do cliente certo; teste grátis conta os dias certos.
- **Meta/WhatsApp:** nada de envio em massa nem para quem não chamou; respeita a aprovação do Rodrigo.
- **Postagem:** horários dos clientes não batem; logo e formato certos; nada publica sem aprovação (exceto a substituta da regra "cliente nunca fica sem post").
- **Celular:** a tela funciona no celular (o Rodrigo administra muito pelo celular), com uma rolagem só.
- **Custo:** nenhuma chamada paga de IA ligada sem o OK dele.

## Entrega
```text
RESULTADO: PODE SAIR / BLOQUEADO
Bloqueia (arrumar antes):
- ...
Pode ir, mas arrumar depois:
- ...
Prova usada (comando / teste / link):
- ...
```
Em português simples, frases curtas, no máximo 5 itens por lista.
