"""Teste isolado do planejamento Atlas / GILTEC. Execute: python -m unittest discover -s tests -p 'test_atlas_giltec.py'"""
import datetime
import importlib.util
import json
import pathlib
import sys
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/social/campanha_diaria.py"
DATA = ROOT / "scripts/social/campanha/conteudo.json"
sys.path.insert(0, str(SCRIPT.parent))
from carimbador import carimbar_logo, verificar_logo


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

    def test_no_forbidden_equipment_in_giltec_campaign(self):
        cfg = self.content["giltec"]
        self.assertNotIn("carrinho", cfg["equipamentos"])
        self.assertNotIn("carrinho", sum(cfg["ciclo"], []))
        for key in sum(cfg["ciclo"], []):
            nome = cfg["equipamentos"][key]["nome"].lower()
            self.assertNotIn("carrinho de mão", nome)
            self.assertNotIn("plataforma elevatória", nome)
        self.assertEqual(cfg["equipamentos"]["soprador"]["nome"], "Soprador de folhas a gasolina (mochila)")

    def test_carimbador_applies_verifiable_original_logo(self):
        from PIL import Image
        for brand in ("giltec", "flow", "daniela"):
            self.assertTrue(verificar_logo(brand).is_file())
            img = Image.new("RGBA", (1080, 1350), (0, 0, 0, 255))
            size = carimbar_logo(img, brand, 64, 48, 104)
            self.assertGreater(size[0], 30)
            self.assertLessEqual(size[0] + 64, 1080)
            self.assertLessEqual(size[1] + 48, 1350)

    def test_carimbador_refuses_unknown_brand(self):
        from PIL import Image
        with self.assertRaisesRegex(RuntimeError, "não cadastrado"):
            carimbar_logo(Image.new("RGBA", (1080, 1350)), "fake", 64, 48, 104)

    def test_correct_story_and_post_dimensions(self):
        from PIL import Image
        original = Image.new("RGB", (1080, 1920))
        self.assertEqual(self.mod.cobrir(original, 1080, 1920).size, (1080, 1920))
        self.assertEqual(self.mod.cobrir(original, 1080, 1350).size, (1080, 1350))

    def test_missing_credentials_must_not_produce_fake_photo(self):
        with patch.dict("os.environ", {"NEXUS_BASE": "", "NEXUS_MASTER_TOKEN": "", "FOTO_FALSA": "0"}):
            with self.assertRaisesRegex(RuntimeError, "foto real indisponível"):
                self.mod.pedir_foto("construction equipment", "4:5", 17)

    def test_fake_photo_only_with_explicit_test_flag(self):
        with patch.dict("os.environ", {"NEXUS_BASE": "", "NEXUS_MASTER_TOKEN": "", "FOTO_FALSA": "1"}):
            image = self.mod.pedir_foto("construction equipment", "4:5", 17)
            self.assertEqual(image.size, (1024, 1280))


if __name__ == "__main__":
    unittest.main()
