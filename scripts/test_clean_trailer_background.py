#!/usr/bin/env python3
"""FFmpeg regression: only ONE crisp centered strip in fullscreen trailer.

The Spider-Man render displayed two crisp copies (top and middle); the approved
Lanterns reference uses one continuous enlarged blurred background around one
centered sharp cinematic strip. Exercise the actual production workflow graph.
"""
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/video-template-render.yml"
BG_FILTER = (
    "scale=720:1280:force_original_aspect_ratio=increase,"
    "crop=720:1280,boxblur=10:1,eq=brightness=-0.14:saturation=0.78"
)


def run_ffmpeg(filter_graph, output, output_label=None):
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=12:duration=2.0",
    ]
    if output_label:
        cmd += ["-filter_complex", filter_graph, "-map", output_label]
    else:
        cmd += ["-vf", filter_graph]
    cmd += ["-ss", "0.8", "-frames:v", "1", str(output)]
    subprocess.run(cmd, check=True, capture_output=True, timeout=45)


def workflow_fullscreen_graph():
    yaml = WORKFLOW.read_text()
    found = re.search(r'^\s*FILTER="([^\n]*)"$', yaml, re.MULTILINE)
    if not found:
        raise AssertionError("Cannot locate workflow video filter")
    graph = found.group(1).split(";[1:v]scale=")[0]
    vars = {
        "$"+"{OUT_W}": "720",
        "$"+"{OUT_H}": "1280",
        "$"+"{HERO_H}": "413",
        "$"+"{BLUR}": "10:1",
        "$"+"{CLEAN_START}": "0.4",
        "$"+"{SCENE_LAST}": "1.5",
    }
    for key, value in vars.items():
        graph = graph.replace(key, value)
    if "$"+"{" in graph or not graph.endswith("[scene-base]"):
        raise AssertionError("Unexpected workflow filter structure")
    return graph


def diff_mean(a, b, rectangle):
    with Image.open(a) as left, Image.open(b) as right:
        a_crop = left.convert("RGB").crop(rectangle)
        b_crop = right.convert("RGB").crop(rectangle)
        return sum(ImageStat.Stat(ImageChops.difference(a_crop, b_crop)).mean) / 3


class CleanTrailerBackgroundTests(unittest.TestCase):
    def test_one_centered_hero_and_one_continuous_background(self):
        graph = workflow_fullscreen_graph()
        self.assertIn(
            "[bg][hero]overlay=(W-w)/2:47:enable='not(between(t,0.4,1.5))'[base]",
            graph
        )
        self.assertIn(
            "[base][fullhero]overlay=(W-w)/2:(H-h)/2:enable='between(t,0.4,1.5)'[scene-base]",
            graph
        )

        with tempfile.TemporaryDirectory(prefix="nexus-clean-bg-") as td:
            d = Path(td)
            composed = d / "fixed.png"
            bg_only = d / "blur.png"
            original_bug = d / "duplicated.png"
            run_ffmpeg(graph, composed, "[scene-base]")
            run_ffmpeg(BG_FILTER, bg_only)
            # Recreate the exact duplicate-top defect to guard against regression.
            buggy = graph.replace(
                ":enable='not(between(t,0.4,1.5))'[base]",
                "[base]"
            )
            run_ffmpeg(buggy, original_bug, "[scene-base]")

            with Image.open(composed) as image:
                self.assertEqual(image.size, (720, 1280))

            # TOP and BOTTOM are both only the same enlarged blurred canvas.
            top = (95, 95, 625, 315)
            bottom = (95, 965, 625, 1170)
            fixed_top = diff_mean(composed, bg_only, top)
            fixed_bottom = diff_mean(composed, bg_only, bottom)
            broken_top = diff_mean(original_bug, bg_only, top)
            self.assertLess(fixed_top, 3, f"Top must be blurred: {fixed_top:.2f}")
            self.assertLess(fixed_bottom, 3, f"Bottom must be blurred: {fixed_bottom:.2f}")
            self.assertGreater(
                broken_top, fixed_top + 7,
                "Test must catch the duplicated sharp image in the old template"
            )
            center = (95, 545, 625, 735)
            self.assertGreater(
                diff_mean(composed, bg_only, center), 9,
                "Center must be distinct and sharp"
            )


if __name__ == "__main__":
    unittest.main()
