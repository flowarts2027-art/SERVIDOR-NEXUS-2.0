# Implantação do Agente WhatsApp

Este módulo adapta apenas o agente de WhatsApp do repositório `asv-digital/bonus-aula-claude-code` para o Nexus 2.0.

## Arquitetura

- Meta WhatsApp Cloud API
- Cloudflare Worker
- Cloudflare D1 para histórico, triagem, rascunhos e log de envio
- OpenAI já existente no Nexus para escrever as respostas
- atendente virtual da Flow Arts (`cloudflare/src/whatsapp-knowledge.js`: fatos, serviços e preços)
- resposta automática **desligada por padrão**; liga/desliga no painel Master › WhatsApp

## Endpoint do webhook

```
https://servidor-nexus.diamantehinode2015.workers.dev/api/whatsapp/webhook
```

## Variáveis obrigatórias no Cloudflare

Segredos:
- `WHATSAPP_VERIFY_TOKEN` — texto que você escolhe para verificar o webhook
- `WHATSAPP_ACCESS_TOKEN` — token permanente/system user da Meta
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número do WhatsApp Business
- `WHATSAPP_APP_SECRET` — App Secret do aplicativo Meta

Variáveis normais já definidas pelo projeto:
- `WHATSAPP_CLIENT_ID=primeiro-teste` (Flow Arts)
- `WHATSAPP_GRAPH_VERSION=v26.0`
- `WHATSAPP_SEND_LIMIT_PER_HOUR=30`

## Segurança herdada e reforçada

1. envio manual exige `confirmed=true`
2. limite de 30 envios por hora (manual + automático)
3. log persistente no D1
4. webhook POST valida `X-Hub-Signature-256`
5. resposta automática só com o robô ligado no painel (`whatsapp_settings.auto_reply`)
6. quando a IA passa para humano (`needsHuman`), responde avisando e pausa o robô naquela conversa (`whatsapp_contacts.bot_paused`)
7. quando uma pessoa responde pelo painel, o robô pausa naquela conversa
8. se a OpenAI falhar, envia aviso seguro ("uma pessoa da equipe vai te responder") e pausa
9. áudio/imagem: pede texto, sem gastar IA

## Rotas internas

Todas, exceto o webhook, exigem autenticação Nexus.

- `GET /api/whatsapp/status`
- `GET /api/whatsapp/inbox`
- `GET /api/whatsapp/messages?phone=55...`
- `GET /api/whatsapp/drafts`
- `POST /api/whatsapp/send` (pausa o robô na conversa)
- `POST /api/whatsapp/settings` `{"autoReply": true|false}`
- `POST /api/whatsapp/contact` `{"phone":"55...","botPaused":false,"read":true}`

Exemplo de envio aprovado:

```json
{
  "to": "5521999999999",
  "text": "Mensagem aprovada",
  "confirmed": true,
  "draftId": "opcional"
}
```

## Comportamento

Quando chega mensagem:
1. valida assinatura da Meta;
2. salva histórico no D1;
3. classifica em urgente, lead, cliente, fornecedor, pessoal ou ruído;
4. gera prioridade;
5. cria rascunho curto;
6. aguarda confirmação humana para qualquer envio.


## Passo a passo do Rodrigo (2026-10-12)

1. App Meta **Flow Arts WhatsApp** (separado do app do Instagram), portfólio Rodrigo Carvalho. Número de teste da Meta criado; celular do Rodrigo adicionado como destinatário. Feito em 2026-10-12.
2. Cloudflare › Worker `servidor-nexus` › Configurações › Variáveis e segredos: o Rodrigo digita os 4 segredos acima. Nunca colar no chat.
3. Meta › WhatsApp › Configuração › Webhook: URL do webhook acima + o mesmo `WHATSAPP_VERIFY_TOKEN`; assinar o campo `messages`.
4. Painel Master › WhatsApp: conferir "Conectado", mandar "oi" do celular e ver a conversa aparecer. Só então ligar o robô.
5. O token de teste da Meta dura 24 h. Para uso real: criar usuário do sistema no portfólio e gerar token permanente.
6. Chip pré-pago novo: adicionar como número de produção na Meta e trocar `WHATSAPP_PHONE_NUMBER_ID`.
