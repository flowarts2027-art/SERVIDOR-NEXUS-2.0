from pathlib import Path
from PIL import Image
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/nexus-mark-blue.svg"
rendered = ROOT / ".tmp-nexus-mark.png"
cairosvg.svg2png(url=str(SOURCE), write_to=str(rendered), output_width=432, output_height=432)
source = Image.open(rendered).convert("RGBA")
rendered.unlink()

# Use only the official blue N mark; the wordmark is intentionally excluded
# so Android launchers do not crop or display text below the icon.
icon_sizes = {
    "mipmap-mdpi/ic_launcher.png": 48,
    "mipmap-hdpi/ic_launcher.png": 72,
    "mipmap-xhdpi/ic_launcher.png": 96,
    "mipmap-xxhdpi/ic_launcher.png": 144,
    "mipmap-xxxhdpi/ic_launcher.png": 192,
}

for flavor in ("cliente", "master"):
    base = ROOT / "android/app/src" / flavor / "res"
    for relative, size in icon_sizes.items():
        out = base / relative
        out.parent.mkdir(parents=True, exist_ok=True)
        source.resize((size, size), Image.Resampling.LANCZOS).save(out, "PNG", optimize=True)

    # Adaptive-icon foreground: symbol only, with no wordmark.
    source.save(base / "drawable-nodpi/ic_launcher_foreground.png", "PNG", optimize=True)

    # Splash screen: use the same symbol for a consistent app identity.
    splash = Image.new("RGBA", (288, 288), (15, 39, 71, 255))
    mark = source.resize((192, 192), Image.Resampling.LANCZOS)
    splash.alpha_composite(mark, ((288 - 192) // 2, (288 - 192) // 2))
    splash.convert("RGB").save(base / "drawable-nodpi/splash.png", "PNG", optimize=True)

print("Updated Android branding for cliente and master from", SOURCE)
