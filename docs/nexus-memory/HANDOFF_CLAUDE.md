# Passagem de trabalho — Claude Code → ChatGPT

Este arquivo é preenchido pelo **Claude Code** ao fim de cada sessão relevante para o Nexus / Flow Arts. Não é preenchimento automático nem acesso aos prompts privados do Claude. Consulte `BRIDGE_PROTOCOL.md` e `TASK_BOARD.md`.

## 2026-10-21 BRT — TAREFA PARA O CHATGPT: criar os 3 posts de hoje da Flow Arts (09h, 12h e 19h)
- **Origem → destino:** Rodrigo (via Claude Code) → ChatGPT. Pedido explícito do Rodrigo para registrar aqui; ele vai pedir ao ChatGPT para ler e executar.
- **Estado:** planejado. Nada criado, enviado ou agendado pelo Claude.

### ⚠️ Leia antes de tudo: o que é a Flow Arts
- **Flow Arts = agência de marketing e automação com IA** para pequenos negócios do Brasil, atendidos 100% online. Instagram: @flowarts2026.
- **NÃO é "flow arts" de circo.** Nada de acrobacia, malabares, poi, bambolê, bastão, fogo, contorcionismo, dança, palco, circo ou artistas performáticos. Se a imagem ou o texto lembrar isso, está errado: refaça.
- O que a Flow Arts vende: marketing e automação de Instagram 24h com IA, além de sites, fotos e vídeos para pequenos negócios.
- Público: donos de pequenos negócios (cafés, salões, lojas, restaurantes, prestadores de serviço) que não têm tempo para postar.
- Tom: próximo, direto, prático e confiante; frases curtas; pt-BR simples; transparente sobre o uso de IA.

### Regras (valem para os 3 posts)
- Formato: **post de imagem 4:5 (1080×1350)**. Sem vídeo (decisão do Rodrigo em 14/10).
- Imagem: fotografia realista, cores naturais, luz natural. **Sem tom azul, filtro azul ou neon.** Sem logo (é colocado depois). Uma cena clara. Pessoas só como donos de negócio ou clientes comuns.
- Texto na arte: só o título curto indicado abaixo, em português, sem erro de digitação. Confira letra por letra.
- Proibido: preços ou valores; citar Global Play, outros clientes ou concorrentes; inventar clientes, números, resultados ou depoimentos; prometer seguidores ou vendas; falar de streaming ou entretenimento.
- Legenda: gancho na 1ª linha → problema → dica → CTA do post → linha final do brinde: `Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁`
- Hashtags: `#FlowArts #MarketingDigital #Automacao #InteligenciaArtificial #PequenosNegocios`

### Post 1 — 09:00
- **Tema:** erros de imagem que afastam clientes de pequenos negócios.
- **Título na arte:** "Esse erro afasta seus clientes"
- **Gancho da legenda:** "Seu Instagram pode estar afastando clientes sem você perceber."
- **Conteúdo:** 3 erros comuns (foto escura e tremida, perfil sem bio clara, posts sem padrão) e como corrigir cada um.
- **CTA:** "Salve para usar depois."
- **Cena da imagem:** antes e depois do mesmo produto de uma padaria ou café, lado a lado sobre uma mesa: à esquerda, foto escura e amadora de celular; à direita, a mesma foto clara e profissional.

### Post 2 — 12:00 (dia 21 da campanha)
- **Tema:** perguntas que todo cliente faz antes de contratar marketing com IA.
- **Título na arte:** "Antes de contratar, você pergunta isso?"
- **Gancho da legenda:** "Você tem alguma destas 3 dúvidas antes de contratar marketing com IA?"
- **Conteúdo:** responder com honestidade 3 dúvidas: (1) "Imagem de IA parece falsa?" → por isso existe o exemplo grátis antes de contratar; (2) "Vou perder o controle do meu Instagram?" → nada é publicado sem a aprovação do cliente no painel; (3) "Deve ser caro?" → a IA reduz o custo de estúdio e produção; peça o exemplo grátis primeiro. Sem citar preço.
- **CTA:** "Qual dessas é a sua dúvida? Responda nos comentários."
- **Cena da imagem:** dona de um pequeno salão ou café, sentada no balcão, olhando o celular com expressão de dúvida, luz natural de fim de tarde.

### Post 3 — 19:00 (dia 21 da campanha)
- **Tema:** transparência — o que a IA faz e o que a gente revisa.
- **Título na arte:** "A IA cria. A gente revisa."
- **Gancho da legenda:** "Sim, usamos IA. E é por isso que você ganha tempo."
- **Conteúdo:** a IA ajuda a criar fotos, textos e ideias de post; uma pessoa revisa tudo; o cliente aprova no painel antes de qualquer publicação; nada sai sem o OK dele.
- **CTA:** "Siga a Flow Arts para mais dicas de marketing com IA."
- **Cena da imagem:** mesa de trabalho vista de cima: notebook com uma grade de fotos de produtos de um café, celular mostrando um feed, caderno com anotações de revisão e uma xícara de café; sem pessoas.

### Entrega esperada do ChatGPT
1. As 3 artes 4:5 e as 3 legendas completas, identificadas por horário (09h, 12h, 19h).
2. Antes de entregar, conferir: nenhuma imagem com circo, acrobacia ou malabares; texto da arte sem erro; sem tom azul; sem preço; sem cliente inventado.
3. Entregar ao Rodrigo para revisão. **Não publicar.** O Rodrigo sobe no painel e aprova; só depois o Nexus publica no horário.
4. Registrar o resultado em `HANDOFF_CHATGPT.md`, sem colar as imagens nem dados privados.

## 2026-10-21 BRT — Monitoramento passa a vigiar a Flow Arts (PR #338, integrado)
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido:** Rodrigo pediu, em branch própria e sem merge, trocar Global Play/Ragnar pela Flow Arts (`primeiro-teste`) no monitoramento e no teste noturno.
- **Diagnóstico (só leitura):** os alertas #331, #333, #334 e #335 eram falsos. O teste noturno e o Sentinel procuravam `globalplay-streaming` e `ragnar-one`, que estão arquivados e não aparecem mais em `/api/autonomy-health`; o `jq` saía com código 4. O #332 (`ok=false`) é real: `CREATOR`, `DESIGNER` e `FORMAT BUILDER` estão pausados desde 16/10 e ficam "stale".
- **Alterado (branch `fix/monitor-flowarts`):** `.github/workflows/nexus-overnight-regression.yml` confere o ciclo da `primeiro-teste` (sem exigir agentes frescos, por causa da pausa); `.github/scripts/nexus-autofix-policy.mjs` separa `CYCLE_CLIENTS` (Flow Arts) de `INSTAGRAM_CLIENTS`; testes em `nexus-autofix.test.mjs`. Nada em `cloudflare/` ou `public/`, então o merge não faz deploy.
- **Não alterado de propósito:** a checagem do Instagram continua nas contas antigas, porque `/api/instagram-publishing-health` só valida essas duas. Incluir a Flow Arts exige mudar o Worker (deploy) — decisão do Rodrigo. `nexus-audit.mjs` e o comando de `nexus-core-autonomy.yml` para `ragnar-one` também não foram mexidos.
- **Testes:** não rodados localmente (Node ausente). O CI do PR roda `nexus-autofix.test.mjs`; o teste noturno só usa a `main`, então só é comprovado depois do merge.
- **Resultado:** com OK do Rodrigo, PR #338 juntado (71df078). CI e Overnight Regression passaram em 71df078; sem deploy. Alertas #331, #333, #334 e #335 fechados como falsos. #332 segue aberto (agentes pausados).

## 2026-10-21 BRT — Auditoria da memória e correção do estado do CRM
- **Origem → destino:** Claude Code → ChatGPT
- **Pedido e objetivo:** Rodrigo pediu uma auditoria do Nexus (memória do ChatGPT + mudanças recentes no Git) e depois a correção da memória sobre o PR #330, numa branch própria.
- **Decisões confirmadas:** só documentação; nenhum código, deploy ou mensagem. `HANDOFF_CHATGPT.md` não foi editado (é histórico do ChatGPT); a correção ficou aqui, no `PROJECT_STATE.md` e no `TASK_BOARD.md`.
- **Executado e evidências:**
  - Lidos `BRIDGE_PROTOCOL`, `TASK_BOARD`, `HANDOFF_CHATGPT`, `HANDOFF_CLAUDE`, `PROJECT_STATE`, `KNOWN_ISSUES` e `AUDITORIA-NEXUS-2026-10-16`.
  - Git: `main` local = `origin/main` = f31375f (merge do PR #330, 20/10 10:47 BRT). O PR #328 também está na `main`. Diff de código desde 19/10: 9 arquivos (+414/−60), CRM e testes.
  - Corrigido: `TASK_BOARD` (linha CRM-INSTAGRAM-001 estava fora da tabela e dizia "sem deploy"; BRIDGE-001 atualizado) e `PROJECT_STATE` (nota de correção no topo). Branch `docs/memoria-merge-pr330`.
  - Testes não reexecutados: Node não está instalado na máquina desta sessão; `gh` também não, então o workflow de deploy não foi consultado.
- **Problemas encontrados para acompanhar:**
  - `PROJECT_STATE.md` (entradas de 12/10) cita telefone, CNPJ e um vazamento de senha pessoal. O repositório é público; avaliar com o Rodrigo se esses trechos devem ser resumidos.
  - "Prioridade zero" (Getify/MySQL) segue sem confirmação do Rodrigo.
  - CI vermelho no passo de overlay de vídeo desde 11/10 (ver `KNOWN_ISSUES`).
- **Estado:** integrado à `main` no PR #336 (be02f72); somente documentação, sem deploy.
- **Próximo passo para quem assumir:** conferir no GitHub Actions o deploy de f31375f e testar no Master um contato real do CRM, sem enviar mensagem. Ao registrar novas entregas, marcar o estado depois do merge.
- **Bloqueios / autorização necessária:** merge desta branch e qualquer teste em produção dependem do OK do Rodrigo.

## Instruções deste arquivo
- **Ao assumir:** leia a entrada mais recente em `HANDOFF_CHATGPT.md`, os sete arquivos de memória citados em `AGENTS.md` e o quadro `TASK_BOARD.md`.
- **Ao terminar:** acrescente no topo uma entrada com data/hora de Brasília, tarefa, decisões, arquivos/commits/PRs efetivamente alterados, testes reais e falhas, status de deploy, pendências e próximo passo para o ChatGPT.
- **Segurança:** não colar segredos, prompts confidenciais, conversas completas nem dados identificáveis de clientes neste repositório público.
