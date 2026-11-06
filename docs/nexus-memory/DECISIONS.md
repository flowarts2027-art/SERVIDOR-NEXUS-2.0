# Decisões e limites

## 2026-10-23 — Imagens autorizadas na memória e no repositório
- **Imagens liberadas (decisão do Rodrigo, 23/10/2026):** o ChatGPT e o Claude podem enviar imagens para a memória e para o repositório (artes, referências, fotos de produto e fotos dos clientes para os posts). Continua proibido subir imagem que mostre documento, CPF/CNPJ, telefone, senha, token ou print de conversa privada. Esta autorização substitui a proibição genérica de imagens privadas somente nesse escopo; não altera o envio de referências à OpenAI nem religa a geração paga pela API.
- **Envio ao painel autorizado (Rodrigo, 24/10/2026):** o ChatGPT pode enviar todo dia as imagens, vídeos e legendas de todos os clientes ativos para o painel, salvando na branch `agendamentos` (pastas `agendamentos/clientes/<cliente>/AAAA-MM-DD/HHMM/`). Tudo chega como "esperando aprovação": o ChatGPT não aprova nem publica. Não é preciso pedir nova autorização a cada envio.
- Escopo escolhido pelo Rodrigo: opção 2, regra documental do BRIDGE_PROTOCOL.md. A opção 1 (pixels privados enviados à OpenAI) não foi autorizada por esta decisão. Nenhum arquivo de imagem enviado nesta alteração.

## 2026-10-18 — Imagens por IA pausadas até ter mais clientes
- Rodrigo: assinatura do ChatGPT (~R$ 100/mês) sai mais barata agora; ele gera as imagens e sobe pelo Master. Religar a API quando houver clientes demais para fazer na mão (conta feita: empata por volta de 4–5 clientes; aí pôr o custo da imagem no preço do plano).
- Trava no código: `generateOriginalMedia` recusa com `image_generation_paused` se a variável NEXUS_IMAGE_GENERATION não for "on". Vale para Creator, Format Builder, agente de carrossel, campanha "IA" do cliente e emergência. Religar = criar NEXUS_IMAGE_GENERATION=on na Cloudflare, só com OK do Rodrigo.
- Master › Postagens › "Enviar carrossel pronto" agora lista todos os clientes ativos (antes só Flow Arts).

## 2026-10-18 — Padrão visual dos carrosséis (aprovado pelo Rodrigo)
- Referência: carrosséis de exemplo de salão e cafeteria (docs/referencias/carrossel-aprovado-*.jpg). Fotos do ChatGPT sem texto; títulos, logo e botão por código.
- Regra entrou no agente de carrossel (`carousel-agent.js`, Diretor de arte): foto aberta, corpo inteiro, luz do dia, cores vivas, negócio de bairro brasileiro, parede lisa no alto, e o roteiro das 5 cenas (celular pensativo → vazio e preocupado → sorrindo com o celular → clientes chegando → atendendo e olhando para a câmera).
- Fotos por API da OpenAI: Rodrigo NÃO quer (custa por foto). Ele gera no app do ChatGPT e manda aqui.

## 2026-10-17 — CRM no WhatsApp pessoal; Master em azul
- O CRM usa o número pessoal do Rodrigo (22 96481-6185). O número virtual da Meta é de teste (+1 555…) e só fala com até 5 números cadastrados; não serve para clientes. Retorno automático pela API fica para quando houver chip novo e cliente pagante (fora das 24 h a Meta exige mensagem modelo paga).
- O CRM não envia nada sozinho: lembra no dia certo e abre o WhatsApp com a mensagem pronta.
- O Master sai do preto e branco: azul, branco e cinza, letras maiores, menos informação solta (o resto fica em blocos fechados).

## 2026-10-16 — Carrossel: IA faz a foto, código escreve o texto
- Rodrigo não aceita texto errado na arte. No carrossel da Flow Arts a IA não escreve mais letras: o título, o rodapé, o logo e o botão "Comente QUERO" são colocados por código (fonte Inter). A IA só planeja (títulos conferidos no código) e gera fotos sem texto, revisadas por um revisor que olha a imagem.
- Padrão visual: carrossel de pet shop aprovado pelo Rodrigo (5 cartões: gancho, dor, solução, como funciona, chamada).
- O agente só fala com donos de pequenos negócios (público da Flow Arts). Para clientes futuros falarem com o público deles, precisa de outra versão.

## 2026-10-12 — WhatsApp com IA respondendo sozinha
- Rodrigo pediu um agente de IA respondendo no WhatsApp e autorizou falar preços. Isto substitui a regra antiga "IA só gera rascunho": a resposta automática existe, mas começa **desligada** e só liga pelo painel Master.
- Regra da Meta (desde 15/01/2026): proibido robô de conversa livre; permitido atendente de negócio com passagem para humano. O prompt limita a IA aos fatos da Flow Arts e manda chamar o Rodrigo para fechar/pagar, desconto, reclamação ou dúvida fora do roteiro.
- Fora da lista de preços da IA: "Instagram que responde sozinho" (R$ 197), por conflitar com "ainda não vender resposta automática a comentários" (empresa/visao.md). Rodrigo pode decidir incluir.
- Menu do Master passa a ter 7 itens (entrou WhatsApp).
- Número: teste da Meta agora; depois chip pré-pago dedicado (sem coexistência, que exigiria parceiro pago).

## 2026-10-11 20h45–21h — Novo app Meta "Flow Arts Nexus" (sem portfólio)
- Rodrigo apontou (com razão) que publicar o app não exige CNPJ: o NEXUS IA CENTRAL estava ligado ao portfólio "Rodrigo Carvalho" e por isso o Publicar exigia verificação. Novo app "Flow Arts Nexus" criado pelo Rodrigo SEM portfólio, caso de uso API do Instagram, testador flowarts2026, webhook https://…/api/meta/instagram/webhook verificado, campos comments e messages assinados, configurações básicas preenchidas, app PUBLICADO (Rodrigo, 20h59).
- Próximo: Master › Integrações › salvar ID + chave secreta do app do Instagram novo (Rodrigo digita), configurar redirect OAuth /api/oauth/instagram/callback no app novo e reconectar o Instagram da Flow Arts.


## 2026-10-11 17h47 — Atendimento para todo o Brasil
- Rodrigo: "vamos expandir o alcance do negócio para o Brasil todo, visto que é venda online".
- Flow Arts: público, hashtags (#PequenosNegocios no lugar de #RioDeJaneiro), temas, campanha, cenas das imagens, página /exemplo, visão da empresa e perfil de marketing (v2) agora falam de todo o Brasil. Sede continua no Rio (rodapés legais). profileVersion 2026-10-11g refaz rascunhos não aprovados.
- Café Brisa (demo) continua sendo um café do Rio: é só um exemplo.


## 2026-10-21 — Mais conteúdos nos planos mensais (Flow Arts)
- Rodrigo achou o valor alto para 12 conteúdos e mandou a arte de comparação de planos como modelo.
- Básico: **30 conteúdos/mês** (posts e carrosséis), preço igual (R$ 197 de entrada + R$ 397/mês). Com Vídeo: **60 conteúdos/mês** (Reels, carrosséis e posts), preço igual (R$ 297 + R$ 697/mês).
- A divisão por tipo não foi definida; o site não promete quantidades por tipo. Alterado no site, no rascunho do site e no atendente do WhatsApp.
- Atenção ao custo: 60 conteúdos com vídeo por cliente gastam mais IA e mais tempo de revisão.

## 2026-10-11 15h — Oferta "Instagram no Automático" (Flow Arts)
- Rodrigo pediu que Claude decidisse para começar ("depois eu modifico o valor").
- 12 posts/mês (4 Reels, 4 carrosséis, 4 posts); entrada R$ 297 + mensalidade R$ 697; preço de fundador para os 3 primeiros clientes, travado por 6 meses; sem fidelidade (aviso de 30 dias); Pix mensal.
- Base: mercado BR, pacote básico de 8–12 posts entre R$ 800 e R$ 1.500/mês (Jamile Fernandes 2026; mLabs).
- Não vender ainda: auto-resposta a comentários e conexão sem convite (dependem de App Review da Meta). Posts continuam sem citar preços.
- Documento: Claude Docs "Oferta Flow Arts — Instagram no Automático" (artifact 57da9395-b2c3-40c3-8b58-ad40e0f482b6).
- Pendente: medir custo de OpenAI por cliente durante 1 semana antes do primeiro contrato.


## 2026-10-11 — perfil de marketing da Flow Arts
- Criado `.agents/product-marketing.md` (contexto de marketing da Flow Arts), a partir de `client-brand.js` e respostas do proprietário.
- Sem pacotes/preços definidos: posts não citam valores. Concorrentes não nomeados.
- Global Play foi trabalho real (vídeos, criativos, automação), mas o proprietário decidiu **não citá-la** em posts nem como case.
- O arquivo não é lido pelos agentes do Worker; mudar o comportamento dos posts exige alterar `client-brand.js`.

## 2026-10-10 — contas de streaming paradas
- Global Play e Ragnar One não publicam mais. Retomar só com comprovação de licença do serviço e sem cartazes/trailers de terceiros. O Nexus segue com a conta Flow Arts (marketing).


## 2026-10-10 — escopo da limpeza
- Remover só o que nem o Worker, nem os testes, nem o CI referenciam. O fluxo de vídeo (Render `nexus-video-engine`, helper local, workflows de render) permanece até haver decisão explícita de cortá-lo, porque `github-video-render.js`, `wrangler.jsonc` (`NEXUS_DOWNLOADER_URL`) e `video-source-flow.test.mjs` dependem dele.
- Os dois deploys (`ci.yml` e `deploy-nexus-cloudflare.yml`) ainda coexistem. Não foi alterado: exige decisão sobre qual é o canônico.

- 2026-09-27: ligar coleta automática apenas nas duas contas autônomas existentes, em frequência horária e com prioridade inferior ao Publisher; respeitar `autoRun:false` já salvo. Não disparar DMs não solicitadas. Medir alcance, comentários e leads reais antes de atribuir queda de conversão ao criativo.

- Fonte operacional identificada em 2026-09-27: `globalplay27/SERVIDOR-GLOBAL-PLAY`, pasta `cloudflare/`. Revalidar GitHub e deploy em toda sessão.
- Manter inteligência/orquestração em um Nexus central com configuração e credenciais por cliente.
- Escopo: autorização Instagram, postagens automáticas, acompanhamento de postagens e desempenho.
- Não restaurar edição/corte de vídeo, trailer, instalador/aplicativo, upload de logo, Railway ou Claire/Ragnar como runtimes paralelos.
- Não fazer publicações repetidas para testar. Priorizar teste local/simulação; uma publicação controlada apenas quando indispensável.
- Custo: verificações determinísticas primeiro; gerar → validar → aprovar/publicar ou reprovar com motivo; limite finito de tentativas; falha terminal registrada.
- Não declarar corrigido com base em commit ou health. Exigir evidência de etapa e resultado em produção.
- Não gravar senhas, tokens ou valores secretos nestes documentos.
- Nesta auditoria não foi tomada decisão de alterar runtime sem examinar as linhas de produção do Ragnar e do post ruim.
- Autorizada em 2026-09-27 a conclusão do ciclo dos agentes no runtime existente. Primeira mudança escolhida: política única, fail-closed, para todos os caminhos de publicação e teto de três tentativas por post.
- A recuperação automática pode preencher somente mídia já autorizada/configurada no pool; não reativar geração paga nem repetir mídia publicada para mascarar falta de conteúdo.

## Retomada — 2026-09-27 20h UTC
Implementação incremental da visão somente no Global Play, conforme prioridade do proprietário. Não reativada geração paga de imagens. A análise visual usa API e limite diário existentes; falta de saldo/erro impede aprovação e é registrada. Nenhuma postagem de teste disparada.

## 2026-10-02 — decisão atual sobre vídeo no painel
- A instrução antiga de 2026-09-27 para “não restaurar edição/corte de vídeo” não representa mais o escopo atual do painel. Entre 01 e 02/10 o proprietário voltou a solicitar explicitamente a área `Vídeos`, upload local, geração e download do MP4; os commits recentes do `main` implementam esse fluxo. Não remover a aba ou o render por causa daquela decisão histórica.
- Continua proibido reintroduzir Railway. O fluxo de vídeo vigente usa Worker/R2 + GitHub Actions/FFmpeg.
- Limite escolhido para upload principal: 90 MB, abaixo do teto total de 100 MB da requisição no plano Cloudflare Free, para deixar margem a capa e multipart.

## 2026-10-03 — modelo completo Michael, preparado localmente
- Proprietário forneceu nexus-video.mp4 e d508edaee92dab30f7a2e822192dde70.mp4 e pediu as cinco partes do modelo: celular, lançamento/pipoca, elenco, avaliações e filmes parecidos. Confirmou Michael como filme do teste; capa oficial e sinopse dentro do celular; remover Slim e marcas repetidas.
- Causa da capa vazia confirmada no código: /media/library exige sessão de portal, mas o workflow fazia download sem cookies. Preparada rota /api/internal/video-render/poster protegida pelo token do job, com isolamento de cliente e rejeição de traversal.
- Preparado renderizador Python/Pillow/FFmpeg com cinco partes e preset Michael/2026. Pôster oficial de michael.movie; nove retratos e créditos verificados no Rotten Tomatoes; avaliações são sínteses em português de relatos reais, com atribuição; relacionados são sugestões editoriais, não resultados de recomendação automática.
- Celular/mão e pipoca são novos assets gerados pelo ImageGen com referência; composição segue a sequência do modelo, mas não é cópia idêntica quadro a quadro dos elementos gráficos originais. Não afirmar fidelidade exata sem conferência do proprietário.
- Render local real: outputs/michael-modelo-nexus.mp4, 30s, H.264/AAC, 1080x1920, 4687983 bytes. Cinco partes inspecionadas visualmente e decodificação completa sem erro. 102 testes existentes e dois novos testes do callback passaram; sintaxe JS aprovada.
- Primeira renderização foi descartada após sobrescrita concorrente dos PNGs durante leitura FFmpeg; refeita em pasta separada com playlist concat e verificada sem erro.
- Workflow novo seleciona o preset para Michael/2026. Outros títulos seguem o renderizador anterior; ainda não há catálogo automático genérico de elenco, avaliações e relacionados.
- Produção atual main 14a89ab62f793b058dac09c11fa4e9de55e6144a. Nenhuma renderização autenticada R2/GitHub executada nesta sessão; alteração ainda não implantada. Consulta HTTP do host a /health foi recusada com 403 e não é prova de serviço indisponível.
- Próximo passo: publicar a alteração para revisão, validar CI e implantação, depois executar upload -> render -> download autenticado do Michael no painel. Registrar evidência de produção separada do MP4 local.

## 2026-10-03 — ampliação autorizada do modelo
- Proprietário determinou que o modelo seja padrão para todos os próximos filmes e séries; pediu aba de busca YouTube e Reacher como exemplo. Determinou editar a fonte completa, sem corte em 90 segundos.
- Implementados busca assíncrona YouTube via yt-dlp, seleção de catálogo, importação por link, modelo genérico data-driven e duração integral. Upload multipart R2 remove o limite de 95 MiB do resultado.
- Catálogo de séries: TVmaze, elenco real, nota atribuída e sugestões por gênero. Filmes: Apple/iTunes; informações ausentes aparecem como indisponíveis, sem inventar depoimentos/elenco. Michael mantém preset com pôster oficial. Créditos TVmaze CC BY-SA no vídeo.
- Primeiro smoke genérico Reacher detectou sinopse maior que a tela; corrigido trecho legível com reticências. Render real de 3s sem duration explícita preservou 3s. Testes novos de domínio YouTube, seleção exata de catálogo e isolamento multipart passaram.
- Ainda falta CI, implantação e teste autenticado de busca/importação/edição integral Reacher; não considerar essa ampliação concluída apenas pelo código local.


## 2026-10-03 — trailers oficiais em português e WhatsApp
- Pedido expresso: todos os filmes e séries devem usar somente trailers oficiais dublados em português; resultado em inglês foi reportado pelo proprietário.
- Busca ampliada para 20 resultados, filtro exige canal verificado de distribuidor reconhecido e indícios de português; rejeita inglês/legendado. Geração por busca ou link confere idioma do áudio em três amostras via Whisper e interrompe se não confirmado. Prefere faixa de áudio pt quando disponível.
- Campo de WhatsApp e asset oficial Meta adicionados; número salvo por cliente e aplicado nas cinco partes.
- 108 testes Node passaram e sintaxe client-lite aprovada. CI, implantação desta correção e conferência real do áudio ainda pendentes; não afirmar produção validada.
- Continuidade: PR78 já integrou modelo genérico e duração integral; resta concluir biblioteca de vídeos e campanha semanal com publicação automática. Não confundir com campanhas de imagens existentes.



## 2026-10-03 — evidência atual e pendências reais
- PR79 integrada em f229fcaa1cb238492f85ff72e31a4dfd504d4c1d. Run37124002993: deploy e verificação da área de vídeos aprovados. 108 testes Node e 4 testes Python aprovados; render smoke de 91s preservado.
- Ajuste seguinte identifica Prime Video Brasil pelo channel_id UCuNjvqjTzw9LcD9PVpTVWRA, pois yt-dlp retorna channel_is_verified=null para esse canal real. ID confirmado pelo trailer htlUwNs2AjQ publicado em artigo oficial About Amazon Brasil. Run37124467288: deploy e verificação do painel aprovados.
- Busca autenticada Reacher agora mostra trailers do Prime Video Brasil e não os resultados ingleses anteriores. Screenshot salvo em outputs/nexus-busca-oficial-portugues.png. Ainda apareceu um título não correspondente; próximo ajuste deve filtrar correspondência do título consultado sem liberar canais não oficiais.
- Teste real Reacher run37124512978 falhou no download: YouTube pediu Sign in to confirm you are not a bot no GitHub runner. Não houve render nem upload desse job; não afirmar que geração YouTube funciona. Metadados consultados do computador local confirmaram faixa pt e duração122s para htlUwNs2AjQ, mas não comprovam MP4 renderizado.
- Não exportar cookies ou credenciais para contornar o bloqueio. Próximos passos: resolver importação automática com acesso autorizado; conferir idioma real e MP4 completo; implementar botão Enviar para biblioteca e integrar campanha semanal/publicação automática. Usuário pediu agilidade e perguntou o que falta; esses três itens foram informados claramente.


## 2026-10-03 — confirmação do original e validação do painel
Correção incremental sobre main 469eff9. Ingestão utiliza o endpoint existente /ingest do serviço Render; /ingest respondeu 400 invalid_source_url para corpo vazio, confirmando a rota. Falhas de transporte/timeout deixavam jobs em importing 10%; agora persistem failed, liberam token e apresentam erro. Upload e callback verificam HEAD, tamanho e propriedade do objeto R2. Laboratório e render só liberam com original confirmado; ingestão não dispara render automaticamente. Resultado só é ready após confirmação R2. MP4 local exige assinatura ftyp. Estados, isolamento e decisões de postagens preservam campos D1; RADAR corrigido de followersDelta inexistente para followerDelta; ciclo manual usa scheduler existente; métricas ausentes não viram zeros reais.
Evidência local: 113 testes unitários aprovados. Integração HTTP com SQLite real e emulador R2: upload 514422 bytes, render FFmpeg 1080x1920 / 5s, download 1331908 bytes com hash íntegro, acesso sem sessão 401, MP4 falso 415, campanhas por cliente, aprovar/reprovar e ciclo dos 13 agentes aprovados. Dispatch GitHub simulado nesse teste; produção ainda não validada nesta etapa. Novo teste reproduzível scripts/test-client-workspace.mjs integrado no CI Node22. Layout existente preservado; removidas duas decorações sem conteúdo (emoji/círculo).
Próximo passo: CI Linux (bundle local Windows bloqueado por leitura de diretório ancestral), deploy e E2E autenticado em produção. Não afirmar R2 remoto/render remoto comprovados até executar.
## 2026-10-04 — YouTube primeiro no PC

Usuário autorizou priorizar download YouTube no PC antes de geração direta e consultar plugins/dots. Baixar no PC é ação principal; Tentar gerar direto (servidor) fica secundária. Não ler/exportar cookies. Auxiliar local portátil é necessário porque o navegador não executa yt-dlp nem pode escolher arquivo local silenciosamente. Não reintroduz Railway nem publicação Meta para testes.


## 2026-10-09 — referências Instagram e teste único autorizado
- Usuário anexou referência Reel e montagem de quatro cenas, esclareceu quatro imagens separadas, autorizou implementar/implantar e forçar UMA postagem de teste Global Play. Não publicar montagem. Marca tipográfica única; nenhuma afirmação de logo gráfico original exato ou animar cenas do filme. Uma publicação controlada será carrossel; Reel usa Ken Burns10s. Mantidos orçamento/revisão visual.

- Ajuste após revisão automática: upload de media-generation bloqueado por envio automático de imagens privadas R2 para OpenAI sem autorização específica. Removido resolver/payload de imagens privadas e testes atualizados; implementação final envia apenas direção textual interpretada das referências anexadas. Biblioteca não é lida nem enviada. A implantação permanece pendente nesta etapa.


## 2026-10-09 — deploy de referências e falha real do teste controlado
- PR #187 integrado em main 2bc23e74c3d046091f5752a91dad0e0d0eb910c8; CI PR 37954922226 aprovado. Produção run37955312763 confirmou deploy Worker d8e27dfd-61c2-4857-86ef-a7d0268df769 e painéis; teste Global Play retornou attempted1/published0/posts[] com erro Too many subrequests by single Worker invocation às16:02:43UTC. Nenhuma publicação confirmada.
- Recuperação focada: polling Meta limitado a12 consultas porcontainer (antesaté40); mantém revisão visual real e media_publish único após FINISHED. Não altera plano Cloudflare nem orçamento OpenAI.
- Antes de qualquer repetição, CI [retry-social-test] consulta diagnóstico autenticado somente leitura: estado R2 do teste anterior e25 mídias recentes Meta; bloqueia nova tentativa se houver carrossel após início anterior ou histórico insuficiente. Não repetir cegamente nem apagar lock anterior.
- Implementação final de referências usa direção textual das imagens anexadas, sem envio dos pixels/biblioteca privada R2. Reels têm layout9:16 e zoomFFmpeg testado localmente; Reel real ainda não renderizado/publicado. Próximo: CI/deploy da recuperação e evidência real Meta.

## 2026-10-14 — Reels e NVIDIA
- Rodrigo: "se não der para fazer vídeo, não faça". Reel que é só 1 imagem com zoom não sai; vira post 4:5 (`FLOWARTS_REAL_VIDEO_REELS=false` em flowarts-campaign.js). Religar só com vídeo de verdade (várias cenas ou vídeo por IA), com OK dele.
- NVIDIA Nemotron: descartada, fica desabilitada. Não ligar sem pedido dele.

## 2026-10-14 — Imagem por IA para clientes
- Só depois que o Rodrigo liga (Master → Clientes → coluna IA do cliente). Limite = total da campanha do cliente (dias x posts), no máximo 60 por mês. Custo na OpenAI da Flow Arts.

## 2026-10-15 — Como achar clientes
- Rodrigo perguntou se dá para achar clientes pelas redes sociais. Explicado: hashtag do Instagram exige aprovação da Meta e só 30 hashtags/7 dias, sem telefone; copiar páginas da Meta é contra as regras (risco de bloqueio); mapa grátis é fraco. Decisão dele: "não faça isso, quero praticidade". Caminho: Google Maps (falta ativar o crédito). Não fazer conferidor de Instagram nem busca por rede social.

## 2026-10-17 — Reels animados por modelo, não por prompt
- Vídeos "feitos em código" (repositório awesome-opus5-5-videos) entram no Nexus como modelos fixos preenchidos pelo sistema, gravados no GitHub Actions. Não pedir à IA um código novo por vídeo. Sem custo de OpenAI. Os vídeos do repositório são só inspiração: não copiar obras dos criadores.

## 2026-10-17 — Flow Arts: conteúdo manual
- Campanhas da Flow Arts são subidas à mão pelo Rodrigo. O Reel automático fica desligado para a Flow Arts; usar só para clientes (pagantes).

## 2026-10-18 — Radar de virais automático, pelo caminho oficial
- Rodrigo: nada manual, nada para o cliente digitar. Nicho vem do cadastro.
- Só API oficial da Meta (login pelo Facebook + busca de hashtag). Proibido raspar o Instagram ou usar serviço de scraping (regras do Instagram; risco de bloqueio da conta).
- Os ganchos achados são só referência de formato para os agentes; nunca copiar frase nem citar o outro perfil.


## 2026-11-02 — Tabela nova de planos (Rodrigo)
- Só 3 planos mensais: Postador Automático R$ 97 (2 posts + 2 stories por dia, sem Reels), Resposta Automática R$ 39,90 (comentou QUERO → Direct, mensagem fixa) e Tráfego Pago R$ 297 (só para quem já é cliente; verba paga pelo cliente direto à Meta).
- Avulsos que continuam: Site R$ 497 e Logo R$ 67. Saíram: Essencial, Completo, Completo + Tráfego, Captador, Responde, Reels 5, Posts 10 e o preço de fundador.
- Captador fora da venda: não prometer clientes com ele. O código fica guardado; acesso só liberado na mão pelo Master.
- Uma campanha de anúncio por plano. Começar vendendo o Postador.

## 2026-11-05 — Clientes nunca publicam no mesmo minuto (Rodrigo)
- Regra fixa, detalhada em `REGRA_HORARIOS_CLIENTES.md`: cada cliente tem um minuto próprio na hora, story 5 minutos depois.
- Trava: no máximo 2 publicações por execução. Falha por limite volta para a fila, com no máximo 3 tentativas.
- Substitui a regra de 04/11 em que "Too many subrequests" não gastava tentativa.
- Substitui os 20 minutos entre painéis do PR #585, que nunca foram aplicados no D1 (o job falhou com erro de autenticação).
- Com 6 clientes os degraus de 10 minutos acabam. Decisão do Claude: os novos usam os minutos entre eles, para continuar na mesma hora.

## 2026-11-05 — Nome do painel e quadro de postagens faltando (Rodrigo)
- Regras em `REGRA_MASTER_NOME_E_POSTAGENS.md`.
- Decisão do Claude: o nome novo fica em `config.displayName`, e não em `clients.name`, porque esse campo alimenta marca e legendas.
- Decisão do Claude: postagem com problema não conta para o plano de 2 posts + 2 stories.
- Decisão do Claude: post com 3 falhas (regra do PR #586) também aparece no quadro.

## 2026-11-05 — Janelas por formato e envio de artes (Rodrigo)
- Regras em `REGRAS_ENVIO_ARTES.md`. Vale para todos os clientes.
- Cada janela aceita só o seu tamanho. Imagem certa não é alterada. Nunca converter sozinho.
- Foto sem texto: sem moldura, margem ou faixa de cor. O Nexus escreve por cima, sem cortar. Daniela Martins: nada escrito.
- Isso muda a regra de 29/10 de encaixar a arte com fundo desfocado, e o desenho de faixas do `PADRAO_ARTES.md` para foto sem texto.
- Decisão do Claude: tolerância de 0,5% na proporção, só para arredondamento.
- Decisão do Claude: foto 1:1 sem texto fica como veio, porque a camada de texto é 4:5 ou 9:16.
- Decisão do Claude: as letras ganham contorno escuro para serem lidas sobre a foto, no lugar da faixa.

## 2026-11-05 — Cliente nunca fica sem post (Rodrigo)
- Regra em `REGRA_CLIENTE_NUNCA_SEM_POST.md`. Substituta publica sem esperar aprovação, por pedido expresso do Rodrigo.
- Decisão do Claude: Quatree Dog não recebe imagem gerada, porque o pedido proíbe inventar produto e a diretriz exige embalagem oficial.
- Decisão do Claude: rascunho de agente não vale como imagem original para Quatree e Daniela.
- Decisão do Claude: post com correção pedida fica de fora, porque foi pedido de uma pessoa.

## 2026-11-05 — Respostas do Rodrigo sobre o vigia
- Correção pedida perto do horário: alerta vermelho no quadro, sem publicar.
- Artes de reserva na Biblioteca: Rodrigo envia depois. Até lá vale o alerta vermelho.
- GILTEC (`giltec` e `giltec-locacoes`) pausada por falta de pagamento, até ele liberar.
- Decisão do Claude: "fica sem post" foi lido ao pé da letra. Nem os posts já aprovados saem durante a pausa.

## 2026-11-05 — Marca do cliente (Rodrigo)
- Aprovada a logo no R2, por cima na montagem, com SVG convertido no navegador.
- Título das artes criado na hora, lendo a ficha do cliente. Palavra do botão no "Novo cliente" e na aba Marca.
- Decisão do Claude: o Worker não desenha letras, e o plano grátis não aguenta fazer isso em código. A arte final é montada no GitHub Actions, como nos Reels.
- Decisão do Claude: título na hora vale para quem tem marca salva. Os demais continuam com a lista do deploy.

## 2026-11-05 — Adimax sem imagem gerada (Rodrigo)
- Igual à Quatree: toda peça mostra a ração ou a embalagem, então o vigia não gera imagem para a Adimax.
- Faltando arte, fica o alerta vermelho no quadro.
- Decisão do Claude: o painel ainda não existe, então a regra vale para qualquer id com a palavra adimax.

## 2026-11-05 — Logo no painel (Rodrigo)
- Logo inteira, sem espremer, com corte das sobras ao enviar.
- Aviso de capa em letras grandes. Logo escura em menu escuro vai num cartão na cor principal.
- Marca só no "Novo cliente" e no lápis. A seção separada saiu.
- Decisão do Claude: a capa padrão do Facebook mede 851x315, proporção 2,7. Ela também dispara o aviso, mesmo abaixo de 3.
- Decisão do Claude: o aviso não impede salvar, porque logo escrita em linha pode ser larga.
- Decisão do Claude: o menu usa a cor do texto, que é sempre escura. Se a principal também for escura, o cartão é branco.
- Decisão do Claude: não havia tela de grupo, então entrou uma linha por grupo com lápis em Clientes.
- Grupo Quatree Dog mostra só "Quatree Dog (Ericsson)". O Eduardo saiu.
- Acima dos botões de envio, letras grandes dizem o que é aceito. Adimax usa a palavra do botão QUERO.
- Decisão do Claude: o painel do Eduardo não foi apagado nem arquivado. O pedido foi tirá-lo do grupo.

## 2026-11-05 — Criar com agente no quadro (Rodrigo)
- O que já passou sai do quadro. Depois das 21h, só amanhã e depois.
- Botão "Criar com agente (grátis)": cria até 2 artes, publica sozinho, selo "Criada pelo agente".
- Fora do botão: Daniela Martins, Quatree Dog, Adimax e GILTEC.
- "Enviar artes" abre no dia da linha e diz 2 posts + 2 stories.
- Decisão do Claude: faltando post e story, cria 1 de cada. Horários 9h e 19h, os mesmos da página Enviar artes.
- Decisão do Claude: o botão fica só nas linhas de falta. Linha de problema já tem post gravado, e o vigia cuida dela.
- Decisão do Claude: sem cair na Biblioteca, para o selo dizer a verdade.
- Decisão do Claude: a página Enviar artes também passou a preencher 2 + 2, para o texto não mentir.

## 2026-11-05 — GILTEC sem imagem gerada (Rodrigo)
- O vigia não gera imagem para `giltec` e `giltec-locacoes`, nem depois de sair da pausa.
- O painel da Adimax foi apagado pelo Rodrigo. Ele cria de novo depois do merge.
- Decisão do Claude: a regra vale para o grupo inteiro, para vendedora nova não escapar por ter outro id.

## 2026-11-06 — Cor da Adimax (Rodrigo)
- A marca oficial (@adimaxoficial) é ADIMAX em preto sobre amarelo-ouro. `#FFA500` estava errado.
- Valem principal e destaque `#F2A900`, texto `#000000`, logo preta.
- Decisão do Claude: destaque igual à principal. Destaque preto sumiria no menu escuro, e o botão das artes sai amarelo-ouro com letra preta.

## 2026-11-06 — Acesso e grupos no Master (Rodrigo)
- Pedido: senha sempre gerada, "Copiar acesso" nas duas telas e "+ Novo grupo" com herança da marca.
- Decisão do Claude: não guardar senha legível. Para cliente com login, copiar o acesso exige criar senha nova, com confirmação.
- Decisão do Claude: logo obrigatória no grupo novo, porque sem ela não há o que herdar.
- Decisão do Claude: a trava da Adimax vale também para grupo com a palavra adimax no id.
