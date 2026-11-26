---
name: voz-da-marca
description: Montar o "jeito de escrever" de um cliente do Nexus a partir de posts e textos reais dele, e usar esse perfil em toda legenda, moldura e mensagem. Use antes de criar campanha para cliente novo ou quando as legendas estiverem genéricas, com cara de IA.
---

# Voz da marca (Nexus)

Adaptado da skill `brand-voice` do projeto ECC (licença MIT). Ver `THIRD_PARTY_NOTICES.md`.

## De onde tirar (nesta ordem)
1. Posts reais do Instagram do cliente (os mais recentes).
2. Site, catálogo, cardápio ou folheto do cliente.
3. Mensagens de WhatsApp que o próprio cliente mandou ao público (se o Rodrigo passar).
4. O que o Rodrigo disse sobre o cliente.

Juntar de 5 a 20 exemplos. Nunca usar exemplo genérico da internet como fonte.

## O que observar
- Tamanho das frases e ritmo.
- Formal ou informal ("você", "vc", "a gente").
- Uso de emoji (quantos, quais).
- Como chama o público (ex.: "tutor", "cliente", "amiga").
- Palavras que sempre aparecem e palavras que nunca aparecem.
- Como faz o chamado para ação.

## Onde salvar
`docs/nexus-memory/clientes/<id>/voz.md`, com este modelo:

```text
PERFIL DE VOZ
Cliente:
Fontes usadas:
Ritmo:
Formalidade:
Emojis:
Como chama o público:
Palavras que usa:
Palavras proibidas:
CTA padrão:
Exemplo de legenda aprovada:
```

Regras de privacidade (o repositório é público): não gravar telefone, endereço pessoal, nome de cliente final nem conversa privada. Só o estilo.

## Proibido em qualquer cliente
- Pergunta-isca só para ganhar comentário.
- "Não é X, é Y" repetido.
- Frases de coach ("acredite no seu potencial").
- Texto que mistura a voz de dois clientes.

## Uso
Toda skill que escreve texto (`campanha-marketing`, `motor-de-conteudo`, `legendas-por-rede`, `inteligencia-de-leads`) lê o `voz.md` primeiro. Se não existir, criar antes.
