# Procedimento de recuperação do Nexus no Windows

## Segurança
- A Cloudflare em produção **não será alterada** por estes comandos.
- O repositório GitHub novo é **público**. Não suba o resultado da extração sem revisão de segredos/dados.
- Não envie API tokens, chaves, senhas ou dumps D1/R2 a terceiros.

## Execução
1. No computador, instale Node.js: https://nodejs.org/.
2. Abra https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0, escolha **Code > Download ZIP**, extraia.
3. Na pasta extraída, abra o PowerShell e execute:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\recuperar-worker.ps1
   ```
4. Entre somente na página oficial da Cloudflare aberta pelo Wrangler.
5. O script criará uma pasta chamada `NEXUS-RECUPERACAO-...` na sua pasta de usuário e tentará importar o Worker `servidor-nexus` para ela. **Não publique nada.**
6. Guarde a cópia no computador e confira os arquivos. Faça backup externo privado, se possível.

## Se o script falhar
Copie apenas o **texto do erro**, escondendo tokens/URLs pessoais, e use os comandos manuais abaixo:
```powershell
npx wrangler@4 login
npx wrangler@4 init --from-dash servidor-nexus
```
Comando descrito pela Cloudflare em https://developers.cloudflare.com/workers/wrangler/commands/workers/#init

## Depois da extração
- Inventariar os arquivos extraídos e as configurações sem salvar segredos no GitHub.
- O código recuperado pode estar empacotado e não corresponder ao original em `src/`.
- Recursos Cloudflare D1/R2, assets e segredos exigem tratamento separado; não aparecem necessariamente no código exportado.
- Recriar testes e configurar CI/CD só após auditoria em ambiente de teste.

## Importante
O bloqueio da conta GitHub antiga não significa que Cloudflare/D1/R2 foram apagados. Sem autenticação na Cloudflare ainda não verificamos esses recursos diretamente.
