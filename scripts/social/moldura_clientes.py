"""Moldura de painel para TODOS os clientes (pedido do Rodrigo, 20/11/2026).

Mesmo molde da Daniela Martins (moldura_daniela.py), com as cores e os textos de cada cliente:
- POST 4:5: foto à esquerda; painel na cor do cliente à direita, com linha na cor de destaque;
- STORY 9:16: foto em cima; painel embaixo;
- título, tópicos, caixa de destaque chamando para o serviço, frase e botão "COMENTE QUERO";
- faixa de baixo onde o Worker cola a logo salva no Master.

Cores e textos revisados em campanha/textos_clientes.json (nada escrito pela IA).
A foto sobe pura (Gemini); o Nexus monta a arte (cloudflare/src/art-frame.js, composePanel).

Uso: python3 moldura_clientes.py PASTA
"""
import json
import os
import sys

import moldura_daniela as md

AQUI = os.path.dirname(os.path.abspath(__file__))
TEXTOS = os.path.join(AQUI, "campanha", "textos_clientes.json")
NOMES = ("OLIVA", "OLIVA_ESCURO", "DOURADO", "DOURADO_CLARO", "DOURADO_ESCURO", "FAIXA_LOGO", "TEXTO_CAIXA")


def hexa(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def misturar(c, alvo, k):
    return tuple(int(c[i] + (alvo[i] - c[i]) * k) for i in range(3))


def paleta(cores):
    """painel + destaque (hex) viram as 7 cores do molde."""
    painel, dest = hexa(cores["painel"]), hexa(cores["destaque"])
    preto, branco = (0, 0, 0), (255, 255, 255)
    return {
        "OLIVA": painel,
        "OLIVA_ESCURO": misturar(painel, preto, 0.28),
        "DOURADO": dest,
        "DOURADO_CLARO": misturar(dest, branco, 0.35),
        "DOURADO_ESCURO": misturar(dest, preto, 0.25),
        "FAIXA_LOGO": hexa(cores["faixa"]) if cores.get("faixa") else misturar(painel, preto, 0.5),
        "TEXTO_CAIXA": misturar(dest, preto, 0.82),
    }


def usar(p):
    for n in NOMES:
        setattr(md, n, p[n])


def gerar(saida):
    dados = json.load(open(TEXTOS, encoding="utf-8"))
    originais = {n: getattr(md, n) for n in NOMES}
    clientes = {}
    limites = {"feed": 1175, "story": 1545}
    try:
        for cliente, cfg in dados.items():
            if cliente.startswith("_"):
                continue
            if cfg.get("igual"):
                continue
            usar(paleta(cfg["cores"]))
            pasta = os.path.join(saida, cliente)
            os.makedirs(pasta, exist_ok=True)
            info = {"estilo": "painel", "feed": [], "story": [], "logo": {"feed": md.LOGO_FEED, "story": md.LOGO_STORY}}
            for tipo, fazer in (("feed", md.feed), ("story", md.story)):
                for i, c in enumerate(cfg[tipo]):
                    img, fim = fazer(c)
                    if fim > limites[tipo]:
                        raise SystemExit(f"texto grande demais em {cliente} {tipo} {i + 1}: termina em {fim}")
                    nome = f"painel-{tipo}-{i + 1}.png"
                    img.save(os.path.join(pasta, nome), optimize=True)
                    info[tipo].append({"arquivo": f"{cliente}/{nome}", "tema": c.get("tema", "geral")})
            clientes[cliente] = info
    finally:
        usar(originais)
    # Painéis do mesmo cliente com outro id (ex.: vendedores da GILTEC) usam a mesma moldura.
    for cliente, cfg in dados.items():
        if not cliente.startswith("_") and cfg.get("igual") in clientes:
            clientes[cliente] = clientes[cfg["igual"]]
    return clientes


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    for c, i in gerar(sys.argv[1]).items():
        print(f"::notice::moldura {c}: {len(i['feed'])} feed, {len(i['story'])} story")
