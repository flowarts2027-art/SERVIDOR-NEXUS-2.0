"""Monta a arte final de um cliente com marca salva no Master (pedido do Rodrigo, 05/11/2026).

Recebe a foto gerada, o título, a palavra do botão, a logo e as cores, e escreve por cima da foto
inteira. Sem faixa de cor, sem margem e sem corte. Roda no GitHub Actions porque o Worker não desenha letras.

Uso: python3 compor_arte.py DADOS.json SAIDA.jpg
"""
import io
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402

import campanha_diaria as cd  # noqa: E402

MARGEM = 64
CONTORNO = 4


def baixar(url):
    with urllib.request.urlopen(url, timeout=60) as resposta:
        return Image.open(io.BytesIO(resposta.read()))


def cor(valor):
    return tuple(int(valor[i:i + 2], 16) for i in (1, 3, 5))


def montar(foto, dados, logo=None):
    story = bool(dados.get("story"))
    largura, altura = (1080, 1920) if story else (1080, 1350)
    arte = foto.convert("RGBA").resize((largura, altura), Image.LANCZOS)
    topo = 270 if story else 48
    alt_logo = 112 if story else 104
    if logo is not None:
        logo = logo.convert("RGBA")
        logo = logo.resize((round(logo.width * alt_logo / logo.height), alt_logo), Image.LANCZOS)
        arte.alpha_composite(logo, (MARGEM, topo))

    d = ImageDraw.Draw(arte)
    titulo = [linha.upper() for linha in dados["title"]]
    destaque = cor(dados["accent"])
    tam = min(cd.cabe(linha, 800, 92 if story else 86, largura - 2 * MARGEM) for linha in titulo)
    fonte = cd.fonte_titulo(tam, 800)
    y = topo + alt_logo + 34
    for linha, preenchimento in zip(titulo, ((255, 255, 255), (255, 255, 255), destaque)):
        d.text((MARGEM, y), linha, font=fonte, fill=preenchimento, stroke_width=CONTORNO, stroke_fill=(0, 0, 0))
        y += int(tam * 1.1)

    alt_botao = 96
    base = (altura - int(altura * 0.20) - alt_botao - 24) if story else (altura - alt_botao - 44)
    larg_botao = 760 if story else 600
    x = (largura - larg_botao) // 2
    d.rounded_rectangle([x, base, x + larg_botao, base + alt_botao], radius=alt_botao // 2, fill=destaque)
    chamada = dados["button"]
    fonte_botao = cd.fonte_titulo(cd.cabe(chamada, 800, 48, larg_botao - 70), 800)
    d.text((largura // 2, base + alt_botao // 2), chamada, font=fonte_botao, fill=cor(dados["onAccent"]), anchor="mm")
    return arte.convert("RGB")


def main():
    dados = json.load(open(sys.argv[1], encoding="utf-8"))
    logo = baixar(dados["logo"]) if dados.get("logo") else None
    montar(baixar(dados["photo"]), dados, logo).save(sys.argv[2], "JPEG", quality=92)


if __name__ == "__main__":
    main()
