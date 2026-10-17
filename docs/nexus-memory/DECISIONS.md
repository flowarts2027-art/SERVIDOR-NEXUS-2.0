# Decisões e limites

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
