"""DOT Carimbo: applies exact official Daniela Martins branding to generated art.
Run before Nexus upload. Requires Pillow and PyMuPDF.
python scripts/dot_carimbo_daniela.py input.jpg output.jpg --brand-pdf path/to/official.pdf
The approved PDF must be provided to this script. Never generate the logo with AI.
"""
import argparse
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

def stamp(source, destination, brand_pdf, header_fraction=0.25):
    base = Image.open(source).convert("RGB")
    w, h = base.size
    with fitz.open(str(brand_pdf)) as doc:
        page = doc[0]
        # Coordinates verified against the official 8-page Daniela presentation.
        rect = fitz.Rect(178, 145, 786, 526)
        pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), clip=rect, alpha=False)
        logo = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        corner = page.get_pixmap(clip=fitz.Rect(900, 10, 901, 11), alpha=False)
        bg = Image.frombytes("RGB", (1, 1), corner.samples).getpixel((0, 0))
    header_h = round(h * header_fraction)
    ImageDraw.Draw(base).rectangle((0, 0, w, header_h), fill=bg)
    logo.thumbnail((int(w * .84), int(header_h * .89)), Image.Resampling.LANCZOS)
    base.paste(logo, ((w - logo.width)//2, (header_h - logo.height)//2))
    output = Path(destination)
    output.parent.mkdir(parents=True, exist_ok=True)
    base.save(output, quality=94, subsampling=0)
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("output")
    parser.add_argument("--brand-pdf", required=True)
    args = parser.parse_args()
    print(stamp(args.image, args.output, args.brand_pdf))
