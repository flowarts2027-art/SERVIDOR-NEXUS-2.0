# Nexus 2.0 — Recuperação segura

Repositório novo depois do bloqueio da conta GitHub anterior. **Este repositório ainda NÃO contém o código recuperado do Nexus.**

## Inventário confirmado (10/10/2026)

- GitHub novo: `flowarts2027-art/SERVIDOR-NEXUS-2.0`.
- GitHub antigo: `globalplay27/SERVIDOR-GLOBAL-PLAY`, indisponível pela conta vinculada.
- Registros anteriores indicam deploy do Worker `servidor-nexus` em 09/10/2026 na Cloudflare, associado a D1 e R2.
- O proprietário informa que a conta Cloudflare continua operando. **Não executar deploy, delete nem reset dos dados** durante a recuperação.

## Primeiro passo no Windows

Instale Node.js, abra o PowerShell numa pasta vazia e execute:

```powershell
npx wrangler@4 login
npx wrangler@4 init --from-dash servidor-nexus --no-delegate-c3
```

O login deve acontecer pela tela oficial da Cloudflare. O segundo comando tenta obter uma cópia **local** do Worker. Se a CLI pedir permissão para publicar/deploy, **não autorize**. Documentação oficial: https://developers.cloudflare.com/workers/wrangler/commands/workers/#init

## Próximas etapas

1. Verificar os arquivos recuperados e criar ZIP local.
2. Identificar arquivos estáticos, configurações, agendamentos e recursos D1/R2 (recuperação separada).
3. Remover segredos e dados pessoais antes de qualquer commit.
4. Reconstruir código, testes e fluxos GitHub Actions somente em ambiente de teste.
5. Validar painéis, agentes, Instagram e editor de vídeo antes de qualquer alteração em produção.

**Atenção: este repositório está PÚBLICO.** Não enviar tokens, senhas, `.env`, `.dev.vars`, credenciais Meta/Instagram, chaves OpenAI, dados de clientes, nem backups D1/R2. Mude a visibilidade para privada antes de importar qualquer material confidencial.

A exportação do Worker pode não recuperar todo o código-fonte original, assets nem histórico Git. Recuperar a versão publicada não é o mesmo que restaurar o projeto integralmente.
