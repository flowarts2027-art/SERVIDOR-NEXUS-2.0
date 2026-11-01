# Nexus Maestro — contrato de coordenação dos DOTs
Versão inicial: 2026-11-01. **Especificação; não representa agente já instalado ou ativado.**

## Princípio
O Maestro é o orquestrador técnico de cada pedido de campanha no Nexus. **Dante continua diretor** e responsável pela validação editorial; Maestro não substitui Dante nem a aprovação humana. Um pedido de campanha iniciado em interface integrada deve chamar o Maestro automaticamente, sem palavra-chave.

## Fluxo obrigatório
1. Receber `cliente_id`, pedido, data, formatos e campanha; gerar `job_id` idempotente.
2. Carregar as diretrizes oficiais por cliente no GitHub, verificar disponibilidade e versão das referências visuais (PDF, logos, modelos), catálogo, restrições, estado da agenda do Nexus e últimas entregas. **Se um arquivo obrigatório estiver ausente, interromper e sinalizar; nunca inventar fonte.**
3. Lia: conferir objetivo, linha, produto, público e evitar repetições.
4. Maya: produzir fundo/imagem e composição a partir de referências aprovadas; manter embalagens e marcas oficiais como ativos, sem recriar marca. Quando exigido, gerar arte sem textos/logotipo e sobrepor ativos oficiais depois.
5. Caio: validar nomes, CTAs, revisão ortográfica, alegações e números contra documentos originais.
6. Clara: auditar saída por imagem, comparando ao modelo, PDF e logo oficiais; conferir dimensão, 4:5/9:16, margens, separação dos slides, quantidade, duplicação, ortografia e integridade do logotipo; reprovar e solicitar correção se falhar.
7. Dante: revisar conteúdo final e liberar apenas para a fila de **aprovação humana** no Nexus.
8. Bento: verificar agenda e enviar ao painel sem publicar automaticamente; registrar IDs/links, horários e status. Falha de envio não pode ser marcada como sucesso.
9. Persistir `job_id`, cliente, regras e hashes das referências, cada etapa, evidências, tentativas, reprovados, aprovadores, arquivos finais, status de envio e itens pendentes. Retomar somente os faltantes, sem duplicar.

## Regras por cliente conhecidas (validar todos os ativos na auditoria)
### Quatree Dog (`quatree-dog`)
Consultar antes de cada execução `docs/nexus-memory/clientes/quatree/CARROSSEL_LINHAS_7D.md`, `docs/nexus-memory/clientes/quatree/CATALOGO_QUATREE_2026_DIRETRIZ.md` e diretrizes compartilhadas citadas nesses arquivos. O PDF original `CATÁLOGO QUATREE 2026` e a imagem-modelo precisam ser localizados e verificados; a diretriz afirma expressamente que o modelo vem anexado ao chat, não está naquele arquivo. **Não confundir referência textual com disponibilidade do PDF binário.** Produção de carrosséis: 1080×1350, imagens separadas, embalagem oficial fiel, tabela de garantia apenas com valores conferidos, CTA `COMENTE TABELA`. Para 7 dias: 3 carrosséis/dia com 2 imagens cada; respeitar o mapeamento de linhas e não duplicar produtos. Gerar fotografia sem letras e aplicar textos por código quando exigido.
### Daniela Martins
Usar somente logotipo oficial com borboleta dourada e identificação `Ateliê Daniela Martins`, quando conferidos nos ativos. **Gerar primeiro a imagem limpa; aplicar o logotipo original como carimbo/sobreposição no final**, sem solicitar ao gerador que desenhe a marca. Tema dourado e branco, margens seguras, cliente/profissional realistas, separar imagens de carrossel e stories. Se logo original ausente, bloquear e reportar.
### Flow Arts
Usar exclusivamente a logo oficial azul/prateada, nunca inventar nem redesenhar. Para o perfil institucional conferir o cronograma vigente antes de criar: evitar peças duplicadas pela campanha automática. Se faltarem referências, bloquear.

## Portas de qualidade obrigatórias
- Falta de PDF, logo ou modelo obrigatório: `blocked_missing_reference`.
- Diferença de logo/embalagem, alegação não suportada, arte em mosaico, dimensão errada ou duplicação: `rejected_qa`, com motivo e correção.
- Clara/Dante não aprovaram: impedir envio.
- Envio ao painel fica `pending_human_approval` até a pessoa aprovar; não confundir aprovação da equipe com permissão para publicação.
- Detectores automáticos (dimensão, contagem, hash perceptual, campos exigidos) complementam revisão visual humana; não garantem fidelidade sozinhos.

## Implementação pendente no código do Nexus
Criar serviço/endpoint de orquestração, armazenamento persistente de jobs, adaptadores dos DOTs e fontes GitHub, validações automáticas e integração na entrada de campanhas. Testar com uma campanha-piloto Quatree e uma Daniela, incluindo falhas intencionais e recomeço de conversa. Não afirmar que estas integrações existem enquanto não houver código testado e deploy confirmado.
