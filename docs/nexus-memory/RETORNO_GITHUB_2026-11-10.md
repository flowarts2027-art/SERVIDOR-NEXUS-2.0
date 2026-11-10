# Retorno ao GitHub — Nexus 2.0 (10/11/2026)

## Decisão
- O GitHub `flowarts2027-art/SERVIDOR-NEXUS-2.0` voltou a ser o repositório principal do projeto.
- Não fazer novos pushes ao GitLab `flow-arts-marketing-digital/servidor-nexus-flowarts`.
- O GitLab deve ser **arquivado (reversível), não excluído**, depois de conferir dependências. Arquivar mantém o histórico exclusivo do GitLab.
- Nenhum deploy/ativação de publicação do Instagram está autorizado por esta migração. Manter pausadas as postagens da Flow Arts e do Nexus AI, conforme orientação de 09/11, até liberação expressa.

## Inventário confirmado pelo conector
1. GitHub disponível com permissão de administrador. A `main` recebeu o PR #608 em 10/11, contendo a árvore da `main` do GitLab na revisão `026e853e59ec378ceb2cad464678e9ac9311927f`. Arquivos importantes foram comparados por blob SHA e coincidiram.
2. O GitLab tem dois projetos: `servidor-nexus-flowarts` (código) e `nexus-2-0` (vazio). Ambos ainda não estavam arquivados na verificação.
3. As branches `claude/graphify-regra-tokens`, `claude/grupo-quatree-dog`, `claude/nomes-paineis`, `claude/painel-cores-quatree`, `claude/planos-cartoes-celular`, `claude/quatree-logo-cores`, `claude/saude-instagram-clientes-ativos` e `claude/vigiar-clientes-instagram` tinham exatamente o mesmo commit de ponta nos dois serviços.
4. A branch `agendamentos` no GitHub está mais adiantada que a versão correspondente do GitLab, cujo commit `b3d50a9` já existe no histórico do GitHub.
5. A branch experimental `feat/ai-reels-cloudflare-preview-20261109` só existia no GitLab; seu conteúdo alterado foi preservado na branch GitHub `archive/gitlab-ai-reels-preview-20261109`, **sem merge nem deploy**. Os três arquivos foram verificados com o mesmo blob SHA.
6. Os commits próprios do GitLab não foram transplantados integralmente como histórico Git, embora o conteúdo da `main` tenha sido salvo. Por isso, não apagar o repositório GitLab.

## Antes de arquivar o GitLab
- Confirmar no PC (`git remote -v`) que o GitHub é o remote principal e que não existem alterações locais não enviadas.
- Conferir qual repositório é usado por Cloudflare Workers Builds, GitHub Actions, Render, scripts locais, bots Graphify, ingestão de artes e outros webhooks. Não trocar tokens/segredos em documentação pública.
- Verificar que nenhuma integração em produção dependa ainda da URL do GitLab. O conector não confirmou o estado de todos os pipelines ou integrações.
- Só então arquivar os dois projetos no GitLab pelas configurações dos projetos; não excluir a conta nem os repositórios. Desconectar o conector GitLab do ChatGPT é opcional e **não** equivale a arquivar projetos.
- Validar no GitHub que as rotas/branches e o acesso de leitura e escrita funcionam, sem disparar publicação ou deploy.

## Segurança operacional
A recuperação da conta GitHub e a cópia de arquivos **não** comprovam que a Cloudflare voltou a fazer deploy automaticamente. Manter o fluxo manual com autorização explícita e nunca ativar automações de postagem apenas por causa da migração.
