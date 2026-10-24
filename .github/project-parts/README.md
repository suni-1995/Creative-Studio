# Split project file storage

Large source and binary files can be committed in small, ordered base64 chunks.

For each original file path, place chunks at:

`.github/project-parts/<original/path>.part0001.b64`
`.github/project-parts/<original/path>.part0002.b64`

The manifest `manifest.json` maps the original file path to its number of parts and original SHA-256 digest:

```json
{
  "app/src/main/assets/index.html": {
    "parts": 3,
    "sha256": "64-character-hex-sha256"
  }
}
```

The assembler concatenates the base64 text in order, decodes it and verifies the SHA-256 checksum before writing the original file. Chunks must be contiguous pieces of the base64 encoding of the complete original file, **not** separately encoded pieces.
Run `python3 scripts/assemble_parts.py` before the Android build.
