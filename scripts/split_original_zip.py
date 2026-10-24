#!/usr/bin/env python3
"""Split an original Android project ZIP into GitHub-friendly, verified chunks.

Usage:
  python3 scripts/split_original_zip.py path/to/Creative-Studio_GitHub_Actions_v59.zip
The output goes into .github/project-parts/ and includes a manifest.
"""
from pathlib import Path
from zipfile import ZipFile
import base64
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / ".github" / "project-parts"
CHUNK_CHARS = 60000

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/split_original_zip.py <project.zip>")
    archive = Path(sys.argv[1])
    if not archive.is_file():
        raise SystemExit(f"ZIP not found: {archive}")
    manifest = {}
    with ZipFile(archive) as z:
        for info in z.infolist():
            name = info.filename
            if info.is_dir() or name.startswith("/") or ".." in Path(name).parts:
                continue
            if name.startswith(".github/project-parts/"):
                continue
            payload = z.read(info)
            encoded = base64.b64encode(payload).decode("ascii")
            chunks = [encoded[i:i + CHUNK_CHARS] for i in range(0, len(encoded), CHUNK_CHARS)] or [""]
            manifest[name] = {"parts": len(chunks), "sha256": hashlib.sha256(payload).hexdigest()}
            for idx, chunk in enumerate(chunks, 1):
                target = PARTS / f"{name}.part{idx:04d}.b64"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(chunk + "\n", encoding="ascii")
            print(f"{name}: {len(payload)} bytes, {len(chunks)} part(s)")
    PARTS.mkdir(parents=True, exist_ok=True)
    (PARTS / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(manifest)} verified source files")

if __name__ == "__main__":
    main()
