"""Artes da campanha do brinde (Flow Arts, 24 a 30/11/2026). 1080x1350 (post 4:5).
O canto de cima à direita fica livre: ali o Nexus cola a logo do Master.
Uso: python3 scripts/social/brinde/campanha/gerar_artes.py"""
import pathlib
from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent
FONTES = (AQUI.parent.parent / "fonts").as_uri()
CAPA = (AQUI.parents[3] / "public" / "img" / "brinde-30-legendas-capa.jpg").as_uri()
SAIDA = AQUI.parents[3] / "public" / "img" / "campanha-brinde"

CSS = f"""
@font-face {{ font-family: I; src: url({FONTES}/InterDisplay-Medium.otf); font-weight: 500; }}
@font-face {{ font-family: I; src: url({FONTES}/InterDisplay-Bold.otf); font-weight: 700; }}
@font-face {{ font-family: I; src: url({FONTES}/InterDisplay-ExtraBold.otf); font-weight: 800; }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1080px; height: 1350px; font-family: I; color: #fff; overflow: hidden; }}
.a {{ width: 1080px; height: 1350px; position: relative; padding: 250px 84px 90px; display: flex; flex-direction: column;
     background: radial-gradient(90% 60% at 100% 0%, #2B63F0 0%, rgba(43,99,240,0) 60%), radial-gradient(70% 50% at 0% 100%, #1D3F9E 0%, rgba(29,63,158,0) 70%), #0F1E3D; }}
.light {{ background: #F4F6FA; color: #0F1E3D; }}
.tag {{ align-self: flex-start; background: #FFC83D; color: #0F1E3D; font-weight: 800; font-size: 34px; border-radius: 99px; padding: 14px 30px; }}
h1 {{ font-size: 96px; line-height: 1.02; font-weight: 800; letter-spacing: -1px; margin-top: 34px; }}
h1 em {{ font-style: normal; color: #8FB0FF; }}
.light h1 em {{ color: #2B63F0; }}
p.s {{ font-size: 42px; line-height: 1.3; font-weight: 500; color: #D3DCF2; margin-top: 30px; }}
.light p.s {{ color: #46516B; }}
.cta {{ margin-top: auto; align-self: flex-start; background: #2B63F0; color: #fff; font-weight: 800; font-size: 44px; border-radius: 99px; padding: 26px 46px; }}
.cta.g {{ background: #FFC83D; color: #0F1E3D; }}
.url {{ font-size: 32px; color: #9DB4F5; margin-top: 20px; font-weight: 700; }}
.light .url {{ color: #2B63F0; }}
.card {{ background: #fff; color: #16233F; border-radius: 28px; padding: 34px 38px; font-size: 38px; line-height: 1.38; border-left: 14px solid #2B63F0; margin-top: 34px; box-shadow: 0 20px 50px rgba(0,0,0,.25); }}
.mk {{ background: #E6EDFF; color: #2B63F0; font-weight: 700; border-radius: 10px; padding: 0 8px; }}
.cover {{ position: absolute; right: 70px; bottom: 120px; width: 330px; border-radius: 16px; transform: rotate(-6deg); box-shadow: 0 30px 70px rgba(0,0,0,.5); }}
.list {{ margin-top: 34px; display: grid; gap: 20px; font-size: 44px; font-weight: 700; }}
.list div {{ display: flex; gap: 22px; align-items: center; }}
.list b {{ width: 70px; height: 70px; border-radius: 20px; background: rgba(255,255,255,.12); display: grid; place-items: center; font-size: 40px; flex: none; }}
.light .list b {{ background: #E6EDFF; }}
.vs {{ display: grid; gap: 26px; margin-top: 34px; }}
.vs .x, .vs .ok {{ border-radius: 26px; padding: 28px 34px; font-size: 38px; line-height: 1.35; }}
.vs .x {{ background: #FDECEC; color: #7A1E1E; border: 3px solid #F3B4B4; }}
.vs .ok {{ background: #E8F6EF; color: #0E5A3A; border: 3px solid #9FD9BD; }}
.vs small {{ display: block; font-size: 30px; font-weight: 800; margin-bottom: 8px; }}
.n {{ position: absolute; left: 84px; bottom: 70px; font-size: 30px; color: #9DB4F5; font-weight: 700; }}
"""

def page(body, cls=""):
    return f"<html><head><meta charset=utf-8><style>{CSS}</style></head><body><div class='a {cls}'>{body}</div></body></html>"

CTA = "<div class='cta g'>🎁 Pegue grátis: link na bio</div><div class='url'>flowarts.com.br/brinde</div>"

ARTES = {
 # Dia 1 — carrossel (5 cards)
 "d1-1": page(f"<span class='tag'>🎁 BRINDE GRÁTIS</span><h1>Nunca mais fique sem saber <em>o que postar</em></h1><p class='s'>30 legendas prontas, de graça.<br>Arrasta para o lado 👉</p><img class='cover' src='{CAPA}' style='width:320px;bottom:80px;right:90px'>"),
 "d1-2": page(f"<h1>30 legendas <em>prontas</em> para o seu negócio</h1><p class='s'>É só copiar, trocar as palavras marcadas e postar.</p><img class='cover' src='{CAPA}'>"),
 "d1-3": page("<h1 style='font-size:80px'>Veja uma delas:</h1><div class='card'>Prazer, eu sou <span class='mk'>[seu nome]</span>, da <span class='mk'>[nome do negócio]</span>! 👋 Há <span class='mk'>[tempo]</span> eu ajudo <span class='mk'>[quem você atende]</span> aqui em <span class='mk'>[cidade]</span>.</div><p class='s'>Pronto. Seu post de hoje está feito.</p>"),
 "d1-4": page("<h1 style='font-size:80px'>6 tipos de post que todo negócio precisa</h1><div class='list'><div><b>👋</b>Apresentação</div><div><b>🎬</b>Bastidores</div><div><b>⭐</b>Clientes felizes</div><div><b>💡</b>Dica útil</div><div><b>🏷️</b>Oferta</div><div><b>💬</b>Conversa</div></div>"),
 "d1-5": page("<h1>É grátis e você baixa <em>na hora</em></h1><p class='s'>Toque no link da bio, coloque seu nome e WhatsApp e pronto.</p>" + CTA),
 # Dia 2
 "d2": page("<span class='tag'>VOCÊ POSTA E NINGUÉM VÊ?</span><h1>Talvez o problema seja <em>a legenda</em></h1><p class='s'>Legenda que só vende não puxa conversa. E sem conversa, o Instagram não mostra seu post.</p>" + CTA),
 # Dia 3
 "d3": page("<h1>Copie e cole: <em>legenda de conversa</em></h1><div class='card'>Você prefere <span class='mk'>[opção A]</span> ou <span class='mk'>[opção B]</span>? 🤔 Responde com A ou B aqui embaixo!</div><p class='s'>Pergunta fácil = comentário. Tem mais 29 assim no guia.</p>" + CTA, "light"),
 # Dia 4
 "d4": page("<span class='tag'>ERRO Nº 1</span><h1>Postar <em>só promoção</em></h1><p class='s'>Quem só vende cansa o seguidor. O certo é misturar: bastidores, dicas, clientes felizes… e só às vezes oferta.</p><p class='s' style='color:#fff;font-weight:700'>O guia te diz o que postar em cada dia.</p>" + CTA),
 # Dia 5
 "d5": page(f"<span class='tag'>🎁 PRESENTE PARA VOCÊ</span><h1>30 legendas <em>grátis</em></h1><p class='s' style='max-width:560px'>Para loja, salão, restaurante, clínica e qualquer negócio.</p><img class='cover' src='{CAPA}' style='width:300px;bottom:300px;right:60px'>" + CTA),
 # Dia 6
 "d6": page("<h1 style='font-size:84px'>A mesma foto. <em>Outra legenda.</em></h1><div class='vs'><div class='x'><small>❌ ANTES</small>Promoção hoje. Venha conferir.</div><div class='ok'><small>✅ DEPOIS</small>Só até sábado! 🔥 Corte + escova por R$ 59. Comenta QUERO que a gente separa seu horário.</div></div>" + CTA, "light"),
 # Dia 7
 "d7": page("<span class='tag'>MANDA PARA ALGUÉM</span><h1>Conhece alguém que tem <em>negócio</em>?</h1><p class='s'>Envia este post para essa pessoa. Ela vai te agradecer: são 30 legendas prontas, de graça.</p><div class='cta'>📲 Toque em enviar</div><div class='url'>Brinde no link da bio · flowarts.com.br/brinde</div>"),
}

SAIDA.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 1080, "height": 1350})
    for nome, html in ARTES.items():
        f = AQUI / "_tmp.html"; f.write_text(html, encoding="utf-8")
        pg.goto(f.as_uri()); pg.wait_for_timeout(300)
        pg.screenshot(path=str(SAIDA / f"{nome}.jpg"), type="jpeg", quality=90)
    (AQUI / "_tmp.html").unlink()
    b.close()
print("ok", len(ARTES))
