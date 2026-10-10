#!/usr/bin/env python3
"""Build a truthful, non-empty portrait cover from the selected trailer itself.

Used only when a verified catalog poster is unavailable. The source MP4 is
already confirmed for this client's job; no stock art, search-image mixing,
AI invented poster or third-party images are used.
"""
import argparse
import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

SIZE = (720, 1080)


def duration_seconds(source):
    raw = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(source)],
        text=True, timeout=20
    ).strip()
    value = float(raw)
    if not math.isfinite(value) or value <= 0:
        raise ValueError("invalid_trailer_duration")
    return value


def extract_frame(source, at, destination):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
           "-ss", f"{at:.3f}", "-i", str(source),
           "-frames:v", "1", "-vf", "scale=640:-2",
           "-an", "-update", "1", str(destination)]
    done = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                          timeout=45, check=False)
    return done.returncode == 0 and destination.is_file() and destination.stat().st_size > 100


def rate_frame(img):
    gray = ImageOps.grayscale(img).resize((160, 90), Image.Resampling.LANCZOS)
    stats = ImageStat.Stat(gray)
    brightness = stats.mean[0]
    contrast = stats.stddev[0]
    edges = ImageStat.Stat(gray.filter(ImageFilter.FIND_EDGES)).mean[0]
    # Trailers often start/end with dark fades or logos. Avoid those frames.
    if brightness < 14 or contrast < 9:
        return -100.0
    return brightness * .12 + contrast * .45 + edges * .30


def build(source, output):
    source, output = Path(source), Path(output)
    if not source.is_file() or not source.stat().st_size:
        raise ValueError("missing_trailer_for_poster")
    duration = duration_seconds(source)
    frames = []
    with tempfile.TemporaryDirectory(prefix="nexus-trailer-poster-") as folder:
        for i, fraction in enumerate((0.16, 0.32, 0.52, 0.68)):
            candidate = Path(folder) / f"frame-{i}.png"
            at = min(max(.05, duration * fraction), max(.05, duration - .08))
            if not extract_frame(source, at, candidate):
                continue
            try:
                with Image.open(candidate) as opened:
                    frame = opened.convert("RGB")
                score = rate_frame(frame)
                frames.append((score, frame))
            except (OSError, ValueError):
                continue
        if not frames:
            raise ValueError("trailer_poster_frame_unavailable")

        score, frame = max(frames, key=lambda item: item[0])
        # Black video or unusably dark frames should not masquerade as a poster.
        if score < -50:
            raise ValueError("trailer_poster_frame_unusable")

        background = ImageOps.fit(frame, SIZE, method=Image.Resampling.LANCZOS)
        background = background.filter(ImageFilter.GaussianBlur(25)).convert("RGBA")
        background = Image.alpha_composite(
            background, Image.new("RGBA", SIZE, (2, 9, 17, 175))
        )

        hero = frame.copy()
        hero.thumbnail((680, 835), Image.Resampling.LANCZOS)
        frame_w, frame_h = hero.size
        at_x, at_y = (SIZE[0] - frame_w) // 2, (SIZE[1] - frame_h) // 2 - 25

        shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle((at_x-12,at_y-12,at_x+frame_w+12,at_y+frame_h+12),
                             radius=20, fill=(0,0,0,140))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        background = Image.alpha_composite(background, shadow)

        background.alpha_composite(hero.convert("RGBA"), (at_x, at_y))
        draw = ImageDraw.Draw(background)
        draw.rounded_rectangle((at_x-2,at_y-2,at_x+frame_w+2,at_y+frame_h+2),
                               radius=8, outline=(190, 219, 238, 180), width=3)
        # Clearly distinguish this cover from a verified official film poster.
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 23)
        except OSError:
            font = ImageFont.load_default()
        label = "CAPA DO TRAILER"
        box = draw.textbbox((0,0),label,font=font)
        text_w, text_h = box[2]-box[0], box[3]-box[1]
        draw.rounded_rectangle((25, 25, 25+text_w+36, 25+text_h+29),
                               radius=14, fill=(3, 16, 25, 228),
                               outline=(84, 186, 229, 230), width=2)
        draw.text((43, 38), label, fill=(232, 246, 255, 255), font=font)

        output.parent.mkdir(parents=True, exist_ok=True)
        background.convert("RGB").save(output, "JPEG", quality=92, subsampling=0)
        with Image.open(output) as check:
            check.verify()
        print(f"trailer_frame_poster_ready: {output} ({SIZE[0]}x{SIZE[1]})")
        return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    build(args.source, args.output)
