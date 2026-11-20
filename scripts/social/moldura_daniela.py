"""Moldura da Daniela Martins (pedido do Rodrigo, 20/11/2026).

Toda foto que sobe no painel dela (Gemini, ChatGPT ou Master) ganha a identidade dela:
- POST 4:5: foto à esquerda; painel verde-oliva #746E44 à direita, com linha dourada curva;
- STORY 9:16: foto em cima; painel verde-oliva embaixo;
- título (serifa branca + itálico dourado), tópicos com check dourado, caixa dourada chamando
  para agendar com a Daniela, frase em itálico e botão "COMENTE QUERO";
- onda branca com linha dourada embaixo, onde o Worker cola a logo salva no Master.

O Worker não tem Pillow: aqui fica só a camada transparente com as letras (uma por texto).
O Worker cola: foto (cobrindo a tela) + esta camada + logo (cloudflare/src/art-frame.js, composePanel).
Textos revisados em campanha/textos_daniela.json (nada escrito pela IA).

Uso: python3 moldura_daniela.py PASTA  (gera PASTA/daniela-martins/...)
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = os.path.join(AQUI, "fonts")
TEXTOS = os.path.join(AQUI, "campanha", "textos_daniela.json")
CLIENTE = "daniela-martins"

OLIVA = (116, 110, 68)
OLIVA_ESCURO = (88, 83, 48)
DOURADO = (214, 178, 102)
DOURADO_CLARO = (240, 214, 150)
DOURADO_ESCURO = (168, 128, 58)
BRANCO = (255, 255, 255)
CREME = (248, 245, 237)
FAIXA_LOGO = (66, 62, 34)  # onda de baixo: verde-oliva bem escuro, para a logo dourada e branca aparecer
TEXTO_CAIXA = (52, 48, 24)

FEED = (1080, 1350)
STORY = (1080, 1920)
# Onde o Worker cola a logo (centro da onda branca). Mesmo valor em art-frame.js (PANEL_LOGO).
LOGO_FEED = {"centro_y": 1272, "altura": 110}
LOGO_STORY = {"centro_y": 1640, "altura": 120}


def fonte(nome, tamanho, peso=None):
    f = ImageFont.truetype(os.path.join(FONTES, nome), tamanho)
    if peso:
        try:
            f.set_variation_by_name(peso)
        except Exception:
            pass
    return f


def titulo1(t):
    return fonte("Gelasio.ttf", t, "Bold")


def titulo2(t):
    return fonte("CrimsonText-SemiBoldItalic.ttf", t)


def corpo(t, peso="Medium"):
    return fonte("Montserrat.ttf", t, peso)


def largura(d, txt, f):
    b = d.textbbox((0, 0), txt, font=f)
    return b[2] - b[0]


def caber(d, txt, gerador, maximo, larg, minimo=20):
    t = maximo
    while t > minimo and largura(d, txt, gerador(t)) > larg:
        t -= 2
    return gerador(t)


def quebrar(d, txt, f, larg):
    linhas, atual = [], ""
    for p in txt.split():
        teste = (atual + " " + p).strip()
        if largura(d, teste, f) <= larg or not atual:
            atual = teste
        else:
            linhas.append(atual)
            atual = p
    if atual:
        linhas.append(atual)
    return linhas


def degrade_vertical(w, h, c0, c1):
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        k = y / max(1, h - 1)
        cor = tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3)) + (255,)
        for x in range(w):
            px[x, y] = cor
    return img


def dourado(w, h):
    """Faixa dourada com brilho (para caixa e linhas)."""
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for x in range(w):
        k = x / max(1, w - 1)
        brilho = 0.5 + 0.5 * math.cos((k - 0.45) * math.pi * 1.6)
        base = tuple(int(DOURADO_ESCURO[i] + (DOURADO_CLARO[i] - DOURADO_ESCURO[i]) * brilho) for i in range(3))
        for y in range(h):
            px[x, y] = base + (255,)
    return img


def check(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=DOURADO, width=4)
    d.line([(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.38), (cx + r * 0.5, cy - r * 0.35)],
           fill=DOURADO_CLARO, width=6, joint="curve")


def onda(W, H, topo, amplitude):
    """Máscara da onda branca de baixo e os pontos da linha dourada."""
    pts = [(x, topo + amplitude * math.sin(x / W * math.pi * 1.15 + 0.35)) for x in range(0, W + 1, 4)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(pts + [(W, H), (0, H)], fill=255)
    return mask, pts


def linha(img, pts, cor, grossura):
    camada = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(camada).line(pts, fill=cor + (255,), width=grossura, joint="curve")
    brilho = camada.filter(ImageFilter.GaussianBlur(3))
    img.alpha_composite(brilho)
    img.alpha_composite(camada)


def caixa_dourada(img, d, x, y, w, txt, tam):
    f = corpo(tam, "Bold")
    linhas = quebrar(d, txt, f, w - 60)
    alt_l = int(f.size * 1.25)
    h = alt_l * len(linhas) + 44
    faixa = dourado(w, h)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=18, fill=255)
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle([x + 4, y + 8, x + w + 4, y + h + 8], radius=18, fill=(0, 0, 0, 90))
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(8)))
    img.paste(faixa, (x, y), m)
    ty = y + 22
    for ln in linhas:
        d.text((x + w // 2, ty), ln, font=f, fill=TEXTO_CAIXA, anchor="mt")
        ty += alt_l
    return y + h


def botao(d, cx, y, w, txt, tam):
    h = int(tam * 2.3)
    x = cx - w // 2
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=OLIVA_ESCURO + (255,), outline=DOURADO, width=4)
    f = caber(d, txt, lambda t: corpo(t, "Bold"), tam, w - 60, 18)
    d.text((cx, y + h // 2), txt, font=f, fill=BRANCO, anchor="mm")
    return y + h


def bloco_texto(img, d, c, x0, x1, y, story):
    """Título, sublinhado, tópicos, caixa, frase e botão. Devolve o y final."""
    larg = x1 - x0
    centro = (x0 + x1) // 2
    alinhar = "mt" if story else "lt"
    tx = centro if story else x0
    f1 = caber(d, c["titulo"][0], titulo1, 84 if story else 74, larg, 34)
    d.text((tx, y), c["titulo"][0], font=f1, fill=BRANCO, anchor=alinhar)
    y += int(f1.size * 1.12)
    f2 = caber(d, c["titulo"][1], titulo2, 96 if story else 82, larg, 36)
    d.text((tx, y - 8), c["titulo"][1], font=f2, fill=DOURADO_CLARO, anchor=alinhar)
    y += int(f2.size * 1.05)
    # Sublinhado dourado curvo.
    ux0, ux1 = (centro - 200, centro + 200) if story else (x0 + 40, x1 - 20)
    pts = [(ux0 + (ux1 - ux0) * k / 40, y + 10 - 9 * math.sin(k / 40 * math.pi)) for k in range(41)]
    linha(img, pts, DOURADO, 4)
    y += 50
    ft = corpo(36 if story else 32, "Medium")
    r = 24 if story else 22
    for tp in c["topicos"]:
        linhas = quebrar(d, tp, ft, larg - 2 * r - 26)
        alt = int(ft.size * 1.28) * len(linhas)
        cy = y + alt // 2
        check(d, x0 + r, cy, r)
        ty = y
        for ln in linhas:
            d.text((x0 + 2 * r + 22, ty), ln, font=ft, fill=BRANCO)
            ty += int(ft.size * 1.28)
        y += max(alt, 2 * r) + (28 if story else 34)
    y += 6
    y = caixa_dourada(img, d, x0 - (0 if story else 6), y, larg + (0 if story else 6), c["caixa"], 36 if story else 31)
    if c.get("frase"):
        y += 26
        ff = caber(d, c["frase"], titulo2, 58, larg, 28)
        d.text((centro, y), c["frase"], font=ff, fill=BRANCO, anchor="mt")
        y += int(ff.size * 1.15)
    y += 30
    return botao(d, centro, y, min(larg, 560 if story else 470), "MANDE QUERO NO DIRECT" if story else "COMENTE QUERO", 36 if story else 33)


def centralizar(img, c, x0, x1, topo, base, story):
    """Mede o bloco numa camada de rascunho e desenha de novo centralizado entre topo e base."""
    rasc = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fim = bloco_texto(rasc, ImageDraw.Draw(rasc), c, x0, x1, topo, story)
    y0 = topo + max(0, (base - fim) // 2)
    return bloco_texto(img, ImageDraw.Draw(img), c, x0, x1, y0, story)


def feed(c):
    W, H = FEED
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Painel verde-oliva à direita, com a borda esquerda em curva.
    borda = [(470 + 55 * math.sin(y / H * math.pi), y) for y in range(0, H + 1, 6)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(borda + [(W, H), (W, 0)], fill=255)
    img.paste(degrade_vertical(W, H, OLIVA, OLIVA_ESCURO), (0, 0), mask)
    linha(img, borda, DOURADO, 5)
    fim = centralizar(img, c, 575, 1035, 60, 1160, False)
    # Onda branca com linha dourada, embaixo da tela toda (lugar da logo).
    m, pts = onda(W, H, 1190, 20)
    img.paste(Image.new("RGBA", (W, H), FAIXA_LOGO + (255,)), (0, 0), m)
    linha(img, pts, DOURADO, 5)
    return img, fim


def story(c):
    W, H = STORY
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    topo = 820
    borda = [(x, topo - 40 * math.sin(x / W * math.pi)) for x in range(0, W + 1, 6)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(borda + [(W, H), (0, H)], fill=255)
    img.paste(degrade_vertical(W, H, OLIVA, OLIVA_ESCURO), (0, 0), mask)
    linha(img, borda, DOURADO, 5)
    fim = centralizar(img, c, 110, 970, 850, 1530, True)
    m, pts = onda(W, H, 1560, 22)
    img.paste(Image.new("RGBA", (W, H), FAIXA_LOGO + (255,)), (0, 0), m)
    linha(img, pts, DOURADO, 5)
    return img, fim


def gerar(saida):
    textos = json.load(open(TEXTOS, encoding="utf-8"))
    pasta = os.path.join(saida, CLIENTE)
    os.makedirs(pasta, exist_ok=True)
    info = {"estilo": "painel", "feed": [], "story": [], "logo": {"feed": LOGO_FEED, "story": LOGO_STORY}}
    limites = {"feed": 1175, "story": 1545}
    for tipo, fazer in (("feed", feed), ("story", story)):
        for i, c in enumerate(textos[tipo]):
            img, fim = fazer(c)
            if fim > limites[tipo]:
                raise SystemExit(f"texto grande demais em {tipo} {i + 1}: termina em {fim}")
            nome = f"painel-{tipo}-{i + 1}.png"
            img.save(os.path.join(pasta, nome), optimize=True)
            info[tipo].append({"arquivo": f"{CLIENTE}/{nome}", "tema": c["tema"]})
    return info


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    i = gerar(sys.argv[1])
    print(f"::notice::moldura daniela: {len(i['feed'])} feed, {len(i['story'])} story")
