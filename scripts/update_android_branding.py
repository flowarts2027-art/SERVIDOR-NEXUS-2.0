from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/nexus-mark-metal-blue.png"
source = Image.open(SOURCE).convert("RGBA")

# Use only the supplied metallic blue Nexus mark; no wordmark is included.
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

    # Adaptive-icon foreground: the supplied symbol only.
    source.resize((432, 432), Image.Resampling.LANCZOS).save(
        base / "drawable-nodpi/ic_launcher_foreground.png", "PNG", optimize=True
    )

    # Splash screen: the same supplied symbol over the existing dark background.
    splash = Image.new("RGBA", (288, 288), (15, 39, 71, 255))
    mark = source.resize((224, 224), Image.Resampling.LANCZOS)
    splash.alpha_composite(mark, ((288 - 224) // 2, (288 - 224) // 2))
    splash.convert("RGB").save(base / "drawable-nodpi/splash.png", "PNG", optimize=True)

print("Updated Android branding for cliente and master from", SOURCE)
