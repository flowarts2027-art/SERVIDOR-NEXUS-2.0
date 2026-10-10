#!/usr/bin/env python3
"""Regression: promoted related titles may not borrow the main movie poster."""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("nexus_promo", ROOT / "scripts/build_promo_card.py")
promo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(promo)


class RelatedTitleArtworkTests(unittest.TestCase):
    def test_related_cards_deduplicate_titles_and_use_their_own_image(self):
        main = Image.new("RGBA", (360, 540), (220, 35, 35, 255))
        own = Image.new("RGBA", (360, 540), (35, 210, 70, 255))
        meta = {
            "title": "Homem-Aranha",
            "posterUrl": "https://example.test/main.jpg",
            "related": [
                {"title": "Homem Aranha", "image": "https://example.test/duplicate.jpg"},
                {"title": "Homem-Aranha 2", "image": "https://example.test/main.jpg"},
                {"title": "Filme inexistente", "image": ""},
                {"title": "Doutor Estranho", "image": "https://example.test/own.jpg"},
                {"title": "Doutor Estranho", "image": "https://example.test/duplicate-2.jpg"},
            ],
        }
        with tempfile.TemporaryDirectory() as folder:
            location = Path(folder)
            def image_fetch(url, *_):
                if url == "https://example.test/own.jpg":
                    return own
                return main
            with patch.object(promo, "fetch_image", side_effect=image_fetch) as mock_fetch:
                promo.draw_related_scene(location, None, meta, location, main)
            with Image.open(location / "scene-related.png") as rendered:
                # Artwork box is 90..430 x 918..1132 in the first card.
                pixel = rendered.convert("RGB").getpixel((260, 1025))
                self.assertGreater(pixel[1], pixel[0], "Related scene reused the main red poster")
                self.assertEqual(rendered.size, (1080, 1920))
            self.assertEqual(mock_fetch.call_count, 1)

    def test_no_verified_related_artwork_shows_no_fake_card(self):
        poster = Image.new("RGBA", (360, 540), (220, 35, 35, 255))
        meta = {
            "title": "Homem-Aranha",
            "posterUrl": "https://example.test/main.jpg",
            "related": [
                {"title": "Homem-Aranha", "image": "https://example.test/other.jpg"},
                {"title": "Outro título", "image": "https://example.test/main.jpg"},
            ],
        }
        with tempfile.TemporaryDirectory() as folder:
            location = Path(folder)
            with patch.object(promo, "fetch_image", side_effect=AssertionError("unverified fetch")):
                promo.draw_related_scene(location, None, meta, location, poster)
            with Image.open(location / "scene-related.png") as scene:
                self.assertEqual(scene.size, (1080, 1920))
                self.assertNotEqual(scene.getpixel((260, 1025)), poster.getpixel((100, 100)))


if __name__ == "__main__":
    unittest.main()
