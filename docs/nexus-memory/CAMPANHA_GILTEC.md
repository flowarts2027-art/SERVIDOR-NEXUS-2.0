# Campanha GILTEC Locações — regras das artes (Rodrigo, 27/10/2026)

## 2026-10-28 — Regra permanente da logo oficial GILTEC

GILTEC: toda arte, de toda campanha, leva a logo oficial (docs/nexus-memory/clientes/giltec/logo-giltec.png). A IA não escreve texto dentro da imagem; a logo é aplicada por cima depois que a imagem fica pronta. Nunca recriar ou redesenhar a logo: usar sempre o arquivo original.

- Aplicar o arquivo original no canto inferior direito ou superior, sem cobrir o equipamento, em tamanho legível e discreto, preservando cores, letras e proporções.
- Fluxo autorizado por Rodrigo: terminou as imagens com a logo → enviar diretamente ao painel GILTEC, esperando aprovação, sem pedir novamente. Não aprovar nem publicar. Em erro, informar e entregar as imagens para Enviar artes.
- Campanha diária. Escopo atual: as três imagens de 28/10/2026 (compactador, martelete e gerador), sem gerar campanha de 30 dias.
- **Estado real:** regra documentada; arquivo original da logo não foi disponibilizado como anexo acessível nesta mensagem. O caminho acima é o destino definido, NÃO comprovação de arquivo salvo. Aplicação da logo e envio das três imagens permanecem pendentes do original. Nenhum upload novo realizado nesta etapa.


Cliente: `giltec` (painel próprio). Ramo: **locação de equipamentos para construção civil**.
Pasta: `agendamentos/clientes/giltec/AAAA-MM-DD/HHMM/` (sempre com a data). Nunca na raiz `agendamentos/AAAA-MM-DD/`, que é o painel da Flow Arts.

## Problemas da campanha de 28/10 (não repetir)
1. **Betoneira em quase tudo.** O mesmo modelo amarelo apareceu no cartão 1, no post das 12h e no story das 12h. Compactador, martelete e gerador também se repetiram entre carrossel e stories.
2. **Carrossel cortado de uma imagem larga.** Os 5 cartões eram tiras estreitas e borradas no meio de um fundo azul-marinho liso. Desde 27/10 o GitHub **recusa** cartão assim (`checar-arte.py`).

## Regra 1 — um equipamento diferente em cada peça do dia
- Em um mesmo dia, **cada peça mostra um equipamento principal diferente** (posts, cartões do carrossel e stories contam).
- **Betoneira: no máximo 1 peça por dia**, e nunca como peça principal (post) dois dias seguidos.
- Antes de criar, leia a última entrada da GILTEC em `HANDOFF_CHATGPT.md` e **não repita o equipamento principal do dia anterior no mesmo horário**.
- Ao terminar, registre em `HANDOFF_CHATGPT.md` a lista: horário → equipamento → cena.

### Equipamentos confirmados (nas legendas da GILTEC)
compactador (placa vibratória / sapo) · martelete / rompedor · gerador · betoneira

> Outros equipamentos só depois que o Rodrigo confirmar que a GILTEC aluga (ex.: andaime, escora, cortadora de piso, serra, vibrador de concreto, compressor, alisadora de piso). Sem confirmação, varie a **cena**, não invente produto.

## Regra 2 — variar a cena, não só o equipamento
Rodízio de cenas: obra de casa · prédio em construção · reforma dentro de loja ou apartamento · obra em estrada/rodovia (asfalto, acostamento) · terraplenagem · entrega do equipamento na obra (caminhão GILTEC) · balcão/atendimento da loja.
- Pessoas com EPI (capacete, colete, luva, bota). Rosto não precisa aparecer.
- Mudar ângulo, horário do dia (manhã, pôr do sol) e cor do céu entre as peças.
- Nunca reaproveitar a mesma foto/render de equipamento com outro texto por cima.

## Regra 3 — formato
- Post e cartão de carrossel: **1080×1350 cada, arte ocupando a imagem inteira**. Cada cartão é gerado **separado**. Nunca gerar uma imagem larga e cortar em tiras. Nunca colocar a arte pequena no meio de um fundo liso.
- Story: 1080×1920, também sem bordas lisas.
- Logo oficial aplicada por composição após gerar a cena, conforme regra permanente de 28/10 abaixo. A IA não gera texto na imagem. CTA **Comente QUERO** na legenda e na camada textual do sistema, quando aplicável.
- Sem preço, sem promessa de prazo que o Rodrigo não deu.

## Conferência automática (GitHub)
- Imagem idêntica a outra do mesmo cliente → recusada.
- Faixa vazia de cor lisa nas laterais ou em cima/embaixo → recusada (`.github/scripts/checar-arte.py`).
- O GitHub **não** consegue ver se o equipamento é o mesmo. Essa conferência é do ChatGPT (Regra 1) e do Rodrigo no painel.
