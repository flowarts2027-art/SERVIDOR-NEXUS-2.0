# Memória compartilhada — Radar Comercial Flow Arts
Atualizado em 2026-11-01. Documento para Claude, ChatGPT e DOTs. Fonte: histórico de decisões da equipe e descrições das PRs #479, #483, #486, #488, #489, #490, #491 e #492. **Não substitui auditoria de código, testes ou verificação de produção.**

## Visão do proprietário
O Radar Comercial deve ser um **caçador automático de oportunidades B2B**, exclusivamente para o cliente Flow Arts no Nexus. Não deve obrigar o usuário a inserir @, concorrentes ou procurar contatos manualmente. Deve exibir oportunidades reais, justificativa/evidência, perfil Instagram, WhatsApp comercial público quando verificável, e permitir **aprovação manual** antes de abordar alguém. Categorias: (1) criação ou problemas de sites; (2) automação de Instagram; (3) captação de leads; (4) plataformas e serviços de inteligência/prospecção comercial. Interesse deve ser fundamentado em evidências; mera ausência de site na bio ou comentário “QUERO” em brinde não comprovam intenção de compra.

## Histórico do trabalho documentado nas PRs
- **#479**: módulo de leads `flow_radar_leads` em Cloudflare D1; quatro categorias, origem autorizada, URL de evidência, pontuação, deduplicação, fases manuais, rotas/API restritas; sem scraping nem mensagens automáticas. Descrição indicava acesso Master — observar mudança posterior de escopo.
- **#483**: busca/filtros de oportunidades existentes (empresa, @, evidência, concorrente, etapa, intenção 80+); informou que ingestão externa só ocorre com `RADAR_FEED_URL` e `RADAR_FEED_HOST`.
- **#486**: foco no Instagram e acesso na sessão do cliente Flow Arts; proposta de Business Discovery para perfis profissionais permitidos, análise de dados públicos autorizados, comentários dos *próprios* posts Flow Arts, fonte externa HTTPS autorizada, tratamento/ocultação de leads antigos e preservação de histórico. Não há API oficial para leitura indiscriminada de comentários dos concorrentes.
- **#488–#490**: melhoria da navegação mobile e simplificação do dashboard, eliminando a interface excessivamente complexa e buscas manuais como fluxo principal; cards e links de oportunidades reais, estado da fonte e aprovação.
- **#491**: estrutura inicial de funil para eventos deduplicados e indicadores de futura campanha (cliques, curtidas, formulário, WhatsApp aberto, lead qualificado); não equivale a integração automática Meta Ads/WhatsApp.
- **#492**: PR de consolidação do menu mobile e Radar Flow Arts; indicadores de campanha ficam secundários/ocultos até existir dados reais; POST de métricas desabilitado sem fonte verificada; não criar estatísticas falsas. A descrição alerta que ingestão automática de comentários de campanhas, integração Meta Ads/WhatsApp e teste visual Android ainda estavam pendentes.

O proprietário informou em conversa que fez merge de uma PR final; **é obrigatório verificar branch main, commits, CI, Cloudflare, migrações, permissões e execução de produção para afirmar que cada recurso está ativo**. PR descreve intenção/alteração proposta, não certifica funcionalidade operacional.

## Regras de produto e UX
Dashboard único, integrado à identidade visual Nexus, responsivo e legível no Android; não apresentar telas vazias parecendo quebradas, ícones ausentes, múltiplas abas ou buscas manuais como tarefa principal. Mostrar: status verdadeiro de coleta, total de oportunidades, aprovados, cards com motivo/evidência, perfil Instagram e WhatsApp comercial público após aprovação. Sem leads, mostrar estado vazio transparente e diagnóstico de integração. Acessível exclusivamente à Flow Arts, não aos outros clientes. Evitar métricas inventadas.

## Fonte de descoberta e limites
Somente APIs oficiais Meta conforme permissões, Business Discovery dentro do escopo permitido, interações próprias autorizadas, e feeds/fontes com autorização e documentação da origem. A descoberta automática de **intenção de terceiros** depende de fonte real e configuração `RADAR_FEED_URL`/`RADAR_FEED_HOST`. Não afirmar coleta funcionando sem confirmar. Não implementar scraping não autorizado. Instagram Business Discovery não concede acesso irrestrito a comentários de concorrentes/contas privadas. Links e telefones comerciais devem ser públicos e verificados. Respeitar LGPD, consentimento, retenção, isolamento entre clientes e aprovação humana para contato. Nenhuma DM ou WhatsApp automático.

## Métricas de campanhas futuras
Campanha paga **não é pré-requisito** para o Radar. Quando ocorrer, eventos podem alimentar indicadores, **somente após** integração oficial real com Meta e instrumentação consentida de formulário/WhatsApp. Abertura de WhatsApp não comprova conversa ou venda. Não alterar campanhas/publicações/agendamentos existentes, inclusive o postador automático da Flow Arts.

## Pendências e testes para Claude
1. Auditar `main` e comparar PRs, schema D1, rotas Worker, interface, permissões, isolamento Flow Arts, mobile.
2. Confirmar se feed autorizado está configurado e há descoberta real, sem depender de pesquisa manual.
3. Validar integração oficial Meta, credenciais, Business Discovery, comentários próprios; não prometer comentários de terceiros.
4. Validar deduplicação, evidências, qualificação, aprovação, links e limpeza/ocultação segura de contatos.
5. Validar métricas apenas reais, segurança de ingestão de eventos, LGPD e testes E2E Android/desktop.
6. Documentar cada recurso como: descrito em PR, presente na main, testado, configurado e comprovadamente operacional — **estados distintos**.
7. Se houver correções, criar PR para revisão; não fazer merge/deploy automaticamente.

## Alinhamento dos DOTs
- Dante: valida direção, escopo exclusivo e decisão final.
- Lia: critérios de qualificação e categorias comerciais.
- Maya / Caio / Ravi: comunicação visual, mensagens e conteúdo conforme evidência real, nunca fabricar resultados.
- Bento: integração técnica e ponte GitHub/Nexus, mudanças auditáveis.
- Nilo: avaliação de métricas e evidências, não contar eventos fictícios.
- Clara: testes, LGPD, experiência mobile e revisão antes de liberar.

**Esta memória registra o trabalho e objetivo compartilhado; o estado real de implantação permanece sujeito à auditoria.**

## Atualização Claude — 01/11/2026 (07h)
- **Estado real auditado:** sem fonte em `RADAR_FEED_URL`, a descoberta automática de terceiros não traz leads. O painel não inventa números (correto).
- **Regra confirmada com o proprietário:** não existe forma oficial de ler quem comenta nos posts de concorrentes nem a lista de seguidores de outra conta. Não fazer scraping.
- **Três caminhos permitidos (PR do Claude):** (1) colar o @ de quem comentou, com o link do post como prova; (2) Vigia diário dos perfis cadastrados pela Business Discovery, mostrando os posts com mais comentários (só a quantidade); (3) isca: comentários de interesse nos posts da própria Flow Arts entram no Radar sozinhos.
- **Para os DOTs:** Maya/Caio/Ravi usam os "posts que bombaram" como ideia de tema para a isca da Flow Arts (nunca copiar texto). Nilo não conta quantidade de comentários de concorrente como lead. Clara confere que todo lead entra como `novo` e só é contatado após aprovação.
- **Pendente:** fonte de empresas novas (dados abertos de CNPJ) como feed autorizado.
