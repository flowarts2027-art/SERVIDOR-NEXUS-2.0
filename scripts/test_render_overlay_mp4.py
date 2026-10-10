#!/usr/bin/env python3
"""Encode a real Nexus MP4 and assert each overlay's presence at the right time."""
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image
from render_overlay_layers import build_manifest


def command(*args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise AssertionError("Command failed: " + " ".join(map(str, args)) + "\n" + result.stderr[-4500:])
    return result.stdout


def bright_pixels(image_path, y0, y1):
    with Image.open(image_path) as original:
        image = original.convert("RGB")
        return sum(
            1 for y in range(y0, y1, 5)
            for x in range(120, 420, 5)
            if min(image.getpixel((x, y))) > 175
        )


with tempfile.TemporaryDirectory(prefix="nexus-mp4-qa-") as tmp:
    root = Path(tmp)
    composition = {"overlays": [
        {"type": "text", "text": "EARLY", "start": 0, "end": 0.8,
         "x": 50, "y": 30, "fontSize": 40, "color": "#ffffff"},
        {"type": "text", "text": "LATE", "start": 1, "end": 1.8,
         "x": 50, "y": 70, "fontSize": 40, "color": "#ffffff"},
    ]}
    manifest = build_manifest(composition, root / "layers", duration=2, trim_start=0, first_input=1)
    assert manifest["count"] == 2, manifest
    mp4 = root / "nexus-test.mp4"
    ffmpeg = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
              "-f", "lavfi", "-i", "color=c=0x112233:s=540x960:r=30:d=2"]
    for source in manifest["inputs"]:
        ffmpeg += ["-loop", "1", "-framerate", "30", "-i", source]
    ffmpeg += [
        "-filter_complex", "[0:v]format=rgba[renderbase];" + manifest["filter"],
        "-map", "[out]", "-t", "2", "-r", "30",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(mp4),
    ]
    command(*ffmpeg)
    assert mp4.is_file() and mp4.stat().st_size > 2000, "Encoded MP4 missing or empty"
    stream = json.loads(command(
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration", "-of", "json", str(mp4)
    ))["streams"][0]
    assert (stream["width"], stream["height"]) == (540, 960), stream
    assert 1.9 <= float(stream["duration"]) <= 2.1, stream

    frames = []
    for index, timestamp in enumerate((0.2, 1.3, 1.95)):
        frame = root / f"frame-{index}.png"
        command("ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-ss", str(timestamp), "-i", str(mp4), "-frames:v", "1", str(frame))
        frames.append(frame)

    early_top = bright_pixels(frames[0], 180, 400)
    early_bottom = bright_pixels(frames[0], 555, 790)
    late_top = bright_pixels(frames[1], 180, 400)
    late_bottom = bright_pixels(frames[1], 555, 790)
    ended_top = bright_pixels(frames[2], 180, 400)
    ended_bottom = bright_pixels(frames[2], 555, 790)
    assert early_top > 12 and early_bottom < 4, (early_top, early_bottom)
    assert late_top < 4 and late_bottom > 12, (late_top, late_bottom)
    assert ended_top < 4 and ended_bottom < 4, (ended_top, ended_bottom)
    print("PASS: actual H.264 MP4 540x960, 2s, timed overlays and clean ending")
