from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/nexus-logo-azul-oficial.webp"
source = Image.open(SOURCE).convert("RGBA")

# The source is already a square transparent logo. Resize with high-quality
# filtering for each Android density, preserving the complete artwork.
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

    # Adaptive-icon foreground: keep transparency and use the full official mark.
    foreground = source.resize((432, 432), Image.Resampling.LANCZOS)
    foreground.save(base / "drawable-nodpi/ic_launcher_foreground.png", "PNG", optimize=True)

    # Splash screen: preserve the existing dark Nexus background and center the
    # official logo without cropping or changing its proportions.
    splash = Image.new("RGBA", (288, 288), (15, 39, 71, 255))
    mark = source.resize((192, 192), Image.Resampling.LANCZOS)
    splash.alpha_composite(mark, ((288 - 192) // 2, (288 - 192) // 2))
    splash.convert("RGB").save(base / "drawable-nodpi/splash.png", "PNG", optimize=True)

print("Updated Android branding for cliente and master from", SOURCE)
