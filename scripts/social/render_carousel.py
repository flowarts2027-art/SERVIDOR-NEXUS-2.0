"""Monta os cartões do carrossel da Flow Arts: foto da IA (sem texto) + título, logo, rodapé e numeração.

O texto é escrito por código, com a fonte Inter: sai exatamente como o agente escreveu, sem letra errada.

Uso: python3 render_carousel.py cards.json pasta_saida
cards.json: [{"n":1,"l1":"...","l2":"...","rodape":"...","photo":"/caminho/foto1.jpg"}, ...]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
FONTES = os.path.join(AQUI, "fonts")
SIMBOLO = os.path.join(RAIZ, "public", "brand", "flowarts-symbol.webp")

W, H = 1080, 1350
PRETO = (12, 12, 16)
AZUL = (22, 72, 235)
FUNDO = (253, 253, 251)
PILULA = (226, 234, 252)
F_TITULO = os.path.join(FONTES, "InterDisplay-ExtraBold.otf")
F_NEGRITO = os.path.join(FONTES, "InterDisplay-Bold.otf")
F_MEDIO = os.path.join(FONTES, "InterDisplay-Medium.otf")
BOTAO = "Comente QUERO"
# Faixa da foto que interessa: a IA deixa parede livre em cima e bancada embaixo.
FAIXA_FOTO = (0.18, 0.95)
BASE_FOTO = 1235


def fonte(caminho, tamanho):
    return ImageFont.truetype(caminho, tamanho)


def fonte_que_cabe(texto, caminho, maximo, largura):
    tamanho = maximo
    while tamanho > 40:
        f = fonte(caminho, tamanho)
        if f.getlength(texto) <= largura:
            return f
        tamanho -= 2
    return fonte(caminho, 40)


def colar_foto(img, caminho, topo, base, ancora=0.3, suave=80):
    alt = base - topo
    foto = Image.open(caminho).convert("RGB")
    y0, y1 = int(foto.height * FAIXA_FOTO[0]), int(foto.height * FAIXA_FOTO[1])
    foto = foto.crop((0, y0, foto.width, y1))
    r = max(W / foto.width, alt / foto.height)
    foto = foto.resize((round(foto.width * r), round(foto.height * r)), Image.LANCZOS)
    x = (foto.width - W) // 2
    y = int((foto.height - alt) * ancora)
    foto = foto.crop((x, y, x + W, y + alt))
    mascara = Image.new("L", (W, alt), 255)
    d = ImageDraw.Draw(mascara)
    for yy in range(suave):
        a = int(255 * (yy / suave) ** 1.3)
        d.line([(0, yy), (W, yy)], fill=a)
        d.line([(0, alt - 1 - yy), (W, alt - 1 - yy)], fill=a)
    img.paste(foto, (0, topo), mascara)


def texto_com_halo(img, xy, texto, f, cor):
    halo = Image.new("L", img.size, 0)
    ImageDraw.Draw(halo).text(xy, texto, font=f, fill=255, stroke_width=6, stroke_fill=255)
    halo = halo.filter(ImageFilter.GaussianBlur(4))
    img.paste(Image.new("RGB", img.size, FUNDO), (0, 0), halo)
    ImageDraw.Draw(img).text(xy, texto, font=f, fill=cor)


def cabecalho(img):
    """Símbolo da Flow Arts + FLOW ARTS, centralizados no topo."""
    d = ImageDraw.Draw(img)
    altura = 86
    simbolo = Image.open(SIMBOLO).convert("RGBA")
    simbolo = simbolo.resize((round(simbolo.width * altura / simbolo.height), altura), Image.LANCZOS)
    f1, f2 = fonte(F_TITULO, 46), fonte(F_MEDIO, 46)
    espaco = 8
    larg_arts = sum(f2.getlength(c) for c in "ARTS") + espaco * 3
    total = simbolo.width + 18 + f1.getlength("FLOW") + 18 + larg_arts
    x = (W - total) / 2
    y = 30
    img.paste(simbolo, (round(x), y), simbolo)
    x += simbolo.width + 18
    ty = y + (altura - 46) / 2 - 6
    d.text((x, ty), "FLOW", font=f1, fill=PRETO)
    x += f1.getlength("FLOW") + 18
    for c in "ARTS":
        d.text((x, ty), c, font=f2, fill=PRETO)
        x += f2.getlength(c) + espaco


def seta(d, x, y, cor, tam=30):
    d.line([(x, y), (x + tam, y)], fill=cor, width=5)
    d.line([(x + tam - 12, y - 12), (x + tam, y), (x + tam - 12, y + 12)], fill=cor, width=5, joint="curve")


def montar(card, total):
    img = Image.new("RGB", (W, H), FUNDO)
    l1, l2 = card["l1"].strip(), card["l2"].strip()
    f1 = fonte_que_cabe(l1, F_TITULO, 104, 990)
    f2 = fonte_que_cabe(l2, F_TITULO, min(f1.size, 96), 1010)
    fim_titulo = 140 + int(f1.size * 1.08) + int(f2.size * 1.15)
    colar_foto(img, card["photo"], fim_titulo - 30, BASE_FOTO)
    cabecalho(img)
    y = 140
    for txt, f, cor in ((l1, f1, PRETO), (l2, f2, AZUL)):
        texto_com_halo(img, ((W - f.getlength(txt)) / 2, y), txt, f, cor)
        y += int(f.size * 1.08)
    d = ImageDraw.Draw(img)
    n = int(card["n"])
    rodape = str(card.get("rodape") or "").strip()
    if n == total:
        bw, bh = 600, 104
        bx, by = (W - bw) // 2, 1200
        d.rounded_rectangle((bx, by, bx + bw, by + bh), radius=52, fill=AZUL)
        fb = fonte(F_TITULO, 50)
        tx = bx + (bw - fb.getlength(BOTAO)) / 2 + 26
        cx, cy = tx - 52, by + bh / 2
        d.ellipse((cx - 22, cy - 20, cx + 22, cy + 18), outline=FUNDO, width=5)
        d.polygon([(cx - 14, cy + 12), (cx - 22, cy + 26), (cx - 2, cy + 16)], fill=FUNDO)
        d.text((tx, by + (bh - 60) / 2), BOTAO, font=fb, fill=FUNDO)
        if rodape:
            fr = fonte_que_cabe(rodape, F_MEDIO, 34, 900)
            texto_com_halo(img, ((W - fr.getlength(rodape)) / 2, by - 56), rodape, fr, PRETO)
            d = ImageDraw.Draw(img)
    elif rodape:
        palavras = rodape.split()
        destaque, resto = " ".join(palavras[:2]), " ".join(palavras[2:])
        fb, fr = fonte(F_NEGRITO, 42), fonte(F_MEDIO, 42)
        larg = fb.getlength(destaque) + (fr.getlength(" " + resto) if resto else 0) + 50
        x, yb = (W - larg) / 2, 1262
        d.text((x, yb), destaque, font=fb, fill=AZUL)
        x += fb.getlength(destaque)
        if resto:
            d.text((x, yb), " " + resto, font=fr, fill=PRETO)
            x += fr.getlength(" " + resto)
        seta(d, x + 14, yb + 26, AZUL)
    fc = fonte(F_NEGRITO, 32)
    contador = f"{n}/{total}"
    cw = fc.getlength(contador) + 40
    d.rounded_rectangle((W - 40 - cw, 1250, W - 40, 1310), radius=30, fill=PILULA)
    d.text((W - 40 - cw + 20, 1259), contador, font=fc, fill=AZUL)
    return img


def main():
    cards = json.load(open(sys.argv[1], encoding="utf-8"))
    saida = sys.argv[2]
    os.makedirs(saida, exist_ok=True)
    total = len(cards)
    if not 2 <= total <= 10:
        raise SystemExit("carrossel precisa de 2 a 10 cartões")
    for card in cards:
        img = montar(card, total)
        assert img.size == (W, H)
        img.save(os.path.join(saida, f"{int(card['n'])}.jpg"), quality=92)
        print("cartao", card["n"], "ok")


if __name__ == "__main__":
    main()
