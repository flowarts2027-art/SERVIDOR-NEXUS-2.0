#!/usr/bin/env python3
"""Functional QA for automatic 60s scene-selection, audio, poster and real reviews."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from auto_cinematic_cut import process, probe, select_segments
from build_promo_card import review_items, draw_phone_scene, main as promo_main, verified_rating_stars, draw_reviews_scene
from PIL import Image


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


class VideoCinematicTests(unittest.TestCase):
    def test_scene_plan_retains_opening_and_ending_and_exact_budget(self):
        scenes = [(i, i + 4) for i in range(0, 88, 4)]
        scores = [0.2 + 0.07 * (i % 5) for i in range(len(scenes))]
        pieces = select_segments(88.0, scenes, scores)
        self.assertEqual(pieces[0], (0.0, 4.0))
        self.assertEqual(pieces[-1], (82.0, 88.0))
        self.assertGreater(len(pieces), 4)
        self.assertAlmostEqual(sum(b-a for a,b in pieces), 60, delta=.05)
        self.assertTrue(all(pieces[i][1] <= pieces[i+1][0] for i in range(len(pieces)-1)))

    def test_compilation_excludes_branded_outro_without_shortening(self):
        scenes = [(i, i + 4) for i in range(0, 120, 4)]
        scores = [0.7] * 40
        pieces = select_segments(120, scenes, scores, skip_last_seconds=20)
        self.assertAlmostEqual(sum(b-a for a,b in pieces), 60, delta=0.1)
        self.assertEqual(pieces[-1], (94.0, 100.0))
        self.assertLessEqual(max(b for _,b in pieces), 100)
        normal = select_segments(120, scenes, scores)
        self.assertEqual(normal[-1], (114.0, 120.0))

    def test_reviews_do_not_invent_nexus_or_fake_quotes(self):
        self.assertEqual(review_items({}), [])
        self.assertEqual(review_items({"rating": "7.5", "runtime": "120 min"}),
                         [("Avaliação", "7.5"), ("Duração", "120 min")])
        self.assertEqual(review_items({"reviews": [{"author": "Crítico real", "text": "Boa produção."}]}),
                         [("Crítico real", "Boa produção.")])

    def test_gold_stars_match_only_verified_numeric_catalogue_scores(self):
        self.assertEqual(verified_rating_stars("8.5/10"), 4)
        self.assertEqual(verified_rating_stars("5/5"), 5)
        self.assertEqual(verified_rating_stars("Sem nota disponível"), 0)
        self.assertEqual(verified_rating_stars("5 estrelas incríveis"), 0)
        with tempfile.TemporaryDirectory(prefix="nexus-gold-") as td:
            out = Path(td)
            draw_reviews_scene(out, None, {"rating":"8.5/10"}, "")
            with Image.open(out/"scene-reviews.png") as card:
                image = card.convert("RGB")
                # Black review banner, no previous pale-paper design.
                r,g,b = image.getpixel((90, 1060))
                self.assertLess(max(r,g,b), 70)
                yellows = 0
                for yy in range(970, 1020):
                    for xx in range(170, 460):
                        rr, gg, bb = image.getpixel((xx, yy))
                        if rr > 210 and 140 < gg < 245 and bb < 100:
                            yellows += 1
                self.assertGreater(yellows, 12, "Verified rating must show gold stars")

    def test_real_mp4_scene_cut_preserves_audio_and_source_bookends(self):
        import cv2
        import numpy as np
        with tempfile.TemporaryDirectory(prefix="nexus-cut-") as td:
            td=Path(td); source=td/"source.mp4"; output=td/"final.mp4"; manifest=td/"plan.json"
            run("ffmpeg","-hide_banner","-loglevel","error","-y",
                "-f","lavfi","-i","testsrc2=size=160x90:rate=12:duration=68",
                "-f","lavfi","-i","sine=frequency=600:sample_rate=48000:duration=68",
                "-shortest","-c:v","libx264","-preset","ultrafast","-crf","22",
                "-c:a","aac","-b:a","128k",str(source))
            process(source,output,manifest)
            plan=json.loads(manifest.read_text())
            self.assertEqual(plan["mode"],"cinematic")
            self.assertEqual(plan["segments"][0]["start"],0)
            self.assertEqual(plan["segments"][-1]["end"],68)
            seconds,audio=probe(output)
            self.assertAlmostEqual(seconds,60,delta=0.38)
            self.assertTrue(audio)
            def get_frame(path,sec):
                capture=cv2.VideoCapture(str(path))
                capture.set(cv2.CAP_PROP_POS_MSEC,sec*1000)
                ok,frame=capture.read()
                capture.release()
                self.assertTrue(ok)
                return frame.astype(np.float32)
            for src_t,dst_t in [(1,1),(67,59)]:
                self.assertLess(float(np.mean(np.abs(get_frame(source,src_t)-get_frame(output,dst_t)))),28)
            run("ffmpeg","-hide_banner","-loglevel","error","-i",str(output),
                "-map","0:v:0","-map","0:a:0","-f","null","-")

    def test_short_trailer_keeps_original_duration_and_sound(self):
        with tempfile.TemporaryDirectory(prefix="nexus-short-") as td:
            td=Path(td); src=td/"a.mp4"; out=td/"b.mp4"; plan=td/"c.json"
            run("ffmpeg","-hide_banner","-loglevel","error","-y",
                "-f","lavfi","-i","color=c=blue:s=160x90:r=12:d=3",
                "-f","lavfi","-i","sine=frequency=700:duration=3",
                "-c:v","libx264","-c:a","aac","-shortest",str(src))
            process(src,out,plan)
            self.assertEqual(json.loads(plan.read_text())["mode"],"original")
            self.assertAlmostEqual(probe(out)[0],3,delta=.1)
            self.assertTrue(probe(out)[1])

    def test_phone_poster_is_required_and_real_banner_is_drawn(self):
        with tempfile.TemporaryDirectory(prefix="nexus-poster-") as td:
            path=Path(td)
            with self.assertRaisesRegex(ValueError,"video_official_poster_required"):
                old=os.environ.get("TITLE")
                original=os.environ.get("MOVIE_METADATA")
                try:
                    os.environ["TITLE"]="Filme sem poster"
                    os.environ["MOVIE_METADATA"]="{}"
                    import sys
                    old_argv=sys.argv
                    sys.argv=["build_promo_card.py","--output-dir",str(path/"blank")]
                    try: promo_main()
                    finally: sys.argv=old_argv
                finally:
                    if old is None: os.environ.pop("TITLE",None)
                    else: os.environ["TITLE"]=old
                    if original is None: os.environ.pop("MOVIE_METADATA",None)
                    else: os.environ["MOVIE_METADATA"]=original
            poster=Image.new("RGB",(320,480),(30,150,220))
            out=path/"approved"
            out.mkdir()
            draw_phone_scene(out,None,poster,"Lanternas","Sinopse","2026","SÉRIE")
            with Image.open(out/"scene-phone-under.png") as panel:
                color=panel.convert("RGB").getpixel((420,1000))
                self.assertGreater(sum(color),100)  # official art is not a black screen


if __name__=="__main__":
    unittest.main()
