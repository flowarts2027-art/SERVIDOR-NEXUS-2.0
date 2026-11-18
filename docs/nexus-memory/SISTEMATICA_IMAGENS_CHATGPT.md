# Sistemática de imagens no ChatGPT (02/11/2026)

Pedido do Rodrigo em 02/11/2026. Vale para TODA campanha criada pelo ChatGPT, em qualquer cliente.
Motivo: em campanhas grandes (ex.: 7 dias) o ChatGPT se embolava — imagens duplicadas, imagens em mosaico, logo errada.

## Novo foco da Flow Arts (02/11/2026)
- A Flow Arts agora vende **só a automação do Instagram** (postagem automática, aprovação no painel, resposta automática no direct, ida ao WhatsApp).
- **Não falar mais de busca de leads / lista de empresas / Captador / Radar** nas campanhas da Flow Arts.
- **Nunca usar as hashtags #flowart nem #flowarts** (levam a conteúdo de malabarismo). Usar #FlowArtsMarketing.

## Regra 1 — Uma imagem por vez
- Cada mensagem gera **UMA única imagem**. Nunca pedir "7 imagens", "3 imagens" ou "uma grade" numa geração só.
- **Proibido mosaico, grade, colagem, 2×2 ou várias cenas numa imagem** (exceto se o Rodrigo pedir expressamente um modelo 2×2 de exemplo de nicho).
- Carrossel = cada cartão é uma imagem separada, gerada uma por vez.

## Regra 2 — Planejar antes de gerar
Antes de gerar qualquer imagem, escrever uma **tabela da campanha** com uma linha por peça:

| Nº | Dia | Horário | Formato | Tema | Cena (o que aparece) |
|----|-----|---------|---------|------|----------------------|

- Cada linha tem cena **diferente** de todas as outras (pessoa, lugar, objeto e ângulo diferentes).
- Formatos: post 1080×1350 (4:5), story 1080×1920 (9:16).
- Só depois da tabela pronta começa a geração, **seguindo a ordem das linhas**.

## Regra 3 — Lotes pequenos e checagem
- Trabalhar **1 dia por vez**. Terminou o dia → confere → envia → passa ao próximo dia.
- Depois de cada imagem, conferir: (a) é uma imagem só, sem mosaico; (b) não repete outra peça; (c) proporção certa; (d) nenhum texto cortado nem por cima do rosto das pessoas.
- Errou? Refaz **só aquela imagem**. Não refazer o lote todo.

## Regra 4 — Etapas obrigatoriamente separadas: imagem limpa → carimbador oficial

**Quem é o carimbador (Rodrigo, 18/11/2026) — leia antes de tudo:**
- **O carimbador é o NEXUS, não o ChatGPT.** O ChatGPT não consegue colar a logo sem mexer nela: qualquer edição de imagem dele redesenha a logo, e por isso ela saía trocada ou errada.
- **A Maya entrega a foto LIMPA:** sem logo, sem texto, sem letra nenhuma. O Bento envia pelo conector `nexus_enviar_arte` com **`ja_tem_texto: false`**.
- O Nexus cola por cima o **arquivo original da logo salvo no Master ("Editar cliente")**, o título e o botão. Sem logo no Master, usa a identidade fixa do cliente. Nunca uma logo feita por IA.
- **Proibido** para todos os DOTs: pedir à IA de imagem para desenhar, copiar, "aplicar" ou "carimbar" logo; editar a imagem para pôr logo; mandar arte com logo usando `ja_tem_texto: true`.
- A Clara confere a arte final no painel (logo certa, texto inteiro, formato). Se a logo estiver errada lá, o problema é a logo salva no Master: avisar o Rodrigo, não refazer a foto.

- **Etapa 1 — Maya/gerador:** criar apenas a imagem-base, **SEM LOGO, MARCA, SÍMBOLO OU SIMULAÇÃO DE LOGO**. O prompt deve dizer "sem logo, sem marca"; deixar área livre onde o selo será aplicado. Textos publicitários, quando necessários, devem ser compostos tecnicamente e revisados, não inventados na IA.
- **Etapa 2 — revisão da base:** conferir a imagem, o sabor/produto, texto, proporção e aprovação existente; preservar a foto já aprovada.
- **Etapa 3 — DOT carimbador:** usar o **ARQUIVO ORIGINAL, aprovado, da logo do cliente**, separado da geração. Aplicar por sobreposição exata de pixels; **NUNCA** pedir à IA para imitar, copiar, redesenhar ou criar logo. O executor pode ser composição técnica do Nexus somente quando comprovadamente disponível.
- **Etapa 4 — Clara:** revisar a imagem final com selo aplicado, verificar identificação do cliente, contato correto, duplicações de número/WhatsApp, logo sem distorção, legibilidade e margens. Um defeito bloqueia o envio.
- Se a foto já tiver logo inventada/incorreta, remover de forma tecnicamente segura ou retomar a **versão limpa**; **não carimbar por cima da marca errada**. Corrigir só a camada da marca, preservando o conteúdo aprovado.
- Se faltar o arquivo oficial ou não existir execução confiável do carimbador: marcar **BLOQUEADO_POR_ATIVO** e NÃO enviar a arte como concluída. A regra não prova que o DOT foi instalado.
- Fontes de logo já documentadas: Flow Arts = `public/brand/flowarts-logo.webp` (símbolo `public/brand/flowarts-symbol.webp`); GILTEC = `docs/nexus-memory/clientes/giltec/logo-giltec.png`. Outros clientes: conferir o arquivo ORIGINAL aprovado (Master/briefing) antes de carimbar. Não assumir que uma imagem gerada anteriormente com uma logo é referência oficial.

## Regra 5 — Envio
- Enviar ao painel pelo conector `nexus_enviar_arte` com **`ja_tem_texto: false`** (o Nexus carimba a logo oficial, o título e o botão), uma peça por envio, conferindo a agenda antes para não repetir horário.
- Tudo fica esperando aprovação. O ChatGPT nunca aprova nem publica.
- Ao terminar, registrar em `HANDOFF_CHATGPT.md` o que foi realmente enviado (dia, horário, formato).

## Prompt curto para o Rodrigo colar no ChatGPT
> Leia `docs/nexus-memory/SISTEMATICA_IMAGENS_CHATGPT.md` no GitHub do Nexus e siga as regras. Campanha de [CLIENTE] de [N] dias. Primeiro me mostre a tabela da campanha. Depois gere uma imagem por vez, sem logo e sem texto, e envie ao painel com ja_tem_texto: false (o Nexus põe a logo oficial).

## Lugar da logo (Rodrigo, 18/11/2026)
- Deixe LIVRE o canto de cima à direita (um quadrado de 1/4 da largura), sem título, frase, ícone ou botão: é ali que o Nexus cola a logo do Master.
- Daniela Martins: deixe livre a parte de baixo, no meio.
- Se o canto estiver ocupado, o Nexus procura outro canto livre; se nenhum estiver livre, a arte vai SEM logo.
