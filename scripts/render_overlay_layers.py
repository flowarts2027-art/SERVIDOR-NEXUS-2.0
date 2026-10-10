#!/usr/bin/env python3
"""Turn vetted Nexus text/emoji overlay composition into FFmpeg inputs and filters.

Reads COMPOSITION_JSON; emits only a JSON manifest, never shell instructions.
Only text/emoji are supported. User-supplied media URLs are never downloaded.
"""
import argparse
import json
import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_FAMILIES = {
    (False, False): ["DejaVuSans.ttf", "LiberationSans-Regular.ttf"],
    (True, False): ["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"],
    (False, True): ["DejaVuSans-Oblique.ttf", "LiberationSans-Italic.ttf"],
    (True, True): ["DejaVuSans-BoldOblique.ttf", "LiberationSans-BoldItalic.ttf"],
}
FONT_DIRS = [
    Path("/usr/share/fonts/truetype/dejavu"),
    Path("/usr/share/fonts/truetype/liberation2"),
]


def bounded(value, minimum, maximum, default):
    try:
        number = float(value)
        return max(minimum, min(maximum, number)) if math.isfinite(number) else default
    except (ValueError, TypeError):
        return default


def format_number(value):
    return f"{value:.4f}".rstrip("0").rstrip(".") or "0"


def prepare_image(layer, target):
    text = str(layer.get("text", "")).strip()[:280]
    if not text:
        raise ValueError("overlay_text_required")
    size = round(bounded(layer.get("fontSize"), 8, 90, 26)
                 * bounded(layer.get("scale"), 0.2, 3, 1) * 3)
    size = max(12, min(240, size))
    variants = FONT_FAMILIES[(layer.get("bold") is True, layer.get("italic") is True)]
    candidates = [directory / filename for filename in variants for directory in FONT_DIRS]
    candidates += [FONT_DIRS[0] / "DejaVuSans.ttf"]
    font_path = next((p for p in candidates if p.exists()), None)
    if not font_path:
        raise RuntimeError("overlay_font_missing")
    font = ImageFont.truetype(str(font_path), size)
    scratch = Image.new("RGBA", (1, 1))
    pen = ImageDraw.Draw(scratch)
    # Bound long text and preserve line breaks. The browser also wraps long text.
    max_width = 900
    lines = []
    for paragraph in text.splitlines() or [""]:
        line = ""
        for word in paragraph.split():
            proposed = (line + " " + word).strip()
            if line and pen.textlength(proposed, font=font) > max_width:
                lines.append(line)
                line = word
            else:
                line = proposed
        lines.append(line)
    lines = lines[:6]
    text = "\n".join(lines)
    bbox = pen.multiline_textbbox((0, 0), text, font=font, spacing=8, align="center", stroke_width=2)
    width = int(math.ceil(min(1050, max(48, bbox[2] - bbox[0] + 36))))
    height = int(math.ceil(min(1100, max(48, bbox[3] - bbox[1] + 36))))
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pen = ImageDraw.Draw(image)
    color = str(layer.get("color") or "#ffffff")
    if len(color) != 7 or color[0] != "#" or any(c not in "0123456789abcdefABCDEF" for c in color[1:]):
        color = "#ffffff"
    text_x = (width - (bbox[2] - bbox[0])) / 2 - bbox[0]
    text_y = (height - (bbox[3] - bbox[1])) / 2 - bbox[1]
    pen.multiline_text((text_x, text_y),
                       text, font=font, fill=color, spacing=8, align="center",
                       stroke_width=2, stroke_fill="#0b1528")
    if layer.get("underline"):
        pen.line((14, height - 11, width - 14, height - 11), fill=color, width=3)
    if layer.get("effect") == "glow":
        glow = image.filter(ImageFilter.GaussianBlur(radius=8))
        image = Image.alpha_composite(glow, image)
    rotation = bounded(layer.get("rotation"), -180, 180, 0)
    if rotation:
        image = image.rotate(-rotation, Image.Resampling.BICUBIC, expand=True)
    opacity = bounded(layer.get("opacity"), 0, 1, 1)
    if opacity < 1:
        image.putalpha(image.getchannel("A").point(lambda pixel: round(pixel * opacity)))
    image.save(target)


def build_manifest(comp, directory, duration, trim_start, first_input=10):
    layers = comp.get("overlays", [])
    if not isinstance(layers, list):
        layers = []
    directory.mkdir(parents=True, exist_ok=True)
    filters = []
    inputs = []
    previous = "renderbase"
    allowed = {"none", "blink", "fade", "pulse", "bounce", "slide", "spin", "float", "zoom", "glow"}
    for layer in layers[:16]:
        if not isinstance(layer, dict) or layer.get("type") not in ("text", "emoji"):
            continue
        text = str(layer.get("text", "")).strip()
        if not text:
            continue
        start = bounded(layer.get("start"), 0, 86400, 0) - trim_start
        end = bounded(layer.get("end"), 0, 86400, 0) - trim_start
        if end <= 0 or start >= duration or end <= start:
            continue
        start = max(0.0, start)
        end = min(duration, end)
        index = len(inputs)
        image_path = directory / f"layer-{index:02}.png"
        prepare_image(layer, image_path)
        inputs.append(str(image_path))
        effect = str(layer.get("effect") or "none")
        if effect not in allowed:
            effect = "none"
        in_idx = first_input + index
        prep = f"[{in_idx}:v]format=rgba"
        if effect == "fade":
            prep += f",fade=t=in:st={format_number(start)}:d=0.45:alpha=1"
        elif effect == "spin":
            prep += ",rotate=a='2*PI*t/3':ow='hypot(iw,ih)':oh='hypot(iw,ih)':c=none"
        elif effect in ("pulse", "zoom"):
            power = "0.05" if effect == "pulse" else "0.09"
            prep += (f",scale=w='iw*(1+{power}*sin(n/14))':"
                     f"h='ih*(1+{power}*sin(n/14))':eval=frame")
        prep += f"[ov{index}]"
        filters.append(prep)
        x = format_number(bounded(layer.get("x"), 0, 100, 50) / 100)
        y = format_number(bounded(layer.get("y"), 0, 100, 50) / 100)
        x_expr = f"W*{x}-w/2"
        y_expr = f"H*{y}-h/2"
        if effect == "slide":
            x_expr += "+20*sin(t*3)"
        elif effect == "float":
            y_expr += "-16*sin(t*2)"
        elif effect == "bounce":
            y_expr += "-22*abs(sin(t*3))"
        enabled = f"between(t,{format_number(start)},{format_number(end)})"
        if effect == "blink":
            enabled += "*gte(sin(t*6),-0.3)"
        next_stage = f"composed{index}"
        filters.append(
            f"[{previous}][ov{index}]overlay=x='{x_expr}':y='{y_expr}':"
            f"enable='{enabled}'[{next_stage}]"
        )
        previous = next_stage
    filters.append(f"[{previous}]setsar=1,format=yuv420p[out]")
    return {"inputs": inputs, "filter": ";".join(filters), "count": len(inputs)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--trim-start", type=float, default=0)
    args = parser.parse_args()
    comp = json.loads(os.getenv("COMPOSITION_JSON") or "{}")
    if not isinstance(comp, dict):
        raise ValueError("composition_must_be_object")
    manifest = build_manifest(comp, Path(args.output_dir), max(0, args.duration), max(0, args.trim_start))
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
