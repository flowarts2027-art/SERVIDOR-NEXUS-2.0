# Regra: marca do cliente pelo Master

Pedido do Rodrigo em 05/11/2026. Logo, cores e palavra do botão mudam sem comando e sem deploy.

## Onde
- "Novo cliente": campo opcional. Sem logo, o painel nasce com o tema padrão.
- Clientes > Marca: para cliente ou grupo, com botão Salvar.

## O que salva
- Logo no R2. SVG vira PNG no navegador.
- Cor principal, cor de destaque e cor do texto, tiradas da logo no navegador. Dá para trocar na mão.
- Cor clara demais escurece até o contraste 4,5.
- Palavra do botão: vira "COMENTE QUERO" e entra na resposta automática.
- Ficha em `docs/nexus-memory/clientes/<id>/marca.json`, para o ChatGPT e os agentes.

## Grupos
Painel de grupo usa a marca do grupo, a não ser que tenha marca própria. Sheila (`giltec-locacoes`) entra pelo campo Grupo. A pausa de postagem continua.

## Artes
- A logo salva entra na hora da montagem.
- Cliente com palavra do botão salva: título criado na hora pela IA grátis, lendo a ficha, e arte montada no GitHub Actions (`compor_arte.py`).
- O título não aceita número, preço nem porcentagem.
- Cliente sem marca salva continua com a camada de texto do deploy.
- Quatree Dog e Daniela Martins seguem sem imagem gerada, mesmo com marca salva.
