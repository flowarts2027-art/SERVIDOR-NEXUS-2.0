"""Campanha diária com texto escrito por código (pedido do Rodrigo, 28/10/2026).

A IA grátis do Cloudflare faz só a FOTO (sem texto e sem logo). Este script escreve por cima:
logo verdadeira, título de 3 linhas (a 3ª em destaque), 3 vantagens com ícones e o botão
"COMENTE QUERO". Títulos, vantagens e legendas vêm de campanha/conteudo.json: nada é inventado
pela IA, então não sai palavra errada nem coisa sem sentido.

Uso:
  python3 campanha_diaria.py CLIENTE DATA PASTA_AGENDAMENTOS
Variáveis: NEXUS_BASE e NEXUS_MASTER_TOKEN (sessão temporária do Master) para pedir as fotos.
Sem elas (ou com FOTO_FALSA=1), usa uma foto de teste lisa, só para conferir o desenho.
Saída: agendamentos/[clientes/<id>/]AAAA-MM-DD/HHMM/ (posts) e HHMM-story/ (stories).
"""
import datetime
import io
import json
import os
import random
import sys
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
FONTES = os.path.join(AQUI, "fonts")
F_TITULO = os.path.join(FONTES, "InterDisplay-ExtraBold.otf")
F_NEGRITO = os.path.join(FONTES, "InterDisplay-Bold.otf")
CONTEUDO = os.path.join(AQUI, "campanha", "conteudo.json")

TEMAS = {
    # GILTEC: o estilo azul-marinho e amarelo que o Rodrigo aprovou em 28/10.
    "giltec": {
        "fundo": (4, 16, 44), "destaque": (255, 194, 14), "texto": (255, 255, 255), "botao_texto": (4, 16, 44),
        "logo": os.path.join(RAIZ, "docs", "nexus-memory", "clientes", "giltec", "logo-giltec.png"), "logo_alt": 165,
    },
    # Flow Arts: fundo quase preto, destaque azul da marca, símbolo da Flow Arts.
    "flow": {
        "fundo": (10, 12, 18), "destaque": (64, 120, 255), "texto": (255, 255, 255), "botao_texto": (255, 255, 255),
        "logo": os.path.join(RAIZ, "public", "brand", "flowarts-symbol.webp"), "logo_alt": 120,
    },
}

REGRAS_FOTO = (
    "Realistic professional photograph, natural light, true colors, real place in Brazil. "
    "Absolutely no text, letters, numbers, signs with writing, logos, symbols, brand names, stickers or watermarks anywhere. "
    "One single photo filling the whole frame, no borders, no collage. Wide horizontal-friendly composition: the main subject and any people stay in the middle band of the frame, with free space above their heads and nothing important at the very top or bottom. "
    "Faces are not needed (seen from behind, from the side or at a distance); anatomically correct hands. "
    "If a phone or laptop appears, its screen faces the person using it, never the viewer. No neon, no robots, no blue color cast."
)
ANGULOS = ["wide shot at eye level", "low angle shot", "three-quarter view at medium distance",
           "over-the-shoulder view", "slightly elevated view", "close medium shot"]


def fonte(caminho, tamanho):
    return ImageFont.truetype(caminho, tamanho)


def fonte_que_cabe(texto, caminho, maximo, largura, minimo=44):
    tam = maximo
    while tam > minimo:
        f = fonte(caminho, tam)
        if f.getlength(texto) <= largura:
            return f
        tam -= 2
    return fonte(caminho, minimo)


# ---------- plano do dia (o mesmo para quem roda e para os testes) ----------

def dia_numero(data):
    return (datetime.date.fromisoformat(data) - datetime.date(1970, 1, 1)).days


def plano(cliente, data, conteudo):
    cfg = conteudo[cliente]
    d = dia_numero(data)
    pecas = []
    if cfg["tema"] == "giltec":
        ordem = cfg["ciclo"][d % len(cfg["ciclo"])]
        eq = [cfg["equipamentos"][k] | {"id": k} for k in ordem]
        cena = lambda i: cfg["cenas"][(d * 3 + i) % len(cfg["cenas"])]
        foto = lambda e, i: f"{e['foto']}, at {cena(i)}, {ANGULOS[(d * 2 + i) % len(ANGULOS)]}. The equipment is complete in the frame. {cfg['seguranca']}."
        titulo = lambda e, i: e["titulos"][(d + i) % len(e["titulos"])]
        cartao = lambda e, i: {"foto": foto(e, i), "titulo": titulo(e, i), "vantagens": e["vantagens"], "nome": e["nome"]}
        c1, c2, p12, p19 = cartao(eq[0], 0), cartao(eq[1], 1), cartao(eq[2], 2), cartao(eq[3], 3)
        L = cfg["legendas"]
        leg = lambda modelo, t, e1, e2="": L[modelo].format(t1=t[0], t2=t[1], t3=t[2], e1=e1, e2=e2)
        pecas += [
            {"chave": "0900", "tipo": "carousel", "cartoes": [c1, c2], "legenda": leg("carrossel", c1["titulo"], c1["nome"], c2["nome"])},
            {"chave": "1200", "tipo": "post", "cartoes": [p12], "legenda": leg("post", p12["titulo"], p12["nome"])},
            {"chave": "1900", "tipo": "post", "cartoes": [p19], "legenda": leg("post", p19["titulo"], p19["nome"])},
        ]
        st = cfg["stories"]
        for i, hora in enumerate(["0900", "1200", "1900"]):
            s = st[(d * 3 + i) % len(st)]
            pecas.append({"chave": hora + "-story", "tipo": "story", "cartoes": [{
                "foto": f"{s['foto']}, {ANGULOS[(d + i + 3) % len(ANGULOS)]}. {cfg['seguranca']}.",
                "titulo": s["titulo"], "vantagens": s["vantagens"]}]})
    else:
        dia = cfg["dias"][d % len(cfg["dias"])]
        ang = lambda i: ANGULOS[(d * 2 + i) % len(ANGULOS)]
        com = lambda c, i: {**c, "foto": f"{c['foto']}, {ang(i)}."}
        pecas += [
            {"chave": "0900", "tipo": "carousel", "cartoes": [com(c, i) for i, c in enumerate(dia["carrossel"])], "legenda": dia["legendas"]["0900"]},
            {"chave": "1200", "tipo": "post", "cartoes": [com(dia["post1200"], 5)], "legenda": dia["legendas"]["1200"]},
            {"chave": "1900", "tipo": "post", "cartoes": [com(dia["post1900"], 6)], "legenda": dia["legendas"]["1900"]},
        ]
        for i, hora in enumerate(["0900", "1200", "1900"]):
            pecas.append({"chave": hora + "-story", "tipo": "story", "cartoes": [com(dia["stories"][i], i + 2)]})
    return pecas


# ---------- foto ----------

def foto_falsa(larg, alt, semente):
    rnd = random.Random(semente)
    img = Image.new("RGB", (larg, alt))
    d = ImageDraw.Draw(img)
    for y in range(alt):
        t = y / alt
        d.line([(0, y), (larg, y)], fill=(int(120 + 80 * t), int(130 + 40 * t), int(140 - 60 * t)))
    for _ in range(40):
        x, y, r = rnd.randrange(larg), rnd.randrange(alt), rnd.randrange(20, 120)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(rnd.randrange(60, 220), rnd.randrange(60, 200), rnd.randrange(40, 160)))
    return img.filter(ImageFilter.GaussianBlur(6))


def pedir_foto(prompt, aspecto, semente):
    base = os.environ.get("NEXUS_BASE", "").rstrip("/")
    token = os.environ.get("NEXUS_MASTER_TOKEN", "")
    if os.environ.get("FOTO_FALSA") == "1" or not base or not token:
        return foto_falsa(1024, 1280 if aspecto == "4:5" else 1344, semente)
    corpo = json.dumps({"prompt": prompt + " " + REGRAS_FOTO, "aspect": aspecto}).encode()
    erro = ""
    for tentativa in range(3):
        req = urllib.request.Request(base + "/api/master/foto", data=corpo, method="POST", headers={
            "content-type": "application/json", "cookie": "nexus_master=" + token, "user-agent": "FlowArtsNexus-campanha/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception as e:  # a IA às vezes recusa uma foto ("flagged"): tenta de novo
            erro = str(getattr(e, "read", lambda: b"")() or e)[:200]
            time.sleep(3)
    raise RuntimeError("foto falhou: " + erro)


def cobrir(foto, larg, alt):
    r = max(larg / foto.width, alt / foto.height)
    foto = foto.resize((round(foto.width * r), round(foto.height * r)), Image.LANCZOS)
    x, y = (foto.width - larg) // 2, (foto.height - alt) // 2
    return foto.crop((x, y, x + larg, y + alt))


# ---------- desenho ----------

def degrade(img, topo, base, cor, a0, a1):
    camada = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(camada)
    for y in range(topo, base):
        t = (y - topo) / max(1, base - topo)
        d.line([(0, y), (img.width, y)], fill=cor + (int(a0 + (a1 - a0) * t),))
    img.alpha_composite(camada)


def icone(d, cx, cy, r, tipo, cor_fundo, cor):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=cor_fundo)
    w = max(5, r // 6)
    if tipo == 0:  # visto
        d.line([(cx - r * .45, cy), (cx - r * .1, cy + r * .35), (cx + r * .5, cy - r * .35)], fill=cor, width=w, joint="curve")
    elif tipo == 1:  # estrela
        import math
        pts = []
        for k in range(10):
            ang = -math.pi / 2 + k * math.pi / 5
            rr = r * (.55 if k % 2 == 0 else .24)
            pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
        d.polygon(pts, fill=cor)
    else:  # seta
        d.line([(cx - r * .45, cy), (cx + r * .4, cy)], fill=cor, width=w)
        d.line([(cx + r * .05, cy - r * .38), (cx + r * .45, cy), (cx + r * .05, cy + r * .38)], fill=cor, width=w, joint="curve")


def colar_logo(img, tema, x, y):
    logo = Image.open(tema["logo"]).convert("RGBA")
    alt = tema["logo_alt"]
    logo = logo.resize((round(logo.width * alt / logo.height), alt), Image.LANCZOS)
    img.alpha_composite(logo, (x, y))


# ---------- PADRÃO DAS ARTES (docs/nexus-memory/PADRAO_ARTES.md, Rodrigo 28/10) ----------
# 1. O texto NUNCA fica em cima de pessoa: título numa faixa própria em cima, vantagens e botão
#    numa faixa própria embaixo; a foto fica só no meio, começando abaixo do título.
# 2. Fonte Montserrat ExtraBold (a das artes azuis aprovadas); sem contorno; todas as linhas do
#    título no mesmo tamanho; a 3ª linha na cor de destaque.
# 3. Uma logo só (a verdadeira), no canto de cima à esquerda. Story: nada nos 14% de cima e nos 20% de baixo.
F_MONT = os.environ.get("FONTE_MONTSERRAT", os.path.join(FONTES, "Montserrat[wght].ttf"))


def fonte_titulo(tamanho, peso=800):
    if os.path.isfile(F_MONT):
        f = ImageFont.truetype(F_MONT, tamanho)
        try:
            f.set_variation_by_axes([peso])
        except Exception:
            pass
        return f
    return fonte(F_TITULO if peso >= 800 else F_NEGRITO, tamanho)


def cabe(texto, peso, maximo, largura, minimo=30):
    tam = maximo
    while tam > minimo:
        if fonte_titulo(tam, peso).getlength(texto) <= largura:
            return tam
        tam -= 2
    return minimo


def faixa_foto(img, foto, topo, base, cor, fade=90):
    """Cola a foto só entre topo e base, com bordas que somem suavemente no fundo."""
    W = img.width
    alt = base - topo
    pedaco = cobrir(foto, W, alt).convert("RGBA")
    mascara = Image.new("L", (W, alt), 255)
    dm = ImageDraw.Draw(mascara)
    for k in range(fade):
        a = int(255 * (k / fade) ** 1.4)
        dm.line([(0, k), (W, k)], fill=a)
        dm.line([(0, alt - 1 - k), (W, alt - 1 - k)], fill=a)
    img.paste(pedaco, (0, topo), mascara)


def desenhar(foto, cartao, tema, story=False, numero=None, rodape=""):
    W, H = (1080, 1920) if story else (1080, 1350)
    fundo, dest, txt = tema["fundo"], tema["destaque"], tema["texto"]
    # Fundo das faixas: a própria foto bem desfocada e escurecida na cor do cliente (sem faixa lisa e
    # sem ninguém reconhecível atrás do texto).
    img = cobrir(foto, W, H).filter(ImageFilter.GaussianBlur(18)).convert("RGBA")
    img.alpha_composite(Image.new("RGBA", (W, H), fundo + (190,)))
    d = ImageDraw.Draw(img)
    margem = 64
    topo = 270 if story else 48           # story: abaixo dos 14% de cima
    logo_alt = 112 if story else 104
    tema_logo = dict(tema, logo_alt=logo_alt)

    # --- faixa de cima: logo + título ---
    l1, l2, l3 = [t.upper() for t in cartao["titulo"]]
    larg = W - 2 * margem
    tam = min(cabe(t, 800, 92 if story else 86, larg) for t in (l1, l2, l3))
    f = fonte_titulo(tam, 800)
    y = topo + logo_alt + 34
    altura_linha = int(tam * 1.1)
    for linha, cor in ((l1, txt), (l2, txt), (l3, dest)):
        d.text((margem, y), linha, font=f, fill=cor)
        y += altura_linha
    fim_titulo = y + 24

    # --- faixa de baixo: 3 vantagens + botão ---
    bh = 96
    base_botao = (H - int(H * 0.20) - bh - 24) if story else (H - bh - 44)
    yv = base_botao - 150                 # centro dos ícones
    inicio_rodape = yv - 62               # começo da faixa de baixo

    # --- foto só no meio, nunca atrás do texto ---
    faixa_foto(img, foto, fim_titulo - 20, inicio_rodape + 20, fundo)
    d = ImageDraw.Draw(img)

    colar_logo(img, tema_logo, margem, topo)
    if numero:
        d.rounded_rectangle([W - margem - 68, topo + 18, W - margem, topo + 86], radius=12, fill=dest)
        d.text((W - margem - 34, topo + 52), str(numero), font=fonte_titulo(44, 800), fill=tema["botao_texto"], anchor="mm")

    cor_icone = fundo if tema is TEMAS["giltec"] else (255, 255, 255)
    for i, v in enumerate(cartao["vantagens"][:3]):
        cx = int(W * (0.19 + 0.31 * i))
        icone(d, cx, yv, 34, i, dest, cor_icone)
        palavras = v.upper().split()
        meio = (len(palavras) + 1) // 2
        linhas = [" ".join(palavras[:meio]), " ".join(palavras[meio:])] if len(palavras) > 1 else [v.upper()]
        for k, ln in enumerate(linhas):
            fl = fonte_titulo(cabe(ln, 700, 27, 290, 18), 700)
            d.text((cx, yv + 50 + k * 32), ln, font=fl, fill=txt, anchor="mt")

    bw = 760 if story else 600
    bx = (W - bw) // 2
    d.rounded_rectangle([bx, base_botao, bx + bw, base_botao + bh], radius=bh // 2, fill=dest)
    # Story não aceita comentário: lá o botão pede o QUERO no direct (FORMATOS_POSTAGENS.md).
    chamada = "MANDE QUERO NO DIRECT" if story else "COMENTE QUERO"
    d.text((W // 2, base_botao + bh // 2), chamada, font=fonte_titulo(cabe(chamada, 800, 48, bw - 70), 800), fill=tema["botao_texto"], anchor="mm")
    if story and rodape:
        d.text((W // 2, base_botao + bh + 30), rodape, font=fonte_titulo(30, 600), fill=txt, anchor="mt")
    return img.convert("RGB")


def gerar(cliente, data, saida_raiz):
    conteudo = json.load(open(CONTEUDO, encoding="utf-8"))
    cfg = conteudo[cliente]
    tema = TEMAS[cfg["tema"]]
    base = os.path.join(saida_raiz, cfg["pasta"], data) if cfg["pasta"] else os.path.join(saida_raiz, data)
    feitos, erros = [], []
    for peca in plano(cliente, data, conteudo):
        pasta = os.path.join(base, peca["chave"])
        # Já tem arte nesta pasta (de outro dia de execução ou do ChatGPT): não refaz.
        if os.path.isdir(pasta) and any(n.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".mp4")) for n in os.listdir(pasta)):
            feitos.append(peca["chave"] + " (já existia)")
            continue
        try:
            story = peca["tipo"] == "story"
            imagens = []
            for i, c in enumerate(peca["cartoes"]):
                foto = pedir_foto(c["foto"], "9:16" if story else "4:5", f"{cliente}{data}{peca['chave']}{i}")
                num = i + 1 if peca["tipo"] == "carousel" else None
                imagens.append(desenhar(foto, c, tema, story=story, numero=num, rodape=cfg.get("rodape_story", "")))
            os.makedirs(pasta, exist_ok=True)
            if story:
                imagens[0].save(os.path.join(pasta, "story.jpg"), quality=90)
            elif peca["tipo"] == "carousel":
                for i, im in enumerate(imagens):
                    im.save(os.path.join(pasta, f"{i + 1:02d}.jpg"), quality=90)
            else:
                imagens[0].save(os.path.join(pasta, "imagem.jpg"), quality=90)
            # Legenda que o ChatGPT já deixou na pasta continua valendo; senão usa a do conteudo.json.
            leg = os.path.join(pasta, "legenda.txt")
            if not story and not (os.path.isfile(leg) and open(leg, encoding="utf-8").read().strip()):
                open(leg, "w", encoding="utf-8").write(peca["legenda"].strip() + "\n")
            feitos.append(peca["chave"])
        except Exception as e:
            erros.append(f"{peca['chave']}: {str(e)[:160]}")
    return feitos, erros


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    feitos, erros = gerar(sys.argv[1], sys.argv[2], sys.argv[3])
    for f in feitos:
        print("::notice::feito " + f)
    for e in erros:
        print("::error::" + e)
    sys.exit(1 if erros and not feitos else 0)
