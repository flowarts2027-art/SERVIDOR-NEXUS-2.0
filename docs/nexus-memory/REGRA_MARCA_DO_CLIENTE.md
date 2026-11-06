# Regra: marca do cliente pelo Master

Pedido do Rodrigo em 05/11/2026. Logo, cores e palavra do botão mudam sem comando e sem deploy.

## Onde
- "Novo cliente": campo opcional. Sem logo, o painel nasce com o tema padrão.
- Clientes, no lápis do cliente: nome e marca.
- Clientes, no lápis do grupo: marca do grupo.
- Sem mexer na marca, o lápis não grava nada. Quem herda do grupo continua herdando.

## O que salva
- Logo no R2. SVG vira PNG no navegador.
- Ao enviar, o navegador corta as sobras de fundo em volta da logo.
- Imagem com mais de 3 vezes de largura, ou na medida da capa do Facebook (851x315), mostra aviso grande. O aviso não impede salvar.
- Cor principal, cor de destaque e cor do texto, tiradas da logo no navegador. Dá para trocar na mão.
- Cor clara demais escurece até o contraste 4,5.
- Palavra do botão: vira "COMENTE QUERO" e entra na resposta automática.
- Ficha em `docs/nexus-memory/clientes/<id>/marca.json`, para o ChatGPT e os agentes.

## Painel
- A logo aparece inteira, na proporção dela, com no máximo 200 px de largura no menu.
- No celular, a mesma logo aparece no topo.
- O menu usa a cor do texto, que é sempre escura.
- Logo escura vai num cartão de cantos arredondados, na cor principal. Se a principal também for escura, o cartão é branco.
- Adimax: cartão amarelo-ouro `#F2A900`, logo e texto pretos, painel amarelo-ouro e preto. Marca oficial no Instagram @adimaxoficial.
- Logo toda preta: o editor ignora o preto e preenche azul-marinho `#1c283a`. As cores precisam ser digitadas à mão.

## Grupos
Painel de grupo usa a marca do grupo, a não ser que tenha marca própria. Sheila (`giltec-locacoes`) entra pelo campo Grupo. A pausa de postagem continua.

## Artes
- A logo salva entra na hora da montagem.
- Cliente com palavra do botão salva: título criado na hora pela IA grátis, lendo a ficha, e arte montada no GitHub Actions (`compor_arte.py`).
- O título não aceita número, preço nem porcentagem.
- Cliente sem marca salva continua com a camada de texto do deploy.
- Quatree Dog, Daniela Martins, Adimax e GILTEC seguem sem imagem gerada, mesmo com marca salva.
