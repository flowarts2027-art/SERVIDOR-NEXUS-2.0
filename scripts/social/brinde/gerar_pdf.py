"""Gera o PDF do brinde "30 legendas prontas" a partir do HTML desta pasta.
Uso (na raiz do repositório): python3 scripts/social/brinde/gerar_pdf.py
Precisa do Google Chrome (ou Chromium) instalado."""
import pathlib, shutil, subprocess, sys

aqui = pathlib.Path(__file__).resolve().parent
raiz = aqui.parents[2]
html = aqui / "30-legendas.html"
saida = raiz / "public" / "downloads" / "30-legendas-flowarts.pdf"
chrome = next((c for c in ("google-chrome", "chromium", "chromium-browser", "chrome") if shutil.which(c)), None)
if not chrome:
    sys.exit("Chrome não encontrado.")
subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                "--allow-file-access-from-files", f"--print-to-pdf={saida}", html.as_uri()], check=True,
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(saida, saida.stat().st_size, "bytes")
