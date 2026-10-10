#!/usr/bin/env python3
"""No-network regression test for batch Commons portrait fallback."""
import io
import json
import unittest
import importlib.util
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("promo", Path(__file__).with_name("build_promo_card.py"))
promo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(promo)

class FakeReply:
    def __enter__(self):
        return self
    def __exit__(self, *_):
        return None
    def read(self, limit=-1):
        return json.dumps({"query": {"pages": [
            {"title": "Tom Holland (actor)", "thumbnail": {"source":
             "https://upload.wikimedia.org/wikipedia/commons/a/aa/Tom.jpg"}},
            {"title": "Zendaya", "thumbnail": {"source":
             "https://upload.wikimedia.org/wikipedia/commons/b/bb/Zendaya.jpg"}},
            {"title": "Mark Ruffalo", "thumbnail": {"source":
             "https://bad.example.com/fake.jpg"}}
        ]}}).encode()

class TestPortraits(unittest.TestCase):
    def test_batch_returns_real_authorized_names_only(self):
        with patch.object(promo.urllib.request, "urlopen", return_value=FakeReply()) as mocked:
            pictures = promo.wikipedia_cast_photos([
                {"name":"Tom Holland"}, {"name":"Zendaya"}, {"name":"Mark Ruffalo"}
            ])
        self.assertEqual(set(pictures), {"Tom Holland", "Zendaya"})
        self.assertTrue(all(link.startswith("https://upload.wikimedia.org/wikipedia/commons/") or link.startswith("https://thumb.wikimedia.org/wikipedia/commons/") for link in pictures.values()))
        self.assertEqual(mocked.call_count, 1)
    def test_rejects_other_hosts(self):
        self.assertFalse(promo.verified_wikimedia_photo("https://upload.wikimedia.org.evil.invalid/wikipedia/commons/test.jpg"))
        self.assertFalse(promo.verified_wikimedia_photo("http://upload.wikimedia.org/wikipedia/commons/test.jpg"))
        self.assertFalse(promo.verified_wikimedia_photo("https://upload.wikimedia.org/wikipedia/en/nonfree.png"))

if __name__ == "__main__":
    unittest.main()
