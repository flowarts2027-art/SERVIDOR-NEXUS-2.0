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

## Padrão fixo das artes (Rodrigo, 28/10/2026)

**Toda arte de qualquer cliente segue `docs/nexus-memory/PADRAO_ARTES.md`:** texto nunca em cima de pessoa (título numa faixa em cima, botão numa faixa embaixo, foto só no meio), texto escrito por código e nunca pela IA, fonte Montserrat ExtraBold, uma logo só (a verdadeira). A campanha diária da GILTEC, da Flow Arts e da Maskara (desde 28/10) é feita por `.github/workflows/nexus-campanha-diaria.yml`, com fotos da IA grátis do Cloudflare.

## Revisão de campanhas e DOTs (proposta de 27/10/2026)

Para tarefas envolvendo os oito DOTs de marketing (Dante, Lia, Maya, Caio, Ravi, Bento, Nilo e Clara), consultar também `docs/nexus-memory/DOTS_QUALITY_PROTOCOL_2026-10-27.md` e `docs/nexus-memory/DOTS_MARKETING_TRANSFERENCIA.md`. Estas instruções são protocolo de trabalho, **não** prova de instalação dos oito agentes. Verificar disponibilidade real das skills em cada ambiente.

Antes de alegar sucesso, separar geração, revisão visual, upload aceito pelo painel, aprovação do cliente e publicação comprovada. Não inferir publicação a partir de upload nem inferir upload da existência de arquivos. Em conflitos de grade ou CTA, usar o pedido mais recente aplicável ao cliente/data, documentando o conflito. A revisão visual de mídia final deve reprovar imagem repetida, logo incorreta, embalagens sem identificação, texto cortado ou artefato anatômico. Metadados não substituem revisão real.


## Quatree Dog — catálogo de referência obrigatório (30/10/2026)

Para TODA campanha da Quatree Dog, antes de planejar, gerar ou revisar artes e legendas, ler `docs/nexus-memory/clientes/quatree/CATALOGO_QUATREE_2026_DIRETRIZ.md` e consultar o PDF original **CATÁLOGO QUATREE 2026.pdf**. O documento define a responsabilidade de Dante, Lia, Maya, Caio, Ravi, Bento, Clara e Nilo, fidelidade de embalagem/produto/SKU e aprovação manual. Se o PDF original não estiver disponível, não afirmar que o consultou nem inventar embalagens. Esta regra não se aplica aos demais clientes.
