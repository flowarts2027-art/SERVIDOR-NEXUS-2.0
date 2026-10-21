# REGRA FIXA — ChatGPT cria 3 posts por dia da Flow Arts e envia ao painel

**Decisão do Rodrigo (21/10/2026):** o ChatGPT cria **3 posts por dia** para a Flow Arts (@flowarts2026), no padrão abaixo, e envia ao painel pela pasta `agendamentos/`. **Nada é publicado sem o Rodrigo aprovar no painel.**

Esta regra vale todos os dias até o Rodrigo mudar. Ela substitui a frase antiga "1 post por dia vale mais que 3".

## Rotina diária (terminar até 08h de Brasília)
1. Leia esta regra, o `PLANO_CRESCIMENTO.md` (público, função de cada horário e metas), o standup do dia do CEO (`empresa/standup/AAAA-MM-DD.md` na branch `empresa-standup`, se existir) e a entrada mais recente de `HANDOFF_CLAUDE.md`. Veja o que já existe em `agendamentos/` na branch `agendamentos`, para não repetir tema nem horário.
2. Crie 3 posts para o dia: **09:00, 12:00 e 19:00**, seguindo o padrão abaixo e a função de cada horário.
   - **09h · ser salvo:** carrossel útil (passo a passo ou checklist). CTA: "Salve para usar depois".
   - **12h · ser descoberto e enviado:** antes e depois de foto de comida (prova). CTA: "Mande para um dono de cafeteria".
   - **19h · gerar conversa:** pergunta, enquete ou bastidor do exemplo grátis. CTA: "Responda nos comentários".
   - Nos três, a oferta do fim é o **exemplo grátis**: comente QUERO.
   - Escreva também as **5 mensagens de Direct do dia** para o Rodrigo revisar e enviar (elogio verdadeiro + oferta do exemplo grátis, sem preço). Entregue só a ele; não salve no repositório, que é público.
3. Salve na branch **`agendamentos`** do repositório `flowarts2027-art/SERVIDOR-NEXUS-2.0`. Use uma pasta por post:
   - `agendamentos/AAAA-MM-DD/0900/`
   - `agendamentos/AAAA-MM-DD/1200/`
   - `agendamentos/AAAA-MM-DD/1900/`
4. Confira na aba Actions o fluxo "NEXUS Agendar conteúdo pronto (pasta agendamentos)". Cada post precisa aparecer como **"enviado ao painel, esperando aprovação"**.
5. Avise o Rodrigo que os 3 posts estão no painel e registre em `HANDOFF_CHATGPT.md`: data, horários, temas e resultado do fluxo. Não cole imagens nem dados privados.

**Nunca:** apagar a branch `agendamentos`, publicar direto no Instagram, aprovar post no lugar do Rodrigo ou enviar post de horário que já passou.

## Arquivos de cada pasta
| Tipo | Arquivos |
| --- | --- |
| Carrossel (preferido) | `01.jpg`, `02.jpg`, … (5 a 7 cartões) + `legenda.txt` |
| Post de 1 imagem | `imagem.jpg` + `legenda.txt` |
| Reel (só vídeo real) | `video.mp4` + `capa.jpg` + `legenda.txt` |

- Feed: **4:5, 1080×1350**, JPG/PNG/WEBP, até 8 MB cada.
- `legenda.txt`: texto puro, até 2.200 caracteres.
- O post precisa chegar **pelo menos 10 minutos antes** do horário. Post repetido no mesmo dia e hora não é duplicado.
- Mais detalhes: `agendamentos/README.md`.

## Padrão da arte (o mesmo do Nexus: `cloudflare/src/flowarts-styles.js` e `client-brand.js`)
- **Foto realista** de pequeno negócio de verdade, com luz natural e as cores reais da cena.
- **Proibido:** robô, neon, holograma, ficção científica, **tom ou filtro azul**, circo, acrobacia e malabares.
- **Título:** no máximo **7 palavras**, inteiro, sem corte. Fica sempre na **metade de cima**. **Nada nos 20% de baixo.** Use a mesma fonte forte e a mesma posição em todos os posts, para a grade ficar com cara de marca.
- **Sem logo** na arte, porque ele entra depois. Tela de celular nunca virada para quem vê.
- Um assunto claro por imagem. Rosto em close só quando o tema pedir.

## Padrão do conteúdo
- **Público dos próximos posts:** donos de negócios de comida local, como pizzarias, cafés, confeitarias, lanchonetes e restaurantes pequenos. Não pule de nicho a cada post.
- **Mistura (pelo PLANO_CRESCIMENTO):** 1 post útil (09h), 1 prova com antes e depois (12h) e 1 conversa (19h) por dia. A oferta aparece só como "exemplo grátis" no fim; nunca um post inteiro dizendo "a Flow Arts faz por você".
- **Gancho:** fala da dor do dono, não da Flow Arts. Exemplos: "Sua pizza é boa. A foto não." e "3 fotos que todo café deveria postar".
- **Legenda:**
  - Linha 1: palavra-chave de busca + gancho. Exemplo: "Marketing para pizzaria: …".
  - Corpo: de 3 a 5 frases curtas ou passos numerados.
  - Peça envio ou salvamento. Exemplos: "Mande para um dono de pizzaria" ou "Salve para usar no próximo post".
  - Final: `Comente "QUERO" e receba grátis o guia com 10 ideias de post que trazem clientes 🎁`
  - De 3 a 5 hashtags do público. Exemplo: #MarketingParaRestaurantes #Pizzaria #PequenosNegocios #FlowArts.
- **Proibido no texto:** preço, cliente inventado, número ou depoimento inventado e promessa de seguidores ou vendas. Também não abra com "Você cuida do X. A Flow cuida do seu Instagram".

## Conferir antes de salvar (os 3 posts)
- [ ] 4:5, 1080×1350, título inteiro e na metade de cima
- [ ] sem azul, neon, robô, circo ou logo
- [ ] texto da arte sem erro de português
- [ ] legenda com palavra-chave, pedido de envio ou salvamento, QUERO e de 3 a 5 hashtags
- [ ] nada de preço, cliente inventado ou dado pessoal (o repositório é público)
- [ ] temas diferentes entre os 3 e dos posts dos últimos dias

## Se o envio pelo GitHub falhar
Entregue as 3 artes e as 3 legendas ao Rodrigo, identificadas por horário. Ele sobe no Master › Postagens › "Subir conteúdo do cliente". Registre a falha e o motivo em `HANDOFF_CHATGPT.md`, e o Claude investiga.
