"""Grava o Reel animado da Flow Arts (modelo HTML) como MP4 9:16.

Sem IA e sem custo: o navegador desenha cada quadro (window.renderAt) e o FFmpeg junta.
Uso: python3 render_reel.py --data reel.json --out reel.mp4 --cover capa.jpg
reel.json: {"scenes":[{"l1":"...","l2":"...","photo":"/caminho/opcional.jpg"}, ...], "cta":"Comente QUERO", "sub":"..."}
"""
import argparse
import json
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
MODELO = AQUI / "template.html"
SIMBOLO = RAIZ / "public" / "brand" / "flowarts-symbol.webp"
W, H = 1080, 1920


def preparar(dados):
    cenas = []
    for cena in (dados.get("scenes") or [])[:5]:
        foto = str(cena.get("photo") or "").strip()
        if foto and not foto.startswith(("http://", "https://", "file://")):
            caminho = pathlib.Path(foto).resolve()
            foto = caminho.as_uri() if caminho.is_file() else ""
        cenas.append({"l1": str(cena.get("l1") or ""), "l2": str(cena.get("l2") or ""), "photo": foto})
    if len(cenas) != 5:
        raise SystemExit("reel_scenes_required")
    return {
        "scenes": cenas,
        "cta": str(dados.get("cta") or "Comente QUERO"),
        "sub": str(dados.get("sub") or "Link na bio"),
        "brand": {"name": str(dados.get("brandName") or "FLOW ARTS"),
                  "symbol": SIMBOLO.as_uri() if SIMBOLO.is_file() else ""},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cover", required=True)
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()

    dados = preparar(json.loads(pathlib.Path(args.data).read_text(encoding="utf-8")))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--allow-file-access-from-files", "--disable-web-security"])
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        page.add_init_script("window.REEL = " + json.dumps(dados, ensure_ascii=False) + ";")
        page.goto(MODELO.as_uri())
        page.evaluate("document.fonts.ready")
        page.wait_for_function("[...document.images].every(i => i.complete)", timeout=30000)
        if page.evaluate("[...document.images].some(i => !i.naturalWidth)"):
            raise SystemExit("reel_photo_load_failed")
        duracao = float(page.evaluate("window.REEL_DURATION"))
        quadros = int(round(duracao * args.fps))

        # Capa: cena 1 já com o título inteiro na tela.
        page.evaluate("t => window.renderAt(t)", 1.4)
        page.screenshot(path=args.cover, type="jpeg", quality=92)

        ffmpeg = subprocess.Popen([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "image2pipe", "-framerate", str(args.fps), "-c:v", "mjpeg", "-i", "-",
            "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
            "-map", "0:v", "-map", "1:a", "-shortest",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", args.out,
        ], stdin=subprocess.PIPE)
        for n in range(quadros):
            page.evaluate("t => window.renderAt(t)", n / args.fps)
            ffmpeg.stdin.write(page.screenshot(type="jpeg", quality=92))
        ffmpeg.stdin.close()
        if ffmpeg.wait() != 0:
            raise SystemExit("reel_ffmpeg_failed")
        browser.close()
    print(json.dumps({"ok": True, "duration": duracao, "frames": quadros}))


if __name__ == "__main__":
    sys.exit(main())
