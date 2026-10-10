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
- **Dois dumps SQL D1 exportados com sucesso segundo a saida do PowerShell do proprietario (10/10/2026)**: `globalplay-site-db.sql` e `servidor-nexus.sql`, preservados fora do GitHub. Teste de importacao/restauracao ainda pendente.
- **Backup R2 reportado como concluido e verificado** em 10/10/2026 (detalhes abaixo).
- A exportacao SQL remota de D1 pode tornar o banco temporariamente indisponivel durante a operacao. Agendar janela segura antes da exportacao.
- Backups de dados, secrets, tokens, configuracoes privadas e arquivos de clientes nao devem ser publicados neste GitHub.

## Pendencias em ordem segura
1. Conferir IDs reais associados aos bindings `DB` e `MEDIA` a partir do arquivo local da versao ativa; nao divulgar valores de secrets.
2. Confirmar a preservacao privada do manifesto e dos 123 objetos R2 (copias ja baixadas localmente).
3. Validar hashes e estrutura dos dois dumps D1 e testar a importacao em banco local/ambiente isolado; **nao** restaurar sobre a producao.
4. Documentar triggers, routes, demais bindings e configuracoes sem segredos.
5. Reconstruir estrutura e pipeline de testes em ambiente isolado, sem deploy automatico.
6. Validar paineis, Instagram, agentes e videos; so entao planejar migracao/deploy com rollback.

## Regra de seguranca
Nao alterar a producao, nao trocar `NEXUS_SECRET_KEY`, nao publicar secrets e nao aplicar restauracoes em D1/R2 durante este inventario.

## Vinculos verificados na configuracao ativa
- O binding `DB` aponta para o banco D1 UUID `3d440c4a-8925-4526-8d29-03f9eb227d60`, correspondente ao nome `servidor-nexus`.
- O binding `MEDIA` aponta para o bucket `servidor-nexus-media`.
- Confirmacao obtida pela leitura local do JSON da versao ativa pelo proprietario; sem alteracao em producao.

## Backup R2 confirmado em 10/10/2026
- O proprietario executou o script local e informou a mensagem `BACKUP R2 CONCLUIDO E VERIFICADO`.
- Resultado reportado: 123 de 123 objetos, 24.988.330 bytes, nenhuma modificacao no bucket remoto.
- Diretorio privado: `C:\NEXUS-RECUPERACAO\backups-cloudflare\r2-20261010-100815`.
- Inventario e hashes no manifesto local `manifesto-r2.csv` (nao incluido no repositorio publico).
- Confirmacao baseada no resultado do PowerShell do proprietario; arquivos nao foram acessados ou auditados diretamente pelo assistente.
- **D1 exportado em 10/10/2026**: os dois dumps foram baixados com sucesso no Windows (detalhes abaixo). Ainda falta validar conteudo SQL e restauracao isolada.

## Backup D1 reportado em 10/10/2026
- `globalplay-site-db`: exportacao remota realizada com Wrangler 4.149.0; arquivo `.sql` baixado e validado como existente e nao vazio pelo script local.
- `servidor-nexus` (UUID `3d440c4a-8925-4526-8d29-03f9eb227d60`): exportacao remota realizada com sucesso; arquivo `.sql` baixado e validado como existente e nao vazio.
- Caminho local privado: `C:\NEXUS-RECUPERACAO\backups-cloudflare\d1-20261010-102025`.
- `Get-FileHash -Algorithm SHA256` executado para ambos os dumps, salvando arquivos `.sha256.txt`.
- Nenhum arquivo SQL, segredo, URL assinada de exportacao nem dado de cliente publicado no repositorio GitHub.
- Esta confirmacao e baseada na saida do PowerShell; o assistente ainda nao inspecionou os dumps localmente.
- Proxima validacao: tamanho e hash, estrutura dos SQL e eventual restauracao em ambiente **isolado**, nunca no D1 de producao.
