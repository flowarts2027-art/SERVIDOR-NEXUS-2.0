#!/usr/bin/env python3
"""Produce transparent NEXUS green assets and Master Android icons from the official N source."""
from __future__ import annotations

import colorsys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/nexus-mark-metal-blue.png"
WEB_ASSETS = ROOT / "public/assets"
MASTER_ANDROID = ROOT / "android/app/src/master/res"

def recolor(original):
    original = original.convert("RGBA")
    out = Image.new("RGBA", original.size)
    pixels = []
    for r, g, b, a in original.getdata():
        if not a:
            pixels.append((0, 0, 0, 0))
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        # Recolor cyan/blue luminous sections, preserving the chrome/silver.
        if 0.44 <= h <= 0.73 and s >= 0.19:
            h2 = min(0.34, max(0.275, 0.305 + (h - 0.51) * 0.085))
            s2 = min(1, s * 1.18)
            nr, ng, nb = colorsys.hsv_to_rgb(h2, s2, v)
            r, g, b = round(nr * 255), round(ng * 255), round(nb * 255)
        pixels.append((r, g, b, a))
    out.putdata(pixels)
    return out

def launcher(logo, size, bg):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bg[3] > 0:
        ImageDraw.Draw(canvas).rounded_rectangle(
            (0, 0, size - 1, size - 1),
            radius=max(6, size // 5), fill=bg
        )
    side = round(size * 0.88)
    icon = logo.resize((side, side), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, ((size - side) // 2, (size - side) // 2))
    return canvas

def main():
    if not SOURCE.is_file():
        raise SystemExit(f"Required NEXUS metallic N not found: {SOURCE}")
    logo = recolor(Image.open(SOURCE))
    WEB_ASSETS.mkdir(parents=True, exist_ok=True)
    logo.save(WEB_ASSETS / "nexus-mark-green.png", optimize=True)
    for px in (180, 192, 512):
        launcher(logo, px, (10, 76, 48, 255)).save(
            WEB_ASSETS / f"app-master-{px}.png", optimize=True)
    for directory, px in (
        ("mipmap-mdpi", 48), ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96), ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 192),
    ):
        path = MASTER_ANDROID / directory / "ic_launcher.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        launcher(logo, px, (10, 76, 48, 255)).save(path, optimize=True)
    drawable = MASTER_ANDROID / "drawable-nodpi"
    drawable.mkdir(parents=True, exist_ok=True)
    launcher(logo, 512, (0, 0, 0, 0)).save(
        drawable / "ic_launcher_foreground.png", optimize=True)
    splash = Image.new("RGBA", (800, 1200), (250, 255, 252, 255))
    center = logo.resize((620, 620), Image.Resampling.LANCZOS)
    splash.alpha_composite(center, (90, 290))
    splash.save(drawable / "splash.png", optimize=True)
    print("NEXUS_MASTER_GREEN_ASSETS_OK")

if __name__ == "__main__":
    main()
