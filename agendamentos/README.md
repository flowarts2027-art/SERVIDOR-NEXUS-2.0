# Pasta agendamentos — posts prontos (Flow Arts e outros clientes)

> **27/10/2026:** o ChatGPT no modo Work pode salvar as imagens aqui e elas vão sozinhas ao painel. Cliente que não é a Flow Arts vai em `agendamentos/clientes/<id>/AAAA-MM-DD/HHMM/`, **sempre com a data**. Pasta errada dá erro no GitHub Actions. Sem Work: legenda aqui e imagens pela página `/artes.html`.

Cada post colocado aqui sobe sozinho para o painel da Flow Arts (`primeiro-teste`) **esperando a aprovação do Rodrigo**.
Nada é publicado sem esse OK. Quem faz o envio é o fluxo `.github/workflows/nexus-agendar-pasta.yml`.

## Onde salvar
Uma pasta por post: `agendamentos/AAAA-MM-DD/HHMM/` (horário de Brasília).

```
agendamentos/2026-10-22/0900/
agendamentos/2026-10-22/1200/
agendamentos/2026-10-22/1900/
```

## O que vai dentro de cada pasta
| Tipo | Arquivos |
| --- | --- |
| Post de 1 imagem | `imagem.jpg` + `legenda.txt` |
| Carrossel (2 a 10 cartões) | `01.jpg`, `02.jpg`, … + `legenda.txt` |
| Reel | `video.mp4` + `capa.jpg` + `legenda.txt` |
| Story | `story.jpg` (ou `story.mp4` + `capa.jpg`) |

- Imagens de feed: 4:5, 1080×1350, JPG, PNG ou WEBP, até 8 MB cada.
- Reel e Story: 9:16, 1080×1920. Vídeo MP4 até 95 MB.
- `legenda.txt`: a legenda completa, em texto puro, até 2.200 caracteres.

## Regras do envio
- Salve até umas 08h. O post precisa chegar **pelo menos 10 minutos antes** do horário; se o horário já passou, ele não é enviado.
- Envie na branch `agendamentos` (ou na `main`). Cada push só envia as pastas que mudaram.
- Se já existe um post para aquele dia e hora, ele **não é duplicado**. Para trocar, o Rodrigo cancela o antigo no painel e a pasta é enviada de novo.
- Não coloque aqui dados de clientes, telefones, senhas ou chaves: o repositório é público.

## Story no mesmo horário do feed (ordem do Rodrigo, 22/10)
Use `HHMM-story/story.jpg` para story e `HHMM/` para feed, carrossel ou Reel. A deduplicação distingue story dos outros formatos. Cada perfil recebe stories próprios às 09h, 12h e 19h. Nunca repetir uma imagem entre formatos; não usar espelhamento automático.

## Envio sem Work (Flow Arts / primeiro-teste)

O cliente Flow Arts usa o ID interno `primeiro-teste`, mas as pastas **deste cliente** ficam na raiz `agendamentos/AAAA-MM-DD/HHMM/`, e **não** em `agendamentos/clientes/primeiro-teste/`. Veja o passo a passo em [GUIA-FLOW-ARTS-SEM-WORK.md](GUIA-FLOW-ARTS-SEM-WORK.md). Antes de alegar envio, conferir ID no GitHub Actions e o conteúdo na fila de aprovação do painel. Fazer merge de instruções sem os arquivos de imagem não envia campanha alguma.
