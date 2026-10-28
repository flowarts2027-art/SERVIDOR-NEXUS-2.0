#!/usr/bin/env python3
# Confere a arte antes de subir ao painel (pedido do Rodrigo, 27/10/2026, campanha GILTEC).
# Reprova cartão com faixa vazia de cor lisa nas laterais (ou em cima e embaixo): é sinal de
# cartão cortado de uma imagem larga e colado no meio de um fundo, que fica estreito e borrado.
# Uso: checar-arte.py ARQUIVO...   Sai com código 1 e uma linha "arquivo: motivo" por problema.
import sys
try:
    from PIL import Image, ImageStat
except ImportError:
    print("SKIP: Pillow não instalado; conferência de faixa vazia não feita")
    sys.exit(0)

BAND = 0.12      # 12% de cada lado
FLAT = 6.0       # desvio-padrão máximo para considerar "cor lisa"
SAME = 12.0      # diferença máxima de cor entre os dois lados

def flat(img):
    st = ImageStat.Stat(img)
    return max(st.stddev) <= FLAT, st.mean

def check(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    bw, bh = max(1, int(w * BAND)), max(1, int(h * BAND))
    for a, b, lado in (((0, 0, bw, h), (w - bw, 0, w, h), "nas laterais"),
                       ((0, 0, w, bh), (0, h - bh, w, h), "em cima e embaixo")):
        fa, ma = flat(im.crop(a)); fb, mb = flat(im.crop(b))
        if fa and fb and max(abs(x - y) for x, y in zip(ma, mb)) <= SAME:
            return f"faixa vazia de cor lisa {lado} (arte encolhida no meio). Faça a arte ocupando a imagem inteira, sem bordas."
    return ""

bad = 0
for p in sys.argv[1:]:
    try:
        why = check(p)
    except Exception as e:
        why = f"imagem não abre ({str(e)[:60]})"
    if why:
        bad = 1
        print(f"{p}: {why}")
sys.exit(bad)
