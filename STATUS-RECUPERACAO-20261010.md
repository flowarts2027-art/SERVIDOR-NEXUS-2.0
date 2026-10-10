# Nexus 2.0 — status de recuperacao (10/10/2026)

## Codigo e repositorio
- Repositorio novo: `flowarts2027-art/SERVIDOR-NEXUS-2.0`
- Branch de recuperacao: `recovery/nexus-20261010`
- Bundle `index.js` recuperado e confirmado nesta branch; sintaxe passou em `node --check`.
- O historico e os fontes modulares anteriores ainda nao foram recuperados.

## Inventario Cloudflare — confirmado pela consulta Wrangler do proprietario
- Worker de producao: `servidor-nexus`, nao modificado durante a recuperacao.
- Deployment ativo confirmado em 10/10/2026: versao `9d6db227-8d23-4da8-89c8-4477076482c3` recebendo 100% do trafego.
- D1 existentes: `servidor-nexus` e `globalplay-site-db`.
- R2 existente: `servidor-nexus-media` (123 objetos, aproximadamente 25 MB no momento do inventario).
- Bindings ativos: `DB` (D1), `MEDIA` (R2), `IMAGES` (Cloudflare Images) e `ASSETS` (assets estaticos).
- `NEXUS_SECRET_KEY` confirmado como binding de tipo `secret_text` na versao ativa. **O valor nao foi recuperado nem exposto**; manter exatamente a configuracao existente.
- Outros nomes de bindings e secrets foram identificados localmente, sem copiar valores para este repositorio publico.
- Copia de metadados da versao ativa preservada **somente no computador do proprietario**, fora deste repositorio.

## Backups — estado real
- Bookmarks D1 foram registrados para ambos os bancos, mas **nao constituem backups independentes**.
- **NENHUM dump SQL D1 concluido**: a exportacao nao foi autorizada no prompt interativo.
- **NENHUMA copia dos objetos R2 concluida**: apenas o inventario do bucket.
- A exportacao SQL remota de D1 pode tornar o banco temporariamente indisponivel durante a operacao. Agendar janela segura antes da exportacao.
- Backups de dados, secrets, tokens, configuracoes privadas e arquivos de clientes nao devem ser publicados neste GitHub.

## Pendencias em ordem segura
1. Conferir IDs reais associados aos bindings `DB` e `MEDIA` a partir do arquivo local da versao ativa; nao divulgar valores de secrets.
2. Fazer copia integral e verificar os 123 objetos R2 usando apenas operacoes de leitura.
3. Escolher janela de baixa atividade para exportar os dois bancos D1 e conferir arquivos e hashes.
4. Documentar triggers, routes, demais bindings e configuracoes sem segredos.
5. Reconstruir estrutura e pipeline de testes em ambiente isolado, sem deploy automatico.
6. Validar paineis, Instagram, agentes e videos; so entao planejar migracao/deploy com rollback.

## Regra de seguranca
Nao alterar a producao, nao trocar `NEXUS_SECRET_KEY`, nao publicar secrets e nao aplicar restauracoes em D1/R2 durante este inventario.

## Vinculos verificados na configuracao ativa
- O binding `DB` aponta para o banco D1 UUID `3d440c4a-8925-4526-8d29-03f9eb227d60`, correspondente ao nome `servidor-nexus`.
- O binding `MEDIA` aponta para o bucket `servidor-nexus-media`.
- Confirmacao obtida pela leitura local do JSON da versao ativa pelo proprietario; sem alteracao em producao.
