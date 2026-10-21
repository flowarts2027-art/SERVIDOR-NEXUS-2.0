# Quadro compartilhado de tarefas — Flow Arts / Nexus

**Regra:** só marcar `concluído` com evidência. `PR aberto` não significa `no ar`. Este quadro é um índice de transferência, não substitui `NEXT_ACTIONS.md`, `PROJECT_STATE.md` nem o rastreamento de PRs.

| ID | Objetivo | Responsável preferido | Estado em 19/10/2026 | Próximo passo |
| --- | --- | --- | --- | --- |
| BRIDGE-001 | Protocolo de memória entre ChatGPT e Claude | ChatGPT | **Integrado à `main` no PR #316**; Claude leu os handoffs e registrou a primeira passagem em 21/10/2026 | Manter os dois handoffs atualizados ao fim de cada sessão. |
| CRM-INSTAGRAM-001 | Contato manual do CRM: abrir Instagram/Direct ou WhatsApp com mensagem e modelo do nicho, sem envio automático | ChatGPT implementou | **Na `main`** pelos PRs #328 e #330 (merge f31375f, 20/10 10:47 BRT); main faz deploy automático, mas o deploy e o uso real **não foram conferidos** | Conferir no GitHub Actions se o deploy de f31375f passou; depois testar no Master um contato real (perfil certo, texto do nicho, anexo manual) sem enviar mensagem. |
| FLOW-CAPTA-001 | Aperfeiçoar o Captador **já existente no portal de cada cliente**, por nicho, com qualificação e follow-up seletivo; simplificar o Caçador duplicado no Master sem perder administração | **Claude Code** implementa; ChatGPT define marketing | Requisitos registrados no `HANDOFF_CHATGPT.md`; implementação ainda não realizada | Auditar `captador.js`, `public/captador.js`, `daily-prospects.js` e CRM; qualificar empresas, contato inicial manual no Instagram quando aplicável, zerar listagem visual após busca sem resultados, arquivar fracos/sem interesse e acompanhar só leads pertinentes. Preservar dados, permissões e isolamento dos assinantes; propor PR com testes. |
| FLOW-MIDIA-001 | Conectar solicitação de conteúdo do marketing (ChatGPT/Work), implementação técnica (Claude) e fila de mídia no Nexus, preservando aprovação humana | Claude Code implementa e testa; ChatGPT cria/revisa briefings e artes | **Requisitos registrados, nenhuma automação integrada validada** | Auditar upload, R2, agendamento, aprovação e permissões já existentes; definir tickets sem dados privados, estados da fila, aviso de falhas e fluxo manual do vídeo Flow; propor PR pequeno, validar custos/APIs e testar ingestão sem publicar. |
| POSTS-DIARIOS-001 | ChatGPT cria 3 posts por dia (09h, 12h, 19h) e salva em `agendamentos/AAAA-MM-DD/HHMM/`; o GitHub sobe para o painel esperando aprovação | ChatGPT cria; Claude fez o fluxo; Rodrigo aprova | **Regra fixa** em `REGRA_POSTS_DIARIOS.md` (21/10). Fluxo na `main` (PRs #343 e #346). Envio real **testado** em 21/10 (execução 39682635642): post de teste chegou ao painel esperando aprovação | ChatGPT segue a regra todo dia a partir de 22/10; Rodrigo aprova no painel. |
| POSTS-2026-10-21 | Criar os 3 posts de hoje da Flow Arts (09h, 12h, 19h), 4:5, sem confundir com circo/acrobacia | **ChatGPT** cria; Rodrigo revisa e aprova no painel | Briefing completo no topo de `HANDOFF_CLAUDE.md` (21/10); nada criado ainda | ChatGPT lê o briefing, cria artes e legendas, entrega ao Rodrigo sem publicar e registra em `HANDOFF_CHATGPT.md`. |
| FLOW-ARTES-001 | Produzir artes 4:5 por nicho, quatro fotos em 2×2, para exemplos comerciais | ChatGPT / Work; Claude integra o resultado ao painel quando autorizado | Pedido em andamento em conversa, sem conclusão documentada aqui | Retomar briefing e referências visuais aprovadas; não afirmar que as 21 artes estão prontas. |

## Convenções de estado
`planejado` → `em andamento` → `PR aguardando revisão` → `implantado e verificado`. Use `bloqueado` se depender de autorização, credencial ou integração. Para trabalho só de documentação, `integrado` após merge e leitura confirmada, sem alegar alteração operacional.

## Critérios de aceite da ponte
- Ambas as ferramentas, **quando tiverem acesso ao GitHub**, sabem onde ler o resumo mais recente da outra.
- Cada uma registra o que foi executado, com evidência, deixando próximo passo e pendências claros.
- Não se afirma que há sincronização automática do histórico de chat, da tela, de prompts invisíveis ou de tarefas em execução.
- Não há secrets nem dados pessoais inseridos nos novos arquivos; a documentação continua separada do deploy e dos envios reais.

## 2026-10-21 — Correção de estado (Claude)
- As duas entradas abaixo diziam "aguardando publicação". A branch fix/crm-direct-mensagem foi juntada na `main` no PR #330 (f31375f) e a anterior no PR #328. Estado correto: na `main`, deploy e Instagram real não verificados. Ver linha CRM-INSTAGRAM-001 na tabela.

## 2026-10-20 — CRM Direct
- Branch fix/crm-direct-mensagem: link para Direct, cópia de abordagem por nicho e prévia editável. 536 testes + bundle e Chromium com Instagram simulado aprovados. Aguardando revisão/publicação manual e validação real no Instagram. Não há preenchimento automático garantido nem envio automático.

## 2026-10-20 — Canal manual do CRM
- Incluído na mesma branch fix/crm-direct-mensagem: seletor Instagram | WhatsApp, preferência local, texto por nicho revisável e download do modelo. 541 testes + bundle + Chromium com destinos simulados aprovados; aguardando publicação manual, sem envios reais.
