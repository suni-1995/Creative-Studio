#!/usr/bin/env python3
"""Reassemble byte-exact project files from split base64 chunks.
Chunk layout: .github/project-parts/<original/path>.part0001.b64, .part0002.b64 ...
Each chunk contains a continuous portion of the ORIGINAL file's base64 encoding.
"""
from pathlib import Path
import base64
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / ".github" / "project-parts"
MANIFEST = PARTS / "manifest.json"

def main():
    if not MANIFEST.exists():
        print("No split-file manifest yet; nothing to assemble.")
        return 0
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for relpath, spec in manifest.items():
        target = ROOT / relpath
        if not target.resolve().is_relative_to(ROOT.resolve()):
            raise ValueError(f"Invalid target path: {relpath}")
        count = spec["parts"]
        encoded = []
        for i in range(1, count + 1):
            part = PARTS / (relpath + f".part{i:04d}.b64")
            if not part.is_file():
                raise FileNotFoundError(f"Missing required chunk: {part}")
            encoded.append("".join(part.read_text(encoding="ascii").split()))
        payload = base64.b64decode("".join(encoded), validate=True)
        digest = hashlib.sha256(payload).hexdigest()
        if digest != spec["sha256"]:
            raise ValueError(f"SHA-256 mismatch: {relpath}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        print(f"Restored {relpath}: {len(payload)} bytes")
    return 0

if __name__ == "__main__":
    sys.exit(main())
