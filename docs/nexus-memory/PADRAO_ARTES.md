# PADRÃO FIXO DAS ARTES — vale para todos os clientes (Rodrigo, 28/10/2026)

Regra permanente. Vale para o Nexus (código), o ChatGPT, o Claude, o Manus e qualquer agente que faça arte.
Código que aplica: `scripts/social/campanha_diaria.py` (função `desenhar`). Textos: `scripts/social/campanha/conteudo.json`.

## 1. Texto nunca em cima de pessoa
- O título fica numa **faixa própria em cima**; as vantagens e o botão numa **faixa própria embaixo**.
- A **foto fica só no meio**, começando **abaixo do título**. Nenhuma letra passa por cima de cabeça, rosto, mão ou produto.
- Atrás das faixas vai a própria foto **bem desfocada e escurecida** na cor do cliente (nada reconhecível, sem faixa lisa).
- Ao pedir a foto para a IA: pessoas e assunto no **meio** da imagem, com espaço livre acima da cabeça.

## 2. Texto escrito por código, nunca pela IA
- A IA faz **só a foto**: sem letras, números, placas, marcas, logos ou símbolos.
- Título, vantagens e botão são escritos por código, com textos revisados (sem erro de português, sem coisa sem sentido).

## 3. Fonte e tamanho
- **Montserrat ExtraBold** (a das artes azuis aprovadas da GILTEC). Reserva: Inter Display.
- Título em **3 linhas**, todas do **mesmo tamanho**, em maiúsculas; a **3ª linha na cor de destaque**. Sem contorno nas letras.
- Vantagens: 3 itens curtos (1 a 3 palavras), com ícone redondo na cor de destaque.
- Botão: "COMENTE QUERO" no feed; "MANDE QUERO NO DIRECT" no story (story não aceita comentário).

## 4. Logo
- **Uma logo só**, a verdadeira (arquivo original), no canto de cima à esquerda. Nunca desenhada pela IA.
- GILTEC: `docs/nexus-memory/clientes/giltec/logo-giltec.png`. Flow Arts: `public/brand/flowarts-symbol.webp`.

## 5. Formatos
- Feed e carrossel: 1080×1350. Story: 1080×1920, **nada importante nos 14% de cima e nos 20% de baixo**.
- Carrossel: cada cartão com foto própria e número no canto.
- Cada peça do dia com cena diferente; GILTEC com **um equipamento diferente por peça** (betoneira no máximo 1 vez por dia).

## 6. Cores por cliente
| Cliente | Fundo | Destaque | Botão |
| --- | --- | --- | --- |
| GILTEC | azul-marinho | amarelo | amarelo com letra azul |
| Flow Arts | quase preto | azul da marca | azul com letra branca |
| Maskara | preto/grafite | dourado | dourado com letra preta ("COMENTA QUERO ABAIXO") |
| Quatree Dog | verde-petróleo | laranja | laranja com letra escura ("COMENTE TABELA"; story "RESPONDA TABELA") |

## 8. Artes que chegam sem texto (conector do ChatGPT/Claude, 29/10/2026)
- O ChatGPT manda **só a foto**. O Nexus escreve logo, título, vantagens e botão por cima, com os textos de `scripts/social/campanha/textos_upload.json` (molduras feitas no deploy por `scripts/social/molduras_upload.py`).
- Só use `ja_tem_texto=true` quando a imagem já vier com título e botão.

## 7. Conteúdo
- Sem preço, sem prazo prometido, sem telefone na imagem, sem depoimento ou número inventado.
- Tudo vai ao painel **esperando aprovação**.
