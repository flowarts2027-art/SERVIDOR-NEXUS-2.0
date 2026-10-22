#!/usr/bin/env python3
"""Verify deployed niche pages and JPEG bytes, without login or publication."""
import argparse
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
import time
import urllib.request
from urllib.parse import urlparse
from pathlib import Path


class ArtworkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []
        self.videos = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img' and 'arte' in attrs.get('class', '').split():
            self.sources.append(attrs.get('src', ''))
        if tag == 'video':
            self.videos += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', default='https://flowarts.com.br')
    parser.add_argument('--attempts', type=int, default=8)
    args = parser.parse_args()
    origin = args.origin.rstrip('/')
    manifest = json.loads((Path(__file__).resolve().parents[1] / 'docs/nexus-memory/ARTES_2X2_MANIFEST.json').read_text())
    rows = manifest['arquivos']
    assert len(rows) == 21 and len({r['nicho'] for r in rows}) == 21, 'Expected 21 unique niches'

    def get(path, attempt):
        request = urllib.request.Request(f'{origin}/{path}?verify_2x2={attempt}', headers={'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.read()

    def verify(row, attempt):
        niche, path = row['nicho'], row['arquivo']
        public_path = path.removeprefix('public/')
        page = get(f'exemplo/{niche}', attempt).decode('utf-8')
        parsed = ArtworkParser()
        parsed.feed(page)
        assert len(parsed.sources) == 1 and urlparse(parsed.sources[0]).path == '/' + public_path, 'page does not display the expected 2x2 image'
        assert not parsed.videos and '/cartao-' not in page, 'legacy model still displayed'
        data = get(public_path, attempt)
        assert hashlib.sha256(data).hexdigest() == row['sha256'], 'JPEG differs from committed image'
        return niche

    pending = {r['nicho']: r for r in rows}
    errors = {}
    for attempt in range(1, args.attempts + 1):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            futures = {pool.submit(verify, row, attempt): niche for niche, row in pending.items()}
            for future in concurrent.futures.as_completed(futures):
                niche = futures[future]
                try:
                    future.result()
                    del pending[niche]
                    errors.pop(niche, None)
                    print(f'LIVE_2X2_OK {niche}: page + exact JPEG SHA-256', flush=True)
                except Exception as error:
                    errors[niche] = str(error)
        if not pending:
            print(f'LIVE_SHOWCASE_2X2_VERIFIED 21/21 public pages and exact JPEGs at {origin}; authenticated Master session not inspected.')
            return
        print(f'Propagation attempt {attempt}: {len(pending)} niches pending', flush=True)
        if attempt < args.attempts:
            time.sleep(10)
    raise SystemExit('Live showcase verification failed: ' + json.dumps(errors, ensure_ascii=False))


if __name__ == '__main__':
    main()
