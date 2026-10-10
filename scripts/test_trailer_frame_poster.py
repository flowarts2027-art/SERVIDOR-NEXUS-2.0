#!/usr/bin/env python3
"""Regression: trailer fallback cover never requires unrelated film artwork."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageStat
from trailer_frame_poster import build


ROOT = Path(__file__).resolve().parents[1]


def ffmpeg(*args):
    return subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
                          check=True, capture_output=True)


class TrailerPosterFallbackTests(unittest.TestCase):
    def test_creates_portrait_banner_from_selected_source_and_phone_shows_it(self):
        with tempfile.TemporaryDirectory(prefix="nexus-poster-frame-") as td:
            td = Path(td)
            source, cover = td / "original.mp4", td / "cover.jpg"
            ffmpeg("-f", "lavfi", "-i", "testsrc2=s=320x180:r=12:d=6",
                   "-c:v", "libx264", "-preset", "ultrafast", str(source))
            build(source, cover)
            self.assertTrue(cover.exists())
            with Image.open(cover) as image:
                self.assertEqual(image.size, (720, 1080))
                self.assertGreater(ImageStat.Stat(image.convert("L")).stddev[0], 8)
                self.assertGreater(ImageStat.Stat(image.convert("L")).mean[0], 8)
            output = td / "promo"
            env = {**os.environ, "TITLE": "Homem-Aranha", "OVERVIEW": "Trailer selecionado.",
                   "MEDIA_TYPE": "FILME", "RELEASE_YEAR": "2026", "MOVIE_METADATA": "{}"}
            subprocess.run(
                ["/usr/bin/python3", str(ROOT / "scripts/build_promo_card.py"),
                 "--output-dir", str(output), "--poster", str(cover)],
                env=env, check=True, capture_output=True, text=True
            )
            with Image.open(output / "scene-phone-under.png") as phone:
                self.assertEqual(phone.size, (1080, 1920))
                # A phone frame and artwork, not a black screen.
                crop = phone.crop((310, 920, 725, 1300)).convert("RGB")
                self.assertGreater(ImageStat.Stat(crop.convert("L")).stddev[0], 5)
            for name in ("scene-phone-front.png", "scene-reviews.png", "scene-cta.png"):
                self.assertTrue((output / name).is_file(), name)

    def test_rejects_missing_and_all_black_sources(self):
        with tempfile.TemporaryDirectory(prefix="nexus-no-frame-") as td:
            td = Path(td)
            with self.assertRaisesRegex(ValueError, "missing_trailer_for_poster"):
                build(td / "missing.mp4", td / "missing.jpg")
            source = td / "black.mp4"
            ffmpeg("-f", "lavfi", "-i", "color=c=black:s=320x180:r=12:d=3",
                   "-c:v", "libx264", "-preset", "ultrafast", str(source))
            with self.assertRaisesRegex(ValueError, "trailer_poster_frame_unusable"):
                build(source, td / "black.jpg")


if __name__ == "__main__":
    unittest.main()
