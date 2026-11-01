"""Teste isolado do planejamento Atlas / GILTEC. Execute: python -m unittest discover -s tests -p 'test_atlas_giltec.py'"""
import datetime
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/social/campanha_diaria.py"
DATA = ROOT / "scripts/social/campanha/conteudo.json"


class AtlasGiltecTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("campanha_diaria", SCRIPT)
        cls.mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.mod)
        cls.content = json.loads(DATA.read_text(encoding="utf-8"))

    def test_seven_days_six_unique_equipment_and_no_carousel(self):
        cfg = self.content["giltec"]
        self.assertEqual(len(cfg["ciclo"]), 7)
        self.assertEqual(len(set(sum(cfg["ciclo"], []))), 42)
        for index in range(7):
            date = (datetime.date(2026, 11, 2) + datetime.timedelta(days=index)).isoformat()
            pieces = self.mod.plano("giltec", date, self.content)
            self.assertEqual(len(pieces), 6)
            self.assertEqual(sum(p["tipo"] == "post" for p in pieces), 3)
            self.assertEqual(sum(p["tipo"] == "story" for p in pieces), 3)
            self.assertTrue(all(len(p["cartoes"]) == 1 for p in pieces))
            self.assertEqual(len({p["cartoes"][0]["nome"] for p in pieces}), 6)

    def test_correct_story_and_post_dimensions(self):
        from PIL import Image
        original = Image.new("RGB", (1080, 1920))
        self.assertEqual(self.mod.cobrir(original, 1080, 1920).size, (1080, 1920))
        self.assertEqual(self.mod.cobrir(original, 1080, 1350).size, (1080, 1350))


if __name__ == "__main__":
    unittest.main()
