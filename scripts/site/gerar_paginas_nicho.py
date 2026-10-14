#!/usr/bin/env python3
"""Gera as páginas de nicho do site da Flow Arts (public/marketing-para-*.html).

Preços iguais aos da página principal (public/site.html), decisão do Rodrigo em 2026-10-13.
Nada de resultados, clientes ou números inventados.
"""
import html
import json
import sys
from pathlib import Path
from urllib.parse import quote

OUT = Path(sys.argv[1])
WA = "5521964816185"
SITE = "https://flowarts.com.br"

PRECOS = [
    ("Instagram que responde sozinho", "R$ 197, pagamento único. Resposta automática no direct para quem comenta, a pessoa segue o seu perfil e vai direto para o seu WhatsApp, 10 posts prontos com imagens e legendas. Tudo funcionando em até 2 dias."),
    ("5 Reels com IA", "R$ 147. Vídeos curtos para o seu negócio aparecer para quem ainda não te segue."),
    ("10 posts prontos", "R$ 97. Imagens e legendas no estilo da sua marca, entregues em 24h."),
    ("Logo profissional", "R$ 67. Três opções originais para você escolher, em 24h."),
]

COMO = [
    ("A gente conhece o seu negócio", "Você conta o que vende, para quem e qual é o seu jeito. Pode ser por WhatsApp, sem reunião."),
    ("A IA prepara os posts", "Fotos, Reels, carrosséis e legendas no estilo do seu negócio, com um calendário do mês."),
    ("Você só aprova", "Tudo aparece num painel no celular. Nada é publicado sem a sua aprovação."),
]

NICHOS = [
    {
        "slug": "marketing-para-cafeteria",
        "nome": "cafeteria", "da": "da sua cafeteria", "pa": "para a sua cafeteria", "tenho": "uma cafeteria",
        "titulo": "Marketing para cafeteria no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua cafeteria postando com constância, com IA. Ideias de post para café, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para cafeteria: o Instagram do seu café postando sem você parar o balcão.",
        "lead": "Você cuida do café, dos clientes e do caixa. A Flow Arts cuida dos posts. A IA prepara tudo e você só aprova pelo celular.",
        "dor": [
            "O dia começa cedo e termina tarde. Não sobra tempo para fotografar, escrever e postar.",
            "O perfil fica dias parado, e quem passa na rua não lembra do seu café.",
            "As fotos do celular saem escuras e não mostram o capricho que você tem no balcão.",
        ],
        "ideias": [
            ("O café sendo feito", "Um Reel curto do espresso caindo na xícara ou do leite vaporizado. Movimento prende quem está rolando a tela."),
            ("Bastidor de manhã cedo", "A cafeteria abrindo, o pão saindo do forno, a primeira fornada. Mostra cuidado e cria vontade."),
            ("Combo do dia", "Um post simples com o café da manhã ou o lanche da tarde e o preço. Ajuda quem está decidindo onde ir."),
            ("Pergunta para o cliente", "\"Café puro ou com leite?\" Perguntas fáceis geram comentários, e comentário faz o post chegar a mais gente."),
            ("Quem faz o seu café", "Apresente o barista ou a equipe. Pessoas confiam em pessoas."),
        ],
        "faq": [
            ("Preciso tirar as fotos?", "Não precisa. A IA cria as imagens no estilo do seu café. Se você tiver fotos reais boas, elas também podem entrar."),
            ("Funciona para cafeteria pequena, de bairro?", "Sim. O serviço foi pensado para pequenos negócios que não têm tempo nem equipe de marketing."),
            ("Vocês atendem fora do Rio de Janeiro?", "Sim. O atendimento é 100% online, para todo o Brasil."),
            ("Posso ver antes de contratar?", "Pode. A Flow Arts faz um exemplo grátis para o seu café antes de você decidir."),
        ],
        "demo": True,
    },
    {
        "slug": "marketing-para-salao-de-beleza",
        "nome": "salão de beleza", "da": "do seu salão", "pa": "para o seu salão", "tenho": "um salão de beleza",
        "titulo": "Marketing para salão de beleza no Instagram | Flow Arts Marketing",
        "descricao": "Instagram do seu salão de beleza postando com constância, com IA. Ideias de post para salão, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para salão de beleza: o Instagram do seu salão trabalhando entre um cliente e outro.",
        "lead": "Você está com as mãos ocupadas o dia todo. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Entre um corte e uma escova, não dá para parar e pensar no que postar.",
            "O Instagram é a vitrine do salão, mas fica dias sem novidade.",
            "Clientes novas olham o perfil antes de marcar. Perfil parado passa a impressão de salão parado.",
        ],
        "ideias": [
            ("Antes e depois", "O resultado de um corte, uma cor ou uma unha. É o tipo de post que a cliente salva e mostra para a amiga. Use só com autorização da cliente."),
            ("Dica rápida de cuidado", "\"Como manter a escova por mais tempo.\" Dica útil faz a pessoa salvar o post, e salvar ajuda o post a aparecer para mais gente."),
            ("Horários livres da semana", "Um post ou story simples com os horários que ainda estão vagos. Ajuda a encher a agenda."),
            ("Conheça a equipe", "Quem corta, quem pinta, quem faz unha. A cliente nova se sente mais segura para marcar."),
            ("O ambiente do salão", "Um Reel curto mostrando o espaço, a cadeira, o café que você oferece. Mostra o clima do lugar."),
        ],
        "faq": [
            ("Vocês usam fotos das minhas clientes?", "Só se você mandar e tiver a autorização delas. Sem isso, a IA cria imagens no estilo do salão."),
            ("Funciona para salão pequeno ou para quem atende em casa?", "Sim. O serviço foi pensado para pequenos negócios e profissionais que trabalham sozinhos."),
            ("Vocês atendem fora do Rio de Janeiro?", "Sim. O atendimento é 100% online, para todo o Brasil."),
            ("Posso ver antes de contratar?", "Pode. A Flow Arts faz um exemplo grátis para o seu salão antes de você decidir."),
        ],
        "demo": False,
    },
    {
        "slug": "marketing-para-lanchonete",
        "nome": "lanchonete", "da": "da sua lanchonete", "pa": "para a sua lanchonete", "tenho": "uma lanchonete",
        "titulo": "Marketing para lanchonete no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua lanchonete postando com constância, com IA. Ideias de post para lanchonete, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para lanchonete: o Instagram da sua lanchonete dando fome em quem passa pelo feed.",
        "lead": "Você está na chapa e no atendimento. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Na hora do movimento não dá para fotografar. Depois, o cansaço fala mais alto.",
            "Sem posts, o cliente esquece de você bem na hora de escolher onde pedir.",
            "Foto de lanche feita às pressas não dá fome em ninguém.",
        ],
        "ideias": [
            ("O lanche sendo montado", "Um Reel curto do pão, do queijo derretendo e do lanche fechando. É o que dá fome."),
            ("Promoção do dia", "Um post direto com o lanche, o preço e o horário. Quem está com fome decide rápido."),
            ("Combo para dividir", "Mostre um combo para a família ou para os amigos. Ajuda quem está organizando o pedido."),
            ("Enquete", "\"Hambúrguer com ou sem cebola?\" Perguntas fáceis geram comentários e fazem o post circular."),
            ("Como pedir", "Explique em um post como pedir: balcão, WhatsApp ou aplicativo. Tira a dúvida e evita perder pedido."),
        ],
        "faq": [
            ("Preciso tirar as fotos dos lanches?", "Não precisa. A IA cria as imagens no estilo da sua lanchonete. Fotos reais boas também podem entrar."),
            ("Funciona para lanchonete pequena?", "Sim. O serviço foi pensado para pequenos negócios que não têm tempo nem equipe de marketing."),
            ("Vocês atendem fora do Rio de Janeiro?", "Sim. O atendimento é 100% online, para todo o Brasil."),
            ("Posso ver antes de contratar?", "Pode. A Flow Arts faz um exemplo grátis para a sua lanchonete antes de você decidir."),
        ],
        "demo": False,
    },
]

CSS = """
:root{--navy:#0F1E3D;--blue:#2B63F0;--bg:#F4F6FA;--card:#FFFFFF;--ink:#16233F;--muted:#5B6680;--line:#D5DCE8;--whats:#128C4B;--soft:#E6EDFF}
@media (prefers-color-scheme:dark){:root{--bg:#0B1426;--card:#111D35;--ink:#E7ECF7;--muted:#A3AFC7;--line:#24345A;--soft:#1C2D57;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:17px;line-height:1.6}
a{color:var(--blue)}
.wrap{max-width:860px;margin:0 auto}
.top{background:var(--navy);color:#fff;padding:calc(18px + env(safe-area-inset-top)) 16px 0}
.top a.brand{color:#fff;font-weight:700;text-decoration:none}
.hero{background:var(--navy);color:#fff;padding:28px 16px 56px}
.crumbs{font-size:.9rem;color:#9DB4F5;margin:0 0 12px}
.crumbs a{color:#9DB4F5}
h1{margin:0;font-size:clamp(1.8rem,5.5vw,2.7rem);line-height:1.15;text-wrap:balance}
.lead{margin:14px 0 0;color:#D3DCF2;font-size:1.1rem;max-width:52ch}
main{padding:0 16px 32px}
section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 18px;margin-top:20px}
main section:first-child{margin-top:-32px;box-shadow:0 12px 32px rgba(15,30,61,.12)}
h2{margin:0 0 12px;font-size:1.35rem;line-height:1.25}
h3{margin:0 0 4px;font-size:1.05rem}
ul.dor{margin:0;padding-left:20px;display:grid;gap:8px}
ol.ideias{margin:0;padding:0;list-style:none;display:grid;gap:14px;counter-reset:i}
ol.ideias li{counter-increment:i;padding-left:44px;position:relative}
ol.ideias li::before{content:counter(i);position:absolute;left:0;top:0;width:32px;height:32px;border-radius:50%;background:var(--soft);color:var(--blue);display:grid;place-items:center;font-weight:700}
ol.ideias p,.passos p{margin:0;color:var(--muted)}
.passos{display:grid;gap:14px}
.precos{display:grid;gap:12px}
.preco{border:1px solid var(--line);border-radius:12px;padding:14px}
.preco p{margin:4px 0 0;color:var(--muted)}
details{border-top:1px solid var(--line);padding:12px 0}
details:first-of-type{border-top:0}
summary{font-weight:700;cursor:pointer}
details p{margin:8px 0 0;color:var(--muted)}
.cta{text-align:center}
.btn{min-height:54px;border-radius:999px;background:var(--blue);color:#fff;font-weight:700;font-size:1.05rem;display:inline-flex;align-items:center;justify-content:center;padding:0 26px;text-decoration:none;margin:6px}
.btn-whats{background:var(--whats)}
.nota{color:var(--muted);font-size:.92rem}
footer{padding:8px 16px calc(28px + env(safe-area-inset-bottom));color:var(--muted);font-size:.9rem}
footer nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}
a:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
"""


def e(text):
    return html.escape(text, quote=True)


def outros_links(atual):
    return " · ".join(
        f'<a href="/{n["slug"]}">Marketing para {e(n["nome"])}</a>' for n in NICHOS if n["slug"] != atual
    )


def pagina(n):
    url = f"{SITE}/{n['slug']}"
    wa = f"https://wa.me/{WA}?text=" + quote(f"Olá! Tenho {n['tenho']} e quero um exemplo grátis do Instagram.", safe="")
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "name": f"Marketing para {n['nome']} no Instagram",
                "serviceType": "Marketing digital e Instagram com IA",
                "provider": {"@id": f"{SITE}/#empresa"},
                "areaServed": {"@type": "Country", "name": "Brasil"},
                "url": url,
                "description": n["descricao"],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in n["faq"]
                ],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Flow Arts Marketing", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": f"Marketing para {n['nome']}", "item": url},
                ],
            },
        ],
    }
    dor = "".join(f"<li>{e(x)}</li>" for x in n["dor"])
    ideias = "".join(f"<li><h3>{e(t)}</h3><p>{e(d)}</p></li>" for t, d in n["ideias"])
    passos = "".join(f'<div><h3>{i}. {e(t)}</h3><p>{e(d)}</p></div>' for i, (t, d) in enumerate(COMO, 1))
    precos = "".join(f'<div class="preco"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in PRECOS)
    faq = "".join(f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in n["faq"])
    demo = (
        '<p class="nota">Quer ver como fica? <a href="/demo">Veja o painel de exemplo de um café</a> (negócio fictício).</p>'
        if n["demo"] else '<p class="nota">Quer ver como fica? <a href="/demo">Veja um painel de exemplo</a> (negócio fictício).</p>'
    )
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F1E3D">
<title>{e(n['titulo'])}</title>
<meta name="description" content="{e(n['descricao'])}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Flow Arts Marketing">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(n['titulo'])}">
<meta property="og:description" content="{e(n['descricao'])}">
<meta property="og:image" content="{SITE}/brand/flowarts-logo.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/brand/flowarts-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap">
<style>{CSS}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="/">Flow Arts Marketing</a></div></header>
<div class="hero"><div class="wrap">
  <p class="crumbs"><a href="/">Início</a> › Marketing para {e(n['nome'])}</p>
  <h1>{e(n['h1'])}</h1>
  <p class="lead">{e(n['lead'])}</p>
</div></div>
<main><div class="wrap">
  <section>
    <h2>O problema de quem tem {e(n['nome'])}</h2>
    <ul class="dor">{dor}</ul>
  </section>
  <section>
    <h2>5 ideias de post para {e(n['nome'])}</h2>
    <ol class="ideias">{ideias}</ol>
    <p class="nota">Pode usar estas ideias mesmo sem contratar. Se quiser que alguém faça por você, a Flow Arts prepara tudo.</p>
  </section>
  <section>
    <h2>Como a Flow Arts faz o Instagram {e(n['da'])}</h2>
    <div class="passos">{passos}</div>
    {demo}
  </section>
  <section>
    <h2>Preços</h2>
    <div class="precos">{precos}</div>
  </section>
  <section>
    <h2>Perguntas frequentes</h2>
    {faq}
  </section>
  <section class="cta">
    <h2>Peça um exemplo grátis</h2>
    <p>A gente prepara um exemplo {e(n['pa'])}, sem compromisso.</p>
    <a class="btn btn-whats" href="{wa}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
    <a class="btn" href="/exemplo">Pedir pelo site</a>
  </section>
</div></main>
<footer><div class="wrap">
  <span>Flow Arts — CNPJ 65.299.616/0001-50 · Agência de marketing com IA, atendimento online para todo o Brasil.</span>
  <nav aria-label="Outras páginas">{outros_links(n['slug'])} · <a href="/">Início</a> · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a></nav>
</div></footer>
<script>/* Contador de visitas da Flow Arts: só a página e de onde veio, sem dados pessoais. */try{{navigator.sendBeacon&&navigator.sendBeacon("/api/site/hit",new Blob([JSON.stringify({{p:location.pathname,r:document.referrer}})],{{type:"text/plain"}}))}}catch(e){{}}</script>
</body>
</html>
"""


for n in NICHOS:
    (OUT / f"{n['slug']}.html").write_text(pagina(n), encoding="utf-8")
    print(n["slug"])
