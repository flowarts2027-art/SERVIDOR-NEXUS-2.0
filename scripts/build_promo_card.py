#!/usr/bin/env python3
import argparse
import io
import json
import os
import shutil
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter

W, H = 1080, 1920
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/video-template"
PHONE_X, PHONE_Y = 60, 720
PHONE_W, PHONE_H = 846, 1538
SCREEN_X, SCREEN_Y = 281, 888
SCREEN_W, SCREEN_H = 492, 620
CONTENT_TOP = 740
FRAME_PRESET = "nexus"


def preset_style():
    if FRAME_PRESET == "minimal":
        return {"alpha_delta": -42, "panel": (8,16,22,198), "outline": (128,160,176,130), "accent": (220,232,239,255), "phone": (7,12,16,240), "headline": 52, "popcorn": False}
    if FRAME_PRESET == "cinema":
        return {"alpha_delta": 18, "panel": (9,7,4,238), "outline": (203,168,86,190), "accent": (239,211,145,255), "phone": (6,5,4,252), "headline": 60, "popcorn": True}
    return {"alpha_delta": 0, "panel": (2,7,12,220), "outline": (93,132,154,120), "accent": (191,211,222,255), "phone": (2,6,11,248), "headline": 58, "popcorn": True}

def clean(value, limit=5000):
    return " ".join(str(value or "").replace("\n", " ").replace("\r", " ").split())[:limit]

def font_path(bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return p
    raise RuntimeError("promo_font_missing")

def font(size, bold=False):
    return ImageFont.truetype(font_path(bold), size)

def fit_lines(draw, text, face, max_width, max_lines):
    words = clean(text).split()
    if not words:
        return []
    lines, line = [], ""
    for word in words:
        candidate = (line + " " + word).strip()
        if line and draw.textlength(candidate, font=face) > max_width:
            lines.append(line)
            line = word
            if len(lines) >= max_lines:
                break
        else:
            line = candidate
    if len(lines) < max_lines and line:
        lines.append(line)
    rendered = " ".join(lines)
    original = " ".join(words)
    if len(lines) == max_lines and rendered != original:
        tail = lines[-1]
        while tail and draw.textlength(tail + "…", font=face) > max_width:
            tail = tail[:-1].rstrip()
        lines[-1] = (tail.rstrip(" .") + "…") if tail else "…"
    return lines

def draw_wrapped(draw, text, xy, max_width, size, fill, bold=False, max_lines=6, line_gap=9):
    x, y = xy
    face = font(size, bold)
    for line in fit_lines(draw, text, face, max_width, max_lines):
        draw.text((x, y), line, font=face, fill=fill)
        y += size + line_gap
    return y

def contain(img, size):
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    img = img.convert("RGBA")
    img.thumbnail(size, Image.Resampling.LANCZOS)
    out.alpha_composite(img, ((size[0] - img.width) // 2, (size[1] - img.height) // 2))
    return out

def rounded_image(img, size, radius=28):
    img = ImageOps.fit(img.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0]-1, size[1]-1), radius=radius, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask)
    return out

def circle_image(img, diameter):
    img = ImageOps.fit(img.convert("RGB"), (diameter, diameter), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter-1, diameter-1), fill=255)
    out = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask)
    return out

def safe_local(path):
    try:
        p = Path(path)
        if p.exists() and p.stat().st_size:
            return Image.open(p).convert("RGBA")
    except Exception:
        pass
    return None

def fetch_image(url, cache_dir, name):
    url = clean(url, 1600)
    if not url:
        return None
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        allowed = ("tvmaze.com", "mzstatic.com", "tmdb.org", "sonypictures.com.br")
        if host in ("upload.wikimedia.org", "thumb.wikimedia.org") and parsed.path.startswith("/wikipedia/commons/"):
            allowed = allowed + ("upload.wikimedia.org", "thumb.wikimedia.org")
        if parsed.scheme != "https" or not any(host == h or host.endswith("." + h) for h in allowed):
            return None
        req = urllib.request.Request(url, headers={"User-Agent": "NEXUS-Promo/2.0"})
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read(8 * 1024 * 1024 + 1)
        if len(raw) > 8 * 1024 * 1024:
            return None
        p = cache_dir / name
        p.write_bytes(raw)
        with Image.open(io.BytesIO(raw)) as check:
            check.verify()
        return Image.open(p).convert("RGBA")
    except Exception:
        return None

def add_logo(canvas, logo):
    # Body logo is composited by ffmpeg so position, size and animation can be
    # changed per editable job. The final CTA keeps its dedicated centered logo.
    return

def make_base(alpha=110, top=CONTENT_TOP):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    style = preset_style()
    adjusted = max(0, min(255, alpha + style["alpha_delta"]))
    # Keep the trailer area clear. Informational overlays live only below CONTENT_TOP.
    d.rectangle((0, top, W, H), fill=(0, 0, 0, adjusted))
    return img

def draw_contact_badge(canvas, draw, contact, box):
    contact = clean(contact, 34)
    if not contact:
        return
    digits = re.sub(r"\D", "", contact)
    if len(digits) in (12, 13) and digits.startswith("55"):
        digits = digits[2:]
    if len(digits) == 11:
        contact = f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    elif len(digits) == 10:
        contact = f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1, y1, x2, y2), radius=(y2-y1)//2, fill=(7, 20, 14, 242), outline=(45, 220, 98, 220), width=3)
    icon = safe_local(ASSETS / "whatsapp.webp")
    icon_size = max(34, min(54, (y2-y1)-18))
    if icon:
        icon = contain(icon, (icon_size, icon_size))
        canvas.alpha_composite(icon, (x1 + 18, y1 + ((y2-y1)-icon_size)//2))
    number_x = x1 + 18 + icon_size + 16
    draw.text((number_x, y1 + ((y2-y1)-30)//2 - 2), contact, font=font(28, True), fill=(255,255,255,255))

def draw_phone_scene(out_dir, logo, poster, title, overview, year, media_type):
    under = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(under)
    style = preset_style()
    d.rounded_rectangle((SCREEN_X-10, SCREEN_Y-10, SCREEN_X+SCREEN_W+10, H-18), radius=46, fill=style["phone"], outline=style["outline"], width=3)
    d.rounded_rectangle((SCREEN_X, SCREEN_Y, SCREEN_X+SCREEN_W, SCREEN_Y+SCREEN_H), radius=36, fill=(4, 8, 12, 255))

    # Static banner inside the phone: no duplicated moving trailer.
    if poster:
        bg = ImageOps.fit(poster.convert("RGB"), (SCREEN_W, SCREEN_H), method=Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(7)).convert("RGBA")
        shade = Image.new("RGBA", (SCREEN_W, SCREEN_H), (0,0,0,92))
        bg = Image.alpha_composite(bg, shade)
        under.alpha_composite(bg, (SCREEN_X, SCREEN_Y))
        art = contain(poster, (SCREEN_W-90, SCREEN_H-125))
        under.alpha_composite(art, (SCREEN_X+45, SCREEN_Y+28))
        d.rounded_rectangle((SCREEN_X+24, SCREEN_Y+SCREEN_H-104, SCREEN_X+SCREEN_W-24, SCREEN_Y+SCREEN_H-24), radius=22, fill=(3,8,13,220))
        banner_title = clean(title, 70)
        face = font(27, True)
        for i,line in enumerate(fit_lines(d,banner_title,face,SCREEN_W-82,2)):
            d.text((SCREEN_X+41, SCREEN_Y+SCREEN_H-91+i*31), line, font=face, fill=(255,255,255,255))
    else:
        d.text((SCREEN_X+42, SCREEN_Y+245), clean(title,70), font=font(30,True), fill=(255,255,255,255))

    info_y = SCREEN_Y + SCREEN_H + 26
    title_face = font(31, True)
    for line in fit_lines(d, title, title_face, SCREEN_W-112, 2):
        d.text((SCREEN_X+56, info_y), line, font=title_face, fill=(255,255,255,255))
        info_y += 38
    meta = " • ".join(x for x in [media_type.upper(), year] if x)
    if meta:
        d.text((SCREEN_X+56, info_y+8), meta, font=font(18), fill=(178,201,216,255))
        info_y += 44
    draw_wrapped(d, overview, (SCREEN_X+56, info_y+12), SCREEN_W-112, 21, (236,242,247,255), max_lines=5, line_gap=7)
    add_logo(under, logo)
    under.save(out_dir / "scene-phone-under.png")

    front = Image.new("RGBA", (W, H), (0,0,0,0))
    hand = safe_local(ASSETS / "phone-hand.webp")
    if hand:
        front.alpha_composite(hand.resize((PHONE_W, PHONE_H), Image.Resampling.LANCZOS), (PHONE_X, PHONE_Y))
    front.save(out_dir / "scene-phone-front.png")

def draw_launch_scene(out_dir, poster, logo, popcorn, title, overview, year, media_type, metadata, contact):
    img = make_base(224, CONTENT_TOP)
    d = ImageDraw.Draw(img)
    add_logo(img, logo)
    current_year = str(__import__("datetime").datetime.now().year)
    label = "LANÇAMENTO" if year in (current_year, str(int(current_year)-1)) else "EM DESTAQUE"
    style = preset_style()
    d.text((72, 790), media_type.upper() or "FILME / SÉRIE", font=font(20, True), fill=style["accent"])
    d.text((72, 832), label, font=font(style["headline"], True), fill=(255,255,255,255))

    if poster:
        p = rounded_image(poster, (300, 450), 26)
        img.alpha_composite(p, (700, 825))
        d.rounded_rectangle((700,825,1000,1275), radius=26, outline=(240,245,248,215), width=3)
    if popcorn and style["popcorn"]:
        img.alpha_composite(contain(popcorn, (300, 330)), (735, 1280))

    y0 = 945
    title_face = font(34, True)
    for line in fit_lines(d, title, title_face, 560, 2):
        d.text((72, y0), line, font=title_face, fill=(255,255,255,255))
        y0 += 43
    runtime = clean(metadata.get("runtime"), 40)
    rating = clean(metadata.get("rating"), 40)
    meta = " • ".join(x for x in [year, runtime, rating] if x)
    if meta:
        d.text((72, y0+8), meta, font=font(19), fill=(198,216,227,255))
        y0 += 48
    draw_wrapped(d, overview, (72, y0+12), 560, 22, (240,244,247,255), max_lines=6, line_gap=8)
    # The persistent scene-watermark layer owns the single WhatsApp badge.
    img.save(out_dir / "scene-launch.png")

def initials_avatar(name, diameter):
    img = Image.new("RGBA", (diameter,diameter), (30,36,46,255))
    d = ImageDraw.Draw(img)
    parts = [p for p in clean(name,80).split() if p]
    initials = "".join(p[0].upper() for p in parts[:2]) or "?"
    f = font(max(22,diameter//4), True)
    box = d.textbbox((0,0), initials, font=f)
    d.text(((diameter-(box[2]-box[0]))/2,(diameter-(box[3]-box[1]))/2-4), initials, font=f, fill=(238,245,249,255))
    return img

def verified_wikimedia_photo(url):
    """Only public Commons portrait thumbnails, never unrelated third-party artwork."""
    try:
        parsed = urlparse(clean(url, 1600))
        return url if (parsed.scheme == "https" and parsed.hostname in ("upload.wikimedia.org", "thumb.wikimedia.org")
            and parsed.path.startswith("/wikipedia/commons/")) else ""
    except Exception:
        return ""


def wikipedia_cast_photos(cast):
    """Fallback for an API timeout in the Worker: one batch query per video."""
    aliases = {"Tom Holland": "Tom Holland (actor)"}
    by_title = {aliases.get(p.get("name"), p.get("name")): p.get("name")
                for p in cast if isinstance(p, dict) and clean(p.get("name"), 80)}
    if not by_title:
        return {}
    from urllib.parse import urlencode
    params = urlencode({"action": "query", "prop": "pageimages", "piprop": "thumbnail",
                        "pithumbsize": "500", "format": "json", "formatversion": "2",
                        "redirects": "1", "titles": "|".join(by_title)})
    request = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + params,
        headers={"User-Agent": "NEXUSPromo/2.1 (https://globalplay.fun)", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=9) as response:
            body = response.read(250000)
        pages = json.loads(body).get("query", {}).get("pages", [])
        names = {re.sub(r"[^a-z0-9]", "", title.casefold()): name
                 for title, name in by_title.items()}
        photos = {}
        for page in pages:
            key = re.sub(r"[^a-z0-9]", "", str(page.get("title", "")).casefold())
            image = verified_wikimedia_photo((page.get("thumbnail") or {}).get("source"))
            if key in names and image:
                photos[names[key]] = image
        return photos
    except Exception:
        return {}


def draw_cast_scene(out_dir, logo, metadata, cache_dir):
    img = make_base(222, CONTENT_TOP)
    d = ImageDraw.Draw(img)
    add_logo(img, logo)
    d.text((72, 790), "ELENCO", font=font(52, True), fill=(255,255,255,255))
    d.text((74, 850), "Principais nomes", font=font(22), fill=(187,207,220,255))
    cast = [item for item in list(metadata.get("cast") or []) if clean(item.get("name"), 80)][:6]
    if not cast:
        raise ValueError("video_cast_required")
    # Resolve missing portraits in the runner as well, not just at search
    # time. The trailer metadata may contain only cast names.
    fallback_portraits = wikipedia_cast_photos(cast) if any(not p.get("image") for p in cast) else {}
    from concurrent.futures import ThreadPoolExecutor
    def load_person(index_item):
        i, item = index_item
        person = fetch_image(item.get("image"), cache_dir, f"cast-{i}.jpg")
        if person is None and fallback_portraits.get(item.get("name")):
            person = fetch_image(fallback_portraits[item.get("name")], cache_dir, f"cast-fallback-{i}.jpg")
        return item, person
    with ThreadPoolExecutor(max_workers=4) as pool:
        portraits = list(pool.map(load_person, enumerate(cast)))
    verified = [(item, person) for item, person in portraits if person is not None]
    # When real cast photos exist, never surround them with made-up initials
    # masquerading as cast portraits. Only an entirely offline batch uses
    # the neutral initials fallback.
    gallery = verified if verified else [(item, initials_avatar(item.get("name"), 165)) for item in cast]
    diameter, start_x, gap_x, start_y, gap_y = 165, 105, 300, 940, 330
    for i,(item,person) in enumerate(gallery[:6]):
        col, row = i % 3, i // 3
        x, y = start_x + col*gap_x, start_y + row*gap_y
        face = circle_image(person, diameter)
        shadow = Image.new("RGBA", (diameter+20,diameter+20),(0,0,0,0))
        ImageDraw.Draw(shadow).ellipse((5,5,diameter+15,diameter+15),fill=(0,0,0,120))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)), (x-10,y-10))
        img.alpha_composite(face,(x,y))
        d.ellipse((x,y,x+diameter,y+diameter),outline=(245,248,250,220),width=4)
        name = clean(item.get("name"),70)
        ty = y + diameter + 15
        name_face = font(21,True)
        for line in fit_lines(d,name,name_face,diameter+55,2):
            tw = d.textlength(line,font=name_face)
            d.text((x+(diameter-tw)/2,ty),line,font=name_face,fill=(255,255,255,255))
            ty += 27
    img.save(out_dir / "scene-cast.png")

def localize_genres(value):
    mapping = {
        "action":"Ação","adventure":"Aventura","animation":"Animação","comedy":"Comédia",
        "crime":"Crime","documentary":"Documentário","drama":"Drama","family":"Família",
        "fantasy":"Fantasia","history":"História","horror":"Terror","music":"Música",
        "mystery":"Mistério","romance":"Romance","science fiction":"Ficção científica",
        "sci-fi":"Ficção científica","thriller":"Suspense","war":"Guerra","western":"Faroeste"
    }
    parts = [p.strip() for p in re.split(r"[•,/]", clean(value, 180)) if p.strip()]
    return " • ".join(mapping.get(p.lower(), p) for p in parts)

def review_items(metadata):
    out = []
    for r in list(metadata.get("reviews") or [])[:3]:
        text = clean(r.get("text") or r.get("summary"),220)
        if text:
            out.append((clean(r.get("author") or r.get("source") or "Avaliação",60),text))
    for label,value in [
        ("Avaliação", clean(metadata.get("rating"),120)),
        ("Gêneros", localize_genres(metadata.get("genres"))),
        ("Duração", clean(metadata.get("runtime"),100)),
    ]:
        if value and len(out)<3 and all(value != v for _,v in out):
            out.append((label,value))
    # Never invent quotes, critics or NEXUS reviews when the catalogue has no reviews.
    return out[:3]

def verified_rating_stars(value):
    """Only turn a real score with an explicit /5 or /10 scale into gold stars."""
    match = re.search(r"(?<!\d)(\d+(?:[.,]\d+)?)\s*/\s*(5|10)\b", clean(value, 120))
    if not match:
        return 0
    score = float(match.group(1).replace(",", "."))
    scale = int(match.group(2))
    if not 0 <= score <= scale:
        return 0
    return max(0, min(5, int(score / scale * 5 + 0.5)))


def draw_reviews_scene(out_dir, logo, metadata, contact):
    img = make_base(222, CONTENT_TOP)
    d = ImageDraw.Draw(img)
    add_logo(img, logo)
    rows = review_items(metadata)
    real_reviews = any(clean(r.get("text") or r.get("summary"), 220)
                       for r in (metadata.get("reviews") or []) if isinstance(r, dict))
    title = "O QUE ESTÃO ACHANDO" if real_reviews else "SOBRE O TÍTULO"
    d.text((72, 790), title, font=font(46, True), fill=(255,255,255,255))
    if not rows:
        # This is information, not a fabricated review or endorsement.
        rows = [("Informações", "Dados e avaliações verificadas ainda não disponíveis.")]
    y = 900
    for i,(author,text) in enumerate(rows):
        x, w, h = 72, 936, 240
        paper = [
            (x+18,y),(x+w-35,y+8),(x+w,y+26),(x+w-12,y+h-18),
            (x+w-42,y+h),(x+38,y+h-8),(x,y+h-33),(x+10,y+22)
        ]
        # Approved dark-cinema presentation: true black card, discreet gold edge.
        d.polygon(paper, fill=(8, 10, 14, 250))
        d.line(paper + [paper[0]], fill=(190, 145, 45, 205), width=3)
        avatar_x, avatar_y = x+36, y+30
        d.ellipse((avatar_x,avatar_y,avatar_x+58,avatar_y+58),
                  fill=(24, 26, 30, 255), outline=(245, 195, 53, 245), width=2)
        af = font(20, True)
        initial = (author[:1] or "?").upper()
        box = d.textbbox((0,0),initial,font=af)
        d.text((avatar_x+(58-(box[2]-box[0]))/2,avatar_y+13),
               initial,font=af,fill=(255, 211, 77, 255))
        d.text((x+112,y+31),author,font=font(22,True),fill=(255,255,255,255))
        # Stars appear only for a verified numeric catalogue rating, not for
        # unattributed opinions or unknown scores.
        stars = verified_rating_stars(metadata.get("rating"))
        if author == "Avaliação" and stars and text == clean(metadata.get("rating"), 120):
            d.text((x+112, y+74), "★"*stars + "☆"*(5-stars),
                   font=font(28, True), fill=(255, 205, 50, 255))
        draw_wrapped(d,text,(x+36,y+130),w-72,21,(232,235,239,255),
                     max_lines=3,line_gap=8)
        y += 265
    # The persistent scene-watermark layer owns the single WhatsApp badge.
    img.save(out_dir / "scene-reviews.png")

def draw_related_scene(out_dir, logo, metadata, cache_dir, poster):
    img = make_base(224, CONTENT_TOP)
    d = ImageDraw.Draw(img)
    add_logo(img, logo)
    d.text((72, 790), "TÍTULOS RELACIONADOS", font=font(46, True), fill=(255,255,255,255))
    # Do not substitute the selected film poster for unrelated cards.
    # A recommendation needs a distinct title and a fetchable image.
    import unicodedata
    def title_key(value):
        name = unicodedata.normalize("NFKD", clean(value, 180))
        name = "".join(c for c in name if not unicodedata.combining(c))
        return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    main_title = clean(metadata.get("title") or os.getenv("TITLE"), 180)
    main_url = clean(metadata.get("posterUrl"), 1600)
    seen_titles = {title_key(main_title)}
    seen_images = {main_url} if main_url else set()
    related = []
    for item in metadata.get("related") or []:
        if not isinstance(item, dict):
            continue
        title = clean(item.get("title"), 90)
        image_url = clean(item.get("image") or item.get("posterUrl"), 1600)
        if not title or not image_url or title_key(title) in seen_titles or image_url in seen_images:
            continue
        art = fetch_image(image_url, cache_dir, f"related-{len(related)}.jpg")
        if art is None:
            continue
        seen_titles.add(title_key(title))
        seen_images.add(image_url)
        related.append((item, art))
        if len(related) == 3:
            break
    if not related:
        # No fabricated recommendations and no copy of the Spider-Man poster.
        d.rounded_rectangle((72,900,1008,1150),radius=24,fill=(11,17,24,246),outline=(198,216,228,170),width=2)
        d.text((105,970),"Sugestões verificadas indisponíveis",
               font=font(28,True),fill=(230,234,239,255))
        img.save(out_dir / "scene-related.png")
        return
    y = 900
    for i,(item,art) in enumerate(related):
        x, w, h = 72, 936, 250
        d.rounded_rectangle((x,y,x+w,y+h),radius=24,fill=(11,17,24,246),outline=(198,216,228,170),width=2)
        art_x, art_y, art_w, art_h = x+18, y+18, 340, h-36
        d.rounded_rectangle((art_x,art_y,art_x+art_w,art_y+art_h),radius=18,fill=(4,8,12,255))
        if art:
            visible = contain(art, (art_w-12, art_h-12))
            under_x = art_x + (art_w-visible.width)//2
            under_y = art_y + (art_h-visible.height)//2
            img.alpha_composite(visible,(under_x,under_y))
        d.rounded_rectangle((art_x,art_y,art_x+art_w,art_y+art_h),radius=18,outline=(130,157,174,150),width=2)

        text_x = x + 395
        d.text((text_x,y+35),f"SUGESTÃO {i+1:02d}",font=font(17,True),fill=(95,198,239,255))
        title = clean(item.get("title"),90)
        yr = clean(item.get("year"),12)
        tf = font(34,True)
        ty = y+82
        for line in fit_lines(d,title,tf,w-440,2):
            d.text((text_x,ty),line,font=tf,fill=(255,255,255,255))
            ty += 42
        if yr:
            d.text((text_x,y+h-70),yr,font=font(20,True),fill=(184,207,219,255))
        d.text((text_x,y+h-39),"Relacionado ao título principal",font=font(16),fill=(128,155,171,255))
        y += 275
    img.save(out_dir / "scene-related.png")

def draw_watermark_scene(out_dir, logo, contact):
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    add_logo(img, logo)
    draw_contact_badge(img, d, contact, (72, 1770, 560, 1848))
    img.save(out_dir / "scene-watermark.png")

def draw_cta_scene(out_dir, logo, title, contact, cta_text=""):
    img = Image.new("RGBA", (W, H), (0,0,0,255))
    d = ImageDraw.Draw(img)

    # Final brand lockup: ASSISTA NO -> client logo -> WhatsApp.
    style = preset_style()
    radius = 26 if FRAME_PRESET == "minimal" else 44
    d.rounded_rectangle((145, 760, 935, 1515), radius=radius, fill=style["panel"], outline=style["outline"], width=2)
    headline = clean(cta_text, 70) or "ASSISTA NO"
    f = font(54 if FRAME_PRESET == "minimal" else 62, True)
    tw = d.textlength(headline, font=f)
    d.text(((W-tw)/2, 845), headline, font=f, fill=(255,255,255,255))

    if logo:
        final_logo = contain(logo, (500, 260))
        img.alpha_composite(final_logo, ((W-final_logo.width)//2, 985))
    else:
        tf = font(42, True)
        tt = clean(title, 80)
        tw = d.textlength(tt, font=tf)
        d.text(((W-tw)/2, 1040), tt, font=tf, fill=(225,238,246,255))

    draw_contact_badge(img, d, contact, (245, 1320, 835, 1412))
    img.save(out_dir / "scene-cta.png")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default="")
    ap.add_argument("--output-dir", default="")
    ap.add_argument("--poster", default="")
    ap.add_argument("--logo", default="")
    args = ap.parse_args()
    if not args.output and not args.output_dir:
        raise ValueError("output_required")

    title = clean(os.getenv("TITLE"),180)
    overview = clean(os.getenv("OVERVIEW"),1800)
    year = clean(os.getenv("RELEASE_YEAR"),12)
    media_type = clean(os.getenv("MEDIA_TYPE"),32)
    contact = clean(os.getenv("END_CONTACT"),40)
    try:
        composition = json.loads(os.getenv("COMPOSITION_JSON","") or "{}")
        if not isinstance(composition,dict):
            composition = {}
    except Exception:
        composition = {}
    global FRAME_PRESET
    FRAME_PRESET = str(composition.get("framePreset") or "nexus")
    if FRAME_PRESET not in {"nexus", "minimal", "cinema"}:
        FRAME_PRESET = "nexus"
    show_poster = composition.get("showPoster", True) is not False
    show_overview = composition.get("showOverview", True) is not False
    show_cast = composition.get("showCast", True) is not False
    custom_text = clean(composition.get("customText"), 280)
    cta_text = clean(composition.get("cta"), 120)
    if custom_text:
        overview = custom_text
    elif not show_overview:
        overview = ""
    try:
        metadata = json.loads(os.getenv("MOVIE_METADATA","") or "{}")
        if not isinstance(metadata,dict):
            metadata = {}
    except Exception:
        metadata = {}
    if not title:
        raise ValueError("video_metadata_required")

    out_dir = Path(args.output_dir or Path(args.output).parent / "promo-scenes")
    out_dir.mkdir(parents=True,exist_ok=True)
    cache_dir = out_dir/"cache"
    cache_dir.mkdir(exist_ok=True)
    poster = safe_local(args.poster) or fetch_image(metadata.get("posterUrl"),cache_dir,"poster.jpg")
    if not show_poster:
        poster = None
    # A black/empty smartphone is not acceptable in the approved reference
    # model. Fail with an actionable error instead of producing a misleading MP4.
    if not poster:
        error_path = os.getenv("NEXUS_RENDER_ERROR_PATH", "")
        if error_path:
            Path(error_path).write_text("video_official_poster_required")
        raise ValueError("video_official_poster_required")
    logo = safe_local(args.logo)

    # Restore the multi-scene promo: poster/popcorn, verified cast,
    # authentic reviews or catalogue facts, and branded closing CTA.
    popcorn = safe_local(ASSETS / "popcorn.webp") or safe_local(ASSETS / "popcorn.png")
    draw_phone_scene(out_dir,logo,poster,title,overview,year,media_type)
    draw_launch_scene(out_dir,poster,logo,popcorn,title,overview,year,media_type,metadata,contact)
    if show_cast and any(clean(p.get("name"),80) for p in metadata.get("cast",[]) if isinstance(p,dict)):
        draw_cast_scene(out_dir,logo,metadata,cache_dir)
    else:
        # Keep a cast scene even with missing metadata, without inventing actors.
        shutil.copyfile(out_dir / "scene-launch.png", out_dir / "scene-cast.png")
    draw_reviews_scene(out_dir,logo,metadata,contact)
    draw_related_scene(out_dir,logo,metadata,cache_dir,poster)
    draw_watermark_scene(out_dir,logo,contact)
    draw_cta_scene(out_dir,logo,title,contact,cta_text)

    if args.output:
        Image.open(out_dir/"scene-phone-under.png").save(args.output)

if __name__ == "__main__":
    main()
