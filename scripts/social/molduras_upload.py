"""Molduras de texto para as artes que chegam SEM texto (pedido do Rodrigo, 29/10/2026).

O ChatGPT (ou o Claude) manda a foto pronta pelo conector do Nexus. O Worker não tem Pillow,
então a parte com letras é feita AQUI, antes do deploy: uma moldura transparente por texto,
com o mesmo desenho do PADRAO_ARTES.md (faixa de cima com logo e título, faixa de baixo com
3 vantagens e o botão, meio livre para a foto). O Worker só cola: fundo desfocado + foto no
meio + moldura por cima (cloudflare/src/art-frame.js).

Uso:  python3 molduras_upload.py public/molduras
Saída: <pasta>/<cliente>/feed-N.png, story-N.png, num-K-feed.png, num-K-story.png e molduras.json.
Textos: campanha/textos_upload.json (revisados; nada escrito pela IA).
"""
import json
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import campanha_diaria as cd  # noqa: E402

TEXTOS = os.path.join(cd.AQUI, "campanha", "textos_upload.json")
ALFA_VEU = 190     # véu na cor do cliente por cima do fundo desfocado (igual a campanha_diaria.desenhar)
FADE = 90          # bordas da foto somem no fundo, como no desenho da campanha


def layout(cartao, story):
    """Mesmas medidas de campanha_diaria.desenhar."""
    W, H = (1080, 1920) if story else (1080, 1350)
    margem = 64
    topo = 270 if story else 48
    logo_alt = 112 if story else 104
    titulo = [t.upper() for t in cartao["titulo"]]
    tam = min(cd.cabe(t, 800, 92 if story else 86, W - 2 * margem) for t in titulo)
    altura_linha = int(tam * 1.1)
    fim_titulo = topo + logo_alt + 34 + 3 * altura_linha + 24
    bh = 96
    base_botao = (H - int(H * 0.20) - bh - 24) if story else (H - bh - 44)
    yv = base_botao - 150
    inicio_rodape = yv - 62
    return dict(W=W, H=H, margem=margem, topo=topo, logo_alt=logo_alt, titulo=titulo, tam=tam,
                altura_linha=altura_linha, bh=bh, base_botao=base_botao, yv=yv,
                foto_topo=fim_titulo - 20, foto_base=inicio_rodape + 20)


def moldura(cartao, tema, story):
    L = layout(cartao, story)
    W, H = L["W"], L["H"]
    fundo, dest, txt = tema["fundo"], tema["destaque"], tema["texto"]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # As bordas de cima e de baixo da foto somem no fundo (o véu e o fundo desfocado ficam por baixo).
    t, b = L["foto_topo"], L["foto_base"]
    for k in range(FADE):
        a = int(ALFA_VEU * (1 - (k / FADE) ** 1.4))
        d.line([(0, t + k), (W, t + k)], fill=fundo + (a,))
        d.line([(0, b - k), (W, b - k)], fill=fundo + (a,))

    # Faixa de cima: logo + título (3ª linha no destaque).
    cd.colar_logo(img, dict(tema, logo_alt=L["logo_alt"]), L["margem"], L["topo"])
    d = ImageDraw.Draw(img)
    f = cd.fonte_titulo(L["tam"], 800)
    y = L["topo"] + L["logo_alt"] + 34
    for linha, cor in zip(L["titulo"], (txt, txt, dest)):
        d.text((L["margem"], y), linha, font=f, fill=cor)
        y += L["altura_linha"]

    # Faixa de baixo: 3 vantagens + botão.
    cor_icone = tema.get("icone_cor") or (fundo if tema is cd.TEMAS["giltec"] else (255, 255, 255))
    yv = L["yv"]
    for i, v in enumerate(cartao["vantagens"][:3]):
        cx = int(W * (0.19 + 0.31 * i))
        cd.icone(d, cx, yv, 34, i, dest, cor_icone)
        palavras = v.upper().split()
        meio = (len(palavras) + 1) // 2
        linhas = [" ".join(palavras[:meio]), " ".join(palavras[meio:])] if len(palavras) > 1 else [v.upper()]
        for k, ln in enumerate(linhas):
            fl = cd.fonte_titulo(cd.cabe(ln, 700, 27, 290, 18), 700)
            d.text((cx, yv + 50 + k * 32), ln, font=fl, fill=txt, anchor="mt")
    bw = 760 if story else 600
    bx = (W - bw) // 2
    bh, bb = L["bh"], L["base_botao"]
    d.rounded_rectangle([bx, bb, bx + bw, bb + bh], radius=bh // 2, fill=dest)
    chamada = tema.get("botao_story", "MANDE QUERO NO DIRECT") if story else tema.get("botao", "COMENTE QUERO")
    d.text((W // 2, bb + bh // 2), chamada, font=cd.fonte_titulo(cd.cabe(chamada, 800, 48, bw - 70), 800), fill=tema["botao_texto"], anchor="mm")
    return img, {"topo": t, "base": b}


def numero(k, tema):
    """Selo do número do cartão do carrossel (canto de cima à direita)."""
    img = Image.new("RGBA", (68, 68), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, 67, 67], radius=12, fill=tema["destaque"])
    d.text((34, 34), str(k), font=cd.fonte_titulo(44, 800), fill=tema["botao_texto"], anchor="mm")
    return img


def gerar(saida):
    textos = json.load(open(TEXTOS, encoding="utf-8"))
    meta = {"versao": 1, "clientes": {}}
    for cliente, cfg in textos.items():
        if cliente.startswith("_"):
            continue
        tema = cd.TEMAS[cfg["tema"]]
        pasta = os.path.join(saida, cliente)
        os.makedirs(pasta, exist_ok=True)
        info = {"feed": [], "story": [], "numero": {}}
        for tipo in ("feed", "story"):
            story = tipo == "story"
            for i, cartao in enumerate(cfg[tipo]):
                img, faixa = moldura(cartao, tema, story)
                nome = f"{tipo}-{i + 1}.png"
                img.save(os.path.join(pasta, nome), optimize=True)
                info[tipo].append({"arquivo": f"{cliente}/{nome}", **faixa})
            topo = 270 if story else 48
            info["numero"][tipo] = {"left": 1080 - 64 - 68, "top": topo + 18}
        for tipo, alt in (("feed", 1350), ("story", 1920)):
            Image.new("RGBA", (1080, alt), tema["fundo"] + (ALFA_VEU,)).save(os.path.join(pasta, f"veu-{tipo}.png"), optimize=True)
        for k in range(1, 6):
            numero(k, tema).save(os.path.join(pasta, f"num-{k}.png"), optimize=True)
        meta["clientes"][cliente] = info
    json.dump(meta, open(os.path.join(saida, "molduras.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return meta


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    m = gerar(sys.argv[1])
    for c, i in m["clientes"].items():
        print(f"::notice::molduras {c}: {len(i['feed'])} feed, {len(i['story'])} story")
