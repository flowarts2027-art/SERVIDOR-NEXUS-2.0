#!/usr/bin/env python3
"""Diagnostico LOCAL, somente leitura, para a recuperacao do Nexus 2.0.

Nao conecta ao GitHub/Cloudflare, nao imprime registros D1 nem tokens,
nao altera producao e nao envia arquivos para a internet.
Uso: python scripts/diagnostico_nexus.py
CI:  python scripts/diagnostico_nexus.py --repo-only
"""
from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sqlite3
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PADRAO_WINDOWS = Path("C:/NEXUS-RECUPERACAO")
PADROES_SEGREDOS = {
    "OpenAI key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}"),
    "GitHub token": re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}"),
    "GitHub fine-grained token": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{25,}"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "PEM private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}


def aviso(nome: str, detalhe: str) -> None:
    print(f"[INFO] {nome}: {detalhe}")


def ok(nome: str, detalhe: str) -> None:
    print(f"[OK] {nome}: {detalhe}")


def problema(nome: str, detalhe: str) -> None:
    print(f"[FALHOU] {nome}: {detalhe}")


def sha256(caminho: Path) -> str:
    h = hashlib.sha256()
    with caminho.open("rb") as f:
        for pedaco in iter(lambda: f.read(1024 * 1024), b""):
            h.update(pedaco)
    return h.hexdigest()


def verificar_codigo(raiz: Path) -> int:
    codigo = REPO / "index.js"
    if not codigo.is_file():
        codigo = raiz / "nexus-extraido" / "index.js"
    if not codigo.is_file():
        problema("Worker", "index.js ausente do repositorio e da pasta de recuperacao")
        return 1

    ok("Worker", f"index.js encontrado, {codigo.stat().st_size:,} bytes, SHA-256 {sha256(codigo)[:16]}...")
    fonte = codigo.read_text(encoding="utf-8", errors="replace")
    encontrou = [nome for nome, rx in PADROES_SEGREDOS.items() if rx.search(fonte)]
    if encontrou:
        problema("Seguranca", f"padroes de possiveis credenciais: {', '.join(encontrou)} (valores ocultos)")
        return 1
    ok("Seguranca", "nenhum dos formatos de token pesquisados foi encontrado (auditoria parcial)")

    node = shutil.which("node")
    if node:
        resultado = subprocess.run([node, "--check", str(codigo)], capture_output=True, text=True, check=False)
        if resultado.returncode != 0:
            problema("Sintaxe JS", "node --check falhou; consultar saida local do Node, sem compartilhar segredos")
            return 1
        ok("Sintaxe JS", "node --check passou")
    else:
        aviso("Sintaxe JS", "Node.js indisponivel; teste de sintaxe nao executado")
    return 0


def verificar_repositorio() -> None:
    for nome in ["wrangler.toml", "wrangler.jsonc", "package.json", "assets", ".github/workflows"]:
        if (REPO / nome).exists():
            ok("Repositorio", f"{nome} presente")
        else:
            aviso("Repositorio", f"{nome} ainda nao esta presente")
    aviso("Producao", "nenhum deploy, upload ou alteracao remota foi executado")


def verificar_backup_local(raiz: Path) -> None:
    base = raiz / "backups-cloudflare"
    if not base.is_dir():
        aviso("Backups", "diretorio local nao localizado neste computador")
        return

    pastas_d1 = sorted((p for p in base.glob("d1-*") if p.is_dir()), reverse=True)
    if pastas_d1:
        pasta = pastas_d1[0]
        arquivos = sorted(pasta.glob("*.sql"))
        aviso("D1", f"{len(arquivos)} dump(s) SQL encontrados; sem ler registros de clientes")
        for arquivo in arquivos:
            ok("D1", f"{arquivo.name}: {arquivo.stat().st_size:,} bytes, SHA-256 {sha256(arquivo)[:16]}...")
        testes = sorted((p for p in pasta.glob("teste-python-*") if p.is_dir()), reverse=True)
        if testes:
            extensoes = {".db", ".sqlite", ".sqlite3"}
            bancos = [p for p in testes[0].rglob("*") if p.is_file() and p.suffix.lower() in extensoes]
            for arquivo in bancos:
                try:
                    conexao = sqlite3.connect(arquivo.resolve().as_uri() + "?mode=ro", uri=True)
                    try:
                        integridade = conexao.execute("PRAGMA quick_check").fetchone()
                        numero_tabelas = conexao.execute(
                            "SELECT count(*) FROM sqlite_master WHERE type='table'"
                        ).fetchone()[0]
                    finally:
                        conexao.close()
                    if integridade and integridade[0] == "ok":
                        ok("SQLite local", f"{arquivo.name}: quick_check=ok; {numero_tabelas} tabelas")
                    else:
                        problema("SQLite local", f"{arquivo.name}: quick_check nao retornou ok")
                except sqlite3.Error:
                    problema("SQLite local", f"{arquivo.name}: nao foi possivel abrir/validar")
            if not bancos:
                aviso("SQLite local", "nenhum arquivo .db/.sqlite localizado no ultimo teste")
    else:
        aviso("D1", "nenhum diretorio de dumps d1-* encontrado")

    pastas_r2 = sorted((p for p in base.glob("r2-*") if p.is_dir()), reverse=True)
    if pastas_r2:
        pasta = pastas_r2[0]
        manifesto = pasta / "manifesto-r2.csv"
        aviso("R2", "manifesto local presente" if manifesto.is_file() else "manifesto local ausente")
        aviso("R2", "comparacao com os objetos remotos NAO realizada")
    else:
        aviso("R2", "nenhum diretorio r2-* encontrado")


def main() -> int:
    parser = argparse.ArgumentParser(description="Auditoria read-only da recuperacao Nexus 2.0")
    parser.add_argument("--root", type=Path, default=PADRAO_WINDOWS, help="Pasta local NEXUS-RECUPERACAO")
    parser.add_argument("--repo-only", action="store_true", help="Somente codigo e estrutura; para CI")
    args = parser.parse_args()

    print("=== NEXUS 2.0 | DIAGNOSTICO SOMENTE LEITURA ===")
    erros = verificar_codigo(args.root.expanduser())
    verificar_repositorio()
    if not args.repo_only:
        verificar_backup_local(args.root.expanduser())
    print("=== FIM: producao intacta; informacoes sensiveis nao foram exibidas ===")
    return erros


if __name__ == "__main__":
    raise SystemExit(main())
