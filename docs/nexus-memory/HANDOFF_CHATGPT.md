# Passagem de trabalho — ChatGPT → Claude Code

Este arquivo contém **resumos de projeto aprovados para o GitHub público**, não o histórico integral de conversas. O ChatGPT acrescenta novas entradas no topo. Consulte também `BRIDGE_PROTOCOL.md` e `TASK_BOARD.md`.

## 2026-10-19 — Ponte compartilhada e prospecção Flow Arts
- **Origem → destino:** ChatGPT → Claude Code / ChatGPT Work.
- **Pedido:** permitir que os dois assistentes consultem decisões e trabalhos anteriores no Nexus, sem repetir explicações e sem exigir integração direta paga.
- **Decisão:** usar os arquivos existentes em `docs/nexus-memory/` e instruções `AGENTS.md` / `CLAUDE.md`, complementados pelo protocolo e por um quadro de tarefas. Registrar decisões e resultados em handoffs separados. **Não há sincronização automática entre conversas de produtos diferentes.**
- **Divisão preferida:** ChatGPT cuida da estratégia, texto e qualidade visual de marketing; Claude cuida da mecânica/código e validações. Revisão cruzada no GitHub.
- **Prospecção desejada:** identificar pequenos negócios por cidade/nicho, priorizar empresas sem site identificado ou com oportunidade verificável de melhoria digital. Preferir dados públicos e fontes que permitam a consulta; tratar ausência de site como `não encontrado`, nunca certeza absoluta. Cadastro no CRM sem duplicatas, motivo de seleção e fonte da evidência.
- **Volume:** nesta conversa foi proposto **até 20 oportunidades por dia**; o changelog de 19/10 registra uma configuração de **10 por dia** em outra branch. **Conciliar o limite existente com o novo pedido antes de mudar produção**.
- **Abordagem inicial:** painel deve preparar texto personalizado com nome da empresa e assinatura comercial da Flow Arts; botão **“Copiar e abrir Instagram”**, com envio **manual pelo usuário**, não DM automática para desconhecidos. Somente prosseguir para WhatsApp oficial com a autorização exigida e mensagens/modelos adequados. Não usar atraso entre envios para contornar regras.
- **Custos:** tentar busca básica com critérios locais e fontes gratuitas permitidas. Geração/revisão por IA opcional e com teto/visibilidade de custos; não afirmar que análise avançada ou geração de imagens é gratuita.
- **Imagens:** existem pedidos separados de artes publicitárias por nicho no formato 4:5 com quatro fotos em 2×2, estética realista e pouquíssimo texto. Não confundir essa entrega visual com o código do buscador.
- **Situação verificada antes deste PR:** `lead-hunter.js` prioriza comentários recebidos no Instagram; outros módulos existentes (`crm.js`, `daily-prospects.js`, segundo changelog) devem ser inspecionados antes de construir alternativa duplicada. Nenhum novo buscador foi implementado nesta passagem.
- **Próxima ação para Claude / Work:** primeiro auditar o Caçador/CRM que já existe e os PRs abertos; depois propor o menor conjunto de mudanças necessário para qualificação e contato manual. Testar, registrar custo, evitar duplicatas; não implantar sem aprovação do proprietário.
- **Evidência desta passagem:** alterações apenas documentais em branch de integração, aguardando PR/revisão. Nenhuma execução de busca, envio, publicação ou deploy por esta tarefa.
