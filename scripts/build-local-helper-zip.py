#!/usr/bin/env python3
"""Build the current Windows helper package as a static Cloudflare portal asset.

Always run this after checkout and BEFORE Wrangler deploy. The repository's
historical public/nexus-baixar-no-pc.zip may otherwise contain old helper.py.
No local videos, credentials, runtime executables or font files are included.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "local-youtube"
DEST = ROOT / "public" / "nexus-baixar-no-pc.zip"
FILES = ("INICIAR.cmd", "start.ps1", "helper.py", "README.md", ".gitignore")


def main():
    for name in FILES:
        if not (SOURCE / name).is_file():
            raise FileNotFoundError(f"Missing Windows helper file: {name}")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(DEST, mode="w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name in FILES:
            archive.write(SOURCE / name, arcname=name)
    with ZipFile(DEST, mode="r") as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Windows helper ZIP has a corrupt member")
        for name in FILES:
            assert archive.read(name) == (SOURCE / name).read_bytes(), f"Stale archive item: {name}"
    print(f"NEXUS_HELPER_ZIP_OK {DEST} {DEST.stat().st_size} bytes")


if __name__ == "__main__":
    main()
