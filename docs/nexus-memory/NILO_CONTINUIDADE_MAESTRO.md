# Nexus Maestro + Nilo — implementação de continuidade (contrato)
Data: 2026-11-01. Status: **especificação para implementar**, não é serviço ativo.

## Objetivo
Uma ordem inicia uma campanha com todas as peças esperadas e libera produção em lotes sem pedir novo OK a cada lote. Revisão e aprovação de publicação seguem obrigatórias. A interface de chat **não** pode ser presumida como executor persistente.

## Definição de execução
- Entrada: `cliente_id`, `campaign_id`, pedido, referência oficial no GitHub, quantidades, agenda, executor disponível.
- Maestro carrega `docs/nexus-memory/NEXUS_MAESTRO_PROTOCOLO.md` e arquivos do cliente. Sem PDF ou logo exigido, estado `blocked_missing_reference`.
- Criar tarefas estáveis por item (`campaign_id/day/slot/slide`); chave única impede reprodução acidental.
- Estados por imagem: `pending -> generating -> reviewing -> approved_asset -> queued_panel -> awaiting_human_approval`; alternativos `blocked`, `retryable_error`, `rejected_qa`.
- Nilo observa `last_heartbeat_at` e `lease_expires_at`; tarefa sem progresso expira e volta à fila se o executor estiver disponível. Não tentar duas execuções simultâneas da mesma chave.
- Registrar checkpoints a cada imagem e ao final do lote: versão de referência, nome do arquivo, hash SHA-256 e hash perceptual para detecção de duplicação, dimensões e resultado das verificações, etapa Clara/Dante, tentativas, erros, carimbo de tempo e destinatário.
- Reprovação da Clara gera nova tentativa restrita à imagem reprovada, jamais apagar uma imagem aprovada.
- Limitar tentativas, aplicar espera progressiva e mostrar falha persistente no painel para evitar loop infinito.
- Pausar em `waiting_for_executor` quando não houver ferramenta de geração acessível, em `usage_limit_reached` quando houver limite externo, e informar a restrição. **Não alegar que consegue enviar comandos para continuar automaticamente esta conversa do ChatGPT.**
- Bento só envia depois de revisão Clara + validação Dante; painel ainda exige aprovação humana para publicação.

## Interface mínima de status a implementar
`GET /maestro/campaigns/:id` => total, approved, rejected, pending, in_progress, waiting_for_executor, errors, last_checkpoint, latest_event.
`POST /maestro/campaigns` => cria campanha idempotente e devolve id/status.
`POST /maestro/campaigns/:id/resume` => acorda somente lotes pendentes, se houver executor e autorização; nunca contorna limites de plataforma.
Endpoints são desenho de API, não alegação de rotas existentes.

## Testes de aceitação
1. Campanha Quatree: 7 dias × 3 carrosséis × 2 imagens = 42 peças. Injetar interrupção após 6, verificar retomada na peça 7 e zero duplicatas.
2. Forçar 1080×1080 em carrossel Quatree: Clara reprova; não envia.
3. Injetar logo redesenhada de Daniela: Clara reprova. Exigir imagem limpa + sobreposição do logotipo original verificado.
4. Apagar referência PDF: falhar fechado, sem inventar tabela ou embalagem.
5. Simular limite ChatGPT: status waiting_for_executor/usage_limit_reached; nenhuma retomada falsa.
6. Envio aprovado internamente: permanece aguardando aprovação do cliente antes de publicar.

## Integração futura
Implementar adaptadores reais, filas persistentes e workers no Nexus, autenticação de endpoints e logs. Testar numa branch e preparar PR de código. Até esse passo, este documento apenas fixa comportamento e casos de teste.
