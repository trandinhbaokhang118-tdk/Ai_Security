"""Generate minimal valid PNG shield icons for the extension (no deps).

Writes solid-color rounded shield-ish PNGs at 16/48/128 px. Run once:
    python frontend/extension/make_icons.py
"""

from __future__ import annotations

import os
import struct
import zlib


def _png(width: int, height: int, rgba: tuple[int, int, int, int]) -> bytes:
    r, g, b, a = rgba
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0
        for x in range(width):
            # Simple shield: green center circle-ish, transparent corners.
            cx, cy = width / 2, height / 2
            dx, dy = (x - cx) / (width / 2), (y - cy) / (height / 2)
            inside = dx * dx + dy * dy <= 0.85
            if inside:
                raw += bytes((r, g, b, a))
            else:
                raw += bytes((0, 0, 0, 0))

    def chunk(typ: bytes, data: bytes) -> bytes:
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main() -> None:
    out_dir = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(out_dir, exist_ok=True)
    color = (22, 163, 74, 255)  # risk-safe green (brand shield)
    for size in (16, 48, 128):
        path = os.path.join(out_dir, f"icon{size}.png")
        with open(path, "wb") as fh:
            fh.write(_png(size, size, color))
        print("wrote", path)


if __name__ == "__main__":
    main()
