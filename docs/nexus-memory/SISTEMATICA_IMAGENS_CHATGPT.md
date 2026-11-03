# Sistemática de imagens no ChatGPT (02/11/2026)

Pedido do Rodrigo em 02/11/2026. Vale para TODA campanha criada pelo ChatGPT, em qualquer cliente.
Motivo: em campanhas grandes (ex.: 7 dias) o ChatGPT se embolava — imagens duplicadas, imagens em mosaico, logo errada.

## Novo foco da Flow Arts (02/11/2026)
- A Flow Arts agora vende **só a automação do Instagram** (postagem automática, aprovação no painel, resposta automática no direct, ida ao WhatsApp).
- **Não falar mais de busca de leads / lista de empresas / Captador / Radar** nas campanhas da Flow Arts.
- **Nunca usar a hashtag #flowart** (leva a conteúdo de malabarismo). Usar #flowartsmarketing.

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

## Regra 4 — A IA de imagem NÃO desenha a logo
- No prompt da imagem, escrever: "sem logo, sem marca, sem texto escrito".
- Deixar um **espaço livre no canto superior direito** para a logo.
- A logo oficial é colocada **depois**, por cima, sem redesenhar: Flow Arts = `public/brand/flowarts-logo.webp` (símbolo: `public/brand/flowarts-symbol.webp`); GILTEC = `docs/nexus-memory/clientes/giltec/logo-giltec.png`.
- Quem carimba: o DOT de logo (ou o Nexus ao montar a arte). Nunca pedir para a IA "copiar" a logo.

## Regra 5 — Envio
- Enviar ao painel pelo conector `nexus_enviar_arte`, **uma peça por envio**, conferindo a agenda antes para não repetir horário.
- Tudo fica esperando aprovação. O ChatGPT nunca aprova nem publica.
- Ao terminar, registrar em `HANDOFF_CHATGPT.md` o que foi realmente enviado (dia, horário, formato).

## Prompt curto para o Rodrigo colar no ChatGPT
> Leia `docs/nexus-memory/SISTEMATICA_IMAGENS_CHATGPT.md` no GitHub do Nexus e siga as regras. Campanha de [CLIENTE] de [N] dias. Primeiro me mostre a tabela da campanha. Depois gere uma imagem por vez, sem logo, e envie ao painel.
