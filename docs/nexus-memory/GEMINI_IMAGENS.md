# Gemini — regras das imagens (Rodrigo, 28/10/2026)

Desde 28/10 o próprio Nexus gera as artes diárias com o Gemini (Nano Banana), sem depender de chat.
Código: `cloudflare/src/gemini-campaign.js`. Clientes ligados: variável `GEMINI_DAILY_CLIENTS` (começa com `giltec`).

## Quem gera
- Desde 28/10 (08h): Cloudflare Workers AI, grátis (FLUX.2 klein). O Gemini fica de reserva (o plano grátis do Google não gera imagem).

## Quando roda
- Todo dia entre 6h e 8h (Brasília), uma vez por cliente. Se uma peça falhar, tenta de novo na rodada seguinte, sem duplicar.
- Tudo vai ao painel do cliente **esperando aprovação**. Nada é publicado sozinho.
- Limite de gasto: `GEMINI_MONTHLY_LIMIT_USD` (US$ 20). Chegou no limite, para.

## Pacote do dia
| Horário | Formato | Tamanho |
| --- | --- | --- |
| 09h | Carrossel, 2 cartões (cada cartão gerado separado) | 4:5, 1080×1350 |
| 12h | Post de 1 imagem | 4:5, 1080×1350 |
| 19h | Post de 1 imagem | 4:5, 1080×1350 |
| 09h, 12h, 19h | Story (cena própria, diferente dos posts) | 9:16, 1080×1920 |

## Regras de formato (vão no pedido de cada imagem)
- Foto realista, luz natural, cores reais, lugar no Brasil. Nada de ilustração, 3D, neon ou filtro azul.
- **Nenhum texto** na imagem: letras, números, placas, marcas, adesivos, marca d'água.
- Foto ocupando a imagem inteira: sem borda, sem faixa de cor lisa, sem colagem.
- Canto superior direito livre para a **logo**, que o Nexus aplica por cima com o arquivo original (nunca desenhada pela IA). No story, a logo fica abaixo dos 14% de cima.
- Um assunto claro, no meio; nada importante nos 20% de baixo. No story, também nada nos 14% de cima.
- Pessoas com EPI (capacete, colete, luva, bota); rosto não precisa aparecer; mãos e corpo sem defeito.
- Equipamento realista, inteiro e usado do jeito certo; sem máquina inventada, sem marca, sem celular com tela virada para quem vê.
- Cada peça do dia com cena, luz e ângulo de câmera diferentes (nenhuma imagem repetida).

## GILTEC
- Só os 4 equipamentos confirmados: compactador, betoneira, martelete/rompedor, gerador. Um por peça de feed.
- Ciclo de 4 dias: o mesmo horário nunca repete o equipamento do dia anterior; a betoneira alterna entre carrossel e post.
- Stories mostram a obra (casa, reforma, rodovia, prédio, terraplenagem, entrega), sem máquina como assunto principal.
- Legenda: a do GitHub (`agendamentos/clientes/giltec/AAAA-MM-DD/HHMM/legenda.txt`), se existir; senão o Gemini escreve, com WhatsApp da Rose e **Comente QUERO**; sem preço, telefone ou prazo.
