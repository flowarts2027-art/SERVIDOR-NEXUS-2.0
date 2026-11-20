# Nexus 2.0 — instruções para agentes de trabalho

Antes de qualquer alteração, leia integralmente os sete arquivos em `docs/nexus-memory/`:
`PROJECT_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `TEST_RESULTS.md`, `NEXT_ACTIONS.md`, `CHANGELOG.md`.

Confira também o commit atual de `main`, o último deploy do GitHub Actions e o estado dos serviços relevantes. Trate registros de produção como fonte para afirmar resultados; documentação e código não são prova de execução.

Trabalhe em sequência: diagnóstico → hipótese → correção pequena → teste → evidência → próximo passo. Evite publicação real para testes; quando indispensável, faça uma única publicação controlada. Não restaurar Railway, Claire/Ragnar independentes, corte/edição de vídeos, trailer, instalador ou upload de logo.

Antes de terminar, atualize os documentos com o que realmente executou, resultados, problemas e o próximo passo exato. Não inclua credenciais, tokens ou segredos.

## Continuidade entre chat, Work e voz

Diretriz expressa de Rodrigo em 2026-09-27: registrar na memória permanente todas as conversas sobre o Nexus, sejam de chat, Work ou voz. Preservar pedidos, decisões, correções, resultados comprovados, pendências e próximo passo, com data e sem segredos. Registrar mesmo quando não houver mudança no código. Não tratar planos como ações concluídas.

No início de cada sessão com acesso ao projeto, consultar esta memória; antes de encerrar, atualizar os arquivos pertinentes em docs/nexus-memory. Quando a sessão não tiver acesso para ler ou gravar, informar a limitação e não afirmar que houve sincronização. Esta instrução não cria integração automática entre produtos nem acesso a conversas que não estejam disponíveis.

## Ponte de memória entre ChatGPT e Claude Code (2026-10-19)

Além dos sete arquivos obrigatórios, no início de **cada sessão com acesso ao repositório** leia:
- `docs/nexus-memory/BRIDGE_PROTOCOL.md`
- `docs/nexus-memory/TASK_BOARD.md`
- `docs/nexus-memory/HANDOFF_CHATGPT.md`
- `docs/nexus-memory/HANDOFF_CLAUDE.md`

**Regra fixa para o ChatGPT (2026-10-21):** criar os posts do dia da Flow Arts e enviar ao painel pela pasta `agendamentos/`, esperando a aprovação do Rodrigo. Siga `docs/nexus-memory/REGRA_POSTS_DIARIOS.md`. **Desde 22/10: carrossel, stories, Reels e feed — grade em `docs/nexus-memory/FORMATOS_POSTAGENS.md` (Flow Arts e Quatree Dog). NUNCA repetir imagem entre posts, cartões e stories. Quatree: objetivo é VENDA, toda peça mostra produto (`docs/nexus-memory/QUATREE_DIRETRIZ_VENDAS.md`). GILTEC: um equipamento diferente por peça e carrossel sem cortar imagem larga (`docs/nexus-memory/CAMPANHA_GILTEC.md`).** Todo dia, 1 dos 3 posts usa a mensagem "App de agendar post não cria post" (`docs/nexus-memory/MARKETING_POSICIONAMENTO.md`).

Antes de começar, leia a **última passagem do outro assistente** e confira branches/PRs para evitar refazer trabalho. Ao terminar, registre no seu arquivo de handoff o que foi **realmente feito**, testes/links/pendências e próximo passo. ChatGPT escreve em `HANDOFF_CHATGPT.md`; Claude escreve em `HANDOFF_CLAUDE.md`; mantenha `TASK_BOARD.md` coerente com evidências. Esta memória fica em repositório **público**: não grave transcrições completas, dados pessoais, contatos de clientes, tokens, senhas ou prompts confidenciais. Acesso às conversas um do outro **não é automático**. Nenhuma mudança em produção ou gasto é autorizado por esta instrução.

## Sistemática de imagens do ChatGPT e novo foco da Flow Arts (Rodrigo, 02/11/2026)

**Toda campanha feita pelo ChatGPT segue `docs/nexus-memory/SISTEMATICA_IMAGENS_CHATGPT.md`:** uma imagem por geração (nunca mosaico ou grade), tabela da campanha antes de gerar, um dia por vez, a IA nunca desenha a logo (a logo oficial é carimbada depois). **Flow Arts agora foca só na automação do Instagram — sem busca de leads nas campanhas. Nunca usar #flowart nem #flowarts (malabarismo); usar #FlowArtsMarketing.**

## Regra permanente e bloqueante dos DOTs — imagem primeiro, carimbador depois (Rodrigo, 16/11/2026)

**Vale para TODOS os clientes e TODOS os DOTs/fluxos de arte.** Jamais solicitar à IA de imagem para gerar/desenhar/copiar qualquer logomarca junto com a fotografia ou composição. A geração de imagem entrega uma **base limpa, sem logo**. **Somente após a aprovação da base**, o DOT **carimbador** (ou composição técnica equivalente por sobreposição, se disponível e verificada) insere o **arquivo gráfico ORIGINAL e aprovado da marca do cliente**, sem renderização por IA, reconstrução, imitação ou alteração do logotipo. Separar e registrar as duas etapas.
- Dante/Maestro entrega ao carimbador a base aprovada, o identificador do cliente e o arquivo oficial identificado; Maya não desenha logos; Clara confere a arte FINAL já carimbada; Bento só envia ao painel após esse parecer. Se não houver carimbador operacional no ambiente, não fingir execução nem enviar arte com marca inventada.
- Se a imagem já tiver logo incorreta, **retomar a base limpa** (ou remover tecnicamente a marca errada sem afetar a foto) antes de aplicar o selo original. Nunca sobrepor o correto ao incorreto, nem gerar toda a foto outra vez só para tentar acertar a logo.
- Verificar identidade, número/contato associado à marca, proporção, posição, legibilidade, duplicação do WhatsApp e formato (feed 4:5; stories 9:16). Marca original obrigatória e não localizada = **BLOQUEADO_POR_ATIVO**; marca incorreta ou etapa não comprovada = **REPROVADO**, sem envio.
- Documentação dos DOTs é regra de trabalho, **não comprova** que o carimbador foi instalado, acionado ou testado no Nexus. Validar separadamente o executor real e a saída final.
- **Executor real do carimbador (18/11/2026, atualizado no mesmo dia): o Nexus cola SÓ a logo.** Toda arte que chega ao painel (conector, Master ou painel do cliente), com ou sem texto, recebe apenas a logo ORIGINAL salva no Master (`config.brand.logoKey`): canto de cima à direita; Daniela Martins embaixo, no meio. **O Nexus nunca escreve título, vantagens ou botão** (`NEXUS_WRITES_TEXT_ON_ARRIVAL = false` em `cloudflare/src/art-frame.js`); texto, só no ChatGPT. Deixar livre o lugar da logo. O ChatGPT nunca aplica logo, nem por geração nem por edição.

## Moldura da Daniela Martins (Rodrigo, 20/11/2026)

**Exceção à regra "o Nexus nunca escreve texto", só para `daniela-martins`.** Toda foto SEM texto que sobe no painel dela (Gemini, ChatGPT, Master ou conector) ganha a moldura dela: foto cobrindo a tela, painel verde-oliva #746E44 com linha dourada, título, 3 tópicos (story: 2), caixa dourada chamando para agendar com a Daniela, frase e botão COMENTE QUERO, e a logo do Master na faixa de baixo. Textos revisados em `scripts/social/campanha/textos_daniela.json` (camadas feitas no deploy por `scripts/social/moldura_daniela.py`); a IA grátis só responde "já tem texto?" e "é sobrancelha?". Arte que já chega com texto só recebe a logo, como antes. As fotos vêm do Gemini (Gem "FOTOS NEXUS"): POST com o assunto no lado ESQUERDO (o painel cobre a direita); STORY com o assunto na parte de CIMA (o painel cobre de 43% para baixo). Textos nunca mandam a cliente a médico ou outro profissional.

## Imagens da Maskara Assessoria (Rodrigo, 18/11/2026)

**Toda imagem da Maskara (ChatGPT e DOTs) segue `docs/nexus-memory/REGRA_IMAGENS_MASKARA.md`:** contexto de empresa legalizada no início do pedido, arma sempre parada (mesa, bancada ou maleta), nunca na mão nem apontada, foto realista escura com dourado, sem texto e sem logo. Se o gerador bloquear, refazer a cena sem a arma; não insistir nem tentar burlar o filtro.

## Horários de publicação (Rodrigo, 05/11/2026)

**Clientes nunca publicam no mesmo minuto.** Cada cliente tem um minuto fixo na hora e o story sai 5 minutos depois. Ver `docs/nexus-memory/REGRA_HORARIOS_CLIENTES.md`.

## Master: nome do painel e postagens faltando (Rodrigo, 05/11/2026)

**Trocar o nome do painel nunca muda o id do cliente.** O quadro "Postagens faltando" confere 3 dias contra o plano de 2 posts + 2 stories, e o botão "Criar com agente (grátis)" publica sem esperar aprovação. Ver `docs/nexus-memory/REGRA_MASTER_NOME_E_POSTAGENS.md`.

**O quadro "Postagens faltando" saiu da tela do Master a pedido do Rodrigo em 11/11/2026.** Não recolocar sem ele pedir. A troca automática de post com erro continua no servidor e não deve ser desligada.

## Envio de artes (Rodrigo, 05/11/2026)

**Toda arte segue `docs/nexus-memory/REGRAS_ENVIO_ARTES.md`:** formato obrigatório, tamanho certo, imagem certa não é alterada e o Nexus nunca corta ou encolhe sozinho.

## Cliente nunca fica sem post (Rodrigo, 05/11/2026)

**Post com erro é substituído sozinho e publicado sem esperar aprovação.** Exceção à regra geral de aprovação, só para substitutas. Daniela Martins, Quatree Dog, Adimax e GILTEC não recebem imagem gerada. Ver `docs/nexus-memory/REGRA_CLIENTE_NUNCA_SEM_POST.md`.

## Marca do cliente (Rodrigo, 05/11/2026)

**Logo, cores e palavra do botão vêm do Master.** Antes de criar arte, leia `docs/nexus-memory/clientes/<id>/marca.json` se existir. Ver `docs/nexus-memory/REGRA_MARCA_DO_CLIENTE.md`.

## Padrão fixo das artes (Rodrigo, 28/10/2026)

**Toda arte de qualquer cliente segue `docs/nexus-memory/PADRAO_ARTES.md`:** texto nunca em cima de pessoa (título numa faixa em cima, botão numa faixa embaixo, foto só no meio), texto escrito por código e nunca pela IA, fonte Montserrat ExtraBold, uma logo só (a verdadeira). A campanha diária da GILTEC, da Flow Arts e da Maskara (desde 28/10) é feita por `.github/workflows/nexus-campanha-diaria.yml`, com fotos da IA grátis do Cloudflare.

## Revisão de campanhas e DOTs (proposta de 27/10/2026)

Para tarefas envolvendo os oito DOTs de marketing (Dante, Lia, Maya, Caio, Ravi, Bento, Nilo e Clara), consultar também `docs/nexus-memory/DOTS_QUALITY_PROTOCOL_2026-10-27.md` e `docs/nexus-memory/DOTS_MARKETING_TRANSFERENCIA.md`. Estas instruções são protocolo de trabalho, **não** prova de instalação dos oito agentes. Verificar disponibilidade real das skills em cada ambiente.

Antes de alegar sucesso, separar geração, revisão visual, upload aceito pelo painel, aprovação do cliente e publicação comprovada. Não inferir publicação a partir de upload nem inferir upload da existência de arquivos. Em conflitos de grade ou CTA, usar o pedido mais recente aplicável ao cliente/data, documentando o conflito. A revisão visual de mídia final deve reprovar imagem repetida, logo incorreta, embalagens sem identificação, texto cortado ou artefato anatômico. Metadados não substituem revisão real.


## Quatree Dog — catálogo de referência obrigatório (30/10/2026)

Para TODA campanha da Quatree Dog, antes de planejar, gerar ou revisar artes e legendas, ler `docs/nexus-memory/clientes/quatree/CATALOGO_QUATREE_2026_DIRETRIZ.md` e consultar o PDF original **CATÁLOGO QUATREE 2026.pdf**. O documento define a responsabilidade de Dante, Lia, Maya, Caio, Ravi, Bento, Clara e Nilo, fidelidade de embalagem/produto/SKU e aprovação manual. Se o PDF original não estiver disponível, não afirmar que o consultou nem inventar embalagens. Esta regra não se aplica aos demais clientes.
