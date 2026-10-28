# Ponte de trabalho — ChatGPT ↔ Claude (Nexus / Flow Arts)

## 2026-10-28 — Atualização: logo recebida e pacote correto 3 posts + 3 stories

- Pedido mais recente de Rodrigo corrige o escopo: **3 posts, sendo 1 carrossel, e 3 stories**, somente 28/10/2026. Campanha permanece diária, não mensal.
- Logo original recebida e salva em `docs/nexus-memory/clientes/giltec/logo-giltec.png` na main, commit `14fca6681715f14652d551db8a7566ec1249c375`; blob relido `f4224d2c73ce36ba3c95695252d46314d77ccd3e`. SHA-256 original: `3ef3e00415d42537120342a3082baa76f7eeef8816d3c0796c25f169f4788871`. PNG original preservado, sem redesenho nem mudança de cor; nenhuma imagem .b64 ou staging criada.
- 7 imagens finais entregues: 09h carrossel com compactador e betoneira (2 cartões separados); 12h post martelete; 19h post gerador; stories exclusivos de construção residencial, reforma comercial e obra viária. Stories usam cenas de contexto sem repetir equipamento nem inventar produtos de locação. Não reutilizam fotos dos posts.
- Logo original composta por cima em todos os 7 PNGs, tamanho nativo 245×238, sem modificar os pixels. Posts 1080×1350, stories 1080×1920; logo em posição superior direita, com margem segura de topo nos stories. Só a marca contém texto; demais chamadas ficam fora da foto.
- Verificação: inspeção visual do conjunto, 7 hashes distintos, comparação pixel a pixel da logo aprovada, `checar-arte.py` aprovado. ZIP íntegro com imagens, logo, legendas e instruções.
- Legenda 09h atualizada para carrossel no commit `4d22e3156cfc7e34d4c389a0c79a13b0a04431c1`; demais legendas mantêm WhatsApp da Rose, QUERO e hashtags RJ.
- **Painel: ZERO novos uploads confirmados.** Aberta /artes.html; mensagem observada: “Entre no Master primeiro. Depois volte para esta página.” Sem sessão autenticada, envio bloqueado. Não houve aprovação ou publicação. Aplicado fallback autorizado pelo usuário: entrega do pacote final no chat.
- Entrega persistida: GILTEC_2026-10-28_Com_Logo.zip, arquivo `libfile_6c06b4b272a08191933f4aff1417e446`. As imagens finais estão no pacote entregue, NÃO afirmar que foram gravadas na pasta agendamentos remota. Logo e legendas estão no GitHub.
- Próximo passo: enviar os 7 arquivos pela página Enviar artes, cliente GILTEC, dia 28/10, agrupar os dois cartões no mesmo post e selecionar os 3 stories. Conferir conteúdos antigos para evitar duplicação. Não mudar a data automaticamente.
- Esta entrada substitui estados anteriores “logo não recebida” e “somente 3 feeds”. Regra permanente de logo original e envio direto após finalização continua válida; login do Master é o bloqueio atual. Cadastro operacional D1 não alterado; cadastro documental atualizado.


## 2026-10-28 — Regra permanente da logo oficial GILTEC

GILTEC: toda arte, de toda campanha, leva a logo oficial (docs/nexus-memory/clientes/giltec/logo-giltec.png). A IA não escreve texto dentro da imagem; a logo é aplicada por cima depois que a imagem fica pronta. Nunca recriar ou redesenhar a logo: usar sempre o arquivo original.

- Aplicar o arquivo original no canto inferior direito ou superior, sem cobrir o equipamento, em tamanho legível e discreto, preservando cores, letras e proporções.
- Fluxo autorizado por Rodrigo: terminou as imagens com a logo → enviar diretamente ao painel GILTEC, esperando aprovação, sem pedir novamente. Não aprovar nem publicar. Em erro, informar e entregar as imagens para Enviar artes.
- Campanha diária. Escopo atual: as três imagens de 28/10/2026 (compactador, martelete e gerador), sem gerar campanha de 30 dias.
- **Estado real:** regra documentada; arquivo original da logo não foi disponibilizado como anexo acessível nesta mensagem. O caminho acima é o destino definido, NÃO comprovação de arquivo salvo. Aplicação da logo e envio das três imagens permanecem pendentes do original. Nenhum upload novo realizado nesta etapa.


**Objetivo:** usar este repositório como memória de **projeto**, para que ChatGPT (inclusive Work) e Claude Code possam retomar tarefas a partir do mesmo estado verificável. **Não é integração direta de chats nem sincronização em tempo real.** Cada ferramenta precisa ter acesso ao repositório, reler os arquivos e registrar sua parte ao terminar.

## Início de cada sessão

1. Atualize a cópia do repositório e identifique branch e commit. Consulte `AGENTS.md` e, no Claude, `CLAUDE.md`.
2. Leia os **sete arquivos obrigatórios** referidos em `AGENTS.md`, mais este protocolo, `TASK_BOARD.md`, `HANDOFF_CHATGPT.md` e `HANDOFF_CLAUDE.md`.
3. Confirme se já há código, PR ou tarefa equivalente **antes** de implementar de novo. Diferencie pedido, hipótese, teste local, PR e funcionalidade comprovada em produção.
4. Escolha **uma tarefa específica** do quadro. Se depender de publicação, custo, envio a terceiros ou acesso adicional, obtenha a autorização pertinente.

## DOIS JEITOS DE ENVIAR AS IMAGENS — Rodrigo, 27/10/2026 (vale para TODOS os clientes)

### Jeito 1 — ChatGPT no modo Work/agente sobe tudo sozinho (preferido)
Comprovado em 27/10: Quatree Dog e GILTEC subiram assim (execuções 40597414392 e 40594908362). O conector simples de texto **não** sobe imagem; o modo Work sobe.
1. Criar as artes e salvar no repositório, branch `main` ou `agendamentos`, numa pasta por post:
   - Flow Arts: `agendamentos/AAAA-MM-DD/HHMM/`
   - Outro cliente: `agendamentos/clientes/<id-do-cliente>/AAAA-MM-DD/HHMM/` (ids: `quatree-dog`, `giltec`, `maskara-assessoria`)
   - Story: `.../HHMM-story/story.png`
2. Dentro da pasta: `imagem.png` (post), `01.png 02.png ...` (carrossel), `video.mp4 + capa.png` (Reel) e `legenda.txt` (menos no story).
3. **Sempre com a DATA na pasta.** Pasta sem data (ex.: `clientes/giltec/0900/`) dá erro e não vai ao painel.
4. **Cliente que não é a Flow Arts NUNCA vai na raiz `agendamentos/AAAA-MM-DD/`**: a raiz é o painel da Flow Arts.
5. O GitHub manda sozinho ao painel do cliente, **esperando aprovação**. Conferir em Actions → "NEXUS Agendar conteúdo pronto" se apareceu "enviado ao painel". Se corrigir só a legenda, o dia inteiro daquele cliente é conferido de novo (o que já subiu não duplica).

### Jeito 2 — sem Work: página Enviar artes
1. O ChatGPT mostra as artes na conversa e grava **só as legendas** (`.../HHMM/legenda.txt`). Pasta só com legenda não dá erro.
2. O Rodrigo salva as imagens no celular e abre **Enviar artes** (`/artes.html`, botão no topo de "Subir conteúdo do cliente" no Master), escolhe cliente, dia e as imagens. A legenda aparece sozinha. Tudo entra **esperando aprovação**.

**GILTEC:** antes de criar, ler `CAMPANHA_GILTEC.md` (um equipamento diferente por peça; betoneira no máximo 1 por dia; cada cartão do carrossel inteiro, nunca cortado de imagem larga).

Nos dois jeitos: **não** subir imagem em Base64, **não** criar `.media-staging/`, **não** mexer em workflows.

## Permissão do ChatGPT (Rodrigo, 27/10/2026)
A conta nova do ChatGPT do Rodrigo pode ler este repositório e **escrever** em `docs/nexus-memory/` (memória e `HANDOFF_CHATGPT.md`) e em `agendamentos/` (legendas). Código, workflows e a `main` de `cloudflare/` e `public/` continuam só por PR com o OK do Rodrigo. O acesso técnico é dado pelo próprio Rodrigo, conectando o GitHub na conta do ChatGPT.

## Regra fixa do ChatGPT: 3 posts por dia
Todo dia, o ChatGPT cria os posts das 09h, 12h e 19h da Flow Arts e os salva em `agendamentos/` (branch `agendamentos`). Eles sobem ao painel esperando a aprovação do Rodrigo. Passo a passo e padrão da arte: `REGRA_POSTS_DIARIOS.md`.

## Fechamento: passagem de bastão

- **ChatGPT** registra suas decisões e resultados em `HANDOFF_CHATGPT.md`; **Claude** faz o mesmo em `HANDOFF_CLAUDE.md`. Não sobrescreva o histórico do outro agente.
- Adicione uma entrada recente no topo usando: **data/hora BRT; origem/destino; objetivo; decisão; ações confirmadas com link/commit; testes e evidência; pendências; próximo passo exato; bloqueios e necessidade de aprovação**.
- Atualize `TASK_BOARD.md` somente com estados comprovados. Se houve alteração relevante no projeto, atualize também os arquivos centrais da memória (`PROJECT_STATE.md`, `DECISIONS.md`, `NEXT_ACTIONS.md`, `CHANGELOG.md`, `TEST_RESULTS.md` conforme aplicável).
- Um assistente deve ler a entrada mais recente do outro **antes de continuar**. Não interprete intenção, proposta ou PR aberto como deploy.
- Evite conflitos: trabalhe em branch/PR próprio, preserve atualizações concorrentes e, em caso de divergência, compare o histórico do Git antes de editar.

## Formato recomendado de cada registro

```md
## AAAA-MM-DD HH:MM BRT — assunto
- Origem → destino: ChatGPT → Claude (ou vice-versa)
- Pedido e objetivo: ...
- Decisões confirmadas: ...
- Executado e evidências: ... (commit/PR/teste; ou "nenhum código alterado")
- Estado: planejado | em execução | PR aguardando revisão | implantado e verificado
- Próximo passo para quem assumir: ...
- Bloqueios / autorização necessária: ...
```

## Limites, privacidade e custos

- **Repositório público:** NÃO copie transcrições integrais de chat/voz, prompts internos, dados pessoais, telefones de leads, listas de clientes, arquivos confidenciais, tokens, senhas ou chaves. Registre apenas um resumo profissional necessário, sem segredos. Para dados sensíveis, use armazenamento privado apropriado e referência não sensível.
- **Imagens liberadas (decisão do Rodrigo, 23/10/2026):** o ChatGPT e o Claude podem enviar imagens para a memória e para o repositório (artes, referências, fotos de produto e fotos dos clientes para os posts). Continua proibido subir imagem que mostre documento, CPF/CNPJ, telefone, senha, token ou print de conversa privada. Esta autorização substitui a proibição genérica de imagens privadas somente nesse escopo; não altera o envio de referências à OpenAI nem religa a geração paga pela API.
- **Envio ao painel autorizado (Rodrigo, 24/10/2026):** o ChatGPT pode enviar todo dia as imagens, vídeos e legendas de todos os clientes ativos para o painel, salvando na branch `agendamentos` (pastas `agendamentos/clientes/<cliente>/AAAA-MM-DD/HHMM/`). Tudo chega como "esperando aprovação": o ChatGPT não aprova nem publica. Não é preciso pedir nova autorização a cada envio.
- Uma ferramenta **não enxerga automaticamente** a conversa, os prompts ocultos ou a execução interna da outra. Só é compartilhado aquilo que ela gravou aqui ou que tenha sido explicitamente fornecido para registro seguro.
- A ponte via documentos do GitHub não precisa de uma API paga adicional; chamadas voluntárias a modelos, pesquisa paga e infraestrutura podem ter custos próprios. **Não** conecte APIs, crie credenciais nem contrate serviços sem autorização.
- Nenhum agente deve iniciar abordagens automáticas em massa a contatos frios, publicar posts, implantar código, gastar dinheiro ou efetuar ações externas por presumir autorização deste protocolo.
- Com `main` configurada para fazer deploy: preparar branch e abrir PR é diferente de incorporar o PR; seguir a política de aprovação descrita em `CLAUDE.md`.

## Repartição de trabalho preferida

- **ChatGPT:** estratégia, redação, direção visual, qualidade da experiência e revisão do briefing.
- **Claude Code:** implementação funcional, integrações, testes e diagnóstico de runtime.
- A divisão é preferência operacional, não capacidade exclusiva. Registre qualquer transferência em um handoff com tarefa e resultado verificáveis.

## Melhorias opcionais futuras (não implementadas aqui)

1. Criar um resumo automático **de alterações do GitHub** (commits/PRs) para o painel; não captura conversas privadas.
2. Validar via CI a presença dos campos de handoff em PRs que toquem o sistema.
3. Se houver autorização explícita e justificativa de custo, integrar serviços por APIs/webhooks — projeto separado, com orçamento e revisão de segurança.
