#!/usr/bin/env python3
"""CI integration test for the same FFmpeg overlay graph used by Nexus videos."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from PIL import Image
from render_overlay_layers import build_manifest

with tempfile.TemporaryDirectory(prefix="nexus-overlay-") as tmp:
    base = Path(tmp)
    comp = {
        "overlays": [
            {"id": "test", "type": "text", "text": "TESTE NEXUS", "x": 50, "y": 50,
             "start": 0, "end": 2, "fontSize": 48, "scale": 1, "effect": "none", "color": "#ffffff"},
            {"id": "late", "type": "emoji", "text": "!", "x": 80, "y": 20,
             "start": 1, "end": 2, "fontSize": 30, "effect": "float"}
        ]
    }
    manifest = build_manifest(comp, base / "layers", duration=2, trim_start=0, first_input=1)
    assert manifest["count"] == 2, manifest
    assert len(manifest["inputs"]) == 2
    assert "[renderbase]" in manifest["filter"]
    assert "enable='between(t,1,2)'" in manifest["filter"]
    # Trimming maps source time to the output timeline.
    trimmed = build_manifest(comp, base / "trimmed", duration=1, trim_start=1)
    assert trimmed["count"] == 2
    assert "between(t,0,1)" in trimmed["filter"]
    # No overlays keeps existing clip output path safe.
    empty = build_manifest({}, base / "empty", duration=2, trim_start=0)
    assert empty["count"] == 0
    assert empty["filter"] == "[renderbase]setsar=1,format=yuv420p[out]"

    output = base / "smoke.png"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
           "-f", "lavfi", "-i", "color=c=0x112233:s=540x960:r=30:d=2"]
    for file_path in manifest["inputs"]:
        cmd += ["-loop", "1", "-framerate", "30", "-i", file_path]
    cmd += ["-filter_complex", "[0:v]format=rgba[renderbase];" + manifest["filter"],
            "-map", "[out]", "-frames:v", "1", str(output)]
    result = subprocess.run(cmd, capture_output=True, timeout=120, text=True)
    if result.returncode:
        raise RuntimeError("FFmpeg overlay smoke failed: " + result.stderr[-4000:])
    with Image.open(output) as result:
        assert result.size == (540, 960), result.size
        pixels = result.convert("RGB")
        # The central white label must change pixels against the solid source.
        colored = sum(1 for y in range(375, 580, 8) for x in range(100, 450, 8)
                      if min(pixels.getpixel((x, y))) > 160)
        assert colored > 8, "Overlay did not appear in the encoded video frame"
    print("PASS: overlay asset, timeline, empty composition and FFmpeg composite frame")
