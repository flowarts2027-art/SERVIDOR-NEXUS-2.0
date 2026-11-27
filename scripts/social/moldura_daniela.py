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
FAIXA_LOGO = (116, 110, 68)  # tarja fininha de baixo: verde-oliva #746E44 (27/11/2026), com a logo dela
TEXTO_CAIXA = (52, 48, 24)

FEED = (1080, 1350)
STORY = (1080, 1920)
# Onde o Worker cola a logo (centro da onda branca). Mesmo valor em art-frame.js (PANEL_LOGO).
LOGO_FEED = {"centro_y": 1302, "altura": 76}
LOGO_STORY = {"centro_y": 1850, "altura": 104}


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
    padrao = "MANDE QUERO NO DIRECT" if story else "COMENTE QUERO"
    return botao(d, centro, y, min(larg, 560 if story else 470), c.get("botao") or padrao, 36 if story else 33)  # "botao" no texto troca a chamada (ex.: brinde da Flow Arts)


def centralizar(img, c, x0, x1, topo, base, story):
    """Mede o bloco numa camada de rascunho e desenha de novo centralizado entre topo e base."""
    rasc = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fim = bloco_texto(rasc, ImageDraw.Draw(rasc), c, x0, x1, topo, story)
    y0 = topo + max(0, (base - fim) // 2)
    return bloco_texto(img, ImageDraw.Draw(img), c, x0, x1, y0, story)


# Modelo novo (Rodrigo, 27/11/2026): sem painel. A foto cobre a arte toda; o texto vai DIRETO na foto,
# com uma sombra suave atrás das letras (não é faixa); o botão fica CENTRALIZADO embaixo, colado numa
# tarja fininha na cor do cliente, onde o Worker cola a logo (LOGO_FEED / LOGO_STORY).
# POST: título no alto, à direita (a pessoa fica à esquerda, photo-zone.js). STORY: título e botão
# centralizados na parte de baixo. Os stories aprovados pelo Rodrigo em 27/11 são o modelo.
FAIXA_FEED = (1250, 1350)
FAIXA_STORY = (1776, 1920)


def texto_sombra(img, xy, txt, f, anchor, cor=BRANCO):
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sombra)
    ds.text((xy[0], xy[1] + 4), txt, font=f, fill=(0, 0, 0, 200), anchor=anchor)
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(10)))
    brilho = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(brilho).text(xy, txt, font=f, fill=(0, 0, 0, 150), anchor=anchor, stroke_width=6, stroke_fill=(0, 0, 0, 150))
    img.alpha_composite(brilho.filter(ImageFilter.GaussianBlur(14)))
    ImageDraw.Draw(img).text(xy, txt, font=f, fill=cor, anchor=anchor)


def tarja(img, y0, y1):
    W = img.size[0]
    d = ImageDraw.Draw(img)
    d.rectangle([0, y0, W, y1], fill=FAIXA_LOGO + (255,))
    d.rectangle([0, y0, W, y0 + 5], fill=DOURADO + (255,))


def botao_centro(img, cy_base, txt, tam, larg_max):
    d = ImageDraw.Draw(img)
    W = img.size[0]
    f = caber(d, txt, lambda t: corpo(t, "ExtraBold"), tam, larg_max - 90, 22)
    w = min(larg_max, largura(d, txt, f) + 110)
    h = int(f.size * 2.3)
    x, y = (W - w) // 2, cy_base - h
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle([x + 3, y + 8, x + w + 3, y + h + 8], radius=h // 2, fill=(0, 0, 0, 120))
    img.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(10)))
    # Destaque claro demais (ex.: branco do Nexus AI): o botão usa a cor do cliente, com letra branca.
    claro = sum(DOURADO) / 3 > 215
    faixa = degrade_vertical(w, h, OLIVA, OLIVA_ESCURO) if claro else degrade_vertical(w, h, DOURADO_CLARO, DOURADO)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=255)
    img.paste(faixa, (x, y), m)
    ImageDraw.Draw(img).text((W // 2, y + h // 2), txt, font=f, fill=BRANCO if claro else TEXTO_CAIXA, anchor="mm")
    return y


def linhas_titulo(c):
    return [t for t in c["titulo"] if t]


def subtitulo(c):
    return c.get("frase") or c.get("caixa") or ""


def feed(c):
    W, H = FEED
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0, x1 = 585, 1035
    larg = x1 - x0
    y = 70
    # Letra fixa e grande (leitura fácil): quebra a linha em vez de encolher.
    f = corpo(66, "ExtraBold")
    for t in [" ".join(linhas_titulo(c))]:
        for ln in quebrar(d, t, f, larg):
            texto_sombra(img, (x0, y), ln, f, "lt")
            y += int(f.size * 1.12)
    sub = subtitulo(c)
    if sub:
        y += 16
        fs = corpo(36, "SemiBold")
        for ln in quebrar(d, sub, fs, larg):
            texto_sombra(img, (x0, y), ln, fs, "lt")
            y += int(fs.size * 1.25)
    fim = y
    tarja(img, *FAIXA_FEED)
    padrao = "COMENTE QUERO"
    botao_centro(img, FAIXA_FEED[0] - 28, c.get("botao") or padrao, 40, 620)
    return img, fim


def story(c):
    W, H = STORY
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0, x1 = 90, 990
    larg = x1 - x0
    padrao = "MANDE QUERO NO DIRECT"
    topo_botao = botao_centro(img, FAIXA_STORY[0] - 40, c.get("botao") or padrao, 44, 760)
    # Mede o bloco e encosta em cima do botão.
    linhas = []
    f = corpo(84, "ExtraBold")
    linhas += [(ln, f, 1.12) for ln in quebrar(d, " ".join(linhas_titulo(c)), f, larg)]
    sub = subtitulo(c)
    fs = corpo(44, "SemiBold")
    sublinhas = [(ln, fs, 1.25) for ln in quebrar(d, sub, fs, larg)] if sub else []
    altura = sum(int(f.size * k) for _, f, k in linhas) + (18 + sum(int(f.size * k) for _, f, k in sublinhas) if sublinhas else 0)
    y = topo_botao - 40 - altura
    inicio = y
    for ln, f, k in linhas:
        texto_sombra(img, (W // 2, y), ln, f, "mt")
        y += int(f.size * k)
    if sublinhas:
        y += 18
        for ln, f, k in sublinhas:
            texto_sombra(img, (W // 2, y), ln, f, "mt")
            y += int(f.size * k)
    tarja(img, *FAIXA_STORY)
    # "fim" aqui é onde o texto começa: não pode subir demais (acima de 55% cobre a pessoa).
    return img, H - inicio


def gerar(saida):
    textos = json.load(open(TEXTOS, encoding="utf-8"))
    pasta = os.path.join(saida, CLIENTE)
    os.makedirs(pasta, exist_ok=True)
    info = {"estilo": "painel", "feed": [], "story": [], "logo": {"feed": LOGO_FEED, "story": LOGO_STORY}}
    limites = {"feed": 1100, "story": 900}
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
