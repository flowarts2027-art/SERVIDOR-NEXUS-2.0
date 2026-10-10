#!/usr/bin/env python3
"""NEXUS automatic trailer highlights: scene-aware 60-second montage with audio.

Only runs for automatic creation; the disabled editable UI is not used.
Analyze a low-resolution silent proxy. Cut source media precisely with ffmpeg
trim/atrim + concat, keeping original opening and closing footage in order.
Scene selection is a visual-motion heuristic, NOT semantic plot comprehension.
"""
import argparse
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

TARGET_SECONDS = 60.0
OPEN_SECONDS = 4.0
CLOSE_SECONDS = 6.0
MAX_HIGHLIGHT = 4.0
MAX_SOURCE_SECONDS = 900.0


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)


def probe(path):
    raw = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_type", "-of", "json", str(path)
    ], text=True)
    obj = json.loads(raw)
    duration = float(obj["format"]["duration"])
    if not math.isfinite(duration) or duration < 0.15 or duration > MAX_SOURCE_SECONDS:
        raise ValueError("invalid_source_duration")
    if not any(s["codec_type"] == "video" for s in obj["streams"]):
        raise ValueError("missing_video")
    audio = any(s["codec_type"] == "audio" for s in obj["streams"])
    return duration, audio


def scene_ranges(proxy, duration):
    from scenedetect import ContentDetector, detect
    detected = detect(str(proxy), ContentDetector(threshold=25.0, min_scene_len=8),
                      show_progress=False)
    boundaries = [0.0, duration]
    for start, end in detected:
        boundaries.extend([float(start.get_seconds()), float(end.get_seconds())])
    # Detector timestamps refer to the low-res proxy. Coalesce sub-frame gaps.
    boundaries = sorted({round(max(0.0, min(duration, t)), 3) for t in boundaries})
    ranges = [(a, b) for a, b in zip(boundaries, boundaries[1:])
              if b - a >= 0.12]
    return ranges or [(0.0, duration)]


def candidates_for_scenes(scenes, first_end, last_start):
    candidates = []
    cursor = first_end
    for scene_start, scene_end in sorted(scenes):
        a = max(cursor, scene_start, first_end)
        b = min(scene_end, last_start)
        while a < b - 0.001:
            end = min(b, a + MAX_HIGHLIGHT)
            candidates.append((round(a, 3), round(end, 3)))
            a = end
        cursor = max(cursor, b)
    # A detector should cover all frames, but never drop uncatalogued intervals.
    if cursor < last_start - 0.001:
        a = cursor
        while a < last_start - 0.001:
            b = min(a + MAX_HIGHLIGHT, last_start)
            candidates.append((round(a, 3), round(b, 3)))
            a = b
    return [(a, b) for a, b in candidates if b > a + 0.001]


def visual_score(proxy, start, end):
    """Sample within the candidate, avoiding scene-boundary over-scoring."""
    import cv2
    import numpy as np
    cap = cv2.VideoCapture(str(proxy))
    motions, details = [], []
    prev = None
    try:
        steps = max(3, min(13, int((end - start) * 3)))
        for idx in range(steps):
            t = start + (end - start) * ((idx + 0.5) / steps)
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000.0)
            ok, frame = cap.read()
            if not ok:
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            details.append(min(1.0, cv2.Laplacian(gray, cv2.CV_64F).var() / 900.0))
            if prev is not None:
                motions.append(min(1.0, float(np.mean(cv2.absdiff(gray, prev))) / 35.0))
            prev = gray
    finally:
        cap.release()
    if not details:
        return 0.0
    return 0.75 * (sum(motions) / len(motions) if motions else 0.0) + 0.25 * sum(details) / len(details)


def select_segments(duration, scenes, scores, target=TARGET_SECONDS, skip_last_seconds=0):
    """Select diverse shots chronologically; keep the original head and tail."""
    if duration <= target + 0.1:
        return [(0.0, round(duration, 3))]
    # Exclude branded compilation outros only when enough source footage remains.
    # Genuine official trailers retain their natural closing frames by default.
    excluded = max(0.0, min(float(skip_last_seconds), duration - target - 0.25))
    eligible_end = duration - excluded
    opening = min(OPEN_SECONDS, target * 0.20)
    ending = min(CLOSE_SECONDS, target * 0.25)
    tail_start = eligible_end - ending
    middle_budget = target - opening - ending
    candidates = candidates_for_scenes(scenes, opening, tail_start)
    if not candidates or sum(b-a for a, b in candidates) + 0.02 < middle_budget:
        raise ValueError("insufficient_middle_scenes")
    # Spread the chosen highlights throughout the narrative before optimizing
    # visual activity. At most two from any one of six temporal zones.
    slots = 6
    slot_candidates = [[] for _ in range(slots)]
    for idx, (a, b) in enumerate(candidates):
        zone = min(slots-1, int(((a+b)/2 - opening) / (tail_start-opening) * slots))
        slot_candidates[zone].append(idx)
    selected = []
    for zone in slot_candidates:
        if zone:
            selected.append(max(zone, key=lambda i: (scores[i], candidates[i][1]-candidates[i][0])))
    remaining = middle_budget - sum(candidates[i][1]-candidates[i][0] for i in selected)
    # If selected clips already fill the budget, the last selected clip is shortened.
    for i in sorted((i for i in range(len(candidates)) if i not in selected),
                    key=lambda i: (scores[i], candidates[i][1]-candidates[i][0]), reverse=True):
        if remaining <= 0.001:
            break
        selected.append(i)
        remaining -= candidates[i][1]-candidates[i][0]
    pieces = []
    budget = middle_budget
    for i in sorted(selected):
        a, b = candidates[i]
        take = min(b-a, budget)
        if take <= 0.001:
            continue
        # Trim a very long visual shot rather than creating excessively long clips.
        pieces.append((a, round(a+take, 3)))
        budget -= take
    if budget > 0.1:
        raise ValueError("insufficient_selected_duration")
    segments = [(0.0, opening)] + pieces + [(tail_start, eligible_end)]
    if len(segments) > 32:
        raise ValueError("too_many_segments")
    return [(round(a, 3), round(b, 3)) for a, b in segments]


def assemble(source, output, segments, has_audio):
    # Re-encode just the selected portions. The legacy promotional renderer
    # subsequently receives the short MP4 and preserves its 9:16 overlays.
    count = len(segments)
    filters = [
        f"[0:v]split={count}" + "".join(f"[sv{i}]" for i in range(count))
    ]
    if has_audio:
        filters.append(f"[0:a:0]asplit={count}" + "".join(f"[sa{i}]" for i in range(count)))
    for i, (start, end) in enumerate(segments):
        length = end-start
        filters.append(
            f"[sv{i}]trim=start={start:.3f}:end={end:.3f},"
            f"setpts=PTS-STARTPTS,fps=30,setsar=1,format=yuv420p[v{i}]"
        )
        if has_audio:
            fade = min(0.06, length / 10.0)
            filters.append(
                f"[sa{i}]atrim=start={start:.3f}:end={end:.3f},"
                f"asetpts=PTS-STARTPTS,aresample=48000,"
                f"aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
                f"afade=t=in:st=0:d={fade:.3f},"
                f"afade=t=out:st={max(0.0,length-fade):.3f}:d={fade:.3f}[a{i}]"
            )
    if has_audio:
        inputs = "".join(f"[v{i}][a{i}]" for i in range(len(segments)))
        filters.append(f"{inputs}concat=n={len(segments)}:v=1:a=1[vout][aout]")
    else:
        inputs = "".join(f"[v{i}]" for i in range(len(segments)))
        filters.append(f"{inputs}concat=n={len(segments)}:v=1:a=0[vout]")
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-filter_complex", ";".join(filters), "-map", "[vout]"
    ]
    if has_audio:
        cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)]
    run(cmd)


def process(source, output, manifest, target=TARGET_SECONDS, skip_last_seconds=0):
    source, output, manifest = map(Path, (source, output, manifest))
    duration, audio = probe(source)
    if duration <= target + 0.1:
        shutil.copyfile(source, output)
        segments = [(0.0, round(duration, 3))]
        detected_count = 1
        mode = "original"
    else:
        with tempfile.TemporaryDirectory(prefix="nexus-cinematic-") as td:
            proxy = Path(td) / "preview.mp4"
            run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-i", str(source), "-map", "0:v:0", "-vf", "fps=6,scale=288:-2",
                 "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "34",
                 str(proxy)])
            scenes = scene_ranges(proxy, duration)
            opening = OPEN_SECONDS
            excluded = max(0.0, min(float(skip_last_seconds), duration - target - 0.25))
            closing = duration - excluded - CLOSE_SECONDS
            chunks = candidates_for_scenes(scenes, opening, closing)
            scores = [visual_score(proxy, a, b) for a, b in chunks]
            segments = select_segments(duration, scenes, scores, target, skip_last_seconds)
            assemble(source, output, segments, audio)
            detected_count = len(scenes)
            mode = "cinematic"
    result_duration, output_audio = probe(output)
    expected = min(duration, target)
    if abs(result_duration-expected) > 0.38:
        raise RuntimeError(f"cinematic_duration_mismatch:{result_duration:.3f}:{expected:.3f}")
    if audio and not output_audio:
        raise RuntimeError("cinematic_audio_missing")
    data = {"mode": mode, "sourceSeconds": round(duration, 3),
            "outputSeconds": round(result_duration, 3), "targetSeconds": target,
            "originalAudio": audio, "sceneCount": detected_count,
            "segments": [{"start": s, "end": e} for s, e in segments]}
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--target", type=float, default=TARGET_SECONDS)
    parser.add_argument("--skip-last-seconds", type=float, default=0, help="Exclude channel promo from compilation ending")
    args = parser.parse_args()
    if not 15 <= args.target <= 60:
        parser.error("target must be between 15 and 60 seconds")
    if not 0 <= args.skip_last_seconds <= 30:
        parser.error("skip-last-seconds must be between 0 and 30")
    process(args.source, args.output, args.manifest, args.target, args.skip_last_seconds)
