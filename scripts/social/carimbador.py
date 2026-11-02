"""Carimbador de logos: só aplica arquivos oficiais existentes e verificados.

Nunca pede à IA para redesenhar o logo. Registro pode ser atualizado apenas
depois de validar explicitamente o novo ativo original do cliente.
"""
import hashlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LOGOS_OFICIAIS = {
    "giltec": (
        ROOT / "docs/nexus-memory/clientes/giltec/logo-giltec.png",
        "f4224d2c73ce36ba3c95695252d46314d77ccd3e",
    ),
    "flow": (
        ROOT / "public/brand/flowarts-logo.webp",
        "ca1251bf1b477747d31c1a2db143f29c421facee",
    ),
    "daniela": (
        ROOT / "public/brand/daniela-martins-logo.png",
        "84a4eda379eda05ae9af2437317cda9a8e5899b6",
    ),
}


def verificar_logo(cliente):
    """Retorna arquivo oficial ou falha sem inventar marca."""
    if cliente not in LOGOS_OFICIAIS:
        raise RuntimeError(f"CARIMBADOR: logo oficial não cadastrado: {cliente}")
    caminho, sha_esperado = LOGOS_OFICIAIS[cliente]
    if not caminho.is_file():
        raise RuntimeError(f"CARIMBADOR: logo oficial ausente: {cliente}")
    bruto = caminho.read_bytes()
    sha_atual = hashlib.sha1(b"blob " + str(len(bruto)).encode() + b"\0" + bruto).hexdigest()
    if sha_atual != sha_esperado:
        raise RuntimeError(f"CARIMBADOR: logo diverge do original: {cliente}")
    with Image.open(caminho) as img:
        img.verify()
    return caminho


def carimbar_logo(imagem, cliente, x, y, altura, largura_maxima=900):
    """Sobrepõe logo verdadeiro sem distorcer proporção ou ultrapassar o canvas."""
    caminho = verificar_logo(cliente)
    if imagem.mode != "RGBA":
        raise ValueError("CARIMBADOR: canvas precisa ser RGBA")
    if not all(isinstance(v, int) and v >= 0 for v in (x, y, altura, largura_maxima)):
        raise ValueError("CARIMBADOR: coordenadas inválidas")
    with Image.open(caminho) as original:
        logo = original.convert("RGBA")
    # Reduzir mantendo aspecto; nunca esticar ou cortar o logotipo.
    escala = min(altura / logo.height, largura_maxima / logo.width,
                 (imagem.width - x) / logo.width, (imagem.height - y) / logo.height)
    if escala <= 0:
        raise ValueError("CARIMBADOR: logo fora dos limites")
    dimensoes = (max(1, round(logo.width * escala)), max(1, round(logo.height * escala)))
    if dimensoes[0] < 32 or dimensoes[1] < 24:
        raise ValueError("CARIMBADOR: logo pequeno demais")
    imagem.alpha_composite(logo.resize(dimensoes, Image.Resampling.LANCZOS), (x, y))
    return dimensoes
