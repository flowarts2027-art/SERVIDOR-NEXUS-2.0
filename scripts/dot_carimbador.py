"""DOT Carimbador — official branding overlay for any Flow Arts client.

Usage:
  python scripts/dot_carimbador.py art.jpg finished.jpg \
      --logo assets/clients/example/logo.png --position top-center
PNG logo should have a transparent background. This utility never generates
or redraws logos. It does not submit, approve or publish campaigns.
"""
import argparse
from pathlib import Path
from PIL import Image

POSITIONS = ("top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right")

def apply_stamp(source, output, logo_file, position="top-center", width_fraction=0.38,
                margin_fraction=0.045, panel=False):
    base = Image.open(source).convert("RGBA")
    logo = Image.open(logo_file).convert("RGBA")
    if logo.getbbox() is None:
        raise ValueError("Empty or transparent logo")
    # Crop only transparent empty margins; preserve every visible logo pixel.
    logo = logo.crop(logo.getbbox())
    max_w = max(1, int(base.width * width_fraction))
    max_h = max(1, int(base.height * 0.18))
    logo.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    margin = max(8, int(min(base.size) * margin_fraction))
    horizontal, vertical = position.split("-")
    x = {"left": margin, "center": (base.width-logo.width)//2,
         "right": base.width-logo.width-margin}[horizontal]
    y = {"top": margin, "bottom": base.height-logo.height-margin}[vertical]
    if panel:
        from PIL import ImageDraw
        pad = max(10, margin // 2)
        ImageDraw.Draw(base).rounded_rectangle(
            (x-pad, y-pad, x+logo.width+pad, y+logo.height+pad),
            radius=pad, fill=(255, 255, 255, 230)
        )
    base.alpha_composite(logo, (x, y))
    dest = Path(output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.suffix.lower() in (".jpg", ".jpeg"):
        base.convert("RGB").save(dest, quality=95, subsampling=0)
    elif dest.suffix.lower() == ".png":
        base.save(dest)
    else:
        raise ValueError("Output must be JPG or PNG")
    return dest

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("image")
    p.add_argument("output")
    p.add_argument("--logo", required=True)
    p.add_argument("--position", choices=POSITIONS, default="top-center")
    p.add_argument("--width-fraction", type=float, default=0.38)
    p.add_argument("--panel", action="store_true")
    a = p.parse_args()
    if not (0.05 <= a.width_fraction <= 0.8):
        p.error("--width-fraction must be between 0.05 and 0.8")
    print(apply_stamp(a.image, a.output, a.logo, a.position, a.width_fraction, panel=a.panel))
