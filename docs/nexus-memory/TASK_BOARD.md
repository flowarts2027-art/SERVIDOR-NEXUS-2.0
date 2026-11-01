## 2026-11-01 — Campanhas diárias conferidas; dois slots complementados localmente
- Flow Arts, Giltec e Maskara já têm os conjuntos principais do dia na branch `agendamentos`; 22 imagens existentes, 22 hashes Git distintos. Maskara mantém CTA de comentar QUERO.
- Criada localmente uma nova arte 4:5 + legenda para Flow Arts 12h, preenchendo o slot ausente.
- Quatree Dog (ID correto; não “4Dog”) tem calendário de domingo para 1 feed 09h. Rascunho 4:5 + legenda criado, mas é ilustrativo; a campanha exige foto real do representante na Pet Village. Não enviar/publicar até substituir pela foto autorizada.
- Giltec é cliente adicional encontrado na árvore ativa. Luciana Carvalho não foi localizada com cadastro/briefing verificável.
- Nenhum upload ao painel foi confirmado: não há run do workflow para o commit do dia; binários novos permanecem no pacote local. Nenhuma aprovação/publicação.

# Quadro compartilhado de tarefas — Flow Arts / Nexus

## 2026-10-26 — Artes diárias em revisão
Rascunhos locais preparados para Flow Arts e Maskara; Quatree Dog está em mockup e precisa de validação com packshots oficiais. Luciana Carvalho segue sem briefing verificável. **Não houve upload ao painel nesta execução**; os binários não foram gravados na branch. Próximo passo: revisão e transferência segura dos arquivos.


## 2026-10-23 — MASKARA: campanha anterior apagada; refação fotográfica em andamento
Rodrigo reprovou as artes didáticas.42posts antigos removidos do painel, zero restantes (Actions39948848202). Arquivos retirados. Nova ordem: imagens realistas de armas de fogo, estande de tiro e material tático, texto curto para captar clientes do serviço documental. Nenhuma nova campanha reenviada ainda. A confirmação anterior de42uploads é histórica e foi substituída por esta retirada.

## 2026-10-23 08h43 BRT — MASKARA-7D-001: 42 conteúdos no painel
**Concluído o envio**, aguardando aprovação: 3 posts + 3 stories/dia, 24–30/10, 09h/12h/19h. Reels às12h em25/27/29. [Actions39947767760](https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0/actions/runs/39947767760) success; logs confirmam42uploads novos, sem falhas/duplicatas/horários pulados. 60cenas distintas, QA aprovado. Nenhum aprovado/publicado pelo assistente. Próximo: Rodrigo revisar/aprovar e conferir conexão Meta/DOCUMENTOS. Detalhes no HANDOFF_CHATGPT.

## 2026-10-23 07h05 BRT — Quatree de hoje refeito e reenviado
Pedido novo de Rodrigo substitui o conteúdo anterior: sete agendamentos / nove imagens inéditas com embalagem e venda, mesmos diretórios/horários de 23/10. Commit `675399d` na branch `agendamentos`; Actions [39936394814](https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0/actions/runs/39936394814) success com sete uploads confirmados esperando aprovação. QA visual, dimensões e hashes aprovados. Próximo passo: Rodrigo revisar/aprovar no painel. Não reenviar. Detalhes no topo do HANDOFF_CHATGPT.

## Atualização prioritária —23/10, stories e imagens exclusivas
Concluído envio corretivo: **3stories exclusivos09h/12h/19h em CADA perfil**, novo carrosselQuatree15h e ReelFlow12h sem reutilizar cartões/feeds. Execução39891196118 success,8uploads aguardando aprovação e antigos cancelados. Espelhamento feed→story desativado e implantado(39890408576). **Nunca repetir imagem entre formatos.** Esta ordem substitui os resumos anteriores de5conteúdos/1story ou carrossel com feeds reutilizados. Detalhes no topo HANDOFF_CHATGPT e FORMATOS_POSTAGENS. Próximo passo: aprovação de Rodrigo no painel.

## 2026-10-22 23h24 BRT — Campanhas de 23/10 concluídas no envio
- **POSTS-2026-10-23:** cinco conteúdos Flow Arts enviados (09h carrossel, 10h30 story, 12h Reel, 16h story, 19h feed); três feeds Quatree preservados/corrigidos + carrossel 15h e story 18h. Exceção complementar Quatree só para 23/10; rotina segue FORMATOS_POSTAGENS.md.
- Evidências: Actions 39888688531 (oito uploads confirmados) e 39889202971 (TABELA corrigido nas legendas 09h/19h do Quatree, pending, sem duplicação). Tarefa de 06h desativada pois executada agora. Detalhes/limites no topo do HANDOFF_CHATGPT.
- **Próximo passo:** revisão/aprovação no painel, sem recriar os posts de 23/10. Cinco Flow Arts já apareceram como aprovados/agendados na interface; esta sessão não os aprovou nem publicou.

**Regra:** só marcar `concluído` com evidência. `PR aberto` não significa `no ar`. Este quadro é um índice de transferência, não substitui `NEXT_ACTIONS.md`, `PROJECT_STATE.md` nem o rastreamento de PRs.

| ID | Objetivo | Responsável preferido | Estado em 19/10/2026 | Próximo passo |
| --- | --- | --- | --- | --- |
| BRIDGE-001 | Protocolo de memória entre ChatGPT e Claude | ChatGPT | **Integrado à `main` no PR #316**; Claude leu os handoffs e registrou a primeira passagem em 21/10/2026 | Manter os dois handoffs atualizados ao fim de cada sessão. |
| CRM-INSTAGRAM-001 | Contato manual do CRM: abrir Instagram/Direct ou WhatsApp com mensagem e modelo do nicho, sem envio automático | ChatGPT implementou | **Na `main`** pelos PRs #328 e #330 (merge f31375f, 20/10 10:47 BRT); main faz deploy automático, mas o deploy e o uso real **não foram conferidos** | Conferir no GitHub Actions se o deploy de f31375f passou; depois testar no Master um contato real (perfil certo, texto do nicho, anexo manual) sem enviar mensagem. |
| FLOW-CAPTA-001 | Aperfeiçoar o Captador **já existente no portal de cada cliente**, por nicho, com qualificação e follow-up seletivo; simplificar o Caçador duplicado no Master sem perder administração | **Claude Code** implementa; ChatGPT define marketing | Requisitos registrados no `HANDOFF_CHATGPT.md`; implementação ainda não realizada | Auditar `captador.js`, `public/captador.js`, `daily-prospects.js` e CRM; qualificar empresas, contato inicial manual no Instagram quando aplicável, zerar listagem visual após busca sem resultados, arquivar fracos/sem interesse e acompanhar só leads pertinentes. Preservar dados, permissões e isolamento dos assinantes; propor PR com testes. |
| FLOW-MIDIA-001 | Conectar solicitação de conteúdo do marketing (ChatGPT/Work), implementação técnica (Claude) e fila de mídia no Nexus, preservando aprovação humana | Claude Code implementa e testa; ChatGPT cria/revisa briefings e artes | **Requisitos registrados, nenhuma automação integrada validada** | Auditar upload, R2, agendamento, aprovação e permissões já existentes; definir tickets sem dados privados, estados da fila, aviso de falhas e fluxo manual do vídeo Flow; propor PR pequeno, validar custos/APIs e testar ingestão sem publicar. |
| POSTS-DIARIOS-001 | ChatGPT cria 3 posts por dia (09h, 12h, 19h) e salva em `agendamentos/AAAA-MM-DD/HHMM/`; o GitHub sobe para o painel esperando aprovação | ChatGPT cria; Claude fez o fluxo; Rodrigo aprova | **Regra fixa** em `REGRA_POSTS_DIARIOS.md` (21/10). Fluxo na `main` (PRs #343 e #346). Envio real **testado** em 21/10 (execução 39682635642): post de teste chegou ao painel esperando aprovação | ChatGPT segue a regra todo dia a partir de 22/10; Rodrigo aprova no painel. |
| POSTS-2026-10-22 | Criar e enviar ao painel os 3 posts de hoje (09h, 12h, 19h) com imagens e legendas | Plataforma IA do Rodrigo (ChatGPT pelo plano dele) criou; Rodrigo enviou e aprova | **No painel, esperando aprovação:** commit `b1cbf8a` em `agendamentos/2026-10-22/` (0900, 1200, 1900); fluxo com sucesso (execução 39772024382) | Rodrigo aprova no painel. ChatGPT **não** cria estes de novo. |
| POSTS-2026-10-21 | Criar os 3 posts de hoje da Flow Arts (09h, 12h, 19h), 4:5, sem confundir com circo/acrobacia | **ChatGPT** cria; Rodrigo revisa e aprova no painel | Briefing completo no topo de `HANDOFF_CLAUDE.md` (21/10); nada criado ainda | ChatGPT lê o briefing, cria artes e legendas, entrega ao Rodrigo sem publicar e registra em `HANDOFF_CHATGPT.md`. |
| QUATREE-CAMP-001 | Campanha de 30 dias do Quatree Dog (@ericsson_quatree): posts + busca de lojas | ChatGPT cria artes e legendas com o material do cliente; Rodrigo aprova | **Planejado (22/10):** plano em `CAMPANHA_QUATREE_30D.md`; esperando os banners do cliente e o aceite do convite de testador | ChatGPT prepara a semana 1 quando o Rodrigo mandar os banners. |
| OFERTA-197-001 | Oferta nova no site e no robô: Básico R$ 197 sem entrada, fundador R$ 147 (3 vagas até 30/11), garantia, cancelar pelo WhatsApp, resposta automática no Básico, código de pedido, "3 posts grátis" na mensagem do CRM de comida | Claude implementou; Rodrigo aprova | **Na `main`** (PR #378, merge b34a6c7 pelo Rodrigo, 22/10); 574/574 testes; deploy automático | Conferir o site no ar. |
| LANCAMENTO-FUNDADOR-001 | Fechar 3 clientes fundadores de comida até 30/11 e medir pedidos com código e horas por cliente | Rodrigo vende; ChatGPT faz posts; Claude ajusta o Nexus | **Planejado (22/10)**: exemplos reais até 26/10, lançamento 05/11 | Rodrigo faz os 3 posts grátis para 1 padaria e 1 café conhecidos. |
| FORMATOS-001 | Carrossel, stories, Reels e feed na Flow Arts (5 por dia) e no Quatree (2 a 3 por dia) | ChatGPT cria; Rodrigo aprova | **Regra registrada (22/10)** em `FORMATOS_POSTAGENS.md`; vale de 23/10 | ChatGPT segue a grade nova a partir de 23/10. |
| PLANOS-PIX-001 | Planos com nomes curtos; /cadastro com escolha do plano e Pix (CNPJ); aprovação no Master; plano no painel do cliente; Master com leitura fácil | Claude implementou; Rodrigo aprova | **No ar** (PR #381, merge 3d84d1f; deploy 39889673145 success; /cadastro conferido no navegador com os 8 planos, 22/10 23h30) | Primeiro cadastro real: Rodrigo confere o Pix no banco e aprova no Master. |
| QUATREE-VENDA-001 | Conteúdo do Quatree focado em venda: toda peça com produto | ChatGPT cria; Rodrigo aprova | **Diretriz registrada (23/10)** em `QUATREE_DIRETRIZ_VENDAS.md`; auditoria de 23/10: 3 de 9 peças com produto | ChatGPT segue a diretriz no próximo conteúdo. |
| MASKARA-7D-001 | Refazer campanha 24–30/10 com fotografia realista para captar clientes | ChatGPT cria; cliente aprova | **Campanha anterior apagada:42removidos,0restantes. Nova produção em andamento** | Usar armas/estande/material tático conforme Rodrigo; não reenviar artes didáticas. |
| FLOW-ARTES-001 | Uma imagem 4:5 com quatro cenas em 2× 2 para os 21 nichos, integrada ao Master/CRM/vitrine | ChatGPT implementou e implantou | **Implantado**: PR #367 e 900fec9; deploy 39858182963 success. Navegador confirmou 21 páginas/imagens 1080× 1350.561/561 testes. | Usar Master → Exemplos e baixar arte no CRM. Sessão Master autenticada não inspecionada; verificação HTTP opcional 403 registrada no handoff/KNOWN_ISSUES. Nenhuma arte pendente de envio. |

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
