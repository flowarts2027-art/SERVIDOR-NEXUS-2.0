# Envio de artes Flow Arts ao Nexus sem Work

## Cliente e rota conferidos no código
- Flow Arts é identificado internamente como `primeiro-teste`, mas **NÃO** crie `agendamentos/clientes/primeiro-teste` para suas artes.
- O destino correto é **`agendamentos/AAAA-MM-DD/HHMM/`**, na branch `agendamentos` ou `main`.
- `clientes/quatree-dog` e `clientes/maskara-assessoria` são destinados exclusivamente a outros clientes.
- O GitHub Action `.github/workflows/nexus-agendar-pasta.yml` chama `.github/scripts/agendar-pasta.sh` para encaminhar novas pastas ao cliente `primeiro-teste`, aguardando aprovação.

## Como subir as artes pelo navegador, sem Work
1. No GitHub, selecione a branch `agendamentos`.
2. Entre em `agendamentos/`; abra a pasta da data (`AAAA-MM-DD`) e do horário (`HHMM`). Se não existe, use **Add file > Create new file** com caminho como `agendamentos/2026-10-28/0900/legenda.txt`; salve. Depois abra essa pasta e use **Add file > Upload files**. Não crie um post em horário vencido.
3. Para feed: `imagem.jpg` e `legenda.txt`; para carrossel: `01.jpg` a `05.jpg` (ou 2–10 cartões) e `legenda.txt`; para story: `story.jpg` em `HHMM-story/`; para Reel: `video.mp4`, `capa.jpg` e `legenda.txt`.
4. Faça **Commit changes** na branch `agendamentos` depois que a pasta tiver os arquivos completos. O push dispara `NEXUS Agendar conteúdo pronto (pasta agendamentos)`.
5. Confira **Actions** (sucesso) e depois a fila de aprovação do cliente Flow Arts/primeiro-teste no Nexus. Só considere enviado quando o log indicar `enviado ao painel, esperando aprovação` com ID; **não publica automaticamente**.
6. Se o push inicial ocorreu antes de completar os arquivos, após concluir os arquivos execute **Actions > NEXUS Agendar conteúdo pronto (pasta agendamentos) > Run workflow** na branch que contém as artes e informe a data. O acionamento manual reprocessa a data e o sistema evita duplicar slot já existente.

## Exemplo de grade (somente referência, respeitar ordem mais recente)
```text
agendamentos/
  2026-10-28/
    0900/
      01.jpg
      02.jpg
      03.jpg
      04.jpg
      05.jpg
      legenda.txt
    0900-story/
      story.jpg
    1200/
      video.mp4
      capa.jpg
      legenda.txt
    1200-story/
      story.jpg
    1900/
      imagem.jpg
      legenda.txt
    1900-story/
      story.jpg
```

## Segurança e falhas
- Não enviar imagens com dados confidenciais a este repositório público. As artes da marca devem conter logo oficial, não logo gerada por IA; evitar peças duplicadas e texto cortado.
- Arquivos separados, 4:5 (1080x1350) para feed/carrossel e 9:16 (1080x1920) para story/Reel, respeitando limites em `agendamentos/README.md`.
- O horário precisa estar **pelo menos dez minutos no futuro** no momento do processamento. Pastas vencidas são ignoradas.
- Reenvio para o mesmo horário e formato não cria duplicata. Para substituir uma publicação anterior, cancelar a versão antiga no painel e reenviar de acordo com a documentação.
- Se o Actions acusar falha de D1/Cloudflare, o merge não resolve autenticação; ver o log do workflow, corrigir acesso e executar de novo.
- Fazer merge deste guia **não faz upload de imagens automaticamente**: os binários reais devem estar no GitHub para o workflow encontrá-los.
