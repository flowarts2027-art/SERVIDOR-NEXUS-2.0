# Rota de envio Flow Arts — 27/10/2026

Pedido do proprietário: registrar o caminho para evitar novas tentativas pelo painel errado.

- Repositório: flowarts2027-art/SERVIDOR-NEXUS-2.0; branch agendamentos.
- Cliente Flow Arts: primeiro-teste.
- Pastas: agendamentos/AAAA-MM-DD/HHMM/ (padrão Flow Arts) ou agendamentos/clientes/primeiro-teste/AAAA-MM-DD/HHMM/.
- Feed: imagem.png + legenda.txt. Carrossel: 01.png, 02.png etc. + legenda.txt. Story: HHMM-story/story.png.
- Não basta colocar ZIP na raiz: o fluxo não o extrai.
- Data manual: 2026-10-27, nunca 27/10/26. Run 40505219369 falhou com Data inválida antes do upload.
- Horários precisam estar pelo menos 10 minutos no futuro.
- Push aciona nexus-agendar-pasta.yml. Confirmar nos logs enviado ao painel, esperando aprovação, com ID retornado. Não confundir commit com upload nem com publicação.
- Não depende da sessão do navegador estar no cliente. Não orientar login no celular para liberar sessão do assistente.
- Nesta sessão: ZIP recuperado, 10 imagens organizadas em 7 conteúdos e DRY_RUN aprovado. Push por terminal falhou por ausência de autenticação; gravação de imagens pelo conector ainda sem resultado confirmado. Nenhuma publicação realizada.
